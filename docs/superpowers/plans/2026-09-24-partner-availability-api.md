# Partner Availability API (Kitsiva) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expor uma API read-only, autenticada e servidor-a-servidor (`POST /api/v1/availability`) que devolve as casas Lovely Memories disponíveis com o preço real de reserva direta, e uma página `/admin/partners` para gerir chaves e a allow-list de casas.

**Architecture:** Route handler Next.js fino, que orquestra módulos focados em `lib/partner-api/`. Os módulos `destinations`, `validate`, `pricing`, `serialize` e `keys` são puros e testados com `node:test`; `auth` e `search` fazem I/O. Os dados das casas são lidos com o cliente **anon** (a API nunca vê mais do que o site público); o service role serve só para as tabelas de chaves e de registo. A fórmula de preço é um **espelho** de `calculateReservationPrice`, que não é tocada, validado por um script de paridade.

**Tech Stack:** Next.js 16 App Router (route handlers, server actions, `after()`), Supabase (`@supabase/supabase-js`, `@supabase/ssr`), TypeScript, `node:test` via `tsx`, next-intl, Tailwind, lucide-react, sonner.

**Spec:** `docs/superpowers/specs/2026-09-24-partner-availability-api-design.md`

## Global Constraints

- **O checkout NÃO é tocado.** Proibido alterar: `lib/pricing.ts` (exceto um comentário na Task 4), `app/actions/reservation.ts`, `app/actions/stripe.ts`, `app/[locale]/(main)/booking/**`, `app/api/bookings/**`, `app/api/webhooks/stripe/**`, `components/PropertyDetails.tsx` e os componentes BookingCard.
- Nunca `select('*')` nas queries da API; sempre colunas explícitas.
- Nunca espalhar (`...row`) linhas da BD em objetos de resposta.
- Mensagens de erro para fora são genéricas; o detalhe vai só para `console.error`.
- Respostas da API: `Content-Type: application/json`, `Cache-Control: no-store`, sem cabeçalhos CORS.
- Kill-switch: a API só responde se `process.env.PARTNER_API_ENABLED === 'true'`.
- Formato da chave: `lm_live_` + 32 caracteres `[0-9A-Za-z]`. Na BD fica só o SHA-256 hex e o prefixo `lm_live_` + 4 caracteres.
- Rate limit: 60 pedidos/min por chave.
- Limites de validação: estadia ≤ 30 noites; check_in ≤ hoje + 18 meses; guests inteiro entre 1 e 16; check_in > hoje (Europe/Lisbon).
- Origem do booking URL: constante `https://www.lovelymemories.pt` (com www; o domínio com hífen não existe).
- Destinos: `porto`/`oporto` → Porto+Gaia; `gaia`/`vila nova de gaia`/`vn gaia` → Gaia; `algarve` → Algarve; `mykonos`/`mikonos` → Mykonos.
- Strings novas de UI em `messages/{en,pt,he}.json`, com paridade de chaves.
- Migrações Supabase são aplicadas **manualmente** no dashboard; criar o ficheiro não as aplica.
- Commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Os testes unitários correm com `npm run test:partner-api` (criado na Task 2).

## File Structure

| Ficheiro | Responsabilidade |
|---|---|
| `supabase/migrations/20260924120000_partner_api.sql` | Coluna `partner_api_enabled` + tabelas `partner_api_keys` e `partner_api_requests` |
| `lib/partner-api/types.ts` | Tipos do contrato (pedido, resposta, códigos) |
| `lib/partner-api/destinations.ts` | Tabela de aliases + resolução de destino + comparação de cidades |
| `lib/partner-api/validate.ts` | `lisbonToday()` + `validateAvailabilityRequest()` |
| `lib/partner-api/pricing.ts` | `computeStayPrice()`: espelho puro de `calculateReservationPrice` |
| `lib/partner-api/serialize.ts` | Whitelist campo-a-campo → `PartnerProperty` / resposta de sucesso |
| `lib/partner-api/keys.ts` | Gerar chave, calcular o hash, extrair o Bearer |
| `lib/partner-api/auth.ts` | Procurar a chave ativa, rate limit, registo do pedido (service role) |
| `lib/partner-api/search.ts` | Orquestração: casas → disponibilidade → preços → serialização (anon) |
| `lib/partner-api/__tests__/*.test.ts` | Testes `node:test` dos módulos puros |
| `app/api/v1/availability/route.ts` | Handler HTTP |
| `app/actions/partner-api.ts` | Server actions do admin (cada uma verifica o super_admin) |
| `app/[locale]/admin/partners/layout.tsx` | Guard super_admin |
| `app/[locale]/admin/partners/page.tsx` | UI do admin |
| `components/admin/AdminSidebar.tsx` | Entrada "Partners API" (super_admin) |
| `messages/{en,pt,he}.json` | Namespace `AdminPartners` |
| `scripts/check-partner-api-price-parity.ts` | Paridade de preço contra o checkout (BD real) |
| `scripts/test-partner-api.ts` | Smoke + anti-fuga contra o dev server |
| `docs/partner-api/README.md`, `docs/partner-api/openapi.yaml` | Documentação para o parceiro |
| `lib/pricing.ts` | **Só** um comentário por cima de `calculateReservationPrice` |
| `package.json` | Script `test:partner-api` |

---

### Task 1: Migração da BD

**Files:**
- Create: `supabase/migrations/20260924120000_partner_api.sql`

**Interfaces:**
- Produces: coluna `properties.partner_api_enabled boolean`; tabelas `partner_api_keys(id, partner_name, ref_slug, key_prefix, key_hash, created_by, created_at, last_used_at, revoked_at)` e `partner_api_requests(id, key_id, created_at, http_status, status, error_code, result_count, duration_ms)`.

- [ ] **Step 1: Criar o ficheiro de migração**

```sql
-- PARTNER API (Kitsiva / Kileas)
-- =====================================================================
-- Read-only availability API for server-to-server partners.
-- Spec: docs/superpowers/specs/2026-09-24-partner-availability-api-design.md
--
-- 1. properties.partner_api_enabled — per-property allow-list, OFF by default.
-- 2. partner_api_keys — one row per issued key. Only the SHA-256 hash is
--    stored; the full key is shown once at creation and never again.
-- 3. partner_api_requests — one row per authenticated request (audit + rate
--    limit). The request body (dates/destination) is NOT stored.
--
-- Both tables have RLS enabled and NO policies: only the service role can
-- read or write them.

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS partner_api_enabled boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.partner_api_keys (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_name  text NOT NULL,
  ref_slug      text NOT NULL CHECK (ref_slug ~ '^[a-z0-9-]{2,32}$'),
  key_prefix    text NOT NULL,
  key_hash      text NOT NULL UNIQUE,
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_used_at  timestamptz,
  revoked_at    timestamptz
);

CREATE TABLE IF NOT EXISTS public.partner_api_requests (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  key_id        uuid NOT NULL REFERENCES public.partner_api_keys(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  http_status   smallint NOT NULL,
  status        text NOT NULL,
  error_code    text,
  result_count  smallint,
  duration_ms   integer
);

CREATE INDEX IF NOT EXISTS partner_api_requests_key_time
  ON public.partner_api_requests (key_id, created_at DESC);

ALTER TABLE public.partner_api_keys     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_api_requests ENABLE ROW LEVEL SECURITY;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260924120000_partner_api.sql
git commit -m "feat(partner-api): migração — allow-list de casas, chaves e registo de pedidos

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 3: CHECKPOINT HUMANO — pedir ao Marcelo que aplique a migração**

Dizer explicitamente: "A migração `supabase/migrations/20260924120000_partner_api.sql` tem de ser aplicada à mão no SQL Editor do Supabase. As Tasks 7, 8, 11 e 13 dependem dela." Continuar as Tasks 2–6 (puras) enquanto se espera.

---

### Task 2: Tipos + destinos (+ runner de testes)

**Files:**
- Create: `lib/partner-api/types.ts`
- Create: `lib/partner-api/destinations.ts`
- Test: `lib/partner-api/__tests__/destinations.test.ts`
- Modify: `package.json` (bloco `scripts`)

**Interfaces:**
- Produces:
  - `types.ts`: `PartnerApiErrorCode`, `AvailabilityRequest { checkIn: string; checkOut: string; guests: number; destination: string; cities: string[]; nights: number }`, `PartnerProperty`, `SuccessResponse`, `ErrorResponse`, `ResponseStatus`.
  - `destinations.ts`: `normalizeText(input: string): string`, `resolveDestination(input: string): Destination | null`, `cityMatches(propertyCity: unknown, cities: string[]): boolean`, `VALID_DESTINATION_NAMES: string[]`, `interface Destination { name: string; cities: string[]; aliases: string[] }`.

- [ ] **Step 1: Adicionar o script de testes ao `package.json`**

No bloco `"scripts"`, depois de `"test:security"`:

```json
    "test:security": "npx -y tsx scripts/test-security.ts",
    "test:partner-api": "npx -y tsx --test lib/partner-api/__tests__/*.test.ts"
```

- [ ] **Step 2: Criar `lib/partner-api/types.ts`**

```ts
/**
 * Public contract of the partner availability API (POST /api/v1/availability).
 * Spec: docs/superpowers/specs/2026-09-24-partner-availability-api-design.md
 *
 * Everything in these types is sent to an external partner — never add an
 * internal field here without checking the spec's "no internal data" rule.
 */

export type PartnerApiErrorCode =
    | 'INVALID_BODY'
    | 'INVALID_DATES'
    | 'CHECK_IN_TOO_SOON'
    | 'DATES_TOO_FAR'
    | 'STAY_TOO_LONG'
    | 'INVALID_GUESTS'
    | 'UNKNOWN_DESTINATION';

export type ResponseStatus =
    | 'SUCCESS'
    | 'INVALID_REQUEST'
    | 'UNAUTHORIZED'
    | 'RATE_LIMITED'
    | 'METHOD_NOT_ALLOWED'
    | 'ERROR';

/** A request that passed validation. Dates are YYYY-MM-DD. */
export interface AvailabilityRequest {
    checkIn: string;
    checkOut: string;
    guests: number;
    /** Canonical destination name, e.g. "Porto". */
    destination: string;
    /** `properties.city` values this destination covers, e.g. ["Porto", "Gaia"]. */
    cities: string[];
    nights: number;
}

export interface PartnerProperty {
    id: string;
    name: string;
    description: string;
    city: string;
    area_m2: number | null;
    max_guests: number;
    bedrooms: number;
    bathrooms: number;
    total_price: number;
    nightly_price_average: number;
    currency: 'EUR';
    main_image: string | null;
    images: string[];
    amenities: string[];
    booking_url: string;
}

export interface SuccessResponse {
    status: 'SUCCESS';
    search: { check_in: string; check_out: string; guests: number; destination: string };
    currency: 'EUR';
    properties: PartnerProperty[];
}

export interface ErrorResponse {
    status: Exclude<ResponseStatus, 'SUCCESS'>;
    error: { code: string; message: string };
}
```

- [ ] **Step 3: Escrever o teste que falha — `lib/partner-api/__tests__/destinations.test.ts`**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeText, resolveDestination, cityMatches, VALID_DESTINATION_NAMES } from '../destinations';

test('normalizeText strips accents, case and extra spaces', () => {
    assert.equal(normalizeText('  Vila  Nova de GAIA '), 'vila nova de gaia');
    assert.equal(normalizeText('Mýkonos'), 'mykonos');
});

test('Porto resolves to Porto + Gaia', () => {
    const d = resolveDestination('porto');
    assert.ok(d);
    assert.equal(d.name, 'Porto');
    assert.deepEqual(d.cities, ['Porto', 'Gaia']);
});

test('aliases resolve', () => {
    assert.equal(resolveDestination('Oporto')?.name, 'Porto');
    assert.equal(resolveDestination('Vila Nova de Gaia')?.name, 'Gaia');
    assert.equal(resolveDestination('VN Gaia')?.name, 'Gaia');
    assert.equal(resolveDestination('ALGARVE')?.name, 'Algarve');
    assert.equal(resolveDestination('Mikonos')?.name, 'Mykonos');
});

test('unknown destination returns null', () => {
    assert.equal(resolveDestination('Lisbon'), null);
    assert.equal(resolveDestination(''), null);
});

test('cityMatches compares normalized city names', () => {
    assert.equal(cityMatches('Porto', ['Porto', 'Gaia']), true);
    assert.equal(cityMatches(' gaia ', ['Porto', 'Gaia']), true);
    assert.equal(cityMatches('Algarve', ['Porto', 'Gaia']), false);
    assert.equal(cityMatches(null, ['Porto']), false);
    assert.equal(cityMatches({ en: 'Porto' }, ['Porto']), true);
});

test('VALID_DESTINATION_NAMES lists the canonical names', () => {
    assert.deepEqual(VALID_DESTINATION_NAMES, ['Porto', 'Gaia', 'Algarve', 'Mykonos']);
});
```

- [ ] **Step 4: Correr e confirmar que falha**

Run: `npm run test:partner-api`
Expected: FAIL — `Cannot find module '../destinations'`.

- [ ] **Step 5: Implementar `lib/partner-api/destinations.ts`**

```ts
import { getLocalizedStr } from '@/lib/data-utils';

/**
 * Destinations the partner API understands. Adding a destination = adding a row.
 * `cities` must match `properties.city` values (compared normalized).
 * "Porto" deliberately includes Gaia — it's across the bridge, and a traveller
 * asking for Porto expects to see it.
 */
export interface Destination {
    name: string;
    cities: string[];
    aliases: string[];
}

const DESTINATIONS: Destination[] = [
    { name: 'Porto', cities: ['Porto', 'Gaia'], aliases: ['porto', 'oporto'] },
    { name: 'Gaia', cities: ['Gaia'], aliases: ['gaia', 'vila nova de gaia', 'vn gaia'] },
    { name: 'Algarve', cities: ['Algarve'], aliases: ['algarve'] },
    { name: 'Mykonos', cities: ['Mykonos'], aliases: ['mykonos', 'mikonos'] },
];

export const VALID_DESTINATION_NAMES = DESTINATIONS.map(d => d.name);

/** Lowercase, strip diacritics, collapse whitespace. */
export function normalizeText(input: string): string {
    return input
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}

export function resolveDestination(input: string): Destination | null {
    const key = normalizeText(input);
    if (!key) return null;
    return DESTINATIONS.find(d => d.aliases.includes(key)) ?? null;
}

/** `propertyCity` may be a plain string or a localized {en,pt,he} object. */
export function cityMatches(propertyCity: unknown, cities: string[]): boolean {
    const city = normalizeText(getLocalizedStr(propertyCity, 'en'));
    if (!city) return false;
    return cities.some(c => normalizeText(c) === city);
}
```

- [ ] **Step 6: Correr e confirmar que passa**

Run: `npm run test:partner-api`
Expected: PASS — 6 testes, 0 falhas.

- [ ] **Step 7: Commit**

