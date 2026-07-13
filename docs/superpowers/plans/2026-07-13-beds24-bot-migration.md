# Migração do bot de IA para Beds24 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Portar o pipeline de IA de mensagens do branch `feat/ai-guest-messaging` (Hospitable) para o transporte Beds24 provado, com motor auto-send "sabe/não sabe" + human-in-the-loop e inbox premium em `admin/activity`.

**Architecture:** O webhook Beds24 existente (`app/api/webhooks/beds24/route.ts`) ganha um hook pós-ingestão (`lib/beds24/bot-bridge.ts`) que alimenta `ai_conversation`/`ai_message_log`, desliga o bot quando `source=host`, e em mensagens `guest` corre o motor de decisão (`lib/ai-decision.ts`): regras duras → conhecimento cobre? → auto-send via `POST /bookings/messages` OU fila humana com draft. UI nova em 3 painéis. Código Hospitable NÃO entra em main.

**Tech Stack:** Next.js 16 App Router, Supabase (service-role via `getSupabaseAdmin()`), Gemini (pipeline existente em `lib/ai-messaging.ts`), cliente Beds24 existente (`lib/beds24/client.ts`), Tailwind com tokens `admin-dark-*`.

## Global Constraints

- Requisito nº 1 do projeto: NADA pode afetar o site público. Só ficheiros novos + os 2 pontos de integração listados (webhook beds24, página activity).
- `lib/hospitable-api.ts`, `lib/hospitable.ts`, `app/api/webhooks/hospitable/route.ts`: NUNCA entram em main.
- Migrações SQL aplicam-se MANUALMENTE no Supabase — cada task que cria migração termina com aviso explícito ao Marcelo.
- Sem test runner no repo: ciclos de teste = `scripts/test-*.ts` corridos com `npx tsx` (padrão existente) + `npx tsc --noEmit` (scripts/ está fora do tsconfig).
- i18n: chaves novas em paridade nos 3 ficheiros `messages/{en,pt,he}.json`.
- Actions novas: guard `role in ('admin','super_admin')` como no padrão do repo (ver `app/actions/beds24.ts` → `guard()`).
- UI: premium pixel-perfect; dark mode obrigatório (`dark:admin-dark-*`); sentence case; PT como língua da equipa mas chaves i18n nas 3 línguas.
- Auto-send NUNCA acontece com `bot_mode != 'auto'` na propriedade, NUNCA em regras duras, NUNCA sem citação de knowledge.
- Commits frequentes, mensagens `feat(ai-inbox): ...`.

## Mapa de ficheiros

| Ficheiro | Ação | Responsabilidade |
|---|---|---|
| `supabase/migrations/20260714090000_ai_messaging_beds24.sql` | Create | Tabelas ai_* consolidadas p/ Beds24 + bot_mode |
| `lib/ai-messaging.ts` | Create (port adaptado) | Pipeline Gemini: contexto, tom, prompt, draft |
| `lib/ai-decision.ts` | Create | Motor "sabe/não sabe": regras duras + decisão LLM estruturada |
| `lib/beds24/bot-bridge.ts` | Create | Webhook → conversas/mensagens ai_* → decisão → envio/fila |
| `app/api/webhooks/beds24/route.ts` | Modify | +1 chamada ao bridge após ingestão |
| `app/actions/ai-inbox.ts` | Create (port adaptado) | Actions do inbox (listar, thread, enviar, toggles, tom, knowledge) |
| `app/[locale]/admin/activity/page.tsx` | Modify | Página do inbox (server component, guard) |
| `components/admin/inbox/InboxShell.tsx` | Create | Layout 3 painéis + auto-refresh + estado selecionado |
| `components/admin/inbox/ConversationList.tsx` | Create | Painel 1: filtros, pills de estado, fila humana no topo |
| `components/admin/inbox/ThreadView.tsx` | Create | Painel 2: bolhas, cartão auto-send, cartão draft, resposta manual |
| `components/admin/inbox/ContextPanel.tsx` | Create | Painel 3: reserva, toggle bot, estado do knowledge |
| `components/admin/inbox/BotSettings.tsx` | Create | Kill-switch global + modo por propriedade + tom |
| `scripts/test-ai-decision.ts` | Create | Teste do motor de decisão (regras duras, needs_human) |
| `scripts/test-bot-bridge.ts` | Create | Simulação webhook→bridge local (padrão test-security) |
| `messages/{en,pt,he}.json` | Modify | Chaves `AiInbox.*` |

