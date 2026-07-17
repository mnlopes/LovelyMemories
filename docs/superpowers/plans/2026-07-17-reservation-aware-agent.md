# Reservation-aware Guest Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O agente de mensagens deixa de verificar disponibilidade para as datas da própria reserva confirmada do hóspede (fim das alucinações "não disponível"), e ganha contexto mais rico (noites, pessoas reais, hóspede recorrente).

**Architecture:** Um helper puro de sobreposição de datas alimenta (a) uma guarda na ferramenta `getCalendar` e (b) instruções condicionais no system prompt, ambas ativas só para reservas confirmadas. O `bot-bridge` passa estado + campos ricos da reserva. Inquiries mantêm o comportamento atual.

**Tech Stack:** TypeScript, agente próprio (`lib/ai-agent.ts` + tools), Supabase (sem migrações — nenhuma coluna nova), date-fns. Testes por script `npx tsx`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-17-reservation-aware-agent-design.md`.
- SEM migrações de BD (nenhuma coluna nova). `beds24_bookings` já tem `status`, `num_child`, `guest_first_name/last_name`, `guest_email`, `arrival`, `departure`.
- A guarda de reserva confirmada só se aplica quando `isConfirmed` (status ∈ {confirmed, new}); para `inquiry` o `getCalendar` e o prompt ficam EXATAMENTE como hoje.
- `lib/beds24/bot-bridge.ts` é código vivo do webhook em produção: mudanças mínimas e nunca lançar (mantém o try/catch existente).
- Datas em `yyyy-MM-dd`; checkout é o dia de saída (noite exclusiva) — a mesma convenção do `getCalendar`/`getRoomCalendar`.
- Verificação por task: teste do helper via `npx tsx`; `npx tsc --noEmit` limpo; `npm run build` na task que toca o prompt/agente. E2E manual do Marcelo (reprocessar booking do Loïc 89906216 — usar o padrão de `scripts/reprocess-carol.ts`).
- Commits `feat(agent): ...` no branch atual (main local); NUNCA push.
- Confirmar valores exatos antes de editar: LER `lib/ai-messaging.ts` (ReservationContext ~linha 180-190; buildSystemPrompt bloco reservation ~399-409), `lib/ai-agent-tools.ts` (getCalendar execute ~39-52), `lib/ai-agent.ts` (AGENT_OUTPUT_INSTRUCTIONS ~36-50), `lib/beds24/bot-bridge.ts` (handleGuestMessage buildContext ~165-174).

---

### Task 1: Helper puro de sobreposição + testes

**Files:**
- Create: `lib/reservation-window.ts`
- Create: `scripts/test-reservation-window.ts`

**Interfaces:**
- Produces: `datesOverlapStay(reqCheckIn: string, reqCheckOut: string, stayCheckIn: string, stayCheckOut: string): boolean` — true se os intervalos [checkIn, checkOut) se sobrepõem (datas yyyy-MM-dd, checkout exclusivo). Datas inválidas → false.

- [ ] **Step 1: Teste (falha primeiro)**

```typescript
// scripts/test-reservation-window.ts — npx tsx; exit 1 em falha
import { datesOverlapStay } from '../lib/reservation-window';

let fail = 0;
const t = (n: string, ok: boolean) => { if (!ok) { console.error(`FAIL ${n}`); fail++; } };
const STAY = ['2026-07-19', '2026-07-23'] as const;

t('mesmo intervalo → true', datesOverlapStay('2026-07-19', '2026-07-23', ...STAY) === true);
t('dentro da estadia → true', datesOverlapStay('2026-07-20', '2026-07-22', ...STAY) === true);
t('sobreposição parcial início → true', datesOverlapStay('2026-07-17', '2026-07-20', ...STAY) === true);
t('sobreposição parcial fim → true', datesOverlapStay('2026-07-22', '2026-07-25', ...STAY) === true);
t('adjacente antes (reqCheckOut = stayCheckIn) → false', datesOverlapStay('2026-07-15', '2026-07-19', ...STAY) === false);
t('adjacente depois (reqCheckIn = stayCheckOut) → false', datesOverlapStay('2026-07-23', '2026-07-26', ...STAY) === false);
t('totalmente antes → false', datesOverlapStay('2026-07-10', '2026-07-14', ...STAY) === false);
t('totalmente depois → false', datesOverlapStay('2026-07-30', '2026-08-02', ...STAY) === false);
t('datas inválidas → false', datesOverlapStay('lixo', '2026-07-23', ...STAY) === false);

