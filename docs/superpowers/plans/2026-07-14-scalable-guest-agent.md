# Scalable Guest Agent (tool-calling + learning loop) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evoluir o bot de mensagens para um agente com ferramentas (calendário Beds24 + knowledge em 3 camadas) que responde a preço/disponibilidade com dados reais e aprende com as escalações — escalável a 50 propriedades.

**Architecture:** 4 camadas — guardas duras determinísticas → loop de tool-calling (LLM pede `getCalendar`/`getKnowledge`, máx. 4 iterações, saída JSON com citações) → gate determinístico que valida citações contra os dados realmente devolvidos → learning loop que converte respostas humanas (backoffice OU Airbnb via webhook `source=host`) em factos `pending` aprovados no backoffice.

**Tech Stack:** Next.js 16 (server actions), Supabase (service role), Beds24 API v2, Gemini function-calling (primário) + OpenAI tools (fallback), tsx scripts como testes (projeto não tem test framework).

**Spec:** `docs/superpowers/specs/2026-07-14-scalable-guest-agent-design.md`

## Global Constraints

- O LLM NUNCA decide o envio — só as guardas (camada 1) e o gate (camada 3).
- Auto-send NUNCA sem citação validada contra dados reais devolvidos pelas ferramentas nesta execução.
- Negociação/desconto/refund/cancelamento/mudança de reserva/reclamações/PII/early check-in/bagagem escalam SEMPRE, sem LLM.
- Nada entra no knowledge sem aprovação humana (`status='pending'` até revisão).
- Falha de qualquer componente degrada para humano — nunca para silêncio nem invenção.
- Migrações Supabase são aplicadas MANUALMENTE no dashboard — criar o ficheiro NÃO aplica; dizer isso explicitamente ao terminar a task da migração.
- i18n: chaves novas em paridade nos 3 ficheiros `messages/{en,pt,he}.json`.
- Verificação do projeto: `npx tsc --noEmit` (scripts/ está excluído do tsconfig) + scripts tsx com `dotenv.config({ path: '.env.local' })`.
- Testes-script seguem o padrão de `scripts/test-ai-decision.ts`: contador `failed`, helper `t(name, cond)`, `process.exit(failed ? 1 : 0)`.
- Assinatura pública `decide(ctx: DraftContext): Promise<BotDecision>` mantém-se — o bot-bridge não muda o seu fluxo de gate por modo (off/drafts/auto).

---

### Task 1: Migração `ai_property_fact`

**Files:**
- Create: `supabase/migrations/20260715090000_ai_property_fact.sql`

**Interfaces:**
- Produces: tabela `public.ai_property_fact` (colunas: `id uuid`, `external_property_id text`, `topic text`, `fact text`, `source 'manual'|'learned'|'imported'`, `status 'active'|'pending'|'rejected'`, `learned_from text`, `reviewed_by text`, `created_at`, `updated_at`). Tasks 3, 7, 8, 9 leem/escrevem nesta tabela.

- [ ] **Step 1: Escrever a migração**

```sql
-- ── ai_property_fact: factos livres por propriedade (knowledge escalável) ────
-- Fontes: manual (equipa), learned (learning loop, entra pending), imported
-- (import inicial Beds24). Só factos 'active' alimentam o agente.
create table if not exists public.ai_property_fact (
    id uuid primary key default gen_random_uuid(),
    external_property_id text not null,        -- Beds24 property id (text) — join com beds24_properties
    topic text not null default 'general',     -- amenities | access | parking | house_rules | area | general | …
    fact text not null,                        -- uma afirmação verificável, autocontida
    source text not null default 'manual'
        check (source in ('manual', 'learned', 'imported')),
    status text not null default 'active'
        check (status in ('active', 'pending', 'rejected')),
    learned_from text,                          -- reservation_id da conversa de origem (auditoria)
    reviewed_by text,                           -- email do admin que aprovou/rejeitou
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists ai_property_fact_prop_status_idx
    on public.ai_property_fact (external_property_id, status);
create index if not exists ai_property_fact_pending_idx
    on public.ai_property_fact (status, created_at desc);

alter table public.ai_property_fact enable row level security;

drop policy if exists "Staff manage ai_property_fact" on public.ai_property_fact;
create policy "Staff manage ai_property_fact"
    on public.ai_property_fact for all to authenticated
    using (exists (
        select 1 from public.profiles
        where id = auth.uid() and role in ('admin', 'super_admin', 'editor')
    ))
    with check (exists (
        select 1 from public.profiles
        where id = auth.uid() and role in ('admin', 'super_admin', 'editor')
    ));
```

- [ ] **Step 2: Verificar sintaxe por leitura** (não há como aplicar localmente; padrão idêntico às policies de `20260714090000_ai_messaging_beds24.sql:97-109`)

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260715090000_ai_property_fact.sql
git commit -m "feat(ai-inbox): migração ai_property_fact (knowledge escalável por propriedade)"
```

- [ ] **Step 4: Avisar o Marcelo** que a migração tem de ser aplicada MANUALMENTE no dashboard Supabase antes das Tasks 7-9 funcionarem em runtime (as Tasks 2-6 não dependem dela para compilar/testar).

---

### Task 2: Calendário Beds24 — cliente + sumarizador

**Files:**
- Create: `lib/beds24/calendar.ts`
- Create: `scripts/probe-beds24-calendar.ts`
- Create: `scripts/test-calendar-summary.ts`

**Interfaces:**
- Consumes: `beds24Request<T>(method, path, options)` de `lib/beds24/client.ts` (já existe).
- Produces:
  - `getRoomCalendar(roomId: number, startDate: string, endDate: string): Promise<CalendarDay[]>` — `CalendarDay = { date: string; price: number | null; available: boolean; minStay: number | null }`
  - `summariseCalendar(days: CalendarDay[], checkIn: string, checkOut: string): { text: string; citation: string }` — `citation` tem o formato `calendar:<checkIn>..<checkOut>`. Task 6 usa ambos na ferramenta `getCalendar`.

- [ ] **Step 1: Probe do endpoint real** (o formato exato da resposta nunca foi consumido pelo nosso código — verificar antes de fixar o parse)

```typescript
// scripts/probe-beds24-calendar.ts
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { beds24Request } from "../lib/beds24/client";

// Virtudes One (cobaia): roomId 704840
(async () => {
    const res = await beds24Request("GET", "/inventory/rooms/calendar", {
        query: {
            roomId: 704840,
            startDate: "2026-09-01",
            endDate: "2026-09-10",
            includePrices: true,
            includeMinStay: true,
            includeNumAvail: true,
        },
        context: "action",
    });
    console.log(JSON.stringify(res, null, 2));
})();
```

Run: `npx tsx scripts/probe-beds24-calendar.ts`
Expected: JSON com `data[0].calendar[]` — entradas com intervalos `from`/`to` e campos `numAvail`, `price1`, `minStay`. **Se os nomes dos campos diferirem, ajustar o parse do Step 3 ao formato real observado antes de continuar.**

- [ ] **Step 2: Escrever o teste do sumarizador (falha primeiro)**

```typescript
// scripts/test-calendar-summary.ts
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { summariseCalendar, type CalendarDay } from "../lib/beds24/calendar";

let failed = 0;
const t = (name: string, cond: boolean) => { if (!cond) { failed++; console.error("FAIL:", name); } else console.log("ok:", name); };

const days: CalendarDay[] = [
    { date: "2026-09-10", price: 110, available: true, minStay: 2 },
    { date: "2026-09-11", price: 110, available: true, minStay: 2 },
    { date: "2026-09-12", price: 150, available: true, minStay: 2 },
];
// Estadia 10→13 set = 3 noites (13 é checkout, não é noite dormida)
const ok = summariseCalendar(days, "2026-09-10", "2026-09-13");
t("todas disponíveis", ok.text.includes("ALL nights are available"));
t("total 370", ok.text.includes("370"));
t("citation", ok.citation === "calendar:2026-09-10..2026-09-13");

const daysBlocked: CalendarDay[] = [
    { date: "2026-09-10", price: 110, available: true, minStay: 2 },
    { date: "2026-09-11", price: null, available: false, minStay: null },
    { date: "2026-09-12", price: 150, available: true, minStay: 2 },
];
const blocked = summariseCalendar(daysBlocked, "2026-09-10", "2026-09-13");
t("indisponível assinalado", blocked.text.includes("NOT available") && blocked.text.includes("2026-09-11"));
t("sem total quando bloqueado", !blocked.text.includes("Total"));

const missing = summariseCalendar([], "2026-09-10", "2026-09-13");
t("sem dados = sem números", missing.text.includes("No calendar data") && !/\d+\s?€|€\s?\d+/.test(missing.text));

process.exit(failed ? 1 : 0);
```

Run: `npx tsx scripts/test-calendar-summary.ts`
Expected: FAIL — `Cannot find module '../lib/beds24/calendar'`

- [ ] **Step 3: Implementar `lib/beds24/calendar.ts`**

```typescript
import { beds24Request } from "@/lib/beds24/client";

/**
 * Calendário Beds24 (fonte de verdade para preço/disponibilidade, sync Airbnb).
 * Consumido pela ferramenta getCalendar do agente (lib/ai-agent-tools.ts).
 */

export interface CalendarDay {
    date: string;                 // YYYY-MM-DD
    price: number | null;         // preço da noite (price1)
    available: boolean;
    minStay: number | null;
}