Portados do branch com `git show feat/ai-guest-messaging:<path>`: `lib/ai-messaging.ts` (adaptado), partes de `app/actions/ai-messaging.ts` → `ai-inbox.ts`, `components/admin/PropertyKnowledgeManager.tsx` e `BotToneManager.tsx` (reaproveitados com refresh visual dentro de BotSettings).

---

### Task 1: Migração SQL consolidada

**Files:**
- Create: `supabase/migrations/20260714090000_ai_messaging_beds24.sql`

**Interfaces:**
- Produces: tabelas `property_ai_knowledge`, `ai_message_log`, `ai_conversation`, `ai_settings` (adaptadas a Beds24) + coluna `beds24_properties.bot_mode`.

- [ ] **Step 1: Extrair as migrações originais do branch para referência**

```bash
mkdir -p /tmp/ai-mig && for f in 20260709120000_ai_messaging 20260709130000_ai_messaging_phase2 20260709150000_ai_conversations 20260709160000_ai_messaging_settings 20260710120000_property_ai_extras 20260710130000_ai_conversation_bot_checked 20260710140000_ai_conversation_bot_enabled; do git show feat/ai-guest-messaging:supabase/migrations/$f.sql > /tmp/ai-mig/$f.sql; done
```

- [ ] **Step 2: Escrever a migração consolidada** — uma só migração com o schema FINAL (não replay das 7). Conteúdo: as tabelas dos ficheiros de referência com estas alterações:

```sql
-- 20260714090000_ai_messaging_beds24.sql
-- Consolidação das migrações ai_* do branch feat/ai-guest-messaging, adaptadas ao transporte Beds24.
-- APLICAR MANUALMENTE no dashboard Supabase.

-- (colar aqui o conteúdo de /tmp/ai-mig/*.sql na ordem acima, com as alterações:)
-- 1. property_ai_knowledge: renomear coluna hospitable_property_id -> external_property_id (text;
--    passa a guardar o beds24 property id como texto). Mesmo rename em qualquer índice/único.
-- 2. ai_message_log: renomear hospitable_event_id -> external_event_id e
--    hospitable_message_id -> external_message_id (idempotência passa a usar beds24_message_id).
--    Adicionar colunas novas:
alter table public.ai_message_log add column if not exists decision text
    check (decision in ('auto_sent','needs_human','hard_rule','bot_off'));
alter table public.ai_message_log add column if not exists knowledge_citation text;
alter table public.ai_message_log add column if not exists auto_sent_at timestamptz;
-- 3. ai_conversation: reservation_id passa a guardar beds24_booking_id (text); renomear
--    hospitable_property_id -> external_property_id. Manter bot_enabled/bot_checked.
-- 4. Modo do bot por propriedade (tabela nossa da fase 1 — permitido):
alter table public.beds24_properties add column if not exists bot_mode text not null default 'off'
    check (bot_mode in ('off','drafts','auto'));
-- 5. ai_settings (kill-switch global + tom): tabela do branch tal-qual.
-- RLS: políticas dos ficheiros originais (staff admin/super_admin/editor), inalteradas.
```

O ficheiro final NÃO tem comentários-instrução: contém o SQL completo resultante.