```bash
git add package.json lib/partner-api/types.ts lib/partner-api/destinations.ts lib/partner-api/__tests__/destinations.test.ts
git commit -m "feat(partner-api): tipos do contrato e resolução de destinos

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Validação do pedido

**Files:**
- Create: `lib/partner-api/validate.ts`
- Test: `lib/partner-api/__tests__/validate.test.ts`

**Interfaces:**
- Consumes: `resolveDestination`, `VALID_DESTINATION_NAMES` (Task 2); `AvailabilityRequest`, `PartnerApiErrorCode` (Task 2).
- Produces:
  - `lisbonToday(now?: Date): string` (YYYY-MM-DD em Europe/Lisbon)
  - `type ValidationResult = { ok: true; value: AvailabilityRequest } | { ok: false; code: PartnerApiErrorCode; message: string }`
  - `validateAvailabilityRequest(body: unknown, today: string): ValidationResult`
  - Constantes `MAX_NIGHTS = 30`, `MAX_MONTHS_AHEAD = 18`, `MAX_GUESTS = 16`.

- [ ] **Step 1: Escrever o teste que falha — `lib/partner-api/__tests__/validate.test.ts`**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateAvailabilityRequest, lisbonToday } from '../validate';

const TODAY = '2026-09-24';
const ok = { check_in: '2026-10-10', check_out: '2026-10-14', guests: 4, destination: 'Porto' };

function codeOf(body: unknown) {
    const r = validateAvailabilityRequest(body, TODAY);
    return r.ok ? 'OK' : r.code;
}

test('valid request is normalized', () => {
    const r = validateAvailabilityRequest({ ...ok, destination: ' oporto ', extra: 'ignored' }, TODAY);
    assert.ok(r.ok);
    assert.deepEqual(r.value, {
        checkIn: '2026-10-10', checkOut: '2026-10-14', guests: 4,
        destination: 'Porto', cities: ['Porto', 'Gaia'], nights: 4,
    });
});

test('INVALID_BODY: not an object or wrong field types', () => {
    assert.equal(codeOf(undefined), 'INVALID_BODY');
    assert.equal(codeOf(null), 'INVALID_BODY');
    assert.equal(codeOf([ok]), 'INVALID_BODY');
    assert.equal(codeOf({ ...ok, check_in: undefined }), 'INVALID_BODY');
    assert.equal(codeOf({ ...ok, guests: '4' }), 'INVALID_BODY');
    assert.equal(codeOf({ ...ok, destination: 5 }), 'INVALID_BODY');
    assert.equal(codeOf({ ...ok, destination: '   ' }), 'INVALID_BODY');
});

test('INVALID_DATES: format, impossible dates, order', () => {
    assert.equal(codeOf({ ...ok, check_in: '10-10-2026' }), 'INVALID_DATES');
    assert.equal(codeOf({ ...ok, check_in: '2026-02-30' }), 'INVALID_DATES');
    assert.equal(codeOf({ ...ok, check_out: '2026-10-10' }), 'INVALID_DATES');
    assert.equal(codeOf({ ...ok, check_out: '2026-10-09' }), 'INVALID_DATES');
});

test('CHECK_IN_TOO_SOON: today or past', () => {
    assert.equal(codeOf({ ...ok, check_in: TODAY, check_out: '2026-09-26' }), 'CHECK_IN_TOO_SOON');
    assert.equal(codeOf({ ...ok, check_in: '2026-09-01', check_out: '2026-09-05' }), 'CHECK_IN_TOO_SOON');
    assert.equal(codeOf({ ...ok, check_in: '2026-09-25', check_out: '2026-09-27' }), 'OK');
});

test('DATES_TOO_FAR: more than 18 months ahead', () => {
    assert.equal(codeOf({ ...ok, check_in: '2028-03-24', check_out: '2028-03-26' }), 'OK');
    assert.equal(codeOf({ ...ok, check_in: '2028-03-25', check_out: '2028-03-27' }), 'DATES_TOO_FAR');
});

test('STAY_TOO_LONG: more than 30 nights', () => {
    assert.equal(codeOf({ ...ok, check_in: '2026-10-01', check_out: '2026-10-31' }), 'OK');
    assert.equal(codeOf({ ...ok, check_in: '2026-10-01', check_out: '2026-11-01' }), 'STAY_TOO_LONG');
});

test('INVALID_GUESTS: non-integer or out of range', () => {
    assert.equal(codeOf({ ...ok, guests: 0 }), 'INVALID_GUESTS');
    assert.equal(codeOf({ ...ok, guests: 17 }), 'INVALID_GUESTS');
    assert.equal(codeOf({ ...ok, guests: 2.5 }), 'INVALID_GUESTS');
    assert.equal(codeOf({ ...ok, guests: 16 }), 'OK');
});

test('UNKNOWN_DESTINATION lists valid destinations', () => {
    const r = validateAvailabilityRequest({ ...ok, destination: 'Lisbon' }, TODAY);
    assert.equal(r.ok, false);
    if (!r.ok) {
        assert.equal(r.code, 'UNKNOWN_DESTINATION');
        assert.match(r.message, /Porto, Gaia, Algarve, Mykonos/);
    }
});

test('lisbonToday uses Europe/Lisbon, not UTC', () => {
    // 2026-09-24 23:30 UTC = 2026-09-25 00:30 in Lisbon (WEST, UTC+1)
    assert.equal(lisbonToday(new Date('2026-09-24T23:30:00Z')), '2026-09-25');
    // 2026-01-15 23:30 UTC = 2026-01-15 23:30 in Lisbon (WET, UTC+0)
    assert.equal(lisbonToday(new Date('2026-01-15T23:30:00Z')), '2026-01-15');
});
```

- [ ] **Step 2: Correr e confirmar que falha**

Run: `npm run test:partner-api`
Expected: FAIL — `Cannot find module '../validate'`.

- [ ] **Step 3: Implementar `lib/partner-api/validate.ts`**

```ts
import { resolveDestination, VALID_DESTINATION_NAMES } from './destinations';
import type { AvailabilityRequest, PartnerApiErrorCode } from './types';

export const MAX_NIGHTS = 30;
export const MAX_MONTHS_AHEAD = 18;
export const MAX_GUESTS = 16;

const DAY_MS = 86_400_000;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export type ValidationResult =
    | { ok: true; value: AvailabilityRequest }
    | { ok: false; code: PartnerApiErrorCode; message: string };

/** Today's date (YYYY-MM-DD) in Europe/Lisbon — mirrors the checkout's midnight rule. */
export function lisbonToday(now: Date = new Date()): string {
    // en-CA formats as YYYY-MM-DD
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(now);
}

/** UTC midnight epoch ms for a YYYY-MM-DD string, or null if not a real calendar date. */
function parseDate(value: string): number | null {
    const m = DATE_RE.exec(value);
    if (!m) return null;
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const ms = Date.UTC(y, mo - 1, d);
    const back = new Date(ms);
    if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) return null;
    return ms;
}

function addMonthsUtc(ms: number, months: number): number {
    const d = new Date(ms);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, d.getUTCDate());
}

const fail = (code: PartnerApiErrorCode, message: string): ValidationResult => ({ ok: false, code, message });

/**
 * Validates the raw JSON body. Checks run in the spec's order (5.2) and the
 * first failure is returned. Unknown fields are ignored.
 */
export function validateAvailabilityRequest(body: unknown, today: string): ValidationResult {
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
        return fail('INVALID_BODY', 'Request body must be a JSON object');
    }
    const b = body as Record<string, unknown>;
    if (typeof b.check_in !== 'string' || typeof b.check_out !== 'string'
        || typeof b.guests !== 'number' || typeof b.destination !== 'string' || !b.destination.trim()) {
        return fail('INVALID_BODY', 'Required fields: check_in (string), check_out (string), guests (number), destination (string)');
    }

    const checkInMs = parseDate(b.check_in);
    const checkOutMs = parseDate(b.check_out);
    if (checkInMs === null || checkOutMs === null) {
        return fail('INVALID_DATES', 'Dates must be valid calendar dates in YYYY-MM-DD format');
    }
    if (checkOutMs <= checkInMs) {
        return fail('INVALID_DATES', 'check_out must be after check_in');
    }

    const todayMs = parseDate(today)!;
    if (checkInMs <= todayMs) {
        return fail('CHECK_IN_TOO_SOON', 'check_in must be tomorrow or later');
    }
    if (checkInMs > addMonthsUtc(todayMs, MAX_MONTHS_AHEAD)) {
        return fail('DATES_TOO_FAR', `check_in must be within ${MAX_MONTHS_AHEAD} months from today`);
    }

    const nights = Math.round((checkOutMs - checkInMs) / DAY_MS);
    if (nights > MAX_NIGHTS) {
        return fail('STAY_TOO_LONG', `Maximum stay is ${MAX_NIGHTS} nights`);
    }

    if (!Number.isInteger(b.guests) || b.guests < 1 || b.guests > MAX_GUESTS) {
        return fail('INVALID_GUESTS', `guests must be an integer between 1 and ${MAX_GUESTS}`);
    }

    const destination = resolveDestination(b.destination);
    if (!destination) {
        return fail('UNKNOWN_DESTINATION', `Unknown destination. Valid destinations: ${VALID_DESTINATION_NAMES.join(', ')}`);
    }

    return {
        ok: true,
        value: {
            checkIn: b.check_in,
            checkOut: b.check_out,
            guests: b.guests,
            destination: destination.name,
            cities: destination.cities,
            nights,
        },
    };
}
```

- [ ] **Step 4: Correr e confirmar que passa**

Run: `npm run test:partner-api`
Expected: PASS — todos os testes de `destinations` e `validate`.

- [ ] **Step 5: Commit**

```bash
git add lib/partner-api/validate.ts lib/partner-api/__tests__/validate.test.ts
git commit -m "feat(partner-api): validação do pedido com regra da meia-noite em hora de Lisboa

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Espelho da fórmula de preço

**Files:**
- Create: `lib/partner-api/pricing.ts`
- Test: `lib/partner-api/__tests__/pricing.test.ts`
- Modify: `lib/pricing.ts` — **apenas** um bloco de comentário imediatamente acima de `export async function calculateReservationPrice` (linha ~24–27, o JSDoc existente).

**Interfaces:**
- Produces:
  - `interface PricingRulesRow { property_id: string; base_price_per_night: number | string; cleaning_fee: number | string; min_nights: number; weekly_discount_percent: number | string | null; monthly_discount_percent: number | string | null; city_tax_per_night: number | string | null }`
  - `interface CustomPricingRow { property_id: string; start_date: string; end_date: string; price_per_night: number | string }`
  - `interface StayPrice { nights: number; basePrice: number; discountPercent: number; discountAmount: number; cleaningFee: number; cityTaxTotal: number; totalPrice: number; nightlyAverage: number }`
  - `type StayPriceError = { error: 'errorCheckoutAfterCheckin' | 'errorMinNights' }`
  - `computeStayPrice(input: { rules: PricingRulesRow; customPrices: CustomPricingRow[]; checkIn: string; checkOut: string; guests: number }): StayPrice | StayPriceError`
  - Constantes de colunas: `PRICING_RULES_COLUMNS`, `CUSTOM_PRICING_COLUMNS`.

- [ ] **Step 1: Escrever o teste que falha — `lib/partner-api/__tests__/pricing.test.ts`**

Os valores esperados foram calculados à mão com a fórmula de `calculateReservationPrice` (`lib/pricing.ts:28-113`). A tabela `custom_pricing` está vazia em produção (0 linhas em 2026-09-24), por isso **estes testes são a única cobertura** do ramo de preços personalizados.

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStayPrice, type PricingRulesRow, type CustomPricingRow } from '../pricing';

const rules: PricingRulesRow = {
    property_id: 'p1', base_price_per_night: '150.00', cleaning_fee: '85.00', min_nights: 2,
    weekly_discount_percent: '5.00', monthly_discount_percent: '15.00', city_tax_per_night: '2.00',
};

test('short stay: base + cleaning + tax, no discount', () => {
    const r = computeStayPrice({ rules, customPrices: [], checkIn: '2026-10-10', checkOut: '2026-10-14', guests: 4 });
    assert.ok(!('error' in r));
    // base 4*150=600; tax 2*4*4=32; total 600+85+32=717
    assert.deepEqual(r, {
        nights: 4, basePrice: 600, discountPercent: 0, discountAmount: 0,
        cleaningFee: 85, cityTaxTotal: 32, totalPrice: 717, nightlyAverage: 150,
    });
});

test('7+ nights: weekly discount, tax capped at 7 nights', () => {
    const r = computeStayPrice({ rules, customPrices: [], checkIn: '2026-10-01', checkOut: '2026-10-11', guests: 2 });
    assert.ok(!('error' in r));
    // base 10*150=1500; disc 5% = 75; after 1425; tax 2*2*7=28; total 1425+85+28=1538
    assert.equal(r.discountPercent, 5);
    assert.equal(r.discountAmount, 75);
    assert.equal(r.cityTaxTotal, 28);
    assert.equal(r.totalPrice, 1538);
    assert.equal(r.nightlyAverage, 142.5);
});

test('28+ nights: monthly discount', () => {
    const r = computeStayPrice({ rules, customPrices: [], checkIn: '2026-10-01', checkOut: '2026-10-29', guests: 1 });
    assert.ok(!('error' in r));
    // base 28*150=4200; disc 15% = 630; after 3570; tax 2*1*7=14; total 3570+85+14=3669
    assert.equal(r.discountPercent, 15);
    assert.equal(r.totalPrice, 3669);
});

test('custom pricing applies per night, end_date exclusive', () => {
    const custom: CustomPricingRow[] = [
        { property_id: 'p1', start_date: '2026-10-11', end_date: '2026-10-13', price_per_night: '200.00' },
    ];
    const r = computeStayPrice({ rules, customPrices: custom, checkIn: '2026-10-10', checkOut: '2026-10-14', guests: 2 });
    assert.ok(!('error' in r));
    // nights 10,11,12,13 → 150 + 200 + 200 + 150 = 700; tax 2*2*4=16; total 700+85+16=801
    assert.equal(r.basePrice, 700);
    assert.equal(r.totalPrice, 801);
});

test('overlapping custom periods: first in array wins (same as original find())', () => {
    const custom: CustomPricingRow[] = [
        { property_id: 'p1', start_date: '2026-10-10', end_date: '2026-10-12', price_per_night: '300.00' },
        { property_id: 'p1', start_date: '2026-10-10', end_date: '2026-10-12', price_per_night: '100.00' },
    ];
    const r = computeStayPrice({ rules, customPrices: custom, checkIn: '2026-10-10', checkOut: '2026-10-12', guests: 1 });
    assert.ok(!('error' in r));
    assert.equal(r.basePrice, 600);
});

test('null city tax falls back to 2.00; null discounts become 0', () => {
    const r = computeStayPrice({
        rules: { ...rules, city_tax_per_night: null, weekly_discount_percent: null },
        customPrices: [], checkIn: '2026-10-01', checkOut: '2026-10-08', guests: 1,
    });
    assert.ok(!('error' in r));
    // base 7*150=1050; weekly null → 0; tax 2*1*7=14; total 1050+85+14=1149
    assert.equal(r.discountPercent, 0);
    assert.equal(r.cityTaxTotal, 14);
    assert.equal(r.totalPrice, 1149);
});

test('below min_nights returns errorMinNights', () => {
    const r = computeStayPrice({ rules: { ...rules, min_nights: 3 }, customPrices: [], checkIn: '2026-10-10', checkOut: '2026-10-12', guests: 1 });
    assert.deepEqual(r, { error: 'errorMinNights' });
});

test('checkout not after checkin returns errorCheckoutAfterCheckin', () => {
    const r = computeStayPrice({ rules, customPrices: [], checkIn: '2026-10-10', checkOut: '2026-10-10', guests: 1 });
    assert.deepEqual(r, { error: 'errorCheckoutAfterCheckin' });
});

test('totals are rounded to cents', () => {
    const r = computeStayPrice({
        rules: { ...rules, base_price_per_night: '99.99', weekly_discount_percent: '7.50' },
        customPrices: [], checkIn: '2026-10-01', checkOut: '2026-10-08', guests: 3,
    });
    assert.ok(!('error' in r));
    // base 7*99.99=699.93; disc 7.5% = 52.49475; after 647.43525; tax 2*3*7=42; total 774.43525 → 774.44
    assert.equal(r.totalPrice, 774.44);
    assert.equal(r.nightlyAverage, 92.49);
});
```

- [ ] **Step 2: Correr e confirmar que falha**

Run: `npm run test:partner-api`
Expected: FAIL — `Cannot find module '../pricing'`.

- [ ] **Step 3: Implementar `lib/partner-api/pricing.ts`**