/** Janela máxima defensiva: ≤ 31 noites, ≤ 365 dias à frente (guarda do spec). */
export function clampWindow(startDate: string, endDate: string): { start: string; end: string } | null {
    const start = new Date(startDate + "T00:00:00Z");
    const end = new Date(endDate + "T00:00:00Z");
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return null;
    const maxAhead = new Date(); maxAhead.setUTCDate(maxAhead.getUTCDate() + 365);
    if (start > maxAhead) return null;
    const nights = (end.getTime() - start.getTime()) / 86_400_000;
    if (nights > 31) {
        const capped = new Date(start); capped.setUTCDate(capped.getUTCDate() + 31);
        return { start: startDate, end: capped.toISOString().slice(0, 10) };
    }
    return { start: startDate, end: endDate };
}

type RawCalendarEntry = {
    from?: string; to?: string;
    numAvail?: number; price1?: number; minStay?: number;
};

/**
 * Lê o calendário do quarto e expande os intervalos from/to em dias individuais.
 * NOTA: parse validado contra scripts/probe-beds24-calendar.ts — se o formato real
 * diferir, ajustar aqui.
 */
export async function getRoomCalendar(roomId: number, startDate: string, endDate: string): Promise<CalendarDay[]> {
    const win = clampWindow(startDate, endDate);
    if (!win) return [];
    const res = await beds24Request<Array<{ roomId?: number; calendar?: RawCalendarEntry[] }>>(
        "GET", "/inventory/rooms/calendar", {
            query: {
                roomId, startDate: win.start, endDate: win.end,
                includePrices: true, includeMinStay: true, includeNumAvail: true,
            },
            context: "bot",
        },
    );
    const data = (res as { data?: Array<{ calendar?: RawCalendarEntry[] }> })?.data ?? [];
    const entries = data[0]?.calendar ?? [];
    const byDate = new Map<string, CalendarDay>();
    for (const e of entries) {
        if (!e.from) continue;
        const from = new Date(e.from + "T00:00:00Z");
        const to = new Date((e.to ?? e.from) + "T00:00:00Z");
        for (let d = new Date(from); d <= to; d.setUTCDate(d.getUTCDate() + 1)) {
            const date = d.toISOString().slice(0, 10);
            byDate.set(date, {
                date,
                price: typeof e.price1 === "number" ? e.price1 : null,
                available: (e.numAvail ?? 0) > 0,
                minStay: typeof e.minStay === "number" ? e.minStay : null,
            });
        }
    }
    // Devolve só as NOITES da estadia (end é checkout — exclusivo)
    const out: CalendarDay[] = [];
    const start = new Date(win.start + "T00:00:00Z");
    const end = new Date(win.end + "T00:00:00Z");
    for (let d = new Date(start); d < end; d.setUTCDate(d.getUTCDate() + 1)) {
        const date = d.toISOString().slice(0, 10);
        const day = byDate.get(date);
        if (day) out.push(day);
    }
    return out;
}

/**
 * Converte os dias num bloco de FACTOS compacto para o modelo, com a citação
 * que o gate valida. Regra dura do spec: sem dados → texto explícito sem números.
 */
export function summariseCalendar(
    days: CalendarDay[], checkIn: string, checkOut: string,
): { text: string; citation: string } {
    const citation = `calendar:${checkIn}..${checkOut}`;
    const nights = Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86_400_000);
    if (!days.length || days.length < nights) {
        return { citation, text: `No calendar data for ${checkIn} to ${checkOut}. Do NOT state any price or availability for these dates.` };
    }
    const unavailable = days.filter((d) => !d.available).map((d) => d.date);
    const lines: string[] = [`Stay ${checkIn} → ${checkOut} (${nights} night(s)):`];
    if (unavailable.length) {
        lines.push(`NOT available — these nights are blocked/booked: ${unavailable.join(", ")}.`);
    } else {
        lines.push(`ALL nights are available.`);
        const prices = days.map((d) => d.price);
        if (prices.every((p): p is number => typeof p === "number")) {
            const total = prices.reduce((a, b) => a + b, 0);
            lines.push(`Nightly prices: ${days.map((d) => `${d.date}=€${d.price}`).join(", ")}.`);
            lines.push(`Total for the stay: €${total} (nightly sum — plus any platform fees/taxes).`);
        } else {
            lines.push(`Prices are not fully known for this range — do NOT quote a total.`);
        }
        const minStayMax = Math.max(...days.map((d) => d.minStay ?? 0));
        if (minStayMax > nights) lines.push(`WARNING: minimum stay for these dates is ${minStayMax} nights — this ${nights}-night stay does NOT meet it.`);
    }
    return { citation, text: lines.join("\n") };
}
```

- [ ] **Step 4: Correr os testes**

Run: `npx tsx scripts/test-calendar-summary.ts`
Expected: todas `ok:`; exit 0

- [ ] **Step 5: Smoke live** — `npx tsx scripts/probe-beds24-calendar.ts` já validou o formato no Step 1; agora um smoke do parse completo — acrescentar ao fim de `probe-beds24-calendar.ts`:

```typescript
// (após o console.log existente)
import { getRoomCalendar } from "../lib/beds24/calendar";
const days = await getRoomCalendar(704840, "2026-09-01", "2026-09-05");
console.log("parsed days:", days);
```

Run: `npx tsx scripts/probe-beds24-calendar.ts`
Expected: `parsed days:` com 4 entradas, preços coerentes com o painel Beds24.

- [ ] **Step 6: `npx tsc --noEmit`** — Expected: sem erros.

- [ ] **Step 7: Commit**

```bash
git add lib/beds24/calendar.ts scripts/probe-beds24-calendar.ts scripts/test-calendar-summary.ts
git commit -m "feat(ai-agent): calendário Beds24 — cliente com clamp de janela + sumarizador com citação"
```

---

### Task 3: Knowledge 3 camadas — factos + formatação com citações

**Files:**
- Create: `lib/ai-knowledge.ts`
- Modify: `lib/ai-messaging.ts` (adicionar `beds24RoomId` a `PropertyKnowledge` + `loadPropertyKnowledge`)
- Create: `scripts/test-ai-knowledge.ts`

**Interfaces:**
- Consumes: `PropertyKnowledge`, `loadPropertyKnowledge` de `lib/ai-messaging.ts`; tabela `ai_property_fact` (Task 1).
- Produces:
  - `loadPropertyFacts(externalPropertyId: string): Promise<PropertyFact[]>` — `PropertyFact = { id: string; topic: string; fact: string; source: string }` (só `status='active'`)
  - `formatKnowledgeWithCitations(k: PropertyKnowledge | null, facts: PropertyFact[]): { text: string; citations: string[] }` — cada linha prefixada com a chave de citação em parêntesis retos, e.g. `[knowledge.wifiPassword] Wi-Fi password: xyz` / `[fact:<uuid>] Tem berço…`. Task 6 usa isto na ferramenta `getKnowledge`.
  - `PropertyKnowledge.beds24RoomId?: number | null` — Task 6 usa para construir a ferramenta `getCalendar`.

- [ ] **Step 1: Teste (falha primeiro)**

```typescript
// scripts/test-ai-knowledge.ts
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { formatKnowledgeWithCitations, type PropertyFact } from "../lib/ai-knowledge";
import type { PropertyKnowledge } from "../lib/ai-messaging";

let failed = 0;
const t = (name: string, cond: boolean) => { if (!cond) { failed++; console.error("FAIL:", name); } else console.log("ok:", name); };

const k: PropertyKnowledge = { listingName: "The Root", wifiName: "root-wifi", wifiPassword: "pw123", checkIn: "15:00" };
const facts: PropertyFact[] = [{ id: "abc-1", topic: "amenities", fact: "Tem berço a pedido", source: "learned" }];
const out = formatKnowledgeWithCitations(k, facts);

t("linha wifi com chave", out.text.includes("[knowledge.wifiPassword] Wi-Fi password: pw123"));
t("linha facto com chave", out.text.includes("[fact:abc-1] Tem berço a pedido"));
t("citations contém chaves", out.citations.includes("knowledge.wifiPassword") && out.citations.includes("fact:abc-1"));
t("campos vazios ausentes", !out.text.includes("doorCode"));

const empty = formatKnowledgeWithCitations(null, []);
t("null property = aviso", empty.text.includes("No property information"));
t("null property = zero citações", empty.citations.length === 0);

process.exit(failed ? 1 : 0);
```

Run: `npx tsx scripts/test-ai-knowledge.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 2: Implementar `lib/ai-knowledge.ts`**