- [ ] **Step 3: Validar o SQL localmente** (sintaxe): `npx tsx -e "console.log('lint manual: rever CREATE/ALTER, sem referências hospitable_')"` — verificação manual: `grep -i hospitable supabase/migrations/20260714090000_ai_messaging_beds24.sql` → **0 resultados**.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260714090000_ai_messaging_beds24.sql
git commit -m "feat(ai-inbox): consolidated ai_* migration adapted to Beds24 transport"
```

- [ ] **Step 5: AVISAR O MARCELO** — a migração tem de ser aplicada manualmente no Supabase antes da Task 10 (teste E2E). Dizer explicitamente no chat.

### Task 2: Portar `lib/ai-messaging.ts` (pipeline Gemini) sem Hospitable

**Files:**
- Create: `lib/ai-messaging.ts`

**Interfaces:**
- Consumes: tabelas da Task 1.
- Produces (usadas nas Tasks 3-6): `PropertyKnowledge`, `ReservationContext`, `ThreadMessage`, `DraftContext`, `buildContext(input)`, `buildSystemPrompt(ctx)`, `draftReply(ctx): Promise<string>`, `loadBrandTone()`, `loadPropertyKnowledge(externalPropertyId: string|null)`, `describeProvider()`, `isTransientLlmError(err)`, `DEFAULT_BRAND_TONE_TEXT`, `EXTRAS_COLUMNS`, `PROPERTY_BASE_COLUMNS`, `mapPropertyBase`, `mapExtrasRow`.

- [ ] **Step 1: Trazer o ficheiro do branch**

```bash
git show feat/ai-guest-messaging:lib/ai-messaging.ts > lib/ai-messaging.ts
```

- [ ] **Step 2: Adaptações (edits concretos):**
1. Renomear todas as referências de coluna `hospitable_property_id` → `external_property_id` (bate com a Task 1).
2. `loadPropertyKnowledge(hospitablePropertyId...)` → `loadPropertyKnowledge(externalPropertyId: string | null | undefined)`.
3. Em `IncomingGuestMessage`: `hospitablePropertyId` → `externalPropertyId`; `hospitableEventId`/`hospitableMessageId` → `externalEventId`/`externalMessageId` (e as colunas de insert correspondentes `external_event_id`/`external_message_id`).
4. **Remover** `draftForGuestMessage`, `setBotOff`, `flagPlatformMessage` DESTE ficheiro — a lógica de decisão/fila muda e passa para `lib/ai-decision.ts` e `lib/beds24/bot-bridge.ts` (Tasks 3-4). `lib/ai-messaging.ts` fica só com: tipos, tom, knowledge, contexto, prompt, `draftReply`, util de erros. (Apagar também imports que ficarem órfãos.)
5. `grep -in hospitable lib/ai-messaging.ts` → 0 resultados.

- [ ] **Step 3: Verificar**: `npx tsc --noEmit` → 0 erros.

- [ ] **Step 4: Commit**

```bash
git add lib/ai-messaging.ts
git commit -m "feat(ai-inbox): port Gemini drafting pipeline, transport-neutral (no Hospitable)"
```

### Task 3: Motor de decisão `lib/ai-decision.ts` + teste

**Files:**
- Create: `lib/ai-decision.ts`
- Test: `scripts/test-ai-decision.ts`

**Interfaces:**
- Consumes: `DraftContext`, `buildContext`, `buildSystemPrompt`, `draftReply`, `isTransientLlmError` (Task 2).
- Produces: `matchesHardRule(text: string): string | null`; `decide(ctx: DraftContext): Promise<BotDecision>`; `type BotDecision = { action: "auto_send"; reply: string; citation: string } | { action: "needs_human"; draft: string | null; reason: string }`.

- [ ] **Step 1: Escrever o teste primeiro** (`scripts/test-ai-decision.ts`, padrão do `scripts/test-security.ts`: asserts com `process.exitCode`):

```ts
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { matchesHardRule } from "../lib/ai-decision";

let failed = 0;
const t = (name: string, cond: boolean) => { if (!cond) { failed++; console.error("FAIL:", name); } else console.log("ok:", name); };

// Regras duras — têm de escalar
t("preço pt", matchesHardRule("Qual é o preço para dezembro?") !== null);
t("price en", matchesHardRule("Can you do a discount on the price?") !== null);
t("datas", matchesHardRule("Podemos mudar as datas da reserva?") !== null);
t("reclamação", matchesHardRule("O ar condicionado não funciona, isto é inaceitável") !== null);
t("reembolso", matchesHardRule("I want a refund") !== null);
t("cancelar", matchesHardRule("Quero cancelar a reserva") !== null);
t("early checkin", matchesHardRule("Can we check in early at 11am?") !== null);
t("bagagem", matchesHardRule("Podemos deixar as malas antes do check-in?") !== null);

// Perguntas informativas — NÃO são regra dura (seguem para o LLM)
t("wifi passa", matchesHardRule("Qual é a password do wifi?") === null);
t("berço passa", matchesHardRule("Tem berço para bebé?") === null);
t("estacionamento passa", matchesHardRule("Where can I park?") === null);

process.exit(failed ? 1 : 0);
```

- [ ] **Step 2: Correr — tem de FALHAR**: `npx tsx scripts/test-ai-decision.ts` → erro "Cannot find module '../lib/ai-decision'".

- [ ] **Step 3: Implementar `lib/ai-decision.ts`:**

```ts
import { DraftContext, draftReply, isTransientLlmError } from "@/lib/ai-messaging";

export type BotDecision =
    | { action: "auto_send"; reply: string; citation: string }
    | { action: "needs_human"; draft: string | null; reason: string };

/** Regras duras: temas que escalam SEMPRE para humano, sem LLM. Devolve o motivo ou null. */
const HARD_RULES: { reason: string; re: RegExp }[] = [
    { reason: "pricing", re: /pre[çc]o|price|discount|desconto|tarif|rate|cost|custa|valor|payment|pagamento/i },
    { reason: "dates_change", re: /mudar as datas|change (the )?dates|alterar? a reserva|modify (the )?booking|extend (the )?stay|prolongar/i },
    { reason: "availability", re: /disponibilidade|availab|vagas?|free on|livre em/i },
    { reason: "complaint", re: /n[aã]o funciona|not working|broken|avariad|inaceit|unacceptable|complain|reclama|problema com|issue with|dirty|sujo/i },
    { reason: "refund_cancel", re: /refund|reembols|cancel(ar|lation)?|devolu[çc][aã]o/i },
    { reason: "physical_action", re: /early check.?in|late check.?out|check.?in (cedo|antecipado)|deixar (as )?malas|luggage|bags? (before|early)|bagagem/i },
];