console.log(fail === 0 ? 'PASS' : `${fail} failures`);
process.exit(fail === 0 ? 0 : 1);
```

- [ ] **Step 2: Ver falhar** — `npx tsx scripts/test-reservation-window.ts` → erro de módulo.

- [ ] **Step 3: Implementar**

```typescript
// lib/reservation-window.ts — sobreposição de intervalos de datas. Puro; yyyy-MM-dd; checkout exclusivo.
const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** true se [reqCheckIn, reqCheckOut) e [stayCheckIn, stayCheckOut) se sobrepõem. */
export function datesOverlapStay(
    reqCheckIn: string, reqCheckOut: string, stayCheckIn: string, stayCheckOut: string,
): boolean {
    if (![reqCheckIn, reqCheckOut, stayCheckIn, stayCheckOut].every((d) => ISO.test(d))) return false;
    // Comparação lexicográfica funciona para yyyy-MM-dd. Sobreposição de meio-abertos:
    // início_A < fim_B && início_B < fim_A.
    return reqCheckIn < stayCheckOut && stayCheckIn < reqCheckOut;
}
```

- [ ] **Step 4: Ver passar** — `npx tsx scripts/test-reservation-window.ts` → `PASS`.

- [ ] **Step 5: Commit**

```bash
git add lib/reservation-window.ts scripts/test-reservation-window.ts
git commit -m "feat(agent): pure date-overlap helper for reservation-aware calendar guard"
```

---

### Task 2: ReservationContext enriquecido + prompt consciente da reserva

**Files:**
- Modify: `lib/ai-messaging.ts` (tipo `ReservationContext`; `buildSystemPrompt` bloco `const r = ctx.reservation`)

**Interfaces:**
- Consumes: nada de Tasks anteriores.
- Produces: `ReservationContext` ganha `isConfirmed?: boolean` e `nights?: number | null` (mantém `guestName`, `checkInDate`, `checkOutDate`, `guests`, `previousStays`). O `buildSystemPrompt` passa a: (a) renderizar `nights`; (b) quando `isConfirmed`, acrescentar a instrução de não verificar disponibilidade das próprias datas.

- [ ] **Step 1: Ler + estender o tipo `ReservationContext`**

Localizar em `lib/ai-messaging.ts` a definição de `ReservationContext` (perto da linha 180-190). Acrescentar dois campos opcionais mantendo os existentes:

```typescript
    /** Estadia confirmada (status confirmed/new) vs inquiry (pré-reserva). */
    isConfirmed?: boolean;
    /** Nº de noites (derivado das datas). */
    nights?: number | null;
```

- [ ] **Step 2: Render de `nights` + instrução condicional no `buildSystemPrompt`**

No bloco `const r = ctx.reservation; if (r) { ... }` (linhas ~399-409), acrescentar a linha de `nights` ao array `res` (a seguir a `Leaving`):

```typescript
            typeof r.nights === "number" && r.nights > 0 && `Nights: ${r.nights}`,