```typescript
import { getSupabaseAdmin } from "@/lib/supabase";
import type { PropertyKnowledge } from "@/lib/ai-messaging";

/**
 * Camada 3 do knowledge: factos livres por propriedade (ai_property_fact).
 * A formatação anexa a CHAVE DE CITAÇÃO a cada facto — o gate (lib/ai-agent.ts)
 * só aceita citações que existam nas chaves realmente fornecidas ao modelo.
 */

export interface PropertyFact {
    id: string;
    topic: string;
    fact: string;
    source: string;
}

/** Factos ativos da propriedade. Fail-soft: erro → lista vazia. */
export async function loadPropertyFacts(externalPropertyId: string): Promise<PropertyFact[]> {
    try {
        const supabase = await getSupabaseAdmin();
        const { data } = await supabase
            .from("ai_property_fact")
            .select("id, topic, fact, source")
            .eq("external_property_id", externalPropertyId)
            .eq("status", "active")
            .order("created_at", { ascending: true })
            .limit(100);
        return (data ?? []) as PropertyFact[];
    } catch {
        return [];
    }
}

/** Os campos de PropertyKnowledge expostos ao agente, com a sua chave de citação. */
const KNOWLEDGE_FIELDS: Array<{ key: keyof PropertyKnowledge; label: string }> = [
    { key: "listingName", label: "Property" },
    { key: "address", label: "Address" },
    { key: "checkIn", label: "Check-in" },
    { key: "checkOut", label: "Check-out" },
    { key: "wifiName", label: "Wi-Fi network" },
    { key: "wifiPassword", label: "Wi-Fi password" },
    { key: "doorCode", label: "Door code" },
    { key: "buildingAccess", label: "Building access" },
    { key: "apartmentAccess", label: "Apartment access" },
    { key: "parking", label: "Parking" },
    { key: "houseRules", label: "House rules" },
    { key: "amenities", label: "Amenities available" },
    { key: "emergencyContact", label: "Emergency contact" },
    { key: "govFormUrl", label: "Mandatory pre-arrival government (SEF) form" },
    { key: "guidebookUrl", label: "Guidebook" },
    { key: "tips", label: "Local tips" },
];

/**
 * Junta camadas 1+2 (PropertyKnowledge: site + extras) e camada 3 (factos) num
 * bloco de texto onde CADA linha tem a sua chave de citação. Devolve também o
 * conjunto de chaves válidas (para o gate).
 */
export function formatKnowledgeWithCitations(
    k: PropertyKnowledge | null,
    facts: PropertyFact[],
): { text: string; citations: string[] } {
    const lines: string[] = [];
    const citations: string[] = [];

    if (k) {
        for (const f of KNOWLEDGE_FIELDS) {
            const v = k[f.key];
            if (typeof v === "string" && v.trim()) {
                const cite = `knowledge.${String(f.key)}`;
                lines.push(`[${cite}] ${f.label}: ${v}`);
                citations.push(cite);
            }
        }
    }
    for (const fact of facts) {
        const cite = `fact:${fact.id}`;
        lines.push(`[${cite}] (${fact.topic}) ${fact.fact}`);
        citations.push(cite);
    }

    if (!lines.length) {
        return { text: "No property information is available. Do not state any property-specific detail.", citations: [] };
    }
    return {
        text: `Property information — cite the bracketed key of every fact you use:\n${lines.join("\n")}`,
        citations,
    };
}
```

- [ ] **Step 3: Adicionar `beds24RoomId` a `lib/ai-messaging.ts`**

Em `PropertyKnowledge` (após a linha `externalPropertyId?: string | null;`, `lib/ai-messaging.ts:112`):

```typescript
    /** Beds24 room id — needed by the agent's calendar tool. */
    beds24RoomId?: number | null;
```

Em `loadPropertyKnowledge`, mudar o select de `beds24_properties` (linha ~276) e propagar:

```typescript
        const { data: beds24Prop } = await supabase
            .from("beds24_properties")
            .select("internal_property_id, name, beds24_room_id")
            .eq("beds24_property_id", beds24PropertyId)
            .maybeSingle();
        if (!beds24Prop) return null;

        const roomId = (beds24Prop as { beds24_room_id: number | null }).beds24_room_id ?? null;
```

E incluir `beds24RoomId: roomId` nos DOIS returns de knowledge (o parcial "not linked" e o completo):

```typescript
            return {
                externalPropertyId,
                beds24RoomId: roomId,
                listingName: (beds24Prop as { name: string | null }).name ?? null,
            };
```

```typescript
        return {
            id: internalPropertyId,
            externalPropertyId,
            beds24RoomId: roomId,
            ...(prop ? mapPropertyBase(...) : ...),
            ...mapExtrasRow(...),
        };
```

- [ ] **Step 4: Correr o teste** — `npx tsx scripts/test-ai-knowledge.ts` → tudo `ok:`, exit 0.

- [ ] **Step 5: `npx tsc --noEmit`** — sem erros.

- [ ] **Step 6: Commit**

```bash
git add lib/ai-knowledge.ts lib/ai-messaging.ts scripts/test-ai-knowledge.ts
git commit -m "feat(ai-agent): knowledge 3 camadas — factos ativos + formatação com chaves de citação"
```

---

### Task 4: Núcleo do agente — loop de tool-calling com gate de citações

**Files:**
- Create: `lib/ai-agent.ts`
- Create: `scripts/test-ai-agent.ts`

**Interfaces:**
- Consumes: nada de novo (o `callModel` é injetado — os adaptadores reais vêm na Task 5).
- Produces (Task 5 e 6 dependem exatamente disto):

```typescript
export interface AgentTool {
    name: string;
    description: string;
    parameters: Record<string, unknown>;          // JSON schema (object)
    execute: (args: Record<string, unknown>) => Promise<{ content: string; citations: string[] }>;
}
export type ModelTurn =
    | { type: "text"; text: string }
    | { type: "tool_calls"; calls: Array<{ name: string; args: Record<string, unknown> }> };
export type AgentChatMessage =
    | { role: "system" | "user" | "assistant"; content: string }
    | { role: "tool"; name: string; content: string };
export type ModelCaller = (messages: AgentChatMessage[], tools: AgentTool[]) => Promise<ModelTurn>;
export interface AgentOutcome {
    covered: boolean;
    reply: string | null;
    citations: string[];        // já validadas pelo gate
    reason: string;             // "ok" | "not_covered" | "invalid_citation" | "parse_error" | "max_iterations"
}
export function runAgent(opts: {
    systemPrompt: string;
    userMessage: string;
    history: Array<{ role: "user" | "assistant"; content: string }>;
    tools: AgentTool[];
    callModel: ModelCaller;
    maxIterations?: number;     // default 4
}): Promise<AgentOutcome>;
export const AGENT_OUTPUT_INSTRUCTIONS: string;   // bloco a anexar ao system prompt
```

- [ ] **Step 1: Teste com modelo falso (falha primeiro)**

```typescript
// scripts/test-ai-agent.ts
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { runAgent, type AgentTool, type ModelCaller } from "../lib/ai-agent";

let failed = 0;
const t = (name: string, cond: boolean) => { if (!cond) { failed++; console.error("FAIL:", name); } else console.log("ok:", name); };

const knowledgeTool: AgentTool = {
    name: "getKnowledge",
    description: "Property facts",
    parameters: { type: "object", properties: {} },
    execute: async () => ({ content: "[knowledge.wifiPassword] Wi-Fi password: pw123", citations: ["knowledge.wifiPassword"] }),
};

(async () => {
    // 1. Fluxo feliz: tool call → resposta coberta com citação válida
    let calls = 0;
    const happy: ModelCaller = async () => {
        calls++;
        if (calls === 1) return { type: "tool_calls", calls: [{ name: "getKnowledge", args: {} }] };
        return { type: "text", text: JSON.stringify({ covered: true, reply: "A password é pw123 😊", citations: ["knowledge.wifiPassword"], confidence: "high", language: "pt" }) };
    };
    const r1 = await runAgent({ systemPrompt: "x", userMessage: "wifi?", history: [], tools: [knowledgeTool], callModel: happy });
    t("coberto", r1.covered === true);
    t("reply presente", r1.reply === "A password é pw123 😊");
    t("citação validada", r1.citations.join() === "knowledge.wifiPassword");

    // 2. Citação inventada → gate rejeita
    const invented: ModelCaller = async () => ({ type: "text", text: JSON.stringify({ covered: true, reply: "custa €500", citations: ["calendar:2026-01-01..2026-01-05"], language: "en" }) });
    const r2 = await runAgent({ systemPrompt: "x", userMessage: "price?", history: [], tools: [knowledgeTool], callModel: invented });
    t("citação inventada escala", r2.covered === false && r2.reason === "invalid_citation");
    t("draft preservado para a fila", r2.reply === "custa €500");

    // 3. covered=true SEM citações → escala (regra: nunca auto-send sem citação)
    const noCite: ModelCaller = async () => ({ type: "text", text: JSON.stringify({ covered: true, reply: "sim!", citations: [], language: "en" }) });
    const r3 = await runAgent({ systemPrompt: "x", userMessage: "q", history: [], tools: [], callModel: noCite });
    t("sem citação escala", r3.covered === false);

    // 4. JSON malformado → parse_error
    const broken: ModelCaller = async () => ({ type: "text", text: "claro, a password é..." });
    const r4 = await runAgent({ systemPrompt: "x", userMessage: "q", history: [], tools: [], callModel: broken });
    t("json partido escala", r4.covered === false && r4.reason === "parse_error");

    // 5. Loop infinito de tools → corta em maxIterations
    const looper: ModelCaller = async () => ({ type: "tool_calls", calls: [{ name: "getKnowledge", args: {} }] });
    const r5 = await runAgent({ systemPrompt: "x", userMessage: "q", history: [], tools: [knowledgeTool], callModel: looper, maxIterations: 4 });
    t("iterações limitadas", r5.covered === false && r5.reason === "max_iterations");

    // 6. Tool desconhecida pedida pelo modelo → devolve erro ao modelo, não rebenta
    let step = 0;
    const unknownTool: ModelCaller = async () => {
        step++;
        if (step === 1) return { type: "tool_calls", calls: [{ name: "getWeather", args: {} }] };
        return { type: "text", text: JSON.stringify({ covered: false, reply: "vou confirmar", citations: [], language: "pt" }) };
    };
    const r6 = await runAgent({ systemPrompt: "x", userMessage: "q", history: [], tools: [knowledgeTool], callModel: unknownTool });
    t("tool desconhecida sobrevive", r6.covered === false && r6.reply === "vou confirmar");

    // 7. covered=false com draft honesto → passa o draft
    const honest: ModelCaller = async () => ({ type: "text", text: JSON.stringify({ covered: false, reply: "Vou confirmar com a equipa e já te digo! 😊", citations: [], language: "pt" }) });
    const r7 = await runAgent({ systemPrompt: "x", userMessage: "têm bicicletas?", history: [], tools: [], callModel: honest });
    t("não coberto com draft", r7.covered === false && r7.reason === "not_covered" && !!r7.reply);

    process.exit(failed ? 1 : 0);
})();
```