export function matchesHardRule(text: string): string | null {
    for (const r of HARD_RULES) if (r.re.test(text)) return r.reason;
    return null;
}

/**
 * Decide auto-send vs humano. O LLM responde em JSON estruturado; só há auto_send quando
 * `covered=true` E existe citação de knowledge. Qualquer dúvida/erro → needs_human.
 */
export async function decide(ctx: DraftContext): Promise<BotDecision> {
    const hard = matchesHardRule(ctx.incomingMessage);
    if (hard) {
        let draft: string | null = null;
        try { draft = await draftReply(ctx); } catch { /* draft é opcional na escalação */ }
        return { action: "needs_human", draft, reason: `hard_rule:${hard}` };
    }
    try {
        const raw = await draftReply({
            ...ctx,
            decisionMode: true, // ver Task 2 nota abaixo: draftReply aceita flag que injeta a instrução JSON
        } as DraftContext & { decisionMode: boolean });
        const parsed = JSON.parse(raw.replace(/^```json?\s*|```\s*$/g, "")) as {
            covered: boolean; citation?: string; reply?: string;
        };
        if (parsed.covered && parsed.citation && parsed.reply) {
            return { action: "auto_send", reply: parsed.reply, citation: parsed.citation };
        }
        return { action: "needs_human", draft: parsed.reply ?? null, reason: "not_covered" };
    } catch (err) {
        return { action: "needs_human", draft: null, reason: isTransientLlmError(err) ? "llm_transient" : "llm_error" };
    }
}
```

Nota de implementação (faz parte desta task): em `lib/ai-messaging.ts`, `buildSystemPrompt` ganha um bloco condicional quando `ctx.decisionMode === true` — instrução: *"Responde APENAS com JSON `{"covered": boolean, "citation": string, "reply": string}`. `covered=true` só se a resposta estiver explícita no knowledge da propriedade; `citation` = o campo do knowledge usado (ex.: 'wifi'); nunca inventes informação."* E `DraftContext` ganha `decisionMode?: boolean`.

- [ ] **Step 4: Correr o teste — PASSA**: `npx tsx scripts/test-ai-decision.ts` → exit 0. E `npx tsc --noEmit` → 0 erros.

- [ ] **Step 5: Commit**

```bash
git add lib/ai-decision.ts scripts/test-ai-decision.ts lib/ai-messaging.ts
git commit -m "feat(ai-inbox): knows-or-escalates decision engine with hard rules and knowledge citation"
```

### Task 4: Bridge webhook→bot `lib/beds24/bot-bridge.ts` + teste

**Files:**
- Create: `lib/beds24/bot-bridge.ts`
- Test: `scripts/test-bot-bridge.ts`

**Interfaces:**
- Consumes: `Beds24Message`, `Beds24Booking` (`lib/beds24/types.ts`), `beds24Request` (`lib/beds24/client.ts`), `getSupabaseAdmin` (`lib/supabase.ts`), `decide` (Task 3), `buildContext`/`loadPropertyKnowledge` (Task 2).
- Produces: `processBotMessages(booking: Beds24Booking | null, messages: Beds24Message[]): Promise<void>` — chamada pelo webhook (Task 5). Nunca lança (loga e segue; o webhook não pode falhar por causa do bot).

- [ ] **Step 1: Escrever `lib/beds24/bot-bridge.ts`:**

```ts
import { getSupabaseAdmin } from "@/lib/supabase";
import { beds24Request } from "@/lib/beds24/client";
import type { Beds24Booking, Beds24Message } from "@/lib/beds24/types";
import { buildContext } from "@/lib/ai-messaging";
import { decide } from "@/lib/ai-decision";

/**
 * Ponte webhook→bot. Corre DEPOIS da ingestão beds24_* (nunca a bloqueia nem lança).
 * host → bot off na conversa; guest → decisão → auto-send ou fila humana.
 */