```ts
/**
 * Pure mirror of calculateReservationPrice() in lib/pricing.ts.
 *
 * That function is the price the checkout actually charges (via
 * app/actions/stripe.ts). It is deliberately NOT refactored — the checkout is
 * not to be touched — so this file copies its formula step by step. Parity is
 * enforced by scripts/check-partner-api-price-parity.ts; run it whenever either
 * file changes.
 *
 * Differences allowed (and only these):
 * - rules/custom prices are passed in (batch-loaded) instead of queried here;
 * - dates are YYYY-MM-DD strings iterated in UTC instead of local Date objects
 *   (same calendar days);
 * - guests are all treated as adults (children = 0), per the API contract;
 * - it also returns nightlyAverage for the API response.
 */

export interface PricingRulesRow {
    property_id: string;
    base_price_per_night: number | string;
    cleaning_fee: number | string;
    min_nights: number;
    weekly_discount_percent: number | string | null;
    monthly_discount_percent: number | string | null;
    city_tax_per_night: number | string | null;
}

export interface CustomPricingRow {
    property_id: string;
    start_date: string;
    end_date: string;
    price_per_night: number | string;
}

export const PRICING_RULES_COLUMNS =
    'property_id, base_price_per_night, cleaning_fee, min_nights, weekly_discount_percent, monthly_discount_percent, city_tax_per_night';
export const CUSTOM_PRICING_COLUMNS = 'property_id, start_date, end_date, price_per_night';

export interface StayPrice {
    nights: number;
    basePrice: number;
    discountPercent: number;
    discountAmount: number;
    cleaningFee: number;
    cityTaxTotal: number;
    totalPrice: number;
    /** (base − discount) / nights, rounded to cents. Excludes cleaning and tax. */
    nightlyAverage: number;
}

export type StayPriceError = { error: 'errorCheckoutAfterCheckin' | 'errorMinNights' };

const DAY_MS = 86_400_000;
const round2 = (n: number) => Math.round(n * 100) / 100;

function utcMs(date: string): number {
    const [y, m, d] = date.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
}

function isoDate(ms: number): string {
    return new Date(ms).toISOString().slice(0, 10);
}

export function computeStayPrice(input: {
    rules: PricingRulesRow;
    customPrices: CustomPricingRow[];
    checkIn: string;
    checkOut: string;
    guests: number;
}): StayPrice | StayPriceError {
    const { rules, customPrices, checkIn, checkOut, guests } = input;

    // 1. Nights
    const nights = Math.round((utcMs(checkOut) - utcMs(checkIn)) / DAY_MS);
    if (nights <= 0) return { error: 'errorCheckoutAfterCheckin' };

    // 2. Min nights
    if (nights < rules.min_nights) return { error: 'errorMinNights' };

    // 4. Nightly prices with custom overrides (first match wins, like the original find())
    let totalBasePrice = 0;
    const start = utcMs(checkIn);
    for (let i = 0; i < nights; i++) {
        const dateStr = isoDate(start + i * DAY_MS);
        const custom = customPrices.find(cp => dateStr >= cp.start_date && dateStr < cp.end_date);
        totalBasePrice += custom ? Number(custom.price_per_night) : Number(rules.base_price_per_night);
    }

    // 5. Standard discounts
    let discountPercent = 0;
    if (nights >= 28) {
        discountPercent = Number(rules.monthly_discount_percent);
    } else if (nights >= 7) {
        discountPercent = Number(rules.weekly_discount_percent);
    }
    const discountAmount = totalBasePrice * (discountPercent / 100);
    const priceAfterDiscount = totalBasePrice - discountAmount;

    // 6. City tax: all guests are adults, max 7 nights
    const cityTaxPerNight = Number(rules.city_tax_per_night ?? 2.00);
    const cityTaxTotal = cityTaxPerNight * guests * Math.min(nights, 7);

    // 7. Total
    const cleaningFee = Number(rules.cleaning_fee);
    const totalPrice = priceAfterDiscount + cleaningFee + cityTaxTotal;

    return {
        nights,
        basePrice: totalBasePrice,
        discountPercent,
        discountAmount,
        cleaningFee,
        cityTaxTotal,
        totalPrice: round2(totalPrice),
        nightlyAverage: round2(priceAfterDiscount / nights),
    };
}
```

Nota: os passos 1, 2, 4–7 mantêm a numeração dos comentários do original para facilitar a comparação lado a lado. O passo 3 do original é a query de `custom_pricing`, que aqui vem de fora.

- [ ] **Step 4: Correr e confirmar que passa**

Run: `npm run test:partner-api`
Expected: PASS — todos os testes, incluindo os 9 de `pricing`.

- [ ] **Step 5: Adicionar o comentário de sincronização em `lib/pricing.ts`**

Substituir **exatamente** este bloco (linhas 24–27):

```ts
/**
 * Calcula o custo total de uma reserva com base nas regras da propriedade.
 * Esta função deve ser usada tanto no frontend (exibição) quanto no backend (verificação).
 */
```

por:

```ts
/**
 * Calcula o custo total de uma reserva com base nas regras da propriedade.
 * Esta função deve ser usada tanto no frontend (exibição) quanto no backend (verificação).
 *
 * ESPELHADA em lib/partner-api/pricing.ts (API de parceiros). Se mudares esta
 * fórmula, atualiza o espelho e corre: npx tsx scripts/check-partner-api-price-parity.ts
 */
```

- [ ] **Step 6: Confirmar que o checkout só tem o comentário**

Run: `git diff --stat lib/pricing.ts && git diff lib/pricing.ts`
Expected: `1 file changed, 3 insertions(+)`, e o diff só mostra linhas de comentário (`*`).

- [ ] **Step 7: Commit**

```bash
git add lib/partner-api/pricing.ts lib/partner-api/__tests__/pricing.test.ts lib/pricing.ts
git commit -m "feat(partner-api): espelho puro da fórmula de preço do checkout

calculateReservationPrice fica intacta (só ganha um comentário a apontar
para o espelho e para o script de paridade).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Script de paridade de preço

**Files:**
- Create: `scripts/check-partner-api-price-parity.ts`

**Interfaces:**
- Consumes: `calculateReservationPrice` (`lib/pricing.ts`, sem alterações); `computeStayPrice`, `PRICING_RULES_COLUMNS`, `CUSTOM_PRICING_COLUMNS`, `PricingRulesRow`, `CustomPricingRow` (Task 4).
- Produces: comando `npx tsx scripts/check-partner-api-price-parity.ts`, que sai com código 0 se houver paridade e 1 se não houver.

- [ ] **Step 1: Criar o script**

```ts
/**
 * Price parity check: lib/partner-api/pricing.ts (computeStayPrice) must give
 * EXACTLY the same result as lib/pricing.ts (calculateReservationPrice), which
 * is what the checkout charges.
 *
 * Read-only. Run: npx tsx scripts/check-partner-api-price-parity.ts
 * Exit code 1 on any mismatch.
 *
 * Note: custom_pricing was empty in production when this was written — the
 * custom-price branch is covered by lib/partner-api/__tests__/pricing.test.ts.
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const DAY_MS = 86_400_000;
const NIGHTS = [2, 5, 7, 10, 28];
const START_OFFSETS_DAYS = [30, 75];

function isoFromUtc(ms: number) { return new Date(ms).toISOString().slice(0, 10); }
function localDate(iso: string) { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); }

async function main() {
    // Dynamic imports so dotenv runs before lib/supabase reads the env.
    const { supabase } = await import('../lib/supabase');
    const { calculateReservationPrice } = await import('../lib/pricing');
    const { computeStayPrice, PRICING_RULES_COLUMNS, CUSTOM_PRICING_COLUMNS } = await import('../lib/partner-api/pricing');
    type Rules = import('../lib/partner-api/pricing').PricingRulesRow;
    type Custom = import('../lib/partner-api/pricing').CustomPricingRow;

    const { data: rulesRows, error } = await supabase.from('pricing_rules').select(PRICING_RULES_COLUMNS);
    if (error || !rulesRows) throw new Error(`pricing_rules: ${error?.message}`);

    const { data: props } = await supabase.from('properties').select('id, max_guests');
    const maxGuests = new Map<string, number>();
    for (const p of props ?? []) maxGuests.set(p.id, Math.max(1, parseInt(String((p.max_guests as any)?.en ?? p.max_guests), 10) || 1));

    const { data: allCustom } = await supabase.from('custom_pricing').select(CUSTOM_PRICING_COLUMNS);
    const overlaps = new Set<string>();
    for (const a of (allCustom ?? []) as Custom[]) {
        for (const b of (allCustom ?? []) as Custom[]) {
            if (a !== b && a.property_id === b.property_id && a.start_date < b.end_date && b.start_date < a.end_date) {
                overlaps.add(a.property_id);
            }
        }
    }

    const today = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate());
    let checked = 0;
    const mismatches: string[] = [];

    for (const rules of rulesRows as Rules[]) {
        const guestsOptions = Array.from(new Set([1, maxGuests.get(rules.property_id) ?? 2]));
        for (const offset of START_OFFSETS_DAYS) {
            for (const nights of NIGHTS) {
                const checkIn = isoFromUtc(today + offset * DAY_MS);
                const checkOut = isoFromUtc(today + (offset + nights) * DAY_MS);
                const { data: custom } = await supabase.from('custom_pricing').select(CUSTOM_PRICING_COLUMNS)
                    .eq('property_id', rules.property_id).gte('end_date', checkIn).lte('start_date', checkOut);

                for (const guests of guestsOptions) {
                    const original = await calculateReservationPrice({
                        propertyId: rules.property_id, checkIn: localDate(checkIn), checkOut: localDate(checkOut),
                        adults: guests, children: 0,
                    });
                    const mirror = computeStayPrice({ rules, customPrices: (custom ?? []) as Custom[], checkIn, checkOut, guests });
                    checked++;

                    const label = `${rules.property_id} ${checkIn}→${checkOut} guests=${guests}`;
                    if ('error' in original || 'error' in mirror) {
                        const a = 'error' in original ? original.error : 'OK';
                        const b = 'error' in mirror ? mirror.error : 'OK';
                        if (a !== b) mismatches.push(`${label}: original=${a} mirror=${b}`);
                        continue;
                    }
                    for (const field of ['nights', 'basePrice', 'discountPercent', 'discountAmount', 'cleaningFee', 'cityTaxTotal', 'totalPrice'] as const) {
                        if (original[field] !== mirror[field]) {
                            mismatches.push(`${label}: ${field} original=${original[field]} mirror=${mirror[field]}`);
                        }
                    }
                }
            }
        }
    }

    for (const id of overlaps) console.warn(`⚠️  ${id} has overlapping custom_pricing periods — order is not guaranteed; clean them up in the admin.`);
    console.log(`Checked ${checked} scenarios across ${rulesRows.length} properties.`);
    if (mismatches.length) {
        console.error(`❌ ${mismatches.length} mismatches:`);
        for (const m of mismatches) console.error('  ' + m);
        process.exit(1);
    }
    console.log('✅ Price parity OK — 0 differences.');
}

main().catch(err => { console.error(err); process.exit(1); });
```

- [ ] **Step 2: Correr**

Run: `npx tsx scripts/check-partner-api-price-parity.ts`
Expected: `Checked N scenarios across M properties.` seguido de `✅ Price parity OK — 0 differences.`, com exit code 0. (Pode demorar 1–3 minutos; faz ~2 queries por cenário.)

Se aparecer uma diferença: **não** mexer em `lib/pricing.ts`; corrigir o espelho `lib/partner-api/pricing.ts`, voltar a correr o Step 2 e `npm run test:partner-api`.

- [ ] **Step 3: Commit**

```bash
git add scripts/check-partner-api-price-parity.ts
git commit -m "test(partner-api): script de paridade de preço contra o checkout

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Serialização (whitelist)

**Files:**
- Create: `lib/partner-api/serialize.ts`
- Test: `lib/partner-api/__tests__/serialize.test.ts`

**Interfaces:**
- Consumes: `AvailabilityRequest`, `PartnerProperty`, `SuccessResponse` (Task 2); `StayPrice` (Task 4).
- Produces:
  - `SITE_ORIGIN = 'https://www.lovelymemories.pt'`
  - `PROPERTY_COLUMNS: string` (a lista exata de colunas que `search.ts` lê)
  - `interface PropertyRow { id: string; slug: string; title: unknown; description: unknown; city: unknown; area: unknown; max_guests: unknown; bedrooms: unknown; bathrooms: unknown; images: unknown; amenities: unknown; parent_id: string | null; is_multi_unit: boolean | null; property_images?: { url: string | null }[] | null }`
  - `toNumber(val: unknown): number`, `plainText(input: string, max?: number): string`, `collectImages(row: PropertyRow): string[]`, `collectAmenities(raw: unknown): string[]`, `buildBookingUrl(slug: string, req: AvailabilityRequest, refSlug: string): string`
  - `serializeProperty(row: PropertyRow, price: StayPrice, req: AvailabilityRequest, refSlug: string): PartnerProperty`
  - `buildSuccessResponse(req: AvailabilityRequest, properties: PartnerProperty[]): SuccessResponse`

- [ ] **Step 1: Escrever o teste que falha — `lib/partner-api/__tests__/serialize.test.ts`**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    serializeProperty, buildSuccessResponse, plainText, collectImages, collectAmenities,
    buildBookingUrl, toNumber, type PropertyRow,
} from '../serialize';
import type { AvailabilityRequest } from '../types';
import type { StayPrice } from '../pricing';

const req: AvailabilityRequest = {
    checkIn: '2026-10-10', checkOut: '2026-10-14', guests: 4,
    destination: 'Porto', cities: ['Porto', 'Gaia'], nights: 4,
};
const price: StayPrice = {
    nights: 4, basePrice: 600, discountPercent: 0, discountAmount: 0,
    cleaningFee: 85, cityTaxTotal: 32, totalPrice: 717, nightlyAverage: 150,
};
const row: PropertyRow & Record<string, unknown> = {
    id: 'uuid-1', slug: 'bonfim-apartment',
    title: { en: 'Bonfim Apartment', pt: 'Apartamento Bonfim' },
    description: { en: '<p>Modern **two-bedroom** apartment.</p>\n\nClose to the metro.' },
    city: 'Porto', area: '75', max_guests: { en: '4' }, bedrooms: 2, bathrooms: '1.5',
    images: [{ url: 'https://cdn.example/1.jpg' }, 'https://cdn.example/2.jpg', 'http://insecure/3.jpg', 'https://cdn.example/1.jpg'],
    amenities: [
        { category: 'Bathroom', items: [{ en: 'Hair dryer' }, { en: ' Wi-Fi ' }, { en: '' }] },
        { category: 'Internet', items: [{ en: 'wi-fi' }, { en: 'Kitchen', pt: 'Cozinha' }] },
    ],
    parent_id: null, is_multi_unit: false, property_images: [],
    // Internal columns that must NEVER leak even if a row carries them:
    owner_id: 'owner-uuid', address: 'Rua Secreta 1', ical_import_urls: ['https://airbnb/x.ics'],
};

test('serializeProperty maps exactly the contract fields', () => {
    const p = serializeProperty(row, price, req, 'kitsiva');
    assert.deepEqual(Object.keys(p).sort(), [
        'amenities', 'area_m2', 'bathrooms', 'bedrooms', 'booking_url', 'city', 'currency', 'description',
        'id', 'images', 'main_image', 'max_guests', 'name', 'nightly_price_average', 'total_price',
    ]);
    assert.equal(p.id, 'uuid-1');
    assert.equal(p.name, 'Bonfim Apartment');
    assert.equal(p.description, 'Modern two-bedroom apartment. Close to the metro.');
    assert.equal(p.city, 'Porto');
    assert.equal(p.area_m2, 75);
    assert.equal(p.max_guests, 4);
    assert.equal(p.bedrooms, 2);
    assert.equal(p.bathrooms, 1.5);
    assert.equal(p.total_price, 717);
    assert.equal(p.nightly_price_average, 150);
    assert.equal(p.currency, 'EUR');
    assert.equal(p.main_image, 'https://cdn.example/1.jpg');
    assert.deepEqual(p.images, ['https://cdn.example/1.jpg', 'https://cdn.example/2.jpg']);
    assert.deepEqual(p.amenities, ['Hair dryer', 'Wi-Fi', 'Kitchen']);
    assert.equal(p.booking_url,
        'https://www.lovelymemories.pt/en/properties/bonfim-apartment?from=2026-10-10&to=2026-10-14&adults=4&ref=kitsiva');
    const json = JSON.stringify(p);
    assert.ok(!json.includes('owner') && !json.includes('Secreta') && !json.includes('.ics'));
});

test('name falls back to pt, then slug', () => {
    assert.equal(serializeProperty({ ...row, title: { pt: 'Casa' } }, price, req, 'k').name, 'Casa');
    assert.equal(serializeProperty({ ...row, title: null }, price, req, 'k').name, 'bonfim-apartment');
});

test('no images → main_image null, images [] (never a placeholder)', () => {
    const p = serializeProperty({ ...row, images: [], property_images: [] }, price, req, 'k');
    assert.equal(p.main_image, null);
    assert.deepEqual(p.images, []);
});

test('collectImages falls back to property_images and caps at 10', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ url: `https://cdn.example/${i}.jpg` }));
    assert.equal(collectImages({ ...row, images: [], property_images: many }).length, 10);
});

test('area_m2 is null when missing or zero', () => {
    assert.equal(serializeProperty({ ...row, area: null }, price, req, 'k').area_m2, null);
    assert.equal(serializeProperty({ ...row, area: '0' }, price, req, 'k').area_m2, null);
});

test('plainText strips markup and cuts at a word boundary', () => {
    assert.equal(plainText('# Title\n\n*bold* `code` <b>x</b>'), 'Title bold code x');
    const long = 'word '.repeat(100);
    const cut = plainText(long, 20);
    assert.ok(cut.length <= 21);
    assert.ok(cut.endsWith('…'));
    assert.ok(!cut.includes('wor…'));
});

test('collectAmenities dedupes case-insensitively and caps at 30', () => {
    const items = Array.from({ length: 40 }, (_, i) => ({ en: `Item ${i}` }));
    assert.equal(collectAmenities([{ items }]).length, 30);
    assert.deepEqual(collectAmenities('not-an-array'), []);
});

test('toNumber handles localized objects and strings', () => {
    assert.equal(toNumber({ en: '3' }), 3);
    assert.equal(toNumber('2.5'), 2.5);
    assert.equal(toNumber(null), 0);
});

test('buildBookingUrl encodes the slug', () => {
    assert.equal(buildBookingUrl('casa ç', req, 'k'),
        'https://www.lovelymemories.pt/en/properties/casa%20%C3%A7?from=2026-10-10&to=2026-10-14&adults=4&ref=k');
});

test('buildSuccessResponse echoes the normalized search', () => {
    assert.deepEqual(buildSuccessResponse(req, []), {
        status: 'SUCCESS',
        search: { check_in: '2026-10-10', check_out: '2026-10-14', guests: 4, destination: 'Porto' },
        currency: 'EUR',
        properties: [],
    });
});
```

- [ ] **Step 2: Correr e confirmar que falha**

Run: `npm run test:partner-api`
Expected: FAIL — `Cannot find module '../serialize'`.

- [ ] **Step 3: Implementar `lib/partner-api/serialize.ts`**

```ts
import { getLocalizedStr } from '@/lib/data-utils';
import type { AvailabilityRequest, PartnerProperty, SuccessResponse } from './types';
import type { StayPrice } from './pricing';

/**
 * The ONLY place that decides what a partner sees about a property.
 * Every output field is built explicitly from a named input — never spread a
 * DB row into the response. Anything not listed here does not leave the server.
 */