Run: `npx tsx scripts/test-ai-agent.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 2: Implementar `lib/ai-agent.ts`**

```typescript
/**
 * Núcleo do agente (camadas 2+3 do spec 2026-07-14-scalable-guest-agent-design.md):
 * loop de tool-calling provider-agnóstico + gate de citações determinístico.
 *
 * O LLM nunca decide o envio: este módulo devolve um AgentOutcome; quem envia
 * (bot-bridge) cruza `covered` com o modo da propriedade (off/drafts/auto).
 * `callModel` é injetável — os adaptadores reais (Gemini/OpenAI) vivem em
 * lib/ai-agent-providers.ts; os testes usam um modelo falso.
 */

export interface AgentTool {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
    execute: (args: Record<string, unknown>) => Promise<{ content: string; citations: string[] }>;
}

export type ModelTurn =
    | { type: "text"; text: string }
    | { type: "tool_calls"; calls: Array<{ name: string; args: Record<string, unknown> }> };

export type AgentChatMessage =
    | { role: "system" | "user" | "assistant"; content: string }
    | { role: "tool"; name: string; content: string };

export type ModelCaller = (messages: AgentChatMessage[], tools: AgentTool[]) => Promise<ModelTurn>;

export interface AgentOutcome {
    covered: boolean;
    reply: string | null;
    citations: string[];
    reason: string; // ok | not_covered | invalid_citation | parse_error | max_iterations
}

/** Contrato de saída, anexado ao system prompt por quem monta o contexto (Task 6). */
export const AGENT_OUTPUT_INSTRUCTIONS = `
TOOLS: Use the available tools to fetch real data before answering. Never answer property or
calendar questions from memory.

FINAL ANSWER FORMAT: When you are done (with or without tools), respond with ONLY a single JSON
object — no markdown fence, no extra text:
{"covered": boolean, "reply": string, "citations": string[], "confidence": "high"|"low", "language": string}
- "covered" is true ONLY when every factual claim in "reply" is backed by data the tools returned
  in THIS conversation. General knowledge or guesses do NOT count.
- "citations" lists the bracketed keys of the exact facts used (e.g. "knowledge.wifiPassword",
  "fact:<id>", "calendar:2026-09-10..2026-09-13"). Empty when covered is false.
- When covered is false, "reply" must still be a warm, honest guest-facing message saying you'll
  confirm with the team shortly — in the guest's language. Never invent information.
- Never confirm, accept, pre-approve or modify a booking; invite the guest to complete the booking
  and note the team will confirm.`;

/** Extrai o primeiro objeto JSON do texto (tolera fences ```json e prosa à volta). */
function parseOutcome(text: string): { covered: boolean; reply: string | null; citations: string[] } | null {
    const cleaned = text.replace(/^```json?\s*|```\s*$/g, "").trim();
    const candidate = cleaned.startsWith("{") ? cleaned : cleaned.slice(cleaned.indexOf("{"));
    try {
        const parsed = JSON.parse(candidate) as { covered?: unknown; reply?: unknown; citations?: unknown };
        if (typeof parsed.covered !== "boolean") return null;
        return {
            covered: parsed.covered,
            reply: typeof parsed.reply === "string" && parsed.reply.trim() ? parsed.reply.trim() : null,
            citations: Array.isArray(parsed.citations) ? parsed.citations.filter((c): c is string => typeof c === "string") : [],
        };
    } catch {
        return null;
    }
}

export async function runAgent(opts: {
    systemPrompt: string;
    userMessage: string;
    history: Array<{ role: "user" | "assistant"; content: string }>;
    tools: AgentTool[];
    callModel: ModelCaller;
    maxIterations?: number;
}): Promise<AgentOutcome> {
    const max = opts.maxIterations ?? 4;
    const messages: AgentChatMessage[] = [
        { role: "system", content: opts.systemPrompt },
        ...opts.history,
        { role: "user", content: opts.userMessage },
    ];
    /** Chaves de citação REALMENTE fornecidas ao modelo nesta execução — o universo válido do gate. */
    const availableCitations = new Set<string>();

    for (let i = 0; i < max; i++) {
        let turn: ModelTurn;
        try {
            turn = await opts.callModel(messages, opts.tools);
        } catch (err) {
            throw err; // erro de LLM sobe — o chamador (decide) trata transient vs erro
        }

        if (turn.type === "tool_calls") {
            for (const call of turn.calls) {
                const tool = opts.tools.find((t) => t.name === call.name);
                messages.push({ role: "assistant", content: `[tool call] ${call.name}(${JSON.stringify(call.args)})` });
                if (!tool) {
                    messages.push({ role: "tool", name: call.name, content: `Error: unknown tool "${call.name}". Available: ${opts.tools.map((t) => t.name).join(", ") || "none"}.` });
                    continue;
                }
                try {
                    const result = await tool.execute(call.args ?? {});
                    result.citations.forEach((c) => availableCitations.add(c));
                    messages.push({ role: "tool", name: call.name, content: result.content });
                } catch (err) {
                    messages.push({ role: "tool", name: call.name, content: `Error: tool failed (${err instanceof Error ? err.message : "unknown"}). Treat this data as unavailable.` });
                }
            }
            continue;
        }

        // Resposta final → gate determinístico
        const parsed = parseOutcome(turn.text);
        if (!parsed) return { covered: false, reply: null, citations: [], reason: "parse_error" };
        if (!parsed.covered) return { covered: false, reply: parsed.reply, citations: [], reason: "not_covered" };
        if (!parsed.citations.length) return { covered: false, reply: parsed.reply, citations: [], reason: "not_covered" };
        const invalid = parsed.citations.filter((c) => !availableCitations.has(c));
        if (invalid.length) {
            console.warn("[ai-agent] invalid citations (auditoria):", invalid);
            return { covered: false, reply: parsed.reply, citations: [], reason: "invalid_citation" };
        }
        return { covered: true, reply: parsed.reply, citations: parsed.citations, reason: "ok" };
    }
    return { covered: false, reply: null, citations: [], reason: "max_iterations" };
}
```

- [ ] **Step 3: Correr o teste** — `npx tsx scripts/test-ai-agent.ts` → 7 grupos `ok:`, exit 0.

- [ ] **Step 4: `npx tsc --noEmit`** — sem erros.

- [ ] **Step 5: Commit**

```bash
git add lib/ai-agent.ts scripts/test-ai-agent.ts
git commit -m "feat(ai-agent): loop de tool-calling com gate determinístico de citações"
```

---

### Task 5: Adaptadores de provider (Gemini primário + OpenAI fallback)

**Files:**
- Create: `lib/ai-agent-providers.ts`
- Create: `scripts/test-ai-agent-live.ts` (smoke live, precisa de GEMINI_API_KEY)

**Interfaces:**
- Consumes: `AgentTool`, `AgentChatMessage`, `ModelTurn`, `ModelCaller` da Task 4; `isTransientLlmError` de `lib/ai-messaging.ts`.
- Produces: `buildModelCaller(): ModelCaller` — cadeia Gemini→OpenAI com function-calling em ambos, mesma semântica de fallover da `draftReply` existente. Task 6 injeta isto no `runAgent`.

- [ ] **Step 1: Implementar `lib/ai-agent-providers.ts`**

```typescript
import OpenAI from "openai";
import { GoogleGenerativeAI, SchemaType, type FunctionDeclaration, type Content } from "@google/generative-ai";
import type { AgentChatMessage, AgentTool, ModelCaller, ModelTurn } from "@/lib/ai-agent";
import { isTransientLlmError } from "@/lib/ai-messaging";

/**
 * Adaptadores de function-calling por provider para o loop do agente.
 * Ordem: Gemini primeiro (OpenAI está em 429 de quota permanente — handoff
 * 2026-07-14), OpenAI como fallback quando a key existe.
 * Cada chamada do loop tenta a cadeia completa (chamadas são stateless).
 */

const GEMINI_MODEL = process.env.GEMINI_MESSAGING_MODEL || "gemini-2.5-flash";
const OPENAI_MODEL = process.env.OPENAI_MESSAGING_MODEL || "gpt-4o-mini";

function toGeminiTools(tools: AgentTool[]): FunctionDeclaration[] {
    return tools.map((t) => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters as unknown as FunctionDeclaration["parameters"] ?? {
            type: SchemaType.OBJECT, properties: {},
        },
    }));
}

/** Gemini exige histórico a começar em user; role tool→function. */
function toGeminiContents(messages: AgentChatMessage[]): { system: string; contents: Content[] } {
    const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
    const contents: Content[] = [];
    for (const m of messages) {
        if (m.role === "system") continue;
        if (m.role === "tool") {
            contents.push({ role: "function", parts: [{ functionResponse: { name: m.name, response: { content: m.content } } }] });
        } else {
            contents.push({ role: m.role === "user" ? "user" : "model", parts: [{ text: m.content }] });
        }
    }
    while (contents.length && contents[0].role !== "user") contents.shift();
    return { system, contents };
}

async function callGemini(messages: AgentChatMessage[], tools: AgentTool[]): Promise<ModelTurn> {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("Missing GEMINI_API_KEY");
    const { system, contents } = toGeminiContents(messages);
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({
        model: GEMINI_MODEL,
        systemInstruction: system,
        generationConfig: { temperature: 0.4 },
        ...(tools.length ? { tools: [{ functionDeclarations: toGeminiTools(tools) }] } : {}),
    });
    const res = await model.generateContent({ contents });
    const fcalls = res.response.functionCalls();
    if (fcalls && fcalls.length) {
        return { type: "tool_calls", calls: fcalls.map((c) => ({ name: c.name, args: (c.args ?? {}) as Record<string, unknown> })) };
    }
    return { type: "text", text: res.response.text().trim() };
}