export async function processBotMessages(booking: Beds24Booking | null, messages: Beds24Message[]): Promise<void> {
    try {
        const supabase = await getSupabaseAdmin();
        const bookingId = booking?.id ?? messages[0]?.bookingId;
        if (!bookingId) return;

        // Kill-switch global
        const { data: settings } = await supabase.from("ai_settings").select("bot_globally_enabled").eq("id", 1).maybeSingle();
        if (settings && settings.bot_globally_enabled === false) return;

        // Upsert da conversa (uma por booking)
        const propertyId = booking?.propertyId ?? null;
        await supabase.from("ai_conversation").upsert({
            reservation_id: String(bookingId),
            external_property_id: propertyId ? String(propertyId) : null,
            guest_name: [booking?.firstName, booking?.lastName].filter(Boolean).join(" ") || null,
            platform: "airbnb",
            check_in: booking?.arrival ?? null,
            check_out: booking?.departure ?? null,
            updated_at: new Date().toISOString(),
        }, { onConflict: "reservation_id" });

        for (const msg of messages) {
            if (!msg.message) continue;
            if (msg.source === "host") {
                // Humano (ou o próprio bot) respondeu → bot off nesta conversa; auto_sent do bot não desliga
                const { data: own } = await supabase.from("ai_message_log")
                    .select("id").eq("external_message_id", String(msg.id)).maybeSingle();
                if (!own) await supabase.from("ai_conversation")
                    .update({ bot_enabled: false, updated_at: new Date().toISOString() })
                    .eq("reservation_id", String(bookingId));
                continue;
            }
            if (msg.source !== "guest") continue;
            await handleGuestMessage(supabase, bookingId, propertyId, msg);
        }
    } catch (e) {
        console.error("[bot-bridge] failed:", e);
    }
}

async function handleGuestMessage(
    supabase: Awaited<ReturnType<typeof getSupabaseAdmin>>,
    bookingId: number, propertyId: number | null, msg: Beds24Message,
): Promise<void> {
    // Bot off nesta conversa?
    const { data: conv } = await supabase.from("ai_conversation")
        .select("bot_enabled").eq("reservation_id", String(bookingId)).maybeSingle();
    if (conv?.bot_enabled === false) return;

    // Modo da propriedade
    const { data: prop } = await supabase.from("beds24_properties")
        .select("bot_mode, name").eq("beds24_property_id", propertyId ?? -1).maybeSingle();
    const mode: "off" | "drafts" | "auto" = (prop?.bot_mode as never) ?? "off";
    if (mode === "off") return;

    // Claim idempotente (unique em external_message_id)
    const { data: row, error } = await supabase.from("ai_message_log").insert({
        reservation_ref: String(bookingId),
        external_message_id: String(msg.id),
        property_code: prop?.name ?? null,
        channel: "airbnb",
        incoming_message: msg.message,
        status: "draft",
    }).select("id").single();
    if (error || !row) return; // duplicado ou falha de storage → nada a fazer (payload bruto fica no webhook event)

    const ctx = await buildContext({
        externalPropertyId: propertyId ? String(propertyId) : null,
        incomingMessage: msg.message!,
        reservationId: String(bookingId),
    });
    const decision = await decide(ctx);

    if (decision.action === "auto_send" && mode === "auto") {
        const res = await beds24Request<unknown>("POST", "/bookings/messages", {
            body: [{ bookingId, message: decision.reply }], context: "bot",
        }) as Array<{ success: boolean }>;
        await supabase.from("ai_message_log").update(res?.[0]?.success ? {
            status: "sent", sent_message: decision.reply, decision: "auto_sent",
            knowledge_citation: decision.citation, auto_sent_at: new Date().toISOString(),
        } : { status: "failed", error: "auto-send failed", decision: "needs_human", ai_draft: decision.reply })
            .eq("id", row.id);
        return;
    }

    // drafts mode, ou needs_human em qualquer modo → fila humana
    await supabase.from("ai_message_log").update({
        status: "draft",
        ai_draft: decision.action === "auto_send" ? decision.reply : decision.draft,
        decision: decision.action === "auto_send" ? "needs_human" : decision.action === "needs_human" ? (decision.reason.startsWith("hard_rule") ? "hard_rule" : "needs_human") : "needs_human",
        knowledge_citation: decision.action === "auto_send" ? decision.citation : null,
    }).eq("id", row.id);
}
```

Nota: `buildContext` do port (Task 2) — confirmar assinatura real ao portar e ajustar a chamada (o input original usa nomes ligeiramente diferentes; manter o contrato `externalPropertyId`/`incomingMessage`/`reservationId`).

- [ ] **Step 2: Teste de integração local** (`scripts/test-bot-bridge.ts`): simula o caminho sem LLM/API — importa `processBotMessages` com um booking falso `{ id: 999901, propertyId: 341090, firstName: "Teste" }` e (a) mensagem `source: "host"` → verifica na BD que `ai_conversation.bot_enabled` ficou false; (b) mensagem `source: "guest"` com `bot_mode='off'` → verifica que NÃO criou linha em `ai_message_log`. Limpa os registos de teste no fim (`delete` por `reservation_id='999901'`).

```ts
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { processBotMessages } from "../lib/beds24/bot-bridge";
import { getSupabaseAdmin } from "../lib/supabase";