export const SITE_ORIGIN = 'https://www.lovelymemories.pt';

/** Exact columns search.ts reads from `properties`. Never select('*'). */
export const PROPERTY_COLUMNS =
    'id, slug, title, description, city, area, max_guests, bedrooms, bathrooms, images, amenities, parent_id, is_multi_unit, property_images(url)';

const MAX_IMAGES = 10;
const MAX_AMENITIES = 30;
const DESCRIPTION_MAX = 300;

export interface PropertyRow {
    id: string;
    slug: string;
    title: unknown;
    description: unknown;
    city: unknown;
    area: unknown;
    max_guests: unknown;
    bedrooms: unknown;
    bathrooms: unknown;
    images: unknown;
    amenities: unknown;
    parent_id: string | null;
    is_multi_unit: boolean | null;
    property_images?: { url: string | null }[] | null;
}

/** Numbers may be stored as numbers, strings or localized {en,pt,he} objects. */
export function toNumber(val: unknown): number {
    if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
    if (typeof val === 'string') return parseFloat(val) || 0;
    if (typeof val === 'object' && val !== null) {
        const o = val as Record<string, unknown>;
        return toNumber(o.en ?? o.pt ?? o.he ?? Object.values(o)[0]);
    }
    return 0;
}

/** Strip HTML/markdown, collapse whitespace, cut at a word boundary with an ellipsis. */
export function plainText(input: string, max = DESCRIPTION_MAX): string {
    const text = input
        .replace(/<[^>]*>/g, ' ')
        .replace(/[*_#`>~]+/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    if (text.length <= max) return text;
    const cut = text.slice(0, max);
    const lastSpace = cut.lastIndexOf(' ');
    return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…';
}

function localizedText(val: unknown): string {
    if (typeof val === 'object' && val !== null) {
        const o = val as Record<string, unknown>;
        const v = o.en || o.pt;
        return typeof v === 'string' ? v : '';
    }
    return typeof val === 'string' ? val : '';
}

export function collectImages(row: PropertyRow): string[] {
    const fromJson = Array.isArray(row.images)
        ? row.images.map(img => (typeof img === 'string' ? img : (img as { url?: unknown })?.url))
        : [];
    const fromTable = (row.property_images ?? []).map(img => img?.url);
    const source = fromJson.length > 0 ? fromJson : fromTable;

    const out: string[] = [];
    for (const url of source) {
        if (typeof url !== 'string' || !url.startsWith('https://') || out.includes(url)) continue;
        out.push(url);
        if (out.length === MAX_IMAGES) break;
    }
    return out;
}

export function collectAmenities(raw: unknown): string[] {
    if (!Array.isArray(raw)) return [];
    const out: string[] = [];
    const seen = new Set<string>();
    for (const cat of raw) {
        const items = (cat as { items?: unknown })?.items;
        if (!Array.isArray(items)) continue;
        for (const item of items) {
            const name = getLocalizedStr(item, 'en').trim();
            const key = name.toLowerCase();
            if (!name || seen.has(key)) continue;
            seen.add(key);
            out.push(name);
            if (out.length === MAX_AMENITIES) return out;
        }
    }
    return out;
}

export function buildBookingUrl(slug: string, req: AvailabilityRequest, refSlug: string): string {
    const params = new URLSearchParams({
        from: req.checkIn,
        to: req.checkOut,
        adults: String(req.guests),
        ref: refSlug,
    });
    return `${SITE_ORIGIN}/en/properties/${encodeURIComponent(slug)}?${params.toString()}`;
}

export function serializeProperty(
    row: PropertyRow,
    price: StayPrice,
    req: AvailabilityRequest,
    refSlug: string,
): PartnerProperty {
    const images = collectImages(row);
    const area = toNumber(row.area);
    return {
        id: row.id,
        name: localizedText(row.title).trim() || row.slug,
        description: plainText(localizedText(row.description)),
        city: getLocalizedStr(row.city, 'en').trim(),
        area_m2: area > 0 ? area : null,
        max_guests: toNumber(row.max_guests),
        bedrooms: toNumber(row.bedrooms),
        bathrooms: toNumber(row.bathrooms),
        total_price: price.totalPrice,
        nightly_price_average: price.nightlyAverage,
        currency: 'EUR',
        main_image: images[0] ?? null,
        images,
        amenities: collectAmenities(row.amenities),
        booking_url: buildBookingUrl(row.slug, req, refSlug),
    };
}

export function buildSuccessResponse(req: AvailabilityRequest, properties: PartnerProperty[]): SuccessResponse {
    return {
        status: 'SUCCESS',
        search: { check_in: req.checkIn, check_out: req.checkOut, guests: req.guests, destination: req.destination },
        currency: 'EUR',
        properties,
    };
}
```

- [ ] **Step 4: Correr e confirmar que passa**

Run: `npm run test:partner-api`
Expected: PASS — todos os testes.

- [ ] **Step 5: Commit**

```bash
git add lib/partner-api/serialize.ts lib/partner-api/__tests__/serialize.test.ts
git commit -m "feat(partner-api): serialização por whitelist campo a campo

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Chaves e autenticação

**Files:**
- Create: `lib/partner-api/keys.ts`
- Create: `lib/partner-api/auth.ts`
- Test: `lib/partner-api/__tests__/keys.test.ts`

**Interfaces:**
- Consumes: `getSupabaseAdmin()` (`lib/supabase.ts`); tabelas da Task 1 (**migração aplicada**).
- Produces:
  - `keys.ts`: `KEY_PREFIX = 'lm_live_'`, `API_KEY_PATTERN: RegExp`, `generateApiKey(): string`, `hashApiKey(key: string): string`, `displayPrefix(key: string): string`, `extractBearer(header: string | null): string | null`.
  - `auth.ts`: `RATE_LIMIT_PER_MINUTE = 60`, `interface PartnerKey { id: string; partnerName: string; refSlug: string }`, `findActiveKey(token: string): Promise<PartnerKey | null>` (lança se a BD falhar), `isRateLimited(keyId: string): Promise<boolean>` (lança se a BD falhar), `recordRequest(entry: RequestLogEntry): Promise<void>` (nunca lança), `interface RequestLogEntry { keyId: string; httpStatus: number; status: string; errorCode?: string; resultCount?: number; durationMs: number }`.

- [ ] **Step 1: Escrever o teste que falha — `lib/partner-api/__tests__/keys.test.ts`**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateApiKey, hashApiKey, displayPrefix, extractBearer, API_KEY_PATTERN } from '../keys';

test('generateApiKey has the right format and is unique', () => {
    const a = generateApiKey();
    const b = generateApiKey();
    assert.match(a, API_KEY_PATTERN);
    assert.equal(a.length, 'lm_live_'.length + 32);
    assert.notEqual(a, b);
});

test('hashApiKey is sha256 hex and deterministic', () => {
    const h = hashApiKey('lm_live_abc');
    assert.match(h, /^[0-9a-f]{64}$/);
    assert.equal(h, hashApiKey('lm_live_abc'));
    assert.notEqual(h, hashApiKey('lm_live_abd'));
});

test('displayPrefix shows lm_live_ + 4 chars', () => {
    assert.equal(displayPrefix('lm_live_ab12Xk9qP4mZr7Tw2Lc8Vn5Hy3Ds6Fb1'), 'lm_live_ab12');
});

test('extractBearer accepts only well-formed keys', () => {
    const key = generateApiKey();
    assert.equal(extractBearer(`Bearer ${key}`), key);
    assert.equal(extractBearer(`bearer   ${key}`), key);
    assert.equal(extractBearer(null), null);
    assert.equal(extractBearer(''), null);
    assert.equal(extractBearer(key), null);
    assert.equal(extractBearer('Bearer lm_live_short'), null);
    assert.equal(extractBearer(`Basic ${key}`), null);
    assert.equal(extractBearer(`Bearer ${key} extra`), null);
});
```

- [ ] **Step 2: Correr e confirmar que falha**

Run: `npm run test:partner-api`
Expected: FAIL — `Cannot find module '../keys'`.

- [ ] **Step 3: Implementar `lib/partner-api/keys.ts`**

```ts
import { createHash, randomBytes } from 'node:crypto';

/**
 * Partner API keys: `lm_live_` + 32 base62 chars (~190 bits of entropy).
 * Only the SHA-256 hash is stored. A fast hash is fine here: the keys are
 * long random secrets, not human passwords, so brute force is not a concern.
 */

export const KEY_PREFIX = 'lm_live_';
const TOKEN_LENGTH = 32;
const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
export const API_KEY_PATTERN = /^lm_live_[0-9A-Za-z]{32}$/;

export function generateApiKey(): string {
    let token = '';
    while (token.length < TOKEN_LENGTH) {
        for (const byte of randomBytes(64)) {
            // Rejection sampling: 248 = 62 * 4, so byte % 62 stays uniform.
            if (byte < 248 && token.length < TOKEN_LENGTH) token += ALPHABET[byte % 62];
        }
    }
    return KEY_PREFIX + token;
}

export function hashApiKey(key: string): string {
    return createHash('sha256').update(key, 'utf8').digest('hex');
}

/** Non-secret identifier shown in the admin, e.g. "lm_live_ab12". */
export function displayPrefix(key: string): string {
    return key.slice(0, KEY_PREFIX.length + 4);
}

/** Returns the key from an `Authorization: Bearer <key>` header, or null if absent/malformed. */
export function extractBearer(header: string | null): string | null {
    if (!header) return null;
    const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
    if (!match) return null;
    return API_KEY_PATTERN.test(match[1]) ? match[1] : null;
}
```

- [ ] **Step 4: Correr e confirmar que passa**

Run: `npm run test:partner-api`
Expected: PASS.

- [ ] **Step 5: Implementar `lib/partner-api/auth.ts`**

```ts
import { getSupabaseAdmin } from '@/lib/supabase';
import { hashApiKey } from './keys';

/**
 * Key lookup, rate limiting and request logging for the partner API.
 * Uses the service role: partner_api_keys / partner_api_requests have RLS with
 * no policies, so nothing else can read them.
 */

export const RATE_LIMIT_PER_MINUTE = 60;

export interface PartnerKey {
    id: string;
    partnerName: string;
    refSlug: string;
}

export interface RequestLogEntry {
    keyId: string;
    httpStatus: number;
    status: string;
    errorCode?: string;
    resultCount?: number;
    durationMs: number;
}

/** Active (non-revoked) key for this token, or null. Throws on DB failure. */
export async function findActiveKey(token: string): Promise<PartnerKey | null> {
    const db = await getSupabaseAdmin();
    const { data, error } = await db
        .from('partner_api_keys')
        .select('id, partner_name, ref_slug')
        .eq('key_hash', hashApiKey(token))
        .is('revoked_at', null)
        .maybeSingle();
    if (error) throw new Error(`partner_api_keys lookup failed: ${error.message}`);
    if (!data) return null;
    return { id: data.id, partnerName: data.partner_name, refSlug: data.ref_slug };
}

/**
 * True if this key made RATE_LIMIT_PER_MINUTE or more requests in the last 60s.
 * Approximate under concurrency (count-then-insert), acceptable at our volume.
 * Throws on DB failure.
 */
export async function isRateLimited(keyId: string): Promise<boolean> {
    const db = await getSupabaseAdmin();
    const since = new Date(Date.now() - 60_000).toISOString();
    const { count, error } = await db
        .from('partner_api_requests')
        .select('id', { count: 'exact', head: true })
        .eq('key_id', keyId)
        .gt('created_at', since);
    if (error) throw new Error(`partner_api_requests count failed: ${error.message}`);
    return (count ?? 0) >= RATE_LIMIT_PER_MINUTE;
}

/** Best-effort log + last_used_at bump. Never throws — logging must not break a response. */
export async function recordRequest(entry: RequestLogEntry): Promise<void> {
    try {
        const db = await getSupabaseAdmin();
        const [insert, touch] = await Promise.all([
            db.from('partner_api_requests').insert({
                key_id: entry.keyId,
                http_status: entry.httpStatus,
                status: entry.status,
                error_code: entry.errorCode ?? null,
                result_count: entry.resultCount ?? null,
                duration_ms: entry.durationMs,
            }),
            db.from('partner_api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', entry.keyId),
        ]);
        if (insert.error) console.error('[partner-api] request log failed:', insert.error.message);
        if (touch.error) console.error('[partner-api] last_used_at update failed:', touch.error.message);
    } catch (err) {
        console.error('[partner-api] request log exception:', err);
    }
}
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 7: Commit**

```bash
git add lib/partner-api/keys.ts lib/partner-api/auth.ts lib/partner-api/__tests__/keys.test.ts
git commit -m "feat(partner-api): chaves com hash SHA-256, lookup, rate limit e registo

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Pesquisa (orquestração)

**Files:**
- Create: `lib/partner-api/search.ts`

**Interfaces:**
- Consumes: `cityMatches` (Task 2); `computeStayPrice`, `PRICING_RULES_COLUMNS`, `CUSTOM_PRICING_COLUMNS`, `PricingRulesRow`, `CustomPricingRow` (Task 4); `PROPERTY_COLUMNS`, `PropertyRow`, `serializeProperty`, `toNumber` (Task 6); RPC `get_unavailable_property_ids(p_check_in date, p_check_out date)` (já existe); coluna `partner_api_enabled` (Task 1, **aplicada**).
- Produces: `searchAvailableProperties(db: SupabaseClient, req: AvailabilityRequest, refSlug: string): Promise<PartnerProperty[]>`, que lança `Error` se qualquer query falhar (a rota converte em 503).

- [ ] **Step 1: Implementar `lib/partner-api/search.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { cityMatches } from './destinations';
import {
    computeStayPrice, PRICING_RULES_COLUMNS, CUSTOM_PRICING_COLUMNS,
    type PricingRulesRow, type CustomPricingRow,
} from './pricing';
import { PROPERTY_COLUMNS, serializeProperty, toNumber, type PropertyRow } from './serialize';
import type { AvailabilityRequest, PartnerProperty } from './types';

/**
 * dates + guests + destination → available, priced, serialized properties.
 *
 * `db` MUST be an anon client: the API may only see what the public site sees.
 * Reservations are only reachable through the SECURITY DEFINER RPC, which
 * returns property ids and nothing else.
 *
 * Any query failure throws — we never return partial results or assume
 * "available" when availability could not be checked.
 */
export async function searchAvailableProperties(
    db: SupabaseClient,
    req: AvailabilityRequest,
    refSlug: string,
): Promise<PartnerProperty[]> {
    // 1. Allow-listed, active, public properties (same visibility filter as the site search).
    const { data: rows, error: propsError } = await db
        .from('properties')
        .select(PROPERTY_COLUMNS)
        .eq('is_active', true)
        .neq('status', 'hidden')
        .eq('partner_api_enabled', true);
    if (propsError) throw new Error(`properties query failed: ${propsError.message}`);

    // 2. Bookable leaves only (units, or standalone houses), in the destination, with capacity.
    const candidates = ((rows ?? []) as unknown as PropertyRow[]).filter(p =>
        (p.parent_id !== null || !p.is_multi_unit)
        && cityMatches(p.city, req.cities)
        && toNumber(p.max_guests) >= req.guests,
    );
    if (candidates.length === 0) return [];

    // 3. Availability — blocked_dates (incl. iCal imports), reservations, active locks.
    const { data: unavailable, error: rpcError } = await db.rpc('get_unavailable_property_ids', {
        p_check_in: req.checkIn,
        p_check_out: req.checkOut,
    });
    if (rpcError) throw new Error(`availability RPC failed: ${rpcError.message}`);
    const unavailableIds = new Set(((unavailable ?? []) as { property_id: string }[]).map(r => r.property_id));
    const available = candidates.filter(p => !unavailableIds.has(p.id));
    if (available.length === 0) return [];

    // 4. Prices, batch-loaded. The custom_pricing filter matches calculateReservationPrice's exactly.
    const ids = available.map(p => p.id);
    const [rulesRes, customRes] = await Promise.all([
        db.from('pricing_rules').select(PRICING_RULES_COLUMNS).in('property_id', ids),
        db.from('custom_pricing').select(CUSTOM_PRICING_COLUMNS).in('property_id', ids)
            .gte('end_date', req.checkIn).lte('start_date', req.checkOut),
    ]);
    if (rulesRes.error) throw new Error(`pricing_rules query failed: ${rulesRes.error.message}`);
    if (customRes.error) throw new Error(`custom_pricing query failed: ${customRes.error.message}`);

    const rulesById = new Map((rulesRes.data as PricingRulesRow[]).map(r => [r.property_id, r]));
    const customRows = (customRes.data ?? []) as CustomPricingRow[];

    // 5. Price + serialize. No rules or below min nights → silently excluded.
    const results: PartnerProperty[] = [];
    for (const row of available) {
        const rules = rulesById.get(row.id);
        if (!rules) continue;
        const price = computeStayPrice({
            rules,
            customPrices: customRows.filter(c => c.property_id === row.id),
            checkIn: req.checkIn,
            checkOut: req.checkOut,
            guests: req.guests,
        });
        if ('error' in price) continue;
        results.push(serializeProperty(row, price, req, refSlug));
    }

    // 6. Cheapest first, id as a stable tie-breaker.
    return results.sort((a, b) => a.total_price - b.total_price || a.id.localeCompare(b.id));
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add lib/partner-api/search.ts
git commit -m "feat(partner-api): pesquisa com allow-list, RPC de disponibilidade e preços em lote

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Route handler

**Files:**
- Create: `app/api/v1/availability/route.ts`

**Interfaces:**
- Consumes: `extractBearer` (Task 7), `findActiveKey`, `isRateLimited`, `recordRequest` (Task 7), `lisbonToday`, `validateAvailabilityRequest` (Task 3), `searchAvailableProperties` (Task 8), `buildSuccessResponse` (Task 6), `ErrorResponse` (Task 2).
- Produces: `POST /api/v1/availability`; `GET/PUT/PATCH/DELETE/OPTIONS` → 405.

- [ ] **Step 1: Implementar `app/api/v1/availability/route.ts`**

```ts
import { NextRequest, NextResponse, after } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { extractBearer } from '@/lib/partner-api/keys';
import { findActiveKey, isRateLimited, recordRequest } from '@/lib/partner-api/auth';
import { lisbonToday, validateAvailabilityRequest } from '@/lib/partner-api/validate';
import { searchAvailableProperties } from '@/lib/partner-api/search';
import { buildSuccessResponse } from '@/lib/partner-api/serialize';
import type { ErrorResponse, ResponseStatus } from '@/lib/partner-api/types';

/**
 * Partner availability API — read-only, server-to-server, Bearer-authenticated.
 * Spec: docs/superpowers/specs/2026-09-24-partner-availability-api-design.md
 *
 * No CORS headers on purpose: browsers must not be able to call this.
 */

export const dynamic = 'force-dynamic';

const BASE_HEADERS = { 'Cache-Control': 'no-store' };

function json(body: unknown, status: number, extraHeaders: Record<string, string> = {}) {
    return NextResponse.json(body, { status, headers: { ...BASE_HEADERS, ...extraHeaders } });
}

function errorBody(status: Exclude<ResponseStatus, 'SUCCESS'>, code: string, message: string): ErrorResponse {
    return { status, error: { code, message } };
}

const unauthorized = () =>
    json(errorBody('UNAUTHORIZED', 'UNAUTHORIZED', 'Invalid or missing API token'), 401);

const serviceError = () =>
    json(errorBody('ERROR', 'AVAILABILITY_UNAVAILABLE', 'Availability could not be retrieved at this time'), 503);

/** Anon client, no session: sees exactly what the public site sees. */
function createAnonClient() {
    return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
}

export async function POST(request: NextRequest) {
    const startedAt = Date.now();

    // Kill-switch first: no DB access at all when disabled.
    if (process.env.PARTNER_API_ENABLED !== 'true') {
        return json(errorBody('ERROR', 'SERVICE_DISABLED', 'The API is temporarily disabled'), 503);
    }

    const token = extractBearer(request.headers.get('authorization'));
    if (!token) return unauthorized();

    let key;
    try {
        key = await findActiveKey(token);
    } catch (err) {
        console.error('[partner-api] key lookup failed:', err);
        return serviceError();
    }
    if (!key) return unauthorized();

    const keyId = key.id;
    const respond = (
        res: NextResponse,
        status: Exclude<ResponseStatus, 'UNAUTHORIZED' | 'METHOD_NOT_ALLOWED'>,
        errorCode?: string,
        resultCount?: number,
    ) => {
        const durationMs = Date.now() - startedAt;
        after(() => recordRequest({ keyId, httpStatus: res.status, status, errorCode, resultCount, durationMs }));
        return res;
    };

    try {
        if (await isRateLimited(keyId)) {
            return respond(
                json(errorBody('RATE_LIMITED', 'RATE_LIMITED', 'Too many requests. Retry in 60 seconds.'), 429, { 'Retry-After': '60' }),
                'RATE_LIMITED',
                'RATE_LIMITED',
            );
        }
    } catch (err) {
        console.error('[partner-api] rate limit check failed:', err);
        return respond(serviceError(), 'ERROR', 'AVAILABILITY_UNAVAILABLE');
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        body = undefined;
    }

    const validation = validateAvailabilityRequest(body, lisbonToday());
    if (!validation.ok) {
        return respond(
            json(errorBody('INVALID_REQUEST', validation.code, validation.message), 400),
            'INVALID_REQUEST',
            validation.code,
        );
    }

    try {
        const properties = await searchAvailableProperties(createAnonClient(), validation.value, key.refSlug);
        return respond(json(buildSuccessResponse(validation.value, properties), 200), 'SUCCESS', undefined, properties.length);
    } catch (err) {
        console.error('[partner-api] search failed:', err);
        return respond(serviceError(), 'ERROR', 'AVAILABILITY_UNAVAILABLE');
    }
}

function methodNotAllowed() {
    return json(errorBody('METHOD_NOT_ALLOWED', 'METHOD_NOT_ALLOWED', 'Use POST'), 405, { Allow: 'POST' });
}

export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
```

- [ ] **Step 2: Type-check e lint**

Run: `npx tsc --noEmit && npx eslint app/api/v1 lib/partner-api`
Expected: sem erros.

- [ ] **Step 3: Verificação rápida com o dev server (kill-switch e 405)**

Iniciar o preview (`preview_start` com o nome da config em `.claude/launch.json`, porta 3001), **sem** `PARTNER_API_ENABLED` no `.env.local`, e correr:

```bash
curl -s -X POST http://localhost:3001/api/v1/availability -H "Content-Type: application/json" -d "{}"
curl -s -i http://localhost:3001/api/v1/availability
```

Expected: o primeiro devolve `{"status":"ERROR","error":{"code":"SERVICE_DISABLED",...}}`; o segundo `HTTP/1.1 405` com `Allow: POST`.

- [ ] **Step 4: Commit**

```bash
git add app/api/v1/availability/route.ts
git commit -m "feat(partner-api): endpoint POST /api/v1/availability

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Server actions do admin

**Files:**
- Create: `app/actions/partner-api.ts`

**Interfaces:**
- Consumes: `generateApiKey`, `hashApiKey`, `displayPrefix` (Task 7); `logActivity(actorId, action, resource, resourceId, details, severity)` (`app/actions/audit.ts`); `getSupabaseAdmin()`; tabelas da Task 1.
- Produces (todas exigem super_admin e devolvem `ActionResult<T>`):
  - `type ActionResult<T> = { success: true; data: T } | { success: false; error: string }`
  - `interface PartnerKeyListItem { id: string; partnerName: string; refSlug: string; keyPrefix: string; createdAt: string; lastUsedAt: string | null; revokedAt: string | null; requests24h: number }`
  - `interface PartnerPropertyListItem { id: string; name: string; city: string; maxGuests: number; enabled: boolean; icalFailed: boolean }`
  - `interface PartnerApiSummary { apiEnabled: boolean; requests24h: number; activeKeys: number; exposedProperties: number; totalProperties: number }`
  - `listPartnerKeys(): Promise<ActionResult<PartnerKeyListItem[]>>`
  - `createPartnerKey(input: { partnerName: string; refSlug: string }): Promise<ActionResult<{ id: string; key: string; keyPrefix: string }>>`
  - `revokePartnerKey(id: string): Promise<ActionResult<null>>`
  - `listPartnerProperties(): Promise<ActionResult<PartnerPropertyListItem[]>>`
  - `setPartnerPropertyEnabled(id: string, enabled: boolean): Promise<ActionResult<null>>`
  - `getPartnerApiSummary(): Promise<ActionResult<PartnerApiSummary>>`

- [ ] **Step 1: Implementar `app/actions/partner-api.ts`**

```ts
'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getLocalizedStr } from '@/lib/data-utils';
import { generateApiKey, hashApiKey, displayPrefix } from '@/lib/partner-api/keys';
import { toNumber } from '@/lib/partner-api/serialize';
import { logActivity } from './audit';

/**
 * Admin actions for /admin/partners. Server actions are callable directly,
 * without going through the page, so EVERY action checks super_admin itself —
 * the segment layout guard is not enough.
 */

export type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

export interface PartnerKeyListItem {
    id: string;
    partnerName: string;
    refSlug: string;
    keyPrefix: string;
    createdAt: string;
    lastUsedAt: string | null;
    revokedAt: string | null;
    requests24h: number;
}

export interface PartnerPropertyListItem {
    id: string;
    name: string;
    city: string;
    maxGuests: number;
    enabled: boolean;
    icalFailed: boolean;
}

export interface PartnerApiSummary {
    apiEnabled: boolean;
    requests24h: number;
    activeKeys: number;
    exposedProperties: number;
    totalProperties: number;
}

const REF_SLUG_RE = /^[a-z0-9-]{2,32}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getSessionClient() {
    const cookieStore = await cookies();
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
                    } catch {
                        // Called from a context where cookies are read-only; session refresh is handled by proxy.ts.
                    }
                },
            },
        },
    );
}