async function callOpenAI(messages: AgentChatMessage[], tools: AgentTool[]): Promise<ModelTurn> {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("Missing OPENAI_API_KEY");
    const openai = new OpenAI({ apiKey: key });
    const res = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        temperature: 0.4,
        messages: messages.map((m) => m.role === "tool"
            ? { role: "user" as const, content: `[tool result: ${m.name}]\n${m.content}` }
            : { role: m.role, content: m.content }),
        ...(tools.length ? {
            tools: tools.map((t) => ({
                type: "function" as const,
                function: { name: t.name, description: t.description, parameters: t.parameters },
            })),
        } : {}),
    });
    const msg = res.choices[0]?.message;
    if (msg?.tool_calls?.length) {
        return {
            type: "tool_calls",
            calls: msg.tool_calls.map((c) => ({
                name: c.function.name,
                args: (() => { try { return JSON.parse(c.function.arguments) as Record<string, unknown>; } catch { return {}; } })(),
            })),
        };
    }
    return { type: "text", text: (msg?.content ?? "").trim() };
}

/** Cadeia Gemini→OpenAI (só providers com key), com fallover em erros transitórios. */
export function buildModelCaller(): ModelCaller {
    return async (messages, tools) => {
        const chain: Array<(m: AgentChatMessage[], t: AgentTool[]) => Promise<ModelTurn>> = [];
        if (process.env.GEMINI_API_KEY) chain.push(callGemini);
        if (process.env.OPENAI_API_KEY) chain.push(callOpenAI);
        if (!chain.length) chain.push(callGemini); // deixa rebentar com o erro claro de key
        let lastErr: unknown;
        for (let i = 0; i < chain.length; i++) {
            try {
                return await chain[i](messages, tools);
            } catch (err) {
                lastErr = err;
                if (i === chain.length - 1 || !isTransientLlmError(err)) throw err;
                console.warn("[ai-agent-providers] fallover:", err instanceof Error ? err.message : err);
            }
        }
        throw lastErr;
    };
}
```

**NOTA de implementação:** os tipos exatos do SDK `@google/generative-ai` para `FunctionDeclaration.parameters`/`Content` podem exigir ajuste de casts — validar com `tsc` e com o smoke live do Step 2; não mudar a semântica.

- [ ] **Step 2: Smoke live (Gemini real + ferramenta real)**

```typescript
// scripts/test-ai-agent-live.ts
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { runAgent, AGENT_OUTPUT_INSTRUCTIONS, type AgentTool } from "../lib/ai-agent";
import { buildModelCaller } from "../lib/ai-agent-providers";

const tool: AgentTool = {
    name: "getKnowledge",
    description: "Returns the property's verified facts (wifi, check-in, amenities…). Always call this before answering property questions.",
    parameters: { type: "object", properties: {} },
    execute: async () => ({
        content: "[knowledge.wifiPassword] Wi-Fi password: sunset2026\n[knowledge.checkIn] Check-in: 15:00",
        citations: ["knowledge.wifiPassword", "knowledge.checkIn"],
    }),
};

(async () => {
    const out = await runAgent({
        systemPrompt: `You are a vacation-rental guest assistant. Today's date: ${new Date().toISOString().slice(0, 10)}.\n${AGENT_OUTPUT_INSTRUCTIONS}`,
        userMessage: "Hi! What's the wifi password?",
        history: [],
        tools: [tool],
        callModel: buildModelCaller(),
    });
    console.log(JSON.stringify(out, null, 2));
    // Armadilha de alucinação: pergunta de preço SEM ferramenta de calendário
    const trap = await runAgent({
        systemPrompt: `You are a vacation-rental guest assistant. Today's date: ${new Date().toISOString().slice(0, 10)}.\n${AGENT_OUTPUT_INSTRUCTIONS}`,
        userMessage: "How much for 3 nights in September?",
        history: [],
        tools: [tool],
        callModel: buildModelCaller(),
    });
    console.log(JSON.stringify(trap, null, 2));
    const trapOk = trap.covered === false && !/\d+\s?€|€\s?\d+|\$\d+/.test(trap.reply ?? "");
    console.log(trapOk ? "ok: armadilha de preço passou (sem números, escalou)" : "FAIL: armadilha de preço");
    process.exit(trapOk && out.covered ? 0 : 1);
})();
```

Run: `npx tsx scripts/test-ai-agent-live.ts`
Expected: 1º outcome `covered: true` com citação `knowledge.wifiPassword`; 2º `covered: false` sem nenhum número no reply; exit 0.

- [ ] **Step 3: `npx tsc --noEmit`** — sem erros (scripts/ excluído; o que conta é `lib/`).

- [ ] **Step 4: Commit**

```bash
git add lib/ai-agent-providers.ts scripts/test-ai-agent-live.ts
git commit -m "feat(ai-agent): adaptadores function-calling Gemini (primário) + OpenAI (fallback)"
```

---

### Task 6: Rewire `decide()` — regras duras divididas + agente + ferramentas reais

**Files:**
- Create: `lib/ai-agent-tools.ts`
- Modify: `lib/ai-decision.ts` (regras duras + delegação no agente)
- Modify: `scripts/test-ai-decision.ts` (expectativas novas)

**Interfaces:**
- Consumes: `runAgent`/`AGENT_OUTPUT_INSTRUCTIONS` (Task 4), `buildModelCaller` (Task 5), `getRoomCalendar`/`summariseCalendar` (Task 2), `loadPropertyFacts`/`formatKnowledgeWithCitations` (Task 3), `buildSystemPrompt`/`DraftContext`/`draftReply`/`isTransientLlmError` de `lib/ai-messaging.ts`.
- Produces: `decide(ctx: DraftContext): Promise<BotDecision>` com a MESMA assinatura e o MESMO tipo `BotDecision` de hoje (`citation` passa a ser as citações juntas por `", "`). `buildAgentTools(ctx: DraftContext): AgentTool[]` exportada para testes.

- [ ] **Step 1: Atualizar `scripts/test-ai-decision.ts` (falha primeiro)** — preço/disponibilidade informativos DEIXAM de ser regra dura; negociação mantém-se:

Substituir o conteúdo do bloco de testes por:

```typescript
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { matchesHardRule } from "../lib/ai-decision";

let failed = 0;
const t = (name: string, cond: boolean) => { if (!cond) { failed++; console.error("FAIL:", name); } else console.log("ok:", name); };

// NEGOCIAÇÃO/decisões — continuam a escalar SEMPRE
t("desconto pt", matchesHardRule("Fazem desconto para uma semana?") !== null);
t("discount en", matchesHardRule("Can you do a discount on the price?") !== null);
t("cheaper", matchesHardRule("any chance of a cheaper rate?") !== null);
t("mudar datas", matchesHardRule("Podemos mudar as datas da reserva?") !== null);
t("reclamação", matchesHardRule("O ar condicionado não funciona, isto é inaceitável") !== null);
t("reembolso", matchesHardRule("I want a refund") !== null);
t("cancelar", matchesHardRule("Quero cancelar a reserva") !== null);
t("early checkin", matchesHardRule("Can we check in early at 11am?") !== null);
t("bagagem", matchesHardRule("Podemos deixar as malas antes do check-in?") !== null);

// INFORMATIVAS — passam ao agente (que tem dados reais)
t("preço informativo passa", matchesHardRule("Qual é o preço para 3 noites em setembro?") === null);
t("price question passes", matchesHardRule("How much would 3 nights in September cost?") === null);
t("disponibilidade passa", matchesHardRule("Está livre de 20 a 23 de agosto?") === null);
t("availability passes", matchesHardRule("Is it available next weekend?") === null);
t("wifi passa", matchesHardRule("Qual é a password do wifi?") === null);
t("berço passa", matchesHardRule("Tem berço para bebé?") === null);
t("estacionamento passa", matchesHardRule("Where can I park?") === null);

process.exit(failed ? 1 : 0);
```

Run: `npx tsx scripts/test-ai-decision.ts`
Expected: FAIL nos casos "preço informativo passa" / "disponibilidade passa" (as regras atuais ainda os apanham).

- [ ] **Step 2: Criar `lib/ai-agent-tools.ts`** (liga as ferramentas ao contexto da conversa)

```typescript
import type { AgentTool } from "@/lib/ai-agent";
import type { DraftContext } from "@/lib/ai-messaging";
import { getRoomCalendar, summariseCalendar } from "@/lib/beds24/calendar";
import { loadPropertyFacts, formatKnowledgeWithCitations } from "@/lib/ai-knowledge";

/**
 * Constrói as ferramentas do agente LIGADAS à propriedade da conversa.
 * Isolamento por propriedade (invariante do spec): os ids vêm do ctx, nunca do modelo.
 */