async function main() {
    const supabase = await getSupabaseAdmin();
    const booking = { id: 999901, propertyId: 341090, firstName: "Teste", arrival: "2027-06-01", departure: "2027-06-05" } as never;
    await processBotMessages(booking, [{ id: 888801, bookingId: 999901, source: "host", message: "resposta humana" } as never]);
    const { data: conv } = await supabase.from("ai_conversation").select("bot_enabled").eq("reservation_id", "999901").maybeSingle();
    if (conv?.bot_enabled !== false) { console.error("FAIL: host não desligou bot"); process.exitCode = 1; } else console.log("ok: host desliga bot");
    await processBotMessages(booking, [{ id: 888802, bookingId: 999901, source: "guest", message: "olá" } as never]);
    const { data: rows } = await supabase.from("ai_message_log").select("id").eq("reservation_ref", "999901");
    if ((rows?.length ?? 0) > 0) { console.error("FAIL: bot_mode off criou fila"); process.exitCode = 1; } else console.log("ok: mode off ignora");
    await supabase.from("ai_conversation").delete().eq("reservation_id", "999901");
    await supabase.from("ai_message_log").delete().eq("reservation_ref", "999901");
}
main();
```

- [ ] **Step 3: Correr** (exige migração Task 1 aplicada): `npx tsx scripts/test-bot-bridge.ts` → ambos "ok". `npx tsc --noEmit` → 0 erros.

- [ ] **Step 4: Commit**

```bash
git add lib/beds24/bot-bridge.ts scripts/test-bot-bridge.ts
git commit -m "feat(ai-inbox): beds24 webhook-to-bot bridge (conversation upsert, host auto-off, decision routing)"
```

### Task 5: Ligar o bridge ao webhook

**Files:**
- Modify: `app/api/webhooks/beds24/route.ts` (após o bloco de ingestão, ~linha 60-65)

**Interfaces:**
- Consumes: `processBotMessages` (Task 4).

- [ ] **Step 1: Editar o route** — dentro do `try` de processamento existente, depois de `ingestMessages`:

```ts
import { processBotMessages } from '@/lib/beds24/bot-bridge';
// ... no try existente, após ingestBookings/ingestMessages:
        if (payload?.messages?.length) {
            await processBotMessages(payload?.booking ?? null, payload.messages);
        }