/** The current user's id if they are super_admin, otherwise null. */
async function requireSuperAdmin(): Promise<string | null> {
    const supabase = await getSessionClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    return profile?.role === 'super_admin' ? user.id : null;
}

const FORBIDDEN: { success: false; error: string } = { success: false, error: 'Not authorized' };
const since24h = () => new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

type PropertyAdminRow = {
    id: string; slug: string; title: unknown; city: unknown; max_guests: unknown;
    sync_status: string | null; partner_api_enabled: boolean;
    parent_id: string | null; is_multi_unit: boolean | null;
};

/** Active, public, bookable leaves — the same universe the API can ever expose. */
async function loadBookableProperties(): Promise<PropertyAdminRow[]> {
    const db = await getSupabaseAdmin();
    const { data, error } = await db
        .from('properties')
        .select('id, slug, title, city, max_guests, sync_status, partner_api_enabled, parent_id, is_multi_unit')
        .eq('is_active', true)
        .neq('status', 'hidden');
    if (error) throw new Error(error.message);
    return ((data ?? []) as PropertyAdminRow[]).filter(p => p.parent_id !== null || !p.is_multi_unit);
}

export async function listPartnerKeys(): Promise<ActionResult<PartnerKeyListItem[]>> {
    if (!(await requireSuperAdmin())) return FORBIDDEN;
    try {
        const db = await getSupabaseAdmin();
        const [keysRes, reqRes] = await Promise.all([
            db.from('partner_api_keys')
                .select('id, partner_name, ref_slug, key_prefix, created_at, last_used_at, revoked_at')
                .order('created_at', { ascending: false }),
            db.from('partner_api_requests').select('key_id').gt('created_at', since24h()),
        ]);
        if (keysRes.error) throw new Error(keysRes.error.message);
        if (reqRes.error) throw new Error(reqRes.error.message);

        const counts = new Map<string, number>();
        for (const r of reqRes.data ?? []) counts.set(r.key_id, (counts.get(r.key_id) ?? 0) + 1);

        return {
            success: true,
            data: (keysRes.data ?? []).map(k => ({
                id: k.id,
                partnerName: k.partner_name,
                refSlug: k.ref_slug,
                keyPrefix: k.key_prefix,
                createdAt: k.created_at,
                lastUsedAt: k.last_used_at,
                revokedAt: k.revoked_at,
                requests24h: counts.get(k.id) ?? 0,
            })),
        };
    } catch (err) {
        console.error('SERVER ACTION ERROR [listPartnerKeys]:', err);
        return { success: false, error: 'Failed to load API keys' };
    }
}

export async function createPartnerKey(
    input: { partnerName: string; refSlug: string },
): Promise<ActionResult<{ id: string; key: string; keyPrefix: string }>> {
    const userId = await requireSuperAdmin();
    if (!userId) return FORBIDDEN;

    const partnerName = (input.partnerName ?? '').trim();
    const refSlug = (input.refSlug ?? '').trim().toLowerCase();
    if (partnerName.length < 2 || partnerName.length > 60) {
        return { success: false, error: 'Partner name must be 2–60 characters' };
    }
    if (!REF_SLUG_RE.test(refSlug)) {
        return { success: false, error: 'Ref must be 2–32 characters: lowercase letters, numbers and hyphens' };
    }

    try {
        const key = generateApiKey();
        const keyPrefix = displayPrefix(key);
        const db = await getSupabaseAdmin();
        const { data, error } = await db
            .from('partner_api_keys')
            .insert({ partner_name: partnerName, ref_slug: refSlug, key_prefix: keyPrefix, key_hash: hashApiKey(key), created_by: userId })
            .select('id')
            .single();
        if (error || !data) throw new Error(error?.message ?? 'insert returned no row');

        await logActivity(userId, 'CREATE', 'SETTINGS', data.id, { area: 'partner_api', partner: partnerName, ref: refSlug, key_prefix: keyPrefix });
        // The full key is returned ONCE here and never stored or logged.
        return { success: true, data: { id: data.id, key, keyPrefix } };
    } catch (err) {
        console.error('SERVER ACTION ERROR [createPartnerKey]:', err);
        return { success: false, error: 'Failed to create API key' };
    }
}

export async function revokePartnerKey(id: string): Promise<ActionResult<null>> {
    const userId = await requireSuperAdmin();
    if (!userId) return FORBIDDEN;
    if (!UUID_RE.test(id)) return { success: false, error: 'Invalid key id' };

    try {
        const db = await getSupabaseAdmin();
        const { data, error } = await db
            .from('partner_api_keys')
            .update({ revoked_at: new Date().toISOString() })
            .eq('id', id)
            .is('revoked_at', null)
            .select('partner_name, key_prefix')
            .maybeSingle();
        if (error) throw new Error(error.message);
        if (!data) return { success: false, error: 'Key not found or already revoked' };

        await logActivity(userId, 'STATUS_CHANGE', 'SETTINGS', id, { area: 'partner_api', action: 'revoke', partner: data.partner_name, key_prefix: data.key_prefix }, 'WARNING');
        return { success: true, data: null };
    } catch (err) {
        console.error('SERVER ACTION ERROR [revokePartnerKey]:', err);
        return { success: false, error: 'Failed to revoke API key' };
    }
}