export function buildAgentTools(ctx: DraftContext): AgentTool[] {
    const tools: AgentTool[] = [];

    tools.push({
        name: "getKnowledge",
        description: "Returns this property's verified facts: check-in/out, wifi, access, parking, house rules, amenities, learned facts. Call before answering any property question.",
        parameters: { type: "object", properties: {} },
        execute: async () => {
            const facts = ctx.property?.externalPropertyId
                ? await loadPropertyFacts(ctx.property.externalPropertyId)
                : [];
            return formatKnowledgeWithCitations(ctx.property, facts);
        },
    });

    const roomId = ctx.property?.beds24RoomId ?? null;
    if (roomId) {
        tools.push({
            name: "getCalendar",
            description: "Returns REAL availability and nightly prices for this property for a date range. The ONLY valid source for prices/availability/minimum stay. Dates are YYYY-MM-DD; checkOut is the departure day (exclusive night).",
            parameters: {
                type: "object",
                properties: {
                    checkIn: { type: "string", description: "First night, YYYY-MM-DD" },
                    checkOut: { type: "string", description: "Checkout day, YYYY-MM-DD" },
                },
                required: ["checkIn", "checkOut"],
            },
            execute: async (args) => {
                const checkIn = String(args.checkIn ?? "");
                const checkOut = String(args.checkOut ?? "");
                if (!/^\d{4}-\d{2}-\d{2}$/.test(checkIn) || !/^\d{4}-\d{2}-\d{2}$/.test(checkOut)) {
                    return { content: "Error: invalid dates. Use YYYY-MM-DD.", citations: [] };
                }
                const days = await getRoomCalendar(roomId, checkIn, checkOut);
                const s = summariseCalendar(days, checkIn, checkOut);
                // A citação só entra no universo válido se HÁ dados (sem dados → sem citação → gate escala)
                return { content: s.text, citations: days.length ? [s.citation] : [] };
            },
        });
    }

    return tools;
}
```

- [ ] **Step 3: Reescrever `lib/ai-decision.ts`**

```typescript
import { DraftContext, buildSystemPrompt, draftReply, isTransientLlmError } from "@/lib/ai-messaging";
import { runAgent, AGENT_OUTPUT_INSTRUCTIONS } from "@/lib/ai-agent";
import { buildModelCaller } from "@/lib/ai-agent-providers";
import { buildAgentTools } from "@/lib/ai-agent-tools";

export type BotDecision =
    | { action: "auto_send"; reply: string; citation: string }
    | { action: "needs_human"; draft: string | null; reason: string };

/**
 * Regras duras: NEGOCIAÇÃO e decisões escalam SEMPRE, sem LLM.
 * (Spec 2026-07-14: preço/disponibilidade INFORMATIVOS já não escalam —
 * o agente responde-lhes com dados reais do calendário.)
 */
const HARD_RULES: { reason: string; re: RegExp }[] = [
    { reason: "negotiation", re: /desconto|discount|cheaper|mais barato|lower price|better price|negoci|last minute deal/i },
    { reason: "dates_change", re: /mudar as datas|change (the )?dates|alterar? a reserva|modify (the )?booking|extend (the )?stay|prolongar|reschedule/i },
    { reason: "complaint", re: /n[aã]o funciona|not working|broken|avariad|inaceit|unacceptable|complain|reclama|problema com|issue with|dirty|sujo/i },
    { reason: "refund_cancel", re: /refund|reembols|cancel(ar|lation)?|devolu[çc][aã]o/i },
    { reason: "physical_action", re: /early check.?in|check.?in early|late check.?out|check.?out late|check.?in (cedo|antecipado)|deixar (as )?malas|luggage|bags? (before|early)|bagagem/i },
];

export function matchesHardRule(text: string): string | null {
    for (const r of HARD_RULES) if (r.re.test(text)) return r.reason;
    return null;
}

/**
 * Decide auto-send vs humano. Camada 1 (regras duras) → camada 2 (agente com
 * ferramentas) → camada 3 (gate de citações dentro do runAgent). O modo da
 * propriedade (off/drafts/auto) é aplicado pelo chamador (bot-bridge), como hoje.
 */
export async function decide(ctx: DraftContext): Promise<BotDecision> {
    const hard = matchesHardRule(ctx.guestMessage);
    if (hard) {
        let draft: string | null = null;
        try { draft = await draftReply(ctx); } catch { /* draft é opcional na escalação */ }
        return { action: "needs_human", draft, reason: `hard_rule:${hard}` };
    }

    try {
        const today = new Date().toISOString().slice(0, 10);
        const outcome = await runAgent({
            systemPrompt: `${buildSystemPrompt(ctx)}\n\nToday's date: ${today}.\n${AGENT_OUTPUT_INSTRUCTIONS}`,
            userMessage: ctx.guestMessage,
            history: ctx.history.map((m) => ({
                role: m.role === "guest" ? ("user" as const) : ("assistant" as const),
                content: m.content,
            })),
            tools: buildAgentTools(ctx),
            callModel: buildModelCaller(),
        });
        if (outcome.covered && outcome.reply) {
            return { action: "auto_send", reply: outcome.reply, citation: outcome.citations.join(", ") };
        }
        return { action: "needs_human", draft: outcome.reply, reason: outcome.reason };
    } catch (err) {
        return { action: "needs_human", draft: null, reason: isTransientLlmError(err) ? "llm_transient" : "llm_error" };
    }
}
```

**Nota:** `decisionMode` em `DraftContext`/`buildSystemPrompt` fica obsoleto mas NÃO se remove nesta task (o `regenerateDraft` de `app/actions/ai-inbox.ts:320` pode usá-lo) — verificar utilizações com grep; se só `ai-decision.ts` o usava, remover o bloco `decisionMode` de `buildSystemPrompt` e o campo do tipo, e correr `tsc`.

- [ ] **Step 4: Correr os testes**

Run: `npx tsx scripts/test-ai-decision.ts` — Expected: tudo `ok:`, exit 0.
Run: `npx tsx scripts/test-ai-agent.ts` — Expected: continua verde.

- [ ] **Step 5: Dry-run live do pipeline completo** — criar `scripts/test-decide-live.ts`:

```typescript
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { buildContext } from "../lib/ai-messaging";
import { decide } from "../lib/ai-decision";

(async () => {
    // Virtudes One (cobaia): propriedade 341090 — ligada e com knowledge
    const q = process.argv[2] ?? "Is the apartment available from 2026-09-10 to 2026-09-13? How much would it be?";
    const ctx = await buildContext({ guestMessage: q, externalPropertyId: "341090", history: [] });
    const d = await decide(ctx);
    console.log(JSON.stringify(d, null, 2));
})();
```

Run: `npx tsx scripts/test-decide-live.ts`
Expected: `auto_send` com `citation` a começar por `calendar:` e preços coerentes com o painel, OU `needs_human` com draft honesto se os dados não cobrirem. Correr também:
`npx tsx scripts/test-decide-live.ts "Fazem desconto?"` → Expected: `needs_human` com `reason: "hard_rule:negotiation"`.

- [ ] **Step 6: `npx tsc --noEmit`** — sem erros.

- [ ] **Step 7: Commit**

```bash
git add lib/ai-decision.ts lib/ai-agent-tools.ts scripts/test-ai-decision.ts scripts/test-decide-live.ts
git commit -m "feat(ai-agent): decide() delega no agente — preço/disponibilidade com dados reais, negociação escala sempre"
```

---

### Task 7: Import inicial de factos (arranque a frio)

**Files:**
- Create: `scripts/import-property-facts.ts`

**Interfaces:**
- Consumes: `beds24_properties.raw` (jsonb guardado no import), tabela `ai_property_fact` (Task 1).
- Produces: factos `source='imported'`, `status='active'` por propriedade. Script idempotente (re-correr não duplica).

- [ ] **Step 1: Implementar o script**

```typescript
// scripts/import-property-facts.ts — import inicial best-effort do knowledge Beds24
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { getSupabaseAdmin } from "../lib/supabase";

(async () => {
    const supabase = await getSupabaseAdmin();
    const { data: props, error } = await supabase
        .from("beds24_properties")
        .select("beds24_property_id, name, raw")
        .neq("role", "synthetic");
    if (error || !props) { console.error("read failed:", error); process.exit(1); }

    let inserted = 0;
    for (const p of props) {
        const extId = String(p.beds24_property_id);
        // Idempotência: salta propriedades que já têm factos imported
        const { count } = await supabase
            .from("ai_property_fact")
            .select("id", { count: "exact", head: true })
            .eq("external_property_id", extId)
            .eq("source", "imported");
        if ((count ?? 0) > 0) { console.log(`skip ${p.name} (já importado)`); continue; }

        const raw = (p.raw ?? {}) as Record<string, unknown>;
        const candidates: Array<{ topic: string; fact: string }> = [];
        const s = (v: unknown): string | null => (typeof v === "string" && v.trim().length > 10 ? v.trim() : null);

        // Campos best-effort do raw do Beds24 (GET /properties) — ajustar às chaves reais observadas
        const texts = (raw.texts ?? raw) as Record<string, unknown>;
        const desc = s(texts.propertyDescription) ?? s(raw.description);
        if (desc) candidates.push({ topic: "general", fact: `Listing description: ${desc.slice(0, 1500)}` });
        const rules = s(texts.houseRules) ?? s(raw.houseRules);
        if (rules) candidates.push({ topic: "house_rules", fact: `House rules: ${rules.slice(0, 1000)}` });
        const arrival = s(texts.arrivalInstructions);
        if (arrival) candidates.push({ topic: "access", fact: `Arrival info (verify before relying on codes): ${arrival.slice(0, 1000)}` });

        if (!candidates.length) { console.log(`sem textos: ${p.name} — nada a importar`); continue; }
        const { error: insErr } = await supabase.from("ai_property_fact").insert(
            candidates.map((c) => ({
                external_property_id: extId,
                topic: c.topic,
                fact: c.fact,
                source: "imported",
                status: "active",
            })),
        );
        if (insErr) console.error(`insert falhou ${p.name}:`, insErr.message);
        else { inserted += candidates.length; console.log(`ok: ${p.name} +${candidates.length} factos`); }
    }
    console.log(`total inseridos: ${inserted}`);
})();
```

- [ ] **Step 2: Inspecionar as chaves reais do raw primeiro** — Run: `npx tsx scripts/check-beds24.ts` (inspetor existente) ou `SELECT raw FROM beds24_properties LIMIT 1` no dashboard; ajustar os nomes de campos no script ao que existir de facto (o `raw` veio de `GET /properties` no import da Fase 1).

- [ ] **Step 3: Correr** — `npx tsx scripts/import-property-facts.ts` → factos criados para as 6 owned; re-correr → tudo `skip`.

- [ ] **Step 4: Verificar no live** — `npx tsx scripts/test-decide-live.ts "What are the house rules?"` → o draft cita `fact:<id>` dos importados.

- [ ] **Step 5: Commit**

```bash
git add scripts/import-property-facts.ts
git commit -m "feat(ai-agent): import inicial de factos do raw Beds24 (arranque a frio, idempotente)"
```

---

### Task 8: Learning loop — captura da resposta humana (2 canais)

**Files:**
- Create: `lib/ai-learning.ts`
- Modify: `lib/beds24/bot-bridge.ts` (branch `source === "host"`)
- Modify: `app/actions/ai-inbox.ts` (`sendReply`)
- Create: `scripts/test-ai-learning.ts`

**Interfaces:**
- Consumes: `ai_message_log` (par pergunta-escalada), `ai_property_fact` (Task 1), `buildModelCaller` (Task 5).
- Produces: `captureLearning(input: { reservationId: string; externalPropertyId: string | null; humanAnswer: string }): Promise<void>` — nunca lança; insere facto `pending` quando há par válido. `extractFactCandidate(question: string, answer: string, callModel: ModelCaller): Promise<{ topic: string; fact: string } | null>` exportada para teste.

- [ ] **Step 1: Teste da extração com modelo falso (falha primeiro)**

```typescript
// scripts/test-ai-learning.ts
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { extractFactCandidate } from "../lib/ai-learning";
import type { ModelCaller } from "../lib/ai-agent";