```

E LOGO A SEGUIR ao `if (res.length) parts.push(\`Reservation:\n${res.join("\n")}\`);`, acrescentar a instrução de reserva confirmada:

```typescript
        if (r.isConfirmed && r.checkInDate && r.checkOutDate) {
            parts.push(
                `IMPORTANT — this guest has a CONFIRMED booking for ${r.checkInDate} to ${r.checkOutDate}. ` +
                `Their stay is confirmed; never question it or check availability for those dates (they are reserved for this guest). ` +
                `Only use the calendar tool if the guest asks about DIFFERENT dates (extending, or a future stay).`,
            );
        }
```

- [ ] **Step 3: Verificar + commit**

Run: `npx tsc --noEmit`
Expected: limpo.

```bash
git add lib/ai-messaging.ts
git commit -m "feat(agent): reservation-aware prompt (confirmed-stay guard + nights)"
```

---

### Task 3: Guarda de sobreposição na ferramenta getCalendar

**Files:**
- Modify: `lib/ai-agent-tools.ts` (tool `getCalendar` execute)

**Interfaces:**
- Consumes: `datesOverlapStay` (Task 1); `ctx.reservation` com `isConfirmed`/`checkInDate`/`checkOutDate` (Task 2).
- Produces: quando a conversa é de reserva confirmada e o intervalo pedido sobrepõe a estadia do hóspede, o `getCalendar` devolve um conteúdo de redireccionamento (sem citações) em vez de consultar o Beds24. Inquiries e datas diferentes → comportamento atual.

- [ ] **Step 1: Import + guarda no início do `execute` do `getCalendar`**

No topo de `lib/ai-agent-tools.ts` adicionar:

```typescript
import { datesOverlapStay } from "@/lib/reservation-window";
```

Dentro do `execute` do `getCalendar`, LOGO APÓS a validação do formato das datas (a seguir ao `if (!/^\d{4}...`), inserir:

```typescript
                const stay = ctx.reservation;
                if (stay?.isConfirmed && stay.checkInDate && stay.checkOutDate
                    && datesOverlapStay(checkIn, checkOut, stay.checkInDate, stay.checkOutDate)) {
                    return {
                        content: "These dates are the guest's own CONFIRMED stay — their booking is confirmed, this is not an availability question. Do not report these dates as unavailable.",
                        citations: [],
                    };
                }
```

- [ ] **Step 2: Verificar + commit**

Run: `npx tsc --noEmit`
Expected: limpo.

```bash
git add lib/ai-agent-tools.ts
git commit -m "feat(agent): getCalendar guard — never treat the guest's own confirmed dates as an availability query"
```

---

### Task 4: bot-bridge passa estado + campos ricos + recorrência

**Files:**
- Modify: `lib/beds24/bot-bridge.ts` (`handleGuestMessage`, bloco `buildContext({ reservation: ... })` ~165-174)

**Interfaces:**
- Consumes: `ReservationContext` estendido (Task 2).
- Produces: o `reservation` passado a `buildContext` inclui `isConfirmed` (de `booking.status`), `guests` = adultos+crianças, `nights` (derivado), `previousStays` (contagem de estadias passadas do mesmo hóspede).

- [ ] **Step 1: Helper de recorrência + derivações antes do `buildContext`**

Em `handleGuestMessage`, ANTES da chamada `buildContext(...)`, acrescentar o cálculo (nunca lança; best-effort):

```typescript
    // Hóspede recorrente: estadias passadas concluídas do mesmo hóspede (nome+apelido),
    // na mesma propriedade Beds24. Best-effort — 0 em qualquer falha.
    let previousStays = 0;
    const first = booking?.firstName ?? null;
    const last = booking?.lastName ?? null;
    if (first && last && propertyId) {
        const todayISO = new Date().toISOString().slice(0, 10);
        const { data: past } = await supabase
            .from("beds24_bookings")
            .select("beds24_booking_id")
            .eq("beds24_property_id", propertyId)
            .eq("guest_first_name", first)
            .eq("guest_last_name", last)
            .in("status", ["confirmed", "new"])
            .lt("departure", todayISO)
            .neq("beds24_booking_id", bookingId);
        previousStays = past?.length ?? 0;
    }
    const status = (booking?.status ?? "").toLowerCase();
    const isConfirmed = status === "confirmed" || status === "new";
    const nights = booking?.arrival && booking?.departure
        ? Math.max(0, Math.round((new Date(booking.departure).getTime() - new Date(booking.arrival).getTime()) / 86400000))
        : null;
```

- [ ] **Step 2: Passar os campos ao `buildContext`**

Substituir o objeto `reservation` dentro do `buildContext(...)` (linhas ~168-173) por:

```typescript
        reservation: booking ? {
            guestName: [booking.firstName, booking.lastName].filter(Boolean).join(" ") || null,
            checkInDate: booking.arrival ?? null,
            checkOutDate: booking.departure ?? null,
            guests: (booking.numAdult ?? 0) + (booking.numChild ?? 0) || null,
            nights,
            isConfirmed,
            previousStays,
        } : null,
```

(Confirmar os nomes de campo reais do tipo `Beds24Booking` — `numAdult`/`numChild` são os usados no `mapRow` de `sync.ts`.)

- [ ] **Step 3: Verificar + commit**

Run: `npx tsc --noEmit`
Expected: limpo.

```bash
git add lib/beds24/bot-bridge.ts
git commit -m "feat(agent): bridge passes reservation status, real party size, nights, returning-guest count"
```

---

### Task 5: Reforço da instrução "não inventar" + E2E

**Files:**
- Modify: `lib/ai-agent.ts` (`AGENT_OUTPUT_INSTRUCTIONS`, ~linha 47-48)

**Interfaces:**
- Consumes: nada.
- Produces: instrução ligeiramente reforçada para o caso de facto em falta (acesso/wifi) → resposta de espera, sem deduzir de ferramentas.

- [ ] **Step 1: Reforçar a linha do `covered:false`**

Localizar a linha 47-48 do `AGENT_OUTPUT_INSTRUCTIONS` («When covered is false, "reply" must still be a warm, honest guest-facing message saying you'll confirm with the team shortly — Never invent information.») e acrescentar-lhe uma frase:

```
- When covered is false, "reply" must still be a warm, honest guest-facing message saying you'll
  confirm with the team shortly — in the guest's language. Never invent information. If a specific
  detail is missing (e.g. access code, wifi password), acknowledge the question and say the team
  will confirm and send the details before arrival — do NOT infer it from availability or other tools.
```

- [ ] **Step 2: Verificar + commit**

Run: `npx tsc --noEmit && npm run build`
Expected: limpos.

```bash
git add lib/ai-agent.ts
git commit -m "feat(agent): reinforce holding-reply instruction for missing facts"
```

- [ ] **Step 3: E2E manual (Marcelo)**

Reprocessar o booking do Loïc pelo bridge real (padrão `scripts/reprocess-carol.ts`, BOOKING=89906216, propriedade 341088): o novo draft NÃO deve falar em "não disponível" — deve confirmar a estadia 19→23 e, sobre o código de acesso, ou dá-o (se o *Apartment access* estiver preenchido) ou diz que confirma e envia antes da chegada. Verificar também que uma inquiry real de datas continua a responder disponibilidade normalmente.

## Nota de execução
Feature isolada do resto (co-host home redesign). Sem migrações. Depois do E2E do Marcelo, entra no mesmo push a prod dos restantes commits de co-host.