export async function listPartnerProperties(): Promise<ActionResult<PartnerPropertyListItem[]>> {
    if (!(await requireSuperAdmin())) return FORBIDDEN;
    try {
        const rows = await loadBookableProperties();
        const items = rows.map(p => ({
            id: p.id,
            name: getLocalizedStr(p.title, 'en').trim() || p.slug,
            city: getLocalizedStr(p.city, 'en').trim(),
            maxGuests: toNumber(p.max_guests),
            enabled: p.partner_api_enabled === true,
            icalFailed: p.sync_status === 'failed',
        }));
        items.sort((a, b) => a.name.localeCompare(b.name));
        return { success: true, data: items };
    } catch (err) {
        console.error('SERVER ACTION ERROR [listPartnerProperties]:', err);
        return { success: false, error: 'Failed to load properties' };
    }
}

export async function setPartnerPropertyEnabled(id: string, enabled: boolean): Promise<ActionResult<null>> {
    const userId = await requireSuperAdmin();
    if (!userId) return FORBIDDEN;
    if (!UUID_RE.test(id) || typeof enabled !== 'boolean') return { success: false, error: 'Invalid input' };

    try {
        const db = await getSupabaseAdmin();
        const { error } = await db.from('properties').update({ partner_api_enabled: enabled }).eq('id', id);
        if (error) throw new Error(error.message);
        await logActivity(userId, 'UPDATE', 'PROPERTY', id, { area: 'partner_api', partner_api_enabled: enabled });
        return { success: true, data: null };
    } catch (err) {
        console.error('SERVER ACTION ERROR [setPartnerPropertyEnabled]:', err);
        return { success: false, error: 'Failed to update property' };
    }
}