let failed = 0;
const t = (name: string, cond: boolean) => { if (!cond) { failed++; console.error("FAIL:", name); } else console.log("ok:", name); };

(async () => {
    const yes: ModelCaller = async () => ({ type: "text", text: JSON.stringify({ has_fact: true, topic: "amenities", fact: "Tem berço e cadeira de refeição disponíveis a pedido" }) });
    const r1 = await extractFactCandidate("Têm berço?", "Sim temos berço e cadeira de refeição, é só pedir!", yes);
    t("facto extraído", r1?.topic === "amenities" && !!r1?.fact);

    const no: ModelCaller = async () => ({ type: "text", text: JSON.stringify({ has_fact: false }) });
    const r2 = await extractFactCandidate("Can I leave my bags today at 11?", "Yes today it's fine, come by", no);
    t("situacional rejeitado", r2 === null);

    const broken: ModelCaller = async () => ({ type: "text", text: "hm let me think" });
    const r3 = await extractFactCandidate("q", "a resposta é esta e tem comprimento", broken);
    t("json partido = null", r3 === null);

    const r4 = await extractFactCandidate("q", "ok", yes);
    t("resposta curta ignorada", r4 === null);

    process.exit(failed ? 1 : 0);
})();
```

Run: `npx tsx scripts/test-ai-learning.ts` — Expected: FAIL, módulo não existe.

- [ ] **Step 2: Implementar `lib/ai-learning.ts`**

```typescript
import { getSupabaseAdmin } from "@/lib/supabase";
import type { ModelCaller } from "@/lib/ai-agent";
import { buildModelCaller } from "@/lib/ai-agent-providers";

/**
 * Learning loop (camada 4 do spec): quando o bot escalou e um humano respondeu
 * (backoffice OU Airbnb — ambos chegam cá), extrai um facto candidato e
 * grava-o como 'pending' para aprovação no backoffice. NUNCA lança.
 *
 * Guardas anti-lixo:
 *  - só corre quando existe uma escalação recente em aberto (needs_human/hard_rule,
 *    ≤7 dias) — é o par pergunta↔resposta; as mensagens agendadas do Airbnb
 *    (Booking Confirmation/Check-in/Follow Up/Farewell) raramente coincidem com
 *    uma escalação pendente, e o extrator rejeita conteúdo não-factual.
 *    (Refinar com o marcador/fingerprint da experiência de 17/07 quando existir.)
 *  - o extrator só aceita factos GERAIS e reutilizáveis da propriedade — nunca
 *    respostas situacionais desta reserva.
 */

const EXTRACT_PROMPT = `You review a Q&A between a vacation-rental guest and the human host.
Decide if the host's answer contains a GENERAL, REUSABLE fact about the PROPERTY itself —
something that would be true for future guests too (amenities, access, parking, rules, area info).
Situational answers about THIS booking only (e.g. "yes, today that's fine", "we'll check", dates,
prices, discounts) are NOT facts.
Respond with ONLY one JSON object, no fences:
{"has_fact": boolean, "topic": "amenities"|"access"|"parking"|"house_rules"|"area"|"general", "fact": string}
"fact" must be a single self-contained sentence in the language the host used.`;

export async function extractFactCandidate(
    question: string,
    answer: string,
    callModel: ModelCaller = buildModelCaller(),
): Promise<{ topic: string; fact: string } | null> {
    if (answer.trim().length < 15) return null;
    try {
        const turn = await callModel([
            { role: "system", content: EXTRACT_PROMPT },
            { role: "user", content: `Guest question: ${question}\nHost answer: ${answer}` },
        ], []);
        if (turn.type !== "text") return null;
        const cleaned = turn.text.replace(/^```json?\s*|```\s*$/g, "").trim();
        const parsed = JSON.parse(cleaned) as { has_fact?: boolean; topic?: string; fact?: string };
        if (parsed.has_fact !== true || !parsed.fact?.trim()) return null;
        const topics = ["amenities", "access", "parking", "house_rules", "area", "general"];
        return { topic: topics.includes(parsed.topic ?? "") ? parsed.topic! : "general", fact: parsed.fact.trim() };
    } catch {
        return null;
    }
}

export async function captureLearning(input: {
    reservationId: string;
    externalPropertyId: string | null;
    humanAnswer: string;
}): Promise<void> {
    try {
        if (!input.externalPropertyId) return;
        const supabase = await getSupabaseAdmin();

        // Par: a escalação em aberto mais recente desta conversa (≤7 dias)
        const { data: esc } = await supabase
            .from("ai_message_log")
            .select("id, incoming_message")
            .eq("reservation_ref", input.reservationId)
            .eq("status", "draft")
            .in("decision", ["needs_human", "hard_rule"])
            .gte("created_at", new Date(Date.now() - 7 * 24 * 3600_000).toISOString())
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
        if (!esc?.incoming_message) return;

        const candidate = await extractFactCandidate(esc.incoming_message, input.humanAnswer);
        if (!candidate) return;

        await supabase.from("ai_property_fact").insert({
            external_property_id: input.externalPropertyId,
            topic: candidate.topic,
            fact: candidate.fact,
            source: "learned",
            status: "pending",
            learned_from: input.reservationId,
        });
    } catch (e) {
        console.error("[ai-learning] capture failed:", e);
    }
}
```

- [ ] **Step 3: Hook no canal Airbnb** — em `lib/beds24/bot-bridge.ts`, no branch `msg.source === "host"` (linha ~77), DEPOIS do bloco `if (!sentByUs) { ... }` e dentro dele (só mensagens humanas genuínas), acrescentar:

```typescript
                if (!sentByUs) {
                    await supabase.from("ai_conversation").update({
                        // ... (bloco auto-off existente, inalterado)
                    }).eq("reservation_id", String(bookingId)).eq("bot_enabled", true);

                    // Learning loop: a resposta humana no Airbnb pode ensinar o bot
                    const { captureLearning } = await import("@/lib/ai-learning");
                    await captureLearning({
                        reservationId: String(bookingId),
                        externalPropertyId: propertyId ? String(propertyId) : null,
                        humanAnswer: msg.message,
                    });
                }
```

- [ ] **Step 4: Hook no canal backoffice** — em `app/actions/ai-inbox.ts`, dentro de `sendReply` (linha ~276), após o envio bem-sucedido via Beds24, acrescentar (obter `externalPropertyId` da `ai_conversation` da reserva):

```typescript
        // Learning loop: resposta humana enviada pelo backoffice
        try {
            const { data: conv } = await supabase
                .from("ai_conversation")
                .select("external_property_id")
                .eq("reservation_id", reservationId)
                .maybeSingle();
            const { captureLearning } = await import("@/lib/ai-learning");
            await captureLearning({
                reservationId,
                externalPropertyId: conv?.external_property_id ?? null,
                humanAnswer: text,
            });
        } catch { /* learning nunca bloqueia o envio */ }