```

(`processBotMessages` nunca lança — o webhook continua a responder 200 e a medição de latência não muda.)

- [ ] **Step 2: Simulação webhook local** — arrancar `npm run dev` (porta 3001 via preview) e reutilizar o padrão do teste antigo: POST ao endpoint local com secret + payload `{ timeStamp, booking: {id: 999902, propertyId: 341090}, messages: [{id: 888803, bookingId: 999902, source: "guest", message: "Qual é a password do wifi?"}] }`. Verificar: linha em `ai_message_log` com `decision` preenchido (needs_human se knowledge vazio — correto). Limpar registos 999902 no fim.

- [ ] **Step 3:** `npx tsc --noEmit` → 0 erros.

- [ ] **Step 4: Commit**

```bash
git add app/api/webhooks/beds24/route.ts
git commit -m "feat(ai-inbox): wire bot bridge into beds24 webhook"
```

### Task 6: Actions do inbox `app/actions/ai-inbox.ts`

**Files:**
- Create: `app/actions/ai-inbox.ts`

**Interfaces:**
- Consumes: Tasks 1-4; padrão `guard()` de `app/actions/beds24.ts`.
- Produces (para a UI, Tasks 7-9): `getInboxData(): Promise<{ conversations: InboxConversation[]; queue: QueueItem[] }>`, `getThread(bookingId: string)`, `sendReply(bookingId: string, text: string, draftRowId?: string)`, `updateDraft(rowId, text)`, `dismissDraft(rowId)`, `regenerateDraft(rowId)`, `setConversationBot(bookingId, enabled)`, `setPropertyBotMode(beds24PropertyId, mode)`, `setGlobalBot(enabled)`, `getBrandTone()/updateBrandTone(text)`, `listKnowledge()/upsertKnowledge(...)` (port de `listLinkedProperties`/`upsertPropertyExtras`).

- [ ] **Step 1: Portar a base**: `git show feat/ai-guest-messaging:app/actions/ai-messaging.ts > app/actions/ai-inbox.ts` e adaptar:
1. Apagar: `syncHospitableConversations`, `getHospitableStatus`, tudo o que importa `lib/hospitable*`.
2. `sendAiReply`/nova `sendReply`: envio via `beds24Request("POST", "/bookings/messages", { body: [{ bookingId: Number(bookingId), message: text }], context: "action" })` (padrão exato de `sendBeds24Message` em `app/actions/beds24.ts:174`); marca `ai_message_log.status='sent'`, `sent_message`, `sent_at`.
3. `getConversations`→`getInboxData`: junta `ai_conversation` + últimas `beds24_messages` por booking (join por `reservation_id = beds24_booking_id::text`) + fila (`ai_message_log` com `status='draft'`), fila ordenada primeiro.
4. `getConversationThread`→`getThread`: lê `beds24_messages` do booking (fonte de verdade das mensagens) + drafts/auto-sends de `ai_message_log` intercalados por timestamp.
5. Novas: `setPropertyBotMode` (update `beds24_properties.bot_mode`, guard super_admin/admin), `setGlobalBot` (update `ai_settings`).
6. Renomes hospitable→external como nas Tasks 1-2. `grep -in hospitable app/actions/ai-inbox.ts` → 0.
7. Todas as actions com o mesmo `guard()` do padrão beds24 (admin/super_admin).

- [ ] **Step 2:** `npx tsc --noEmit` → 0 erros.

- [ ] **Step 3: Commit**

```bash
git add app/actions/ai-inbox.ts
git commit -m "feat(ai-inbox): inbox server actions on beds24 transport"
```

### Task 7: i18n

**Files:**
- Modify: `messages/en.json`, `messages/pt.json`, `messages/he.json`

- [ ] **Step 1:** Portar as chaves `AiMessaging.*` do branch (`git show feat/ai-guest-messaging:messages/en.json` etc.) para um novo namespace `AiInbox.*` com as chaves novas: `autoSent` ("Resposta automática enviada"), `basedOn` ("baseado em"), `needsHuman` ("precisa de humano"), `humanActive` ("humano ativo"), `botOn`/`botOff`, `draftPending` ("Rascunho — aguarda revisão"), `send`/`edit`/`ignore`, `botModeOff`/`botModeDrafts`/`botModeAuto`, `killSwitch`, `knowledgeMissing` ("falta"), `autoOffNote` ("desliga sozinho se um humano responder"). Paridade nas 3 línguas (he traduzido a sério, não copiado).

- [ ] **Step 2:** `npx tsc --noEmit` + `npm run lint` → limpos.

- [ ] **Step 3: Commit**: `git add messages && git commit -m "feat(ai-inbox): i18n keys en/pt/he"`

### Task 8: UI — shell + lista de conversas (premium)

**Files:**
- Modify: `app/[locale]/admin/activity/page.tsx`
- Create: `components/admin/inbox/InboxShell.tsx`, `components/admin/inbox/ConversationList.tsx`

**Interfaces:**
- Consumes: `getInboxData` (Task 6).
- Produces: `InboxShell` (client, gere seleção + auto-refresh 30s via `router.refresh()` do `@/i18n/routing`, como `Beds24Dashboard.tsx:78-84`); `ConversationList({ conversations, queue, selectedId, onSelect })`.

- [ ] **Step 1:** ANTES de escrever UI, invocar o skill **frontend-design** e aplicar a direção do mockup aprovado (spec §UI): 3 painéis, fila humana âmbar no topo, pills de estado (bot ON verde `emerald`, humano ativo cinza, respondido pelo bot, precisa de humano âmbar), dark mode `admin-dark-*`, skeleton loading, mobile (painéis colapsam para navegação em stack).
- [ ] **Step 2:** `page.tsx`: server component; `guardModule` como o resto do admin (manter o guard que a página activity já tem em main); busca `getInboxData()`; render `<InboxShell initial={...} />`.
- [ ] **Step 3:** Implementar os dois componentes conforme o mockup (grid `grid-cols-[280px_minmax(0,1fr)_300px]`, colapso mobile). Verificação visual: preview no browser, screenshot, comparar com o mockup.
- [ ] **Step 4:** `npx tsc --noEmit` + `npm run lint` → limpos.
- [ ] **Step 5: Commit**: `git add app/[locale]/admin/activity components/admin/inbox && git commit -m "feat(ai-inbox): premium inbox shell and conversation list"`

### Task 9: UI — thread + drafts + contexto + settings

**Files:**
- Create: `components/admin/inbox/ThreadView.tsx`, `components/admin/inbox/ContextPanel.tsx`, `components/admin/inbox/BotSettings.tsx`

**Interfaces:**
- Consumes: `getThread`, `sendReply`, `updateDraft`, `dismissDraft`, `regenerateDraft`, `setConversationBot`, `setPropertyBotMode`, `setGlobalBot`, `getBrandTone`/`updateBrandTone`, `listKnowledge` (Task 6).

- [ ] **Step 1:** `ThreadView`: bolhas guest (esq.) / host (dir.) com hora + latência webhook; cartão verde de auto-resposta com `knowledge_citation` visível ("baseado em: knowledge › {citation}"); cartão tracejado de draft com Enviar/Editar/Ignorar/Regenerar (`useTransition`, estados de envio); caixa de resposta manual. Conforme mockup.
- [ ] **Step 2:** `ContextPanel`: reserva (datas/valor/canal/estado, dados de `beds24_bookings`), toggle bot da conversa com nota, estado do knowledge (campos preenchidos ✓ / em falta ⚠ — deriva de `PropertyKnowledge`: campos null = em falta).
- [ ] **Step 3:** `BotSettings` (secção/rota dentro da página, acessível por botão de engrenagem no header do inbox): kill-switch global, tabela das 6 propriedades com `bot_mode` (off/drafts/auto) via `setPropertyBotMode`, editor de tom (port visual do `BotToneManager`), gestor de knowledge (port visual do `PropertyKnowledgeManager` — trazer do branch e re-skin).
- [ ] **Step 4:** Verificação visual completa (preview, light+dark, mobile 375px, screenshots) + `npx tsc --noEmit` + `npm run lint`.
- [ ] **Step 5: Commit**: `git add components/admin/inbox && git commit -m "feat(ai-inbox): thread view, draft cards, context panel, bot settings"`

### Task 10: Verificação E2E na cobaia + build de produção

**Files:** nenhum novo (verificação).

- [ ] **Step 1:** Pré-condições: migração Task 1 aplicada no Supabase (Marcelo); `bot_mode='drafts'` no Virtudes One (`update beds24_properties set bot_mode='drafts' where beds24_property_id=341090` — via SQL editor ou BotSettings).
- [ ] **Step 2:** Teste real: Marcelo envia mensagem da conta "Carolina" (inquiry existente 89794243) → verificar no inbox: conversa aparece, draft gerado com decisão correta (pergunta de wifi sem knowledge → needs_human; preencher knowledge wifi → nova pergunta → draft coberto). Enviar resposta pelo painel → confirmar chegada no Airbnb.
- [ ] **Step 3:** Teste auto: `bot_mode='auto'` na cobaia → mensagem "qual é a password do wifi?" da Carolina → resposta automática chega ao Airbnb com citação registada. Voltar a `drafts` no fim (rollout recomendado do spec).
- [ ] **Step 4:** Teste host-off: responder pelo Airbnb (conta João) → conversa mostra "humano ativo", bot off.
- [ ] **Step 5:** `npx tsc --noEmit` && `npm run build` → limpos. `npm run test:security` → passa.
- [ ] **Step 6:** Atualizar `docs/superpowers/specs/2026-07-13-beds24-STATUS-HANDOFF.md` (secção nova: bot migrado, estado, o que falta) e memória do projeto.
- [ ] **Step 7: Commit final**: `git add -A && git commit -m "feat(ai-inbox): E2E verified on cobaia — docs updated"`

---

## Self-review (feito)

- **Cobertura do spec:** transporte (T4-5), motor sabe/não-sabe + citação (T3), auto-send gated por modo (T4), fila humana com draft (T4/T9), host auto-off (T4), kill-switch+modos (T1/T6/T9), UI 3 painéis premium (T8-9), métricas base visíveis via decision/citation/latency nas tabelas (T9 thread; dashboard de métricas agregadas fica para iteração seguinte — consciente, YAGNI), knowledge com lacunas (T9), i18n (T7), erros (T4 nunca lança; T3 needs_human em falha LLM), testes (T3/T4/T5/T10). Hospitable fora de main (nenhuma task o traz).
- **Placeholders:** nenhum "TBD"; os passos de port mecânico especificam comando + edits enumerados; código novo está completo.
- **Consistência de tipos:** `BotDecision`/`processBotMessages`/`decide`/`matchesHardRule` consistentes entre T3-T5; renomes `external_*` consistentes T1-T2-T4-T6.
- **Nota honesta:** as assinaturas exatas de `buildContext` do port podem divergir ligeiramente do esboço na T4 — o implementador da T4 deve conferir o ficheiro portado na T2 (aviso incluído na task).