export async function getPartnerApiSummary(): Promise<ActionResult<PartnerApiSummary>> {
    if (!(await requireSuperAdmin())) return FORBIDDEN;
    try {
        const db = await getSupabaseAdmin();
        const [reqRes, keysRes, rows] = await Promise.all([
            db.from('partner_api_requests').select('id', { count: 'exact', head: true }).gt('created_at', since24h()),
            db.from('partner_api_keys').select('id', { count: 'exact', head: true }).is('revoked_at', null),
            loadBookableProperties(),
        ]);
        if (reqRes.error) throw new Error(reqRes.error.message);
        if (keysRes.error) throw new Error(keysRes.error.message);
        return {
            success: true,
            data: {
                apiEnabled: process.env.PARTNER_API_ENABLED === 'true',
                requests24h: reqRes.count ?? 0,
                activeKeys: keysRes.count ?? 0,
                exposedProperties: rows.filter(p => p.partner_api_enabled).length,
                totalProperties: rows.length,
            },
        };
    } catch (err) {
        console.error('SERVER ACTION ERROR [getPartnerApiSummary]:', err);
        return { success: false, error: 'Failed to load summary' };
    }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add app/actions/partner-api.ts
git commit -m "feat(partner-api): server actions do admin com guard super_admin em cada action

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Página do admin + sidebar + i18n

**Files:**
- Create: `app/[locale]/admin/partners/layout.tsx`
- Create: `app/[locale]/admin/partners/page.tsx`
- Modify: `components/admin/AdminSidebar.tsx` (import na linha 4; bloco "System" ~linhas 119–122)
- Modify: `messages/en.json`, `messages/pt.json`, `messages/he.json` (novo namespace `AdminPartners`, a seguir a `AdminAccount`)

**Interfaces:**
- Consumes: todas as actions e tipos da Task 10; `guardRoles` (`lib/admin-guard.ts`).
- Produces: rota `/[locale]/admin/partners`.

- [ ] **Step 1: Criar `app/[locale]/admin/partners/layout.tsx`**

```tsx
import { guardRoles } from "@/lib/admin-guard";

export default async function PartnersGuardLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    await guardRoles(["super_admin"], locale);
    return <>{children}</>;
}
```

- [ ] **Step 2: Acrescentar o namespace `AdminPartners` a `messages/en.json`**

Inserir como chave de topo a seguir ao objeto `"AdminAccount"` (atenção à vírgula do objeto anterior):

```json
    "AdminPartners": {
        "title": "Partners API",
        "description": "Read-only partner access to availability and prices",
        "loading": "Loading…",
        "apiOn": "API on",
        "apiOff": "API off",
        "summary": {
            "requests24h": "Requests (24h)",
            "activeKeys": "Active keys",
            "exposed": "Exposed properties",
            "of": "of {total}"
        },
        "keys": {
            "title": "API keys",
            "new": "New key",
            "partner": "Partner",
            "key": "Key",
            "lastUsed": "Last used",
            "requests24h": "24h",
            "never": "Never",
            "revoke": "Revoke",
            "revoked": "Revoked",
            "revokeConfirm": "Revoke the key for {partner}? Requests with it will stop working immediately.",
            "revokedToast": "Key revoked",
            "empty": "No keys yet. Create one to give a partner access."
        },
        "create": {
            "title": "New API key",
            "partnerName": "Partner name",
            "partnerNamePlaceholder": "Kitsiva",
            "refSlug": "Booking ref",
            "refSlugHint": "Added to booking links as ref=… (lowercase, numbers, hyphens)",
            "refSlugPlaceholder": "kitsiva",
            "cancel": "Cancel",
            "submit": "Create key",
            "createdTitle": "Key created for {partner}",
            "createdHint": "Copy it now. This key won't be shown again.",
            "copy": "Copy",
            "copied": "Copied",
            "secureWarning": "Send it through a secure channel. The partner keeps it in their server's secrets.",
            "done": "I've copied it"
        },
        "properties": {
            "title": "Properties exposed to partners",
            "search": "Search property or city",
            "hint": "Off by default. Only turn on properties with a confirmed iCal calendar.",
            "guests": "{count} guests",
            "icalError": "iCal error",
            "enabledToast": "{name} is now visible to partners",
            "disabledToast": "{name} is hidden from partners",
            "empty": "No properties match your search."
        },
        "genericError": "Something went wrong. Try again."
    },
```

- [ ] **Step 3: Acrescentar o mesmo namespace a `messages/pt.json`** (mesmas chaves, na mesma posição)

```json
    "AdminPartners": {
        "title": "API de parceiros",
        "description": "Acesso read-only de parceiros à disponibilidade e preços",
        "loading": "A carregar…",
        "apiOn": "API ativa",
        "apiOff": "API desligada",
        "summary": {
            "requests24h": "Pedidos (24h)",
            "activeKeys": "Chaves ativas",
            "exposed": "Casas expostas",
            "of": "de {total}"
        },
        "keys": {
            "title": "Chaves de API",
            "new": "Nova chave",
            "partner": "Parceiro",
            "key": "Chave",
            "lastUsed": "Último uso",
            "requests24h": "24h",
            "never": "Nunca",
            "revoke": "Revogar",
            "revoked": "Revogada",
            "revokeConfirm": "Revogar a chave de {partner}? Os pedidos com ela deixam de funcionar de imediato.",
            "revokedToast": "Chave revogada",
            "empty": "Ainda não há chaves. Cria uma para dar acesso a um parceiro."
        },
        "create": {
            "title": "Nova chave de API",
            "partnerName": "Nome do parceiro",
            "partnerNamePlaceholder": "Kitsiva",
            "refSlug": "Ref de reserva",
            "refSlugHint": "Acrescentado aos links de reserva como ref=… (minúsculas, números, hífens)",
            "refSlugPlaceholder": "kitsiva",
            "cancel": "Cancelar",
            "submit": "Criar chave",
            "createdTitle": "Chave criada para {partner}",
            "createdHint": "Copia agora. Esta chave não volta a ser mostrada.",
            "copy": "Copiar",
            "copied": "Copiada",
            "secureWarning": "Envia por canal seguro. O parceiro guarda-a nos secrets do servidor.",
            "done": "Já copiei"
        },
        "properties": {
            "title": "Casas expostas a parceiros",
            "search": "Procurar casa ou cidade",
            "hint": "Desligadas por defeito. Liga só casas com calendário iCal confirmado.",
            "guests": "{count} hóspedes",
            "icalError": "iCal com erro",
            "enabledToast": "{name} está visível para parceiros",
            "disabledToast": "{name} foi escondida dos parceiros",
            "empty": "Nenhuma casa corresponde à pesquisa."
        },
        "genericError": "Algo correu mal. Tenta de novo."
    },
```

- [ ] **Step 4: Acrescentar o mesmo namespace a `messages/he.json`** (mesmas chaves, na mesma posição)

```json
    "AdminPartners": {
        "title": "API לשותפים",
        "description": "גישת קריאה בלבד לשותפים לזמינות ומחירים",
        "loading": "טוען…",
        "apiOn": "ה-API פעיל",
        "apiOff": "ה-API כבוי",
        "summary": {
            "requests24h": "בקשות (24 שעות)",
            "activeKeys": "מפתחות פעילים",
            "exposed": "נכסים חשופים",
            "of": "מתוך {total}"
        },
        "keys": {
            "title": "מפתחות API",
            "new": "מפתח חדש",
            "partner": "שותף",
            "key": "מפתח",
            "lastUsed": "שימוש אחרון",
            "requests24h": "24 ש׳",
            "never": "אף פעם",
            "revoke": "בטל",
            "revoked": "בוטל",
            "revokeConfirm": "לבטל את המפתח של {partner}? בקשות איתו יפסיקו לעבוד מיד.",
            "revokedToast": "המפתח בוטל",
            "empty": "אין עדיין מפתחות. צור מפתח כדי לתת גישה לשותף."
        },
        "create": {
            "title": "מפתח API חדש",
            "partnerName": "שם השותף",
            "partnerNamePlaceholder": "Kitsiva",
            "refSlug": "מזהה הזמנה (ref)",
            "refSlugHint": "נוסף לקישורי ההזמנה כ-ref=… (אותיות קטנות, מספרים, מקפים)",
            "refSlugPlaceholder": "kitsiva",
            "cancel": "ביטול",
            "submit": "צור מפתח",
            "createdTitle": "נוצר מפתח עבור {partner}",
            "createdHint": "העתק עכשיו. המפתח לא יוצג שוב.",
            "copy": "העתק",
            "copied": "הועתק",
            "secureWarning": "שלח בערוץ מאובטח. השותף שומר אותו בסודות של השרת.",
            "done": "העתקתי"
        },
        "properties": {
            "title": "נכסים חשופים לשותפים",
            "search": "חפש נכס או עיר",
            "hint": "כבוי כברירת מחדל. הפעל רק נכסים עם לוח iCal מאומת.",
            "guests": "{count} אורחים",
            "icalError": "שגיאת iCal",
            "enabledToast": "{name} גלוי כעת לשותפים",
            "disabledToast": "{name} מוסתר מהשותפים",
            "empty": "אין נכסים שתואמים לחיפוש."
        },
        "genericError": "משהו השתבש. נסה שוב."
    },
```

- [ ] **Step 5: Verificar a paridade de chaves e a validade do JSON**

Run:
```bash
node -e "const f=l=>require('./messages/'+l+'.json').AdminPartners;const k=(o,p='')=>Object.entries(o).flatMap(([a,v])=>typeof v==='object'?k(v,p+a+'.'):[p+a]);const [e,p,h]=['en','pt','he'].map(l=>k(f(l)).sort().join());console.log(e===p&&e===h?'PARITY OK':'MISMATCH')"
```
Expected: `PARITY OK`.

- [ ] **Step 6: Criar `app/[locale]/admin/partners/page.tsx`**

```tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { toast } from "sonner";
import { Loader2, KeyRound, Plus, Home, Copy, Check, AlertTriangle, CircleCheck, CircleOff, Search } from "lucide-react";
import {
    listPartnerKeys, createPartnerKey, revokePartnerKey, listPartnerProperties,
    setPartnerPropertyEnabled, getPartnerApiSummary,
    type PartnerKeyListItem, type PartnerPropertyListItem, type PartnerApiSummary,
} from "@/app/actions/partner-api";

const card = "bg-white dark:bg-admin-dark-surface rounded-2xl border border-[#f5f5f5] dark:border-admin-dark-border shadow-sm p-6";
const inputClass = "w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f5f5f5] dark:border-admin-dark-border px-4 py-3 rounded-xl text-sm focus:ring-1 focus:ring-[#171717] dark:focus:ring-white outline-none transition-all dark:text-admin-dark-text-primary";
const primaryBtn = "px-5 py-2.5 bg-[#171717] dark:bg-white text-white dark:text-black rounded-xl text-sm font-bold hover:bg-black dark:hover:bg-gray-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2";
const secondaryBtn = "px-5 py-2.5 border border-[#e5e5e5] dark:border-admin-dark-border rounded-xl text-sm font-bold text-[#171717] dark:text-admin-dark-text-primary hover:bg-[#fafafa] dark:hover:bg-admin-dark-bg transition-all";

export default function AdminPartnersPage() {
    const t = useTranslations("AdminPartners");
    const format = useFormatter();

    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState<PartnerApiSummary | null>(null);
    const [keys, setKeys] = useState<PartnerKeyListItem[]>([]);
    const [properties, setProperties] = useState<PartnerPropertyListItem[]>([]);
    const [search, setSearch] = useState("");
    const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

    const [createOpen, setCreateOpen] = useState(false);
    const [form, setForm] = useState({ partnerName: "", refSlug: "" });
    const [creating, setCreating] = useState(false);
    const [created, setCreated] = useState<{ partner: string; key: string } | null>(null);
    const [copied, setCopied] = useState(false);

    const load = useCallback(async () => {
        const [s, k, p] = await Promise.all([getPartnerApiSummary(), listPartnerKeys(), listPartnerProperties()]);
        if (s.success) setSummary(s.data);
        if (k.success) setKeys(k.data);
        if (p.success) setProperties(p.data);
        if (!s.success || !k.success || !p.success) toast.error(t("genericError"));
        setLoading(false);
    }, [t]);

    useEffect(() => { load(); }, [load]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return properties;
        return properties.filter(p => p.name.toLowerCase().includes(q) || p.city.toLowerCase().includes(q));
    }, [properties, search]);

    const handleToggle = async (p: PartnerPropertyListItem) => {
        const next = !p.enabled;
        setPendingIds(prev => new Set(prev).add(p.id));
        setProperties(prev => prev.map(x => (x.id === p.id ? { ...x, enabled: next } : x)));
        const res = await setPartnerPropertyEnabled(p.id, next);
        setPendingIds(prev => { const s = new Set(prev); s.delete(p.id); return s; });
        if (!res.success) {
            setProperties(prev => prev.map(x => (x.id === p.id ? { ...x, enabled: p.enabled } : x)));
            toast.error(res.error || t("genericError"));
            return;
        }
        toast.success(next ? t("properties.enabledToast", { name: p.name }) : t("properties.disabledToast", { name: p.name }));
        setSummary(prev => prev ? { ...prev, exposedProperties: prev.exposedProperties + (next ? 1 : -1) } : prev);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (creating) return;
        setCreating(true);
        const res = await createPartnerKey(form);
        setCreating(false);
        if (!res.success) {
            toast.error(res.error || t("genericError"));
            return;
        }
        setCreated({ partner: form.partnerName.trim(), key: res.data.key });
        setForm({ partnerName: "", refSlug: "" });
        load();
    };

    const handleCopy = async () => {
        if (!created) return;
        await navigator.clipboard.writeText(created.key);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const closeCreate = () => {
        setCreateOpen(false);
        setCreated(null);
        setCopied(false);
    };

    const handleRevoke = async (k: PartnerKeyListItem) => {
        if (!window.confirm(t("keys.revokeConfirm", { partner: k.partnerName }))) return;
        const res = await revokePartnerKey(k.id);
        if (!res.success) {
            toast.error(res.error || t("genericError"));
            return;
        }
        toast.success(t("keys.revokedToast"));
        load();
    };

    if (loading) {
        return (
            <div className="flex items-center gap-3 text-[#a3a3a3] text-sm">
                <Loader2 className="size-4 animate-spin" />{t("loading")}
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-20 max-w-5xl">
            {/* Header */}
            <div className="flex justify-between items-end gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-[#171717] dark:text-admin-dark-text-primary">{t("title")}</h2>
                    <p className="text-[#a3a3a3] mt-2 font-medium">{t("description")}</p>
                </div>
                {summary?.apiEnabled ? (
                    <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                        <CircleCheck className="size-3.5" />{t("apiOn")}
                    </span>
                ) : (
                    <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-[#f5f5f5] text-[#737373] dark:bg-admin-dark-bg dark:text-admin-dark-text-secondary">
                        <CircleOff className="size-3.5" />{t("apiOff")}
                    </span>
                )}
            </div>

            {/* Summary */}
            {summary && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        { label: t("summary.requests24h"), value: String(summary.requests24h), extra: null },
                        { label: t("summary.activeKeys"), value: String(summary.activeKeys), extra: null },
                        { label: t("summary.exposed"), value: String(summary.exposedProperties), extra: t("summary.of", { total: summary.totalProperties }) },
                    ].map(m => (
                        <div key={m.label} className="bg-[#fafafa] dark:bg-admin-dark-bg rounded-2xl p-5">
                            <p className="text-xs font-bold text-[#a3a3a3] uppercase tracking-widest">{m.label}</p>
                            <p className="text-2xl font-bold text-[#171717] dark:text-admin-dark-text-primary mt-1">
                                {m.value} {m.extra && <span className="text-sm font-medium text-[#a3a3a3]">{m.extra}</span>}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {/* API keys */}
            <section className={card}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-[#171717] dark:text-admin-dark-text-primary flex items-center gap-2">
                        <KeyRound className="size-5" />{t("keys.title")}
                    </h3>
                    <button onClick={() => setCreateOpen(true)} className={primaryBtn}>
                        <Plus className="size-4" />{t("keys.new")}
                    </button>
                </div>
                {keys.length === 0 ? (
                    <p className="text-sm text-[#a3a3a3]">{t("keys.empty")}</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs font-bold text-[#a3a3a3] uppercase tracking-widest">
                                    <th className="py-2 pr-4">{t("keys.partner")}</th>
                                    <th className="py-2 pr-4">{t("keys.key")}</th>
                                    <th className="py-2 pr-4">{t("keys.lastUsed")}</th>
                                    <th className="py-2 pr-4">{t("keys.requests24h")}</th>
                                    <th className="py-2" />
                                </tr>
                            </thead>
                            <tbody>
                                {keys.map(k => (
                                    <tr key={k.id} className={`border-t border-[#f5f5f5] dark:border-admin-dark-border ${k.revokedAt ? "opacity-50" : ""}`}>
                                        <td className="py-3 pr-4">
                                            <p className="font-bold text-[#171717] dark:text-admin-dark-text-primary">{k.partnerName}</p>
                                            <p className="text-xs text-[#a3a3a3]">ref={k.refSlug}</p>
                                        </td>
                                        <td className="py-3 pr-4 font-mono text-xs dark:text-admin-dark-text-primary">{k.keyPrefix}••••</td>
                                        <td className="py-3 pr-4 text-[#737373] dark:text-admin-dark-text-secondary">
                                            {k.lastUsedAt ? format.relativeTime(new Date(k.lastUsedAt)) : t("keys.never")}
                                        </td>
                                        <td className="py-3 pr-4 dark:text-admin-dark-text-primary">{k.requests24h}</td>
                                        <td className="py-3 text-right">
                                            {k.revokedAt ? (
                                                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400">{t("keys.revoked")}</span>
                                            ) : (
                                                <button onClick={() => handleRevoke(k)} className="text-xs font-bold text-red-600 hover:text-red-700 dark:text-red-400">
                                                    {t("keys.revoke")}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* Properties */}
            <section className={card}>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-[#171717] dark:text-admin-dark-text-primary flex items-center gap-2">
                        <Home className="size-5" />{t("properties.title")}
                    </h3>
                    <div className="relative sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#a3a3a3]" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("properties.search")} className={`${inputClass} pl-10 py-2.5`} />
                    </div>
                </div>
                <p className="text-xs text-[#a3a3a3] mb-3">{t("properties.hint")}</p>
                {filtered.length === 0 ? (
                    <p className="text-sm text-[#a3a3a3] py-4">{t("properties.empty")}</p>
                ) : (
                    <ul>
                        {filtered.map(p => (
                            <li key={p.id} className="flex items-center gap-3 py-3 border-t border-[#f5f5f5] dark:border-admin-dark-border">
                                <div className="flex-1 min-w-0 text-sm">
                                    <span className="font-bold text-[#171717] dark:text-admin-dark-text-primary">{p.name}</span>
                                    <span className="text-[#a3a3a3]"> · {p.city} · {t("properties.guests", { count: p.maxGuests })}</span>
                                    {p.icalFailed && (
                                        <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                                            <AlertTriangle className="size-3" />{t("properties.icalError")}
                                        </span>
                                    )}
                                </div>
                                <button
                                    role="switch"
                                    aria-checked={p.enabled}
                                    aria-label={p.name}
                                    disabled={pendingIds.has(p.id)}
                                    onClick={() => handleToggle(p)}
                                    className={`relative w-10 h-6 rounded-full transition-colors shrink-0 disabled:opacity-50 ${p.enabled ? "bg-emerald-500" : "bg-[#e5e5e5] dark:bg-admin-dark-border"}`}
                                >
                                    <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${p.enabled ? "left-[18px]" : "left-0.5"}`} />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {/* Create key dialog */}
            {createOpen && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={created ? undefined : closeCreate}>
                    <div className="bg-white dark:bg-admin-dark-surface rounded-2xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
                        {created ? (
                            <>
                                <div>
                                    <h3 className="text-lg font-bold text-[#171717] dark:text-admin-dark-text-primary">{t("create.createdTitle", { partner: created.partner })}</h3>
                                    <p className="text-sm text-[#a3a3a3] mt-1">{t("create.createdHint")}</p>
                                </div>
                                <div className="flex items-center gap-2 bg-[#fafafa] dark:bg-admin-dark-bg rounded-xl p-3">
                                    <code className="flex-1 text-xs break-all dark:text-admin-dark-text-primary">{created.key}</code>
                                    <button onClick={handleCopy} aria-label={t("create.copy")} className="p-2 rounded-lg hover:bg-[#f0f0f0] dark:hover:bg-admin-dark-surface">
                                        {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4 dark:text-admin-dark-text-primary" />}
                                    </button>
                                </div>
                                <div className="p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-xl text-[11px] text-amber-700 dark:text-amber-400 font-medium flex gap-2">
                                    <AlertTriangle className="size-4 shrink-0" />{t("create.secureWarning")}
                                </div>
                                <div className="flex justify-end">
                                    <button onClick={closeCreate} className={primaryBtn}>{t("create.done")}</button>
                                </div>
                            </>
                        ) : (
                            <form onSubmit={handleCreate} className="space-y-4">
                                <h3 className="text-lg font-bold text-[#171717] dark:text-admin-dark-text-primary">{t("create.title")}</h3>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-[#a3a3a3] uppercase tracking-widest">{t("create.partnerName")}</label>
                                    <input required minLength={2} maxLength={60} value={form.partnerName} onChange={e => setForm({ ...form, partnerName: e.target.value })} placeholder={t("create.partnerNamePlaceholder")} className={inputClass} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-[#a3a3a3] uppercase tracking-widest">{t("create.refSlug")}</label>
                                    <input required pattern="[a-z0-9-]{2,32}" value={form.refSlug} onChange={e => setForm({ ...form, refSlug: e.target.value.toLowerCase() })} placeholder={t("create.refSlugPlaceholder")} className={inputClass} />
                                    <p className="text-[11px] text-[#a3a3a3]">{t("create.refSlugHint")}</p>
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <button type="button" onClick={closeCreate} className={secondaryBtn}>{t("create.cancel")}</button>
                                    <button type="submit" disabled={creating} className={primaryBtn}>
                                        {creating && <Loader2 className="size-4 animate-spin" />}{t("create.submit")}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 7: Adicionar a entrada ao sidebar**

Em `components/admin/AdminSidebar.tsx`, linha 4, acrescentar `Plug` à lista de imports do `lucide-react`:

```tsx
import { LayoutGrid, LayoutDashboard, Hotel, Calendar, Users, Wallet, BarChart3, LogOut, ConciergeBell, Settings, Activity, KeyRound, Ticket, FileUp, X, Sparkles, UserCircle, Plug, type LucideIcon } from "lucide-react";
```

E substituir o bloco "Settings only for Super Admin":

```tsx
                    // Settings only for Super Admin
                    ...(role === 'super_admin' ? [
                        { icon: Settings, label: "Settings", path: "/admin/settings" }
                    ] : [])
```

por:

```tsx
                    // Settings and Partners API only for Super Admin (mirrors the guards in their layout.tsx)
                    ...(role === 'super_admin' ? [
                        { icon: Plug, label: "Partners API", path: "/admin/partners" },
                        { icon: Settings, label: "Settings", path: "/admin/settings" }
                    ] : [])
```

- [ ] **Step 8: Type-check e lint**

Run: `npx tsc --noEmit && npx eslint "app/[locale]/admin/partners" app/actions/partner-api.ts components/admin/AdminSidebar.tsx`
Expected: sem erros.

- [ ] **Step 9: Verificar no browser**

Com o preview a correr, autenticado como super_admin, abrir `http://localhost:3001/pt/admin/partners` e confirmar:
1. "Partners API" aparece no sidebar (bloco System).
2. O resumo mostra 0 pedidos, 0 chaves e `0 de N` casas.
3. As casas aparecem, com o badge "iCal com erro" nas que têm `sync_status = 'failed'`.
4. Ligar uma casa → toast, e o contador "Casas expostas" sobe. Voltar a desligá-la.
5. Criar uma chave `Teste interno` / `test` → a chave aparece uma vez; "Já copiei" fecha; a linha mostra `lm_live_xxxx••••`.
6. Revogar essa chave → confirmação → badge "Revogada".
7. `read_console_messages` sem erros.
8. Tirar um screenshot para mostrar ao Marcelo.

- [ ] **Step 10: Commit**

```bash
git add "app/[locale]/admin/partners" components/admin/AdminSidebar.tsx messages/en.json messages/pt.json messages/he.json
git commit -m "feat(partner-api): página /admin/partners — chaves, allow-list de casas e resumo

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Documentação para o parceiro

**Files:**
- Create: `docs/partner-api/README.md`
- Create: `docs/partner-api/openapi.yaml`

**Interfaces:**
- Consumes: o contrato implementado nas Tasks 2–9.

- [ ] **Step 1: Criar `docs/partner-api/README.md`**

````markdown
# Lovely Memories — Partner Availability API

Read-only API that returns Lovely Memories properties available for given dates, with the real direct-booking price and a direct booking link.

Machine-readable spec: [`openapi.yaml`](./openapi.yaml) (OpenAPI 3.1).

## Authentication

Every request needs a Bearer token issued by Lovely Memories:

```
Authorization: Bearer lm_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

- **Server-to-server only.** Keep the token in your server's secret store (e.g. Replit Secrets) and call the API from your backend. Never ship it to a browser or mobile app.
- The API sends no CORS headers, so browsers can't call it directly.
- Limit: 60 requests per minute per key.

## Request

`POST https://www.lovelymemories.pt/api/v1/availability`

```bash
curl -X POST https://www.lovelymemories.pt/api/v1/availability \
  -H "Authorization: Bearer $LOVELY_MEMORIES_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"check_in":"2026-10-10","check_out":"2026-10-14","guests":4,"destination":"Porto"}'
```

| Field | Type | Rules |
|---|---|---|
| `check_in` | string | `YYYY-MM-DD`, from tomorrow (Lisbon time), at most 18 months ahead |
| `check_out` | string | `YYYY-MM-DD`, after `check_in`, stay of at most 30 nights |
| `guests` | integer | 1–16 |
| `destination` | string | One of the destinations below (case and accents ignored) |

### Destinations

| Destination | Also accepted | Includes |
|---|---|---|
| Porto | Oporto | Porto and Gaia |
| Gaia | Vila Nova de Gaia, VN Gaia | Gaia |
| Algarve | — | Algarve |
| Mykonos | Mikonos | Mykonos |

## Response

`200 SUCCESS` — only properties that are actually available, cheapest first. An empty list means nothing is available for those dates.

```json
{
  "status": "SUCCESS",
  "search": { "check_in": "2026-10-10", "check_out": "2026-10-14", "guests": 4, "destination": "Porto" },
  "currency": "EUR",
  "properties": [
    {
      "id": "3f1c2a9e-5b7d-4e1a-9c3f-2d8b6a4e1f00",
      "name": "Bonfim Apartment",
      "description": "Modern two-bedroom apartment…",
      "city": "Porto",
      "area_m2": 75,
      "max_guests": 4,
      "bedrooms": 2,
      "bathrooms": 1,
      "total_price": 717.00,
      "nightly_price_average": 150.00,
      "currency": "EUR",
      "main_image": "https://…/1.jpg",
      "images": ["https://…/1.jpg", "https://…/2.jpg"],
      "amenities": ["Wi-Fi", "Kitchen", "Washer"],
      "booking_url": "https://www.lovelymemories.pt/en/properties/bonfim-apartment?from=2026-10-10&to=2026-10-14&adults=4&ref=kitsiva"
    }
  ]
}
```

### Field notes

- `id` — stable UUID; use it to recognise the same property across searches.
- `total_price` — the full direct-booking price for the stay: nights (with seasonal prices and weekly/monthly discounts) + cleaning fee + tourist tax. All guests are counted as adults. Optional extras (breakfast, transfer) and coupons are not included.
- `nightly_price_average` — accommodation only (after discount) ÷ nights. Excludes cleaning fee and tax.
- `area_m2` — property size in m², or `null`.
- `main_image` — first image, or `null` if the property has none.
- `booking_url` — opens the property page with dates and guests pre-filled. The final price and availability are confirmed again at checkout.

## Errors

| HTTP | `status` | `error.code` | When |
|---|---|---|---|
| 400 | `INVALID_REQUEST` | `INVALID_BODY` | Body isn't a JSON object, or a field is missing or has the wrong type |
| 400 | `INVALID_REQUEST` | `INVALID_DATES` | Bad date format, impossible date, or `check_out` not after `check_in` |
| 400 | `INVALID_REQUEST` | `CHECK_IN_TOO_SOON` | `check_in` is today or in the past |
| 400 | `INVALID_REQUEST` | `DATES_TOO_FAR` | `check_in` more than 18 months ahead |
| 400 | `INVALID_REQUEST` | `STAY_TOO_LONG` | More than 30 nights |
| 400 | `INVALID_REQUEST` | `INVALID_GUESTS` | `guests` not an integer between 1 and 16 |
| 400 | `INVALID_REQUEST` | `UNKNOWN_DESTINATION` | We don't operate there (tell the user "no properties there", not "fully booked") |
| 401 | `UNAUTHORIZED` | `UNAUTHORIZED` | Missing, invalid or revoked token |
| 405 | `METHOD_NOT_ALLOWED` | `METHOD_NOT_ALLOWED` | Use POST |
| 429 | `RATE_LIMITED` | `RATE_LIMITED` | Over 60 requests/minute — wait for `Retry-After` seconds |
| 503 | `ERROR` | `AVAILABILITY_UNAVAILABLE` | Temporary problem — retry later |
| 503 | `ERROR` | `SERVICE_DISABLED` | API temporarily disabled |

Error body:

```json
{ "status": "INVALID_REQUEST", "error": { "code": "INVALID_DATES", "message": "check_out must be after check_in" } }
```

Retry only on `429` and `503`. `400` and `401` won't succeed on retry.
````

- [ ] **Step 2: Criar `docs/partner-api/openapi.yaml`**

```yaml
openapi: 3.1.0
info:
  title: Lovely Memories Partner Availability API
  version: 1.0.0
  description: |
    Read-only, server-to-server API returning Lovely Memories properties available
    for given dates, with the real direct-booking price and a direct booking URL.
    Keep the Bearer token on your server; never expose it to browsers or apps.
servers:
  - url: https://www.lovelymemories.pt
security:
  - bearerAuth: []
paths:
  /api/v1/availability:
    post:
      operationId: searchAvailability
      summary: Available properties for dates, guests and destination
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/AvailabilityRequest' }
            example: { check_in: '2026-10-10', check_out: '2026-10-14', guests: 4, destination: Porto }
      responses:
        '200':
          description: Search succeeded. `properties` is empty when nothing is available.
          content:
            application/json:
              schema: { $ref: '#/components/schemas/SuccessResponse' }
        '400':
          description: Invalid request
          content:
            application/json:
              schema: { $ref: '#/components/schemas/ErrorResponse' }
              example: { status: INVALID_REQUEST, error: { code: INVALID_DATES, message: check_out must be after check_in } }
        '401':
          description: Missing, invalid or revoked token
          content:
            application/json:
              schema: { $ref: '#/components/schemas/ErrorResponse' }
        '405':
          description: Method not allowed (use POST)
          headers:
            Allow: { schema: { type: string, const: POST } }
          content:
            application/json:
              schema: { $ref: '#/components/schemas/ErrorResponse' }
        '429':
          description: Rate limit exceeded (60 requests/minute per key)
          headers:
            Retry-After: { schema: { type: integer }, description: Seconds to wait }
          content:
            application/json:
              schema: { $ref: '#/components/schemas/ErrorResponse' }
        '503':
          description: Temporary error or API disabled — retry later
          content:
            application/json:
              schema: { $ref: '#/components/schemas/ErrorResponse' }
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      description: 'Token format: lm_live_ followed by 32 alphanumeric characters'
  schemas:
    AvailabilityRequest:
      type: object
      required: [check_in, check_out, guests, destination]
      properties:
        check_in:
          type: string
          format: date
          description: YYYY-MM-DD. From tomorrow (Europe/Lisbon), at most 18 months ahead.
        check_out:
          type: string
          format: date
          description: YYYY-MM-DD. After check_in; stay of at most 30 nights.
        guests:
          type: integer
          minimum: 1
          maximum: 16
        destination:
          type: string
          description: 'Porto (also Oporto; includes Gaia), Gaia (also Vila Nova de Gaia, VN Gaia), Algarve, Mykonos (also Mikonos). Case and accents ignored.'
    SuccessResponse:
      type: object
      required: [status, search, currency, properties]
      properties:
        status: { type: string, const: SUCCESS }
        search:
          type: object
          required: [check_in, check_out, guests, destination]
          properties:
            check_in: { type: string, format: date }
            check_out: { type: string, format: date }
            guests: { type: integer }
            destination: { type: string, description: Canonical destination name }
        currency: { type: string, const: EUR }
        properties:
          type: array
          description: Only actually available properties, cheapest first.
          items: { $ref: '#/components/schemas/Property' }
    Property:
      type: object
      required: [id, name, description, city, area_m2, max_guests, bedrooms, bathrooms, total_price, nightly_price_average, currency, main_image, images, amenities, booking_url]
      properties:
        id: { type: string, format: uuid, description: Stable property id }
        name: { type: string }
        description: { type: string, description: Plain text, up to ~300 characters }
        city: { type: string }
        area_m2: { type: [number, 'null'], description: Size in square metres }
        max_guests: { type: integer }
        bedrooms: { type: number }
        bathrooms: { type: number }
        total_price:
          type: number
          description: Full direct-booking price for the stay (nights with seasonal prices and discounts + cleaning fee + tourist tax; all guests as adults). Excludes optional extras and coupons.
        nightly_price_average:
          type: number
          description: Accommodation after discount divided by nights. Excludes cleaning fee and tax.
        currency: { type: string, const: EUR }
        main_image: { type: [string, 'null'], format: uri }
        images: { type: array, maxItems: 10, items: { type: string, format: uri } }
        amenities: { type: array, maxItems: 30, items: { type: string } }
        booking_url:
          type: string
          format: uri
          description: Property page with dates and guests pre-filled. Price and availability are re-checked at checkout.
    ErrorResponse:
      type: object
      required: [status, error]
      properties:
        status:
          type: string
          enum: [INVALID_REQUEST, UNAUTHORIZED, RATE_LIMITED, METHOD_NOT_ALLOWED, ERROR]
        error:
          type: object
          required: [code, message]
          properties:
            code:
              type: string
              enum: [INVALID_BODY, INVALID_DATES, CHECK_IN_TOO_SOON, DATES_TOO_FAR, STAY_TOO_LONG, INVALID_GUESTS, UNKNOWN_DESTINATION, UNAUTHORIZED, RATE_LIMITED, METHOD_NOT_ALLOWED, AVAILABILITY_UNAVAILABLE, SERVICE_DISABLED]
            message: { type: string }
```

- [ ] **Step 3: Validar o YAML**

Run: `npx -y @redocly/cli@latest lint docs/partner-api/openapi.yaml`
Expected: `Woohoo! Your API description is valid.` Os avisos de estilo (ex.: falta `license`) são aceitáveis; erros não.

- [ ] **Step 4: Commit**

```bash
git add docs/partner-api/README.md docs/partner-api/openapi.yaml
git commit -m "docs(partner-api): README e OpenAPI 3.1 para o parceiro

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Smoke test + anti-fuga

**Files:**
- Create: `scripts/test-partner-api.ts`

**Interfaces:**
- Consumes: `generateApiKey`, `hashApiKey`, `displayPrefix` (Task 7); endpoint (Task 9); tabelas (Task 1).
- Pré-condições: dev server a correr em `http://localhost:3001` com `PARTNER_API_ENABLED=true` no `.env.local`, e pelo menos uma casa ligada no admin (Task 11) para o caso de sucesso com resultados.

- [ ] **Step 1: Criar `scripts/test-partner-api.ts`**

```ts
/**
 * Partner API smoke + leak test against a running server.
 *
 *   PARTNER_API_BASE=http://localhost:3001 npx tsx scripts/test-partner-api.ts
 *
 * Creates a temporary key directly in the DB (service role), runs the checks,
 * and deletes the key (and its request logs, via cascade) at the end.
 * Requires PARTNER_API_ENABLED=true on the target server.
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { generateApiKey, hashApiKey, displayPrefix } from '../lib/partner-api/keys';

const BASE = process.env.PARTNER_API_BASE || 'http://localhost:3001';
const URL_ = `${BASE}/api/v1/availability`;
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const ALLOWED_KEYS: Record<string, string[]> = {
    root: ['status', 'search', 'currency', 'properties', 'error'],
    search: ['check_in', 'check_out', 'guests', 'destination'],
    error: ['code', 'message'],
    property: ['id', 'name', 'description', 'city', 'area_m2', 'max_guests', 'bedrooms', 'bathrooms', 'total_price',
        'nightly_price_average', 'currency', 'main_image', 'images', 'amenities', 'booking_url'],
};
const FORBIDDEN_VALUE = /@|ical|\.ics|hospitable/i;

let failures = 0;
function check(name: string, cond: boolean, detail = '') {
    console.log(`${cond ? '✅' : '❌'} ${name}${cond ? '' : ' — ' + detail}`);
    if (!cond) failures++;
}

function isoInDays(days: number) {
    return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

async function call(body: unknown, token?: string, method = 'POST') {
    const res = await fetch(URL_, {
        method,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: method === 'POST' ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    });
    const json = await res.json().catch(() => null);
    return { res, json };
}

function scanForLeaks(value: unknown, ctx: keyof typeof ALLOWED_KEYS, path: string, problems: string[]) {
    if (Array.isArray(value)) {
        value.forEach((v, i) => scanForLeaks(v, ctx, `${path}[${i}]`, problems));
        return;
    }
    if (typeof value === 'string') {
        if (FORBIDDEN_VALUE.test(value)) problems.push(`${path} has a forbidden value: ${value.slice(0, 60)}`);
        return;
    }
    if (typeof value !== 'object' || value === null) return;
    for (const [k, v] of Object.entries(value)) {
        if (!ALLOWED_KEYS[ctx].includes(k)) problems.push(`${path}.${k} is not in the contract`);
        const next = k === 'search' ? 'search' : k === 'error' ? 'error' : k === 'properties' ? 'property' : ctx;
        if (Array.isArray(v) && (k === 'images' || k === 'amenities')) {
            v.forEach((s, i) => typeof s === 'string' && FORBIDDEN_VALUE.test(s) && problems.push(`${path}.${k}[${i}] forbidden value`));
        } else {
            scanForLeaks(v, next, `${path}.${k}`, problems);
        }
    }
}

async function main() {
    const key = generateApiKey();
    const { data: keyRow, error } = await admin.from('partner_api_keys')
        .insert({ partner_name: 'Smoke test', ref_slug: 'smoke-test', key_prefix: displayPrefix(key), key_hash: hashApiKey(key) })
        .select('id').single();
    if (error || !keyRow) throw new Error(`could not create temp key: ${error?.message}`);

    const valid = { check_in: isoInDays(30), check_out: isoInDays(33), guests: 2, destination: 'Porto' };

    try {
        // Auth
        check('401 without token', (await call(valid)).res.status === 401);
        check('401 with malformed token', (await call(valid, 'lm_live_short')).res.status === 401);
        check('401 with unknown token', (await call(valid, generateApiKey())).res.status === 401);
        const get = await call(null, key, 'GET');
        check('405 on GET with Allow: POST', get.res.status === 405 && get.res.headers.get('allow') === 'POST');

        // Validation
        const cases: [string, unknown, string][] = [
            ['INVALID_BODY (not JSON)', '{nope', 'INVALID_BODY'],
            ['INVALID_BODY (missing field)', { ...valid, guests: undefined }, 'INVALID_BODY'],
            ['INVALID_DATES', { ...valid, check_out: valid.check_in }, 'INVALID_DATES'],
            ['CHECK_IN_TOO_SOON', { ...valid, check_in: isoInDays(-1), check_out: isoInDays(2) }, 'CHECK_IN_TOO_SOON'],
            ['DATES_TOO_FAR', { ...valid, check_in: isoInDays(600), check_out: isoInDays(603) }, 'DATES_TOO_FAR'],
            ['STAY_TOO_LONG', { ...valid, check_out: isoInDays(62) }, 'STAY_TOO_LONG'],
            ['INVALID_GUESTS', { ...valid, guests: 0 }, 'INVALID_GUESTS'],
            ['UNKNOWN_DESTINATION', { ...valid, destination: 'Lisbon' }, 'UNKNOWN_DESTINATION'],
        ];
        for (const [name, body, code] of cases) {
            const { res, json } = await call(body, key);
            check(`400 ${name}`, res.status === 400 && json?.status === 'INVALID_REQUEST' && json?.error?.code === code, `got ${res.status} ${JSON.stringify(json)}`);
        }

        // Success
        const { res, json } = await call(valid, key);
        check('200 SUCCESS', res.status === 200 && json?.status === 'SUCCESS', `got ${res.status}`);
        check('Cache-Control: no-store', res.headers.get('cache-control') === 'no-store');
        check('no CORS header', res.headers.get('access-control-allow-origin') === null);
        check('search echoes normalized destination', json?.search?.destination === 'Porto');
        const props = (json?.properties ?? []) as any[];
        console.log(`   ${props.length} properties returned`);
        if (props.length === 0) {
            console.warn('⚠️  No properties returned — turn on at least one Porto property in /admin/partners to test the property shape.');
        }
        for (const p of props) {
            check(`property ${p.id} booking_url`, typeof p.booking_url === 'string'
                && p.booking_url.startsWith('https://www.lovelymemories.pt/en/properties/')
                && p.booking_url.includes(`from=${valid.check_in}`) && p.booking_url.includes(`to=${valid.check_out}`)
                && p.booking_url.includes('adults=2') && p.booking_url.includes('ref=smoke-test'));
            check(`property ${p.id} numeric prices`, typeof p.total_price === 'number' && typeof p.nightly_price_average === 'number' && p.total_price > 0);
            check(`property ${p.id} capacity`, p.max_guests >= valid.guests);
        }
        const sorted = props.every((p, i) => i === 0 || props[i - 1].total_price <= p.total_price);
        check('sorted by total_price', sorted);

        // Leak scan over the whole body
        const problems: string[] = [];
        scanForLeaks(json, 'root', '$', problems);
        check('anti-leak: only contract fields, no forbidden values', problems.length === 0, problems.join('; '));

        // Rate limit: ~12 requests already logged; fire until 429 or 70 total.
        let got429 = false;
        for (let i = 0; i < 70 && !got429; i++) {
            const r = await call({ ...valid, destination: 'Lisbon' }, key);
            if (r.res.status === 429) {
                got429 = r.res.headers.get('retry-after') === '60' && r.json?.error?.code === 'RATE_LIMITED';
            }
            await new Promise(r2 => setTimeout(r2, 50)); // let after() write the log row
        }
        check('429 RATE_LIMITED with Retry-After: 60', got429);
    } finally {
        await admin.from('partner_api_keys').delete().eq('id', keyRow.id);
    }

    if (failures) {
        console.error(`\n❌ ${failures} check(s) failed`);
        process.exit(1);
    }
    console.log('\n✅ All partner API checks passed');
}

main().catch(err => { console.error(err); process.exit(1); });
```

- [ ] **Step 2: Correr contra o dev server**

Pré-condições: `PARTNER_API_ENABLED=true` no `.env.local` (reiniciar o preview depois de mudar o env) e pelo menos uma casa do Porto ligada em `/admin/partners`.

Run: `npx tsx scripts/test-partner-api.ts`
Expected: todas as linhas `✅` e `✅ All partner API checks passed`, com exit code 0.

- [ ] **Step 3: Commit**

```bash
git add scripts/test-partner-api.ts
git commit -m "test(partner-api): smoke test com verificação anti-fuga e rate limit

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Verificação final (E2E + checkout intacto)

**Files:** nenhum (só verificação).

- [ ] **Step 1: Verificações estáticas**

Run: `npx tsc --noEmit && npm run lint && npm run test:partner-api`
Expected: tudo limpo; todos os testes passam.

- [ ] **Step 2: Paridade de preço (de novo, no fim)**

Run: `npx tsx scripts/check-partner-api-price-parity.ts`
Expected: `✅ Price parity OK — 0 differences.`

- [ ] **Step 3: Checkout intacto**

Run:
```bash
git diff main --stat -- lib/pricing.ts app/actions/reservation.ts app/actions/stripe.ts "app/[locale]/(main)/booking" app/api/bookings app/api/webhooks/stripe components/PropertyDetails.tsx
```
Expected: só `lib/pricing.ts | 3 +++`. Correr `git diff main -- lib/pricing.ts` e confirmar que as 3 linhas são de comentário.

(Se o trabalho estiver direto em `main` sem branch, usar o commit anterior à Task 1 no lugar de `main`: `git diff <sha-antes-da-task-1> --stat -- …`.)

- [ ] **Step 4: E2E no browser — preço igual ao checkout**

1. Com uma casa ligada e a API ativa, fazer um pedido real:
   ```bash
   curl -s -X POST http://localhost:3001/api/v1/availability -H "Authorization: Bearer <chave de teste criada no admin>" -H "Content-Type: application/json" -d "{\"check_in\":\"<hoje+30>\",\"check_out\":\"<hoje+33>\",\"guests\":2,\"destination\":\"Porto\"}"
   ```
2. Abrir o `booking_url` do primeiro resultado no preview.
3. Confirmar que o calendário tem as datas selecionadas e que os hóspedes = 2 adultos.
4. Avançar até ao resumo de preço do checkout (sem pagar) e confirmar que o total é **igual** ao `total_price` da API.
5. Screenshot dessa página para o Marcelo.
6. Revogar a chave de teste no admin e confirmar que o mesmo `curl` dá 401.

- [ ] **Step 5: Guard do admin**

Com um utilizador `admin` (não super_admin), confirmar que `/pt/admin/partners` redireciona para `/pt/admin/properties` e que o item "Partners API" não aparece no sidebar.

- [ ] **Step 6: Relatório ao Marcelo + rollout**

Reportar os resultados (incluindo falhas, se houver) e lembrar os passos manuais do rollout (spec §10):
1. A migração `20260924120000_partner_api.sql` foi aplicada? (Task 1)
2. Deploy.
3. Ligar no admin só as casas do piloto com `.ics` confirmado.
4. Criar a chave `Kitsiva` / `kitsiva`.
5. `PARTNER_API_ENABLED=true` na Vercel (Production) + redeploy + smoke contra produção: `PARTNER_API_BASE=https://www.lovelymemories.pt npx tsx scripts/test-partner-api.ts`.
6. Enviar a chave ao Achilles por canal seguro, com `docs/partner-api/README.md` e `openapi.yaml`.