```

**Atenção à ordem:** a captura tem de correr ANTES de o `sendReply` marcar o draft como `sent` (senão o par precisa do row ainda em `status='draft'`). Ler o corpo atual de `sendReply` e inserir a captura no ponto em que o draft ainda está por atualizar; se o update acontecer primeiro, capturar o `incoming_message` do draft row diretamente (o `draftRowId` está disponível) em vez de depender da query por status.

- [ ] **Step 5: Correr os testes** — `npx tsx scripts/test-ai-learning.ts` → tudo `ok:`; `npx tsx scripts/test-ai-agent.ts` e `npx tsx scripts/test-ai-decision.ts` continuam verdes.

- [ ] **Step 6: `npx tsc --noEmit`** — sem erros.

- [ ] **Step 7: Commit**

```bash
git add lib/ai-learning.ts lib/beds24/bot-bridge.ts app/actions/ai-inbox.ts scripts/test-ai-learning.ts
git commit -m "feat(ai-agent): learning loop — resposta humana (backoffice/Airbnb) vira facto pending"
```

---

### Task 9: Fila de sugestões de knowledge — ações + UI + i18n

**Files:**
- Modify: `app/actions/ai-inbox.ts` (3 ações novas)
- Modify: `components/admin/inbox/BotSettings.tsx` (secção de sugestões)
- Modify: `messages/en.json`, `messages/pt.json`, `messages/he.json` (namespace `AiInbox`)

**Interfaces:**
- Consumes: `ai_property_fact` (Task 1); padrão de guarda das ações existentes em `app/actions/ai-inbox.ts` (replicar a verificação de role usada por `updateBrandTone`).
- Produces:
  - `listFactSuggestions(): Promise<FactSuggestion[]>` — `FactSuggestion = { id: string; propertyName: string | null; topic: string; fact: string; learnedFrom: string | null; createdAt: string }` (junta `beds24_properties.name` por `external_property_id`)
  - `reviewFact(id: string, action: "approve" | "reject", editedFact?: string): Promise<{ ok: boolean; error?: string }>` — approve → `status='active'` (+ `fact=editedFact` se dado, `reviewed_by`=email do admin); reject → `status='rejected'`.

- [ ] **Step 1: Implementar as ações** em `app/actions/ai-inbox.ts` (seguir o padrão de auth/role das ações vizinhas — copiar a guarda de `updateBrandTone`):

```typescript
export interface FactSuggestion {
    id: string;
    propertyName: string | null;
    topic: string;
    fact: string;
    learnedFrom: string | null;
    createdAt: string;
}

export async function listFactSuggestions(): Promise<FactSuggestion[]> {
    // [mesma guarda de role das ações vizinhas]
    const supabase = await getSupabaseAdmin();
    const { data: facts } = await supabase
        .from("ai_property_fact")
        .select("id, external_property_id, topic, fact, learned_from, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(50);
    if (!facts?.length) return [];
    const propIds = [...new Set(facts.map((f) => Number(f.external_property_id)).filter(Number.isFinite))];
    const { data: props } = await supabase
        .from("beds24_properties")
        .select("beds24_property_id, name")
        .in("beds24_property_id", propIds);
    const nameById = new Map((props ?? []).map((p) => [String(p.beds24_property_id), p.name as string]));
    return facts.map((f) => ({
        id: f.id as string,
        propertyName: nameById.get(String(f.external_property_id)) ?? null,
        topic: f.topic as string,
        fact: f.fact as string,
        learnedFrom: (f.learned_from as string) ?? null,
        createdAt: f.created_at as string,
    }));
}

export async function reviewFact(
    id: string, action: "approve" | "reject", editedFact?: string,
): Promise<{ ok: boolean; error?: string }> {
    // [mesma guarda de role + captura do email do admin, como nas ações vizinhas]
    const supabase = await getSupabaseAdmin();
    const { error } = await supabase.from("ai_property_fact").update({
        status: action === "approve" ? "active" : "rejected",
        ...(action === "approve" && editedFact?.trim() ? { fact: editedFact.trim() } : {}),
        reviewed_by: adminEmail, // obtido pela guarda
        updated_at: new Date().toISOString(),
    }).eq("id", id).eq("status", "pending");
    return error ? { ok: false, error: error.message } : { ok: true };
}
```

- [ ] **Step 2: UI em `BotSettings.tsx`** — nova secção "Sugestões de knowledge" no fim do painel (o BotSettings já é o ecrã de configuração do bot): lista de cartões `pending` com nome da propriedade + topic pill + texto do facto editável (textarea) + botões Aprovar/Rejeitar; estado vazio simpático; contador no título. Seguir o estilo visual existente do componente (rounded-2xl, borders `#f5f5f5`, dark `admin-dark-*`). Carregar via `listFactSuggestions()` num `useEffect` quando a secção monta; `reviewFact` em cada botão com update otimista da lista.

- [ ] **Step 3: i18n** — acrescentar ao namespace `AiInbox` nos 3 ficheiros (paridade obrigatória):

| chave | en | pt | he |
|---|---|---|---|
| `factSuggestions` | Knowledge suggestions | Sugestões de knowledge | הצעות ידע |
| `factSuggestionsHint` | Answers your team gave that can teach the bot. Approve to add them to the property's knowledge. | Respostas da equipa que podem ensinar o bot. Aprova para entrarem no knowledge da propriedade. | תשובות של הצוות שיכולות ללמד את הבוט. אשרו כדי להוסיף לידע הנכס. |
| `factApprove` | Approve | Aprovar | אישור |
| `factReject` | Reject | Rejeitar | דחייה |
| `factEmpty` | No suggestions right now — the bot will add them as conversations are escalated and answered. | Sem sugestões de momento — o bot acrescenta-as à medida que conversas escalam e são respondidas. | אין הצעות כרגע — הבוט יוסיף אותן ככל ששיחות יוסלמו וייענו. |
| `factFrom` | From conversation | Da conversa | מהשיחה |

- [ ] **Step 4: Verificar paridade i18n** — grep às 7 chaves nos 3 ficheiros; contagem igual.

- [ ] **Step 5: `npx tsc --noEmit` + `npm run lint`** — sem erros novos.

- [ ] **Step 6: Verificação visual** — `npm run dev` via preview (config Claude usa a porta 3001), abrir `/en/admin/activity`, engrenagem → BotSettings → secção visível; com a migração aplicada e um facto `pending` inserido à mão via SQL, aprovar → desaparece da lista e fica `active` na BD.

- [ ] **Step 7: Commit**

```bash
git add app/actions/ai-inbox.ts components/admin/inbox/BotSettings.tsx messages/en.json messages/pt.json messages/he.json
git commit -m "feat(ai-inbox): fila de sugestões de knowledge no BotSettings (aprovar/editar/rejeitar)"
```

---

### Task 10: Verificação final integrada

**Files:** nenhum novo (só verificação e, se preciso, fixes).

- [ ] **Step 1: Bateria completa de testes-script**

```bash
npx tsx scripts/test-calendar-summary.ts
npx tsx scripts/test-ai-knowledge.ts
npx tsx scripts/test-ai-agent.ts
npx tsx scripts/test-ai-decision.ts
npx tsx scripts/test-ai-learning.ts
npx tsx scripts/test-ai-agent-live.ts
```
Expected: todos exit 0. O `test-ai-agent-live.ts` inclui a armadilha de alucinação (preço sem calendário → sem números + escala) — TEM de passar.

- [ ] **Step 2: Dry-runs live do pipeline** (Virtudes One, 341090):

```bash
npx tsx scripts/test-decide-live.ts "está livre de 20 a 23 de setembro? quanto fica?"   # → auto_send c/ citation calendar:…
npx tsx scripts/test-decide-live.ts "do you have a baby crib?"                          # → needs_human (se não houver facto) c/ draft honesto
npx tsx scripts/test-decide-live.ts "Fazem desconto para 5 noites?"                     # → hard_rule:negotiation
```

- [ ] **Step 3: Verificação do projeto** — `npx tsc --noEmit` + `npm run lint` + `npm run build` + `npm run test:security` → todos limpos.

- [ ] **Step 4: Configuração de produção (Marcelo faz):**
  1. Aplicar a migração `20260715090000_ai_property_fact.sql` no dashboard Supabase (se ainda não feita).
  2. Definir `AI_MESSAGING_PROVIDER=gemini` no Vercel (Production) e `.env.local` — Gemini primário.
  3. Correr `npx tsx scripts/import-property-facts.ts` (uma vez, após a migração).
  4. Confirmar Virtudes One em modo `drafts` no BotSettings.

- [ ] **Step 5: E2E real (com o Marcelo, conta Carolina):** mensagem de preço/disponibilidade no Airbnb → draft grounded aparece no inbox com citação `calendar:…` e números corretos vs painel Beds24; pergunta sem cobertura → escalação + draft "vou confirmar"; responder pelo Airbnb (conta João) → facto `pending` aparece nas sugestões do BotSettings.

- [ ] **Step 6: Commit final + atualizar handoff**

```bash
git add -A
git commit -m "feat(ai-agent): agente escalável verificado ponta-a-ponta (drafts nas 6 owned)"
```

Atualizar `docs/superpowers/specs/2026-07-13-beds24-STATUS-HANDOFF.md` com o estado (agente live em drafts; learning loop ativo; pendente: filtro fino das mensagens agendadas pós-17/07; promoção a auto após 2-3 semanas).

---

## Self-review (feito na escrita)

- **Cobertura do spec:** camada 1 (Task 6), camada 2 (Tasks 2-5), camada 3/gate (Task 4 + 6), camada 4 (Task 8-9), `ai_property_fact` (Task 1), import inicial (Task 7), rollout drafts-first 6 owned (Task 10). Filtro das agendadas: guarda estrutural na Task 8 (par exige escalação pendente + extrator rejeita não-factual); o refinamento por marcador/fingerprint fica explicitamente dependente da experiência de 17/07 (fora deste plano, como no spec).
- **Placeholders:** os dois pontos genuinamente desconhecidos (formato exato do calendário Beds24; chaves do `raw` das propriedades) têm passos de PROBE explícitos antes do parse ser fixado — não são TBDs, são verificação contra a realidade.
- **Consistência de tipos:** `AgentTool`/`ModelTurn`/`ModelCaller`/`AgentChatMessage` definidos na Task 4 e consumidos textualmente nas Tasks 5, 6, 8; `PropertyFact` na Task 3 consumido na 6; `BotDecision` inalterado para o bot-bridge.
