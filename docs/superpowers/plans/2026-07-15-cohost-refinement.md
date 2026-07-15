# Co-Host Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bot passa a redigir SEMPRE (postura Assist default), ganha módulo próprio `/admin/cohost` com feed de decisões mobile-first e web push com fallback de email.

**Architecture:** Nova coluna `bot_posture` ('auto'|'assist'|'off') em `ai_conversation` substitui a semântica de `bot_enabled`; resposta humana despromove Auto→Assist em vez de desligar. A decisão auto-send/queue/skip é extraída para um resolver puro testável (`lib/cohost-posture.ts`). O feed de decisões lê `ai_message_log` status='draft' e reutiliza as server actions existentes (`sendReply`/`updateDraft`/`dismissDraft`) — aprovação channel-agnostic. Push via `web-push` (VAPID) + service worker; fallback email Resend.

**Tech Stack:** Next.js 16 App Router, Supabase (migrações manuais!), next-intl (en/pt/he paridade), web-push, Resend (lib/email.ts).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-15-cohost-refinement-design.md`.
- Migrações SQL são aplicadas MANUALMENTE no dashboard Supabase — cada task com migração deve dizê-lo explicitamente ao terminar.
- Ficheiros `'use server'` só podem EXPORTAR funções async — nunca `export type`/re-export de tipos (bug DayPriceInfo de 2026-07-15, fix 2cf1e91).
- i18n: qualquer string nova entra em `messages/en.json`, `messages/pt.json`, `messages/he.json` (he pode = en).
- Rollout: módulo Co-Host é `super_admin` only (como o inbox hoje; `INBOX_ROLES` em ai-inbox.ts). Alargar a admin = mudança futura de 1 linha.
- Postura **Auto mantém-se no modelo mas sem uso operacional** (pendente João): auto-send só com `beds24_properties.bot_mode='auto'` E `bot_posture='auto'` — nenhum dos dois está ativo hoje.
- Verificação por task: `npx tsc --noEmit` limpo; testes por script `npx tsx scripts/...`. Rotas admin são auth-gated → E2E visual final é do Marcelo (porta 3001).
- Commits frequentes, mensagens `feat(cohost): ...`.

---

### Task 1: Resolver puro de postura + migração + bot-bridge

**Files:**
- Create: `lib/cohost-posture.ts`
- Create: `scripts/test-cohost-posture.ts`
- Create: `supabase/migrations/20260716090000_cohost_posture.sql`
- Modify: `lib/beds24/bot-bridge.ts` (linhas 63–100 host-demote; 119–129 gate; 168 auto-send gate)

**Interfaces:**
- Produces: `type BotPosture = 'auto' | 'assist' | 'off'`; `type PropertyBotMode = 'off' | 'drafts' | 'auto'`; `resolveBotAction(propertyMode: PropertyBotMode, posture: BotPosture, decisionAction: 'auto_send' | 'needs_human'): 'auto_send' | 'queue' | 'skip'` — tudo em `lib/cohost-posture.ts` (ficheiro normal, tipos exportáveis; as actions importam daqui).

- [ ] **Step 1: Escrever o teste que falha**

```typescript
// scripts/test-cohost-posture.ts — corre com npx tsx; sai 1 se falhar
import { resolveBotAction } from '../lib/cohost-posture';

const cases: Array<[Parameters<typeof resolveBotAction>, ReturnType<typeof resolveBotAction>]> = [
    // property off mata tudo
    [['off', 'auto', 'auto_send'], 'skip'],
    // posture off mata a conversa
    [['auto', 'off', 'auto_send'], 'skip'],
    [['drafts', 'off', 'needs_human'], 'skip'],
    // Assist redige SEMPRE, nunca auto-envia
    [['auto', 'assist', 'auto_send'], 'queue'],
    [['drafts', 'assist', 'needs_human'], 'queue'],
    // Auto só com property auto E posture auto E decisão auto_send
    [['auto', 'auto', 'auto_send'], 'auto_send'],
    [['auto', 'auto', 'needs_human'], 'queue'],
    [['drafts', 'auto', 'auto_send'], 'queue'],
];

let fail = 0;
for (const [args, expected] of cases) {
    const got = resolveBotAction(...args);
    if (got !== expected) { console.error(`FAIL resolveBotAction(${args.join(',')}) = ${got}, expected ${expected}`); fail++; }
}
console.log(fail === 0 ? `PASS ${cases.length}/${cases.length}` : `${fail} failures`);
process.exit(fail === 0 ? 0 : 1);
```

- [ ] **Step 2: Correr e ver falhar**

Run: `npx tsx scripts/test-cohost-posture.ts`
Expected: erro de módulo (`lib/cohost-posture` não existe)

- [ ] **Step 3: Implementar o resolver**

```typescript
// lib/cohost-posture.ts
// Postura por conversa do co-host. Ficheiro NORMAL (não 'use server') — tipos exportáveis.
export type BotPosture = 'auto' | 'assist' | 'off';
export type PropertyBotMode = 'off' | 'drafts' | 'auto';

export const BOT_POSTURES: BotPosture[] = ['auto', 'assist', 'off'];

/**
 * Decide o que o bridge faz com uma mensagem de hóspede.
 * skip      → não redige (property off ou conversa off)
 * queue     → redige draft para a fila humana (Assist, ou Auto sem confiança)
 * auto_send → envia sozinho (só property auto + posture auto + decisão auto_send)
 */
export function resolveBotAction(
    propertyMode: PropertyBotMode,
    posture: BotPosture,
    decisionAction: 'auto_send' | 'needs_human',
): 'auto_send' | 'queue' | 'skip' {
    if (propertyMode === 'off' || posture === 'off') return 'skip';
    if (decisionAction === 'auto_send' && propertyMode === 'auto' && posture === 'auto') return 'auto_send';
    return 'queue';
}
```

- [ ] **Step 4: Correr e ver passar**

Run: `npx tsx scripts/test-cohost-posture.ts`
Expected: `PASS 8/8`

- [ ] **Step 5: Migração (criar o ficheiro; aplicação é MANUAL no Supabase)**

```sql
-- supabase/migrations/20260716090000_cohost_posture.sql
-- Postura por conversa: substitui a semântica on/off de bot_enabled.
-- assist = bot redige sempre, humano envia (novo default);
-- auto   = pode auto-enviar (só com beds24_properties.bot_mode='auto');
-- off    = não redige (raro, manual).
alter table public.ai_conversation
    add column if not exists bot_posture text not null default 'assist'
    check (bot_posture in ('auto', 'assist', 'off'));

-- Backfill: off manual continua off; resto vira assist (Auto não está em uso).
update public.ai_conversation
    set bot_posture = case
        when bot_enabled = false and bot_off_reason = 'manual' then 'off'
        else 'assist'
    end;

-- bot_enabled fica DEPRECATED (mantido para rollback fácil; o código deixa de o ler).
comment on column public.ai_conversation.bot_enabled is 'DEPRECATED 2026-07-16: usar bot_posture. Mantido para rollback.';
```

- [ ] **Step 6: Rewire do bot-bridge — host despromove em vez de desligar**

Em `lib/beds24/bot-bridge.ts`, substituir o bloco `if (!sentByUs) { ... }` (linhas 83–99) por:

```typescript
                if (!sentByUs) {
                    // Resposta humana DESPROMOVE auto→assist (não desliga: o bot continua
                    // a redigir; só perde o direito de auto-enviar). Postura off não é tocada.
                    await supabase.from("ai_conversation").update({
                        bot_posture: "assist",
                        bot_off_reason: "human_replied",
                        bot_off_at: new Date().toISOString(),
                        bot_off_by: "bot",
                        updated_at: new Date().toISOString(),
                    }).eq("reservation_id", String(bookingId)).eq("bot_posture", "auto");

                    // Learning loop: a resposta humana no Airbnb pode ensinar o bot
                    const { captureLearning } = await import("@/lib/ai-learning");
                    await captureLearning({
                        reservationId: String(bookingId),
                        externalPropertyId: propertyId ? String(propertyId) : null,
                        humanAnswer: msg.message,
                    });
                }
```

- [ ] **Step 7: Rewire do handleGuestMessage — gate por postura + resolver**

Em `lib/beds24/bot-bridge.ts`: adicionar import no topo:

```typescript
import { resolveBotAction, type BotPosture, type PropertyBotMode } from "@/lib/cohost-posture";
```

Substituir as linhas 119–129 (gate `bot_enabled` + gate `mode`) por:

```typescript
    // Postura da conversa (default assist se a conversa ainda não existe)
    const { data: conv } = await supabase
        .from("ai_conversation")
        .select("bot_posture")
        .eq("reservation_id", String(bookingId))
        .maybeSingle();
    const posture = (conv?.bot_posture as BotPosture | undefined) ?? "assist";
    const mode = (prop?.bot_mode as PropertyBotMode | undefined) ?? "off";
    // Gate barato ANTES de gastar LLM: se nem draft vai haver, sair já.
    if (resolveBotAction(mode, posture, "needs_human") === "skip") return;
```

E substituir a condição do auto-send (linha 168) `if (decision.action === "auto_send" && mode === "auto") {` por:

```typescript
    if (decision.action === "auto_send" && resolveBotAction(mode, posture, "auto_send") === "auto_send") {
```

- [ ] **Step 7b: Draft substitui, não acumula (spec §1)**

Ainda em `handleGuestMessage`, logo APÓS o insert idempotente do claim (o bloco `const { data: row, error } = await supabase.from("ai_message_log").insert({...})` ter sucesso), marcar como substituídos os drafts pendentes ANTERIORES da mesma conversa — o draft novo é gerado com o histórico completo (as 10 últimas mensagens já entram no contexto), portanto o antigo fica obsoleto:

```typescript
    // Nova mensagem do hóspede torna obsoletos os drafts pendentes anteriores
    // desta conversa (spec: o draft regenera-se, não acumula).
    await supabase.from("ai_message_log").update({
        status: "skipped",
        skip_reason: "superseded",
        updated_at: new Date().toISOString(),
    }).eq("reservation_ref", String(bookingId)).eq("status", "draft").neq("id", row.id);
```

- [ ] **Step 8: Verificar**

Run: `npx tsx scripts/test-cohost-posture.ts && npx tsc --noEmit && npx tsx scripts/test-bot-bridge.ts`
Expected: PASS 8/8; tsc silencioso; test-bot-bridge continua verde (se o script referir `bot_enabled`, atualizar as asserções para `bot_posture` no mesmo commit).

- [ ] **Step 9: Commit**

```bash
git add lib/cohost-posture.ts scripts/test-cohost-posture.ts supabase/migrations/20260716090000_cohost_posture.sql lib/beds24/bot-bridge.ts scripts/test-bot-bridge.ts
git commit -m "feat(cohost): bot_posture auto/assist/off — human reply demotes, never kills drafting"
```

**⚠ Ao terminar esta task, avisar: a migração `20260716090000_cohost_posture.sql` tem de ser aplicada manualmente no dashboard Supabase antes do E2E.**

---

### Task 2: Server actions — postura + feed de decisões

**Files:**
- Modify: `app/actions/ai-inbox.ts` (substituir `setConversationBot` ~linha 413; alargar `getInboxData` ~94–189; adicionar feed actions no fim)

**Interfaces:**
- Consumes: `BotPosture` de `@/lib/cohost-posture`; tabelas `ai_conversation`, `ai_message_log`.
- Produces (server actions):
  - `setConversationPosture(reservationId: string, posture: 'auto' | 'assist' | 'off'): Promise<{ ok: boolean; error?: string }>`
  - `getDecisionFeed(): Promise<DecisionCard[]>` com `DecisionCard = { rowId: string; reservationId: string; guestName: string | null; propertyName: string | null; incomingMessage: string; draft: string | null; decision: string | null; createdAt: string; checkIn: string | null; checkOut: string | null }`
  - `getPendingDecisionCount(): Promise<number>`
  - `getInboxData` passa a incluir `botPosture: 'auto' | 'assist' | 'off'` em cada conversation (mantendo `botEnabled` derivado = `posture !== 'off'` para não partir `ConversationList`).
- ⚠ `ai-inbox.ts` é `'use server'`: o tipo `DecisionCard` define-se lá mas NÃO se exporta — quem precisar do tipo importa de um novo `lib/cohost-types.ts` OU usa tipo estrutural (preferir o segundo: o feed UI recebe o retorno tipado por inferência de `Awaited<ReturnType<...>>`).

- [ ] **Step 1: `setConversationPosture` (substitui `setConversationBot`)**

Remover a função `setConversationBot` e adicionar no mesmo sítio:

```typescript
export async function setConversationPosture(
    reservationId: string,
    posture: 'auto' | 'assist' | 'off',
): Promise<{ ok: boolean; error?: string }> {
    try {
        const user = await assertAdmin();
        if (!['auto', 'assist', 'off'].includes(posture)) return { ok: false, error: 'Postura inválida' };
        const supabase = await getSupabaseAdmin();
        const { error } = await supabase.from('ai_conversation').update({
            bot_posture: posture,
            bot_off_reason: posture === 'off' ? 'manual' : null,
            bot_off_at: posture === 'off' ? new Date().toISOString() : null,
            bot_off_by: posture === 'off' ? (user.email ?? 'admin') : null,
            updated_at: new Date().toISOString(),
        }).eq('reservation_id', reservationId);
        if (error) return { ok: false, error: error.message };
        return { ok: true };
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'failed' };
    }
}
```

- [ ] **Step 2: `getInboxData` inclui a postura**

No select de `ai_conversation` dentro de `getInboxData`, acrescentar `bot_posture` às colunas; no map de conversations acrescentar:

```typescript
            botPosture: (c.bot_posture as 'auto' | 'assist' | 'off' | null) ?? 'assist',
            botEnabled: ((c.bot_posture as string | null) ?? 'assist') !== 'off',
```

(substituindo o `botEnabled: c.bot_enabled` atual — procurar a linha exata no map.)

- [ ] **Step 3: Feed actions no fim do ficheiro**

```typescript
// ── Co-Host: feed de decisões (drafts pendentes de TODAS as conversas) ───────

type DecisionCard = {
    rowId: string; reservationId: string; guestName: string | null;
    propertyName: string | null; incomingMessage: string; draft: string | null;
    decision: string | null; createdAt: string; checkIn: string | null; checkOut: string | null;
};

export async function getDecisionFeed(): Promise<DecisionCard[]> {
    await assertAdmin();
    const supabase = await getSupabaseAdmin();
    const { data: rows } = await supabase
        .from('ai_message_log')
        .select('id, reservation_ref, guest_name, property_code, incoming_message, ai_draft, decision, created_at')
        .eq('status', 'draft')
        .order('created_at', { ascending: false })
        .limit(50);
    if (!rows?.length) return [];
    const refs = [...new Set(rows.map((r) => r.reservation_ref as string))];
    const { data: convs } = await supabase
        .from('ai_conversation')
        .select('reservation_id, check_in, check_out, property_name, guest_name')
        .in('reservation_id', refs);
    const byRef = new Map((convs ?? []).map((c) => [c.reservation_id as string, c]));
    return rows.map((r) => {
        const conv = byRef.get(r.reservation_ref as string);
        return {
            rowId: r.id as string,
            reservationId: r.reservation_ref as string,
            guestName: (r.guest_name as string | null) ?? (conv?.guest_name as string | null) ?? null,
            propertyName: (conv?.property_name as string | null) ?? (r.property_code as string | null) ?? null,
            incomingMessage: r.incoming_message as string,
            draft: r.ai_draft as string | null,
            decision: r.decision as string | null,
            createdAt: r.created_at as string,
            checkIn: (conv?.check_in as string | null) ?? null,
            checkOut: (conv?.check_out as string | null) ?? null,
        };
    });
}

export async function getPendingDecisionCount(): Promise<number> {
    await assertAdmin();
    const supabase = await getSupabaseAdmin();
    const { count } = await supabase
        .from('ai_message_log')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'draft');
    return count ?? 0;
}
```

- [ ] **Step 4: Atualizar o caller `ContextPanel` só o suficiente para compilar**

Em `components/admin/inbox/ContextPanel.tsx` linha 9, trocar o import `setConversationBot` por `setConversationPosture`, e na linha ~95 trocar a chamada por:

```typescript
                                await setConversationPosture(c.reservationId, c.botEnabled ? "off" : "assist");
```

(O controlo de 3 posturas a sério é a Task 5 — aqui é só manter o toggle a funcionar.)

- [ ] **Step 5: Verificar + commit**

Run: `npx tsc --noEmit`
Expected: limpo (o tipo `Conversation` do InboxData ganha `botPosture` — se `ConversationList`/`ThreadView` derem erro por tipos, acrescentar o campo ao type local deles).

```bash
git add app/actions/ai-inbox.ts components/admin/inbox/ContextPanel.tsx
git commit -m "feat(cohost): setConversationPosture + decision feed actions"
```

---

### Task 3: Módulo Co-Host — rota, sidebar, mover o inbox

**Files:**
- Create: `app/[locale]/admin/cohost/layout.tsx`
- Create: `app/[locale]/admin/cohost/page.tsx`
- Modify: `components/admin/AdminSidebar.tsx` (~linha 91, junto de Activity)
- Modify: `app/[locale]/admin/activity/page.tsx` (remover a tab inbox)
- Modify: `messages/en.json`, `messages/pt.json`, `messages/he.json` (namespace `AdminCohost`)

**Interfaces:**
- Consumes: `InboxShell` de `@/components/admin/inbox/InboxShell`; `BotSettings` de `@/components/admin/inbox/BotSettings`; `DecisionFeed` (Task 4 — nesta task usar placeholder mínimo que a Task 4 substitui).
- Produces: rota `/{locale}/admin/cohost?tab=decisions|inbox|settings`; entrada "Co-Host" no sidebar (super_admin).

- [ ] **Step 1: Layout com guard (padrão do beds24)**

```typescript
// app/[locale]/admin/cohost/layout.tsx
import { guardRoles } from "@/lib/admin-guard";

export default async function CohostLayout({
    children, params,
}: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    // Rollout: super_admin only (como o inbox). Alargar a admin = 1 linha aqui + sidebar.
    await guardRoles(["super_admin"], locale);
    return <>{children}</>;
}
```

- [ ] **Step 2: Página com 3 tabs (Decisions default; mobile-first)**

```typescript
// app/[locale]/admin/cohost/page.tsx
"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Sparkles, MessagesSquare, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { InboxShell } from "@/components/admin/inbox/InboxShell";
import { BotSettings } from "@/components/admin/inbox/BotSettings";
import { DecisionFeed } from "@/components/admin/cohost/DecisionFeed";

type TabType = "decisions" | "inbox" | "settings";

export default function CohostPage() {
    const t = useTranslations("AdminCohost");
    const searchParams = useSearchParams();
    const initial = (searchParams.get("tab") as TabType) || "decisions";
    const [activeTab, setActiveTab] = useState<TabType>(
        ["decisions", "inbox", "settings"].includes(initial) ? initial : "decisions",
    );

    const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
        { key: "decisions", label: t("tabs.decisions"), icon: <Sparkles className="size-4" /> },
        { key: "inbox", label: t("tabs.inbox"), icon: <MessagesSquare className="size-4" /> },
        { key: "settings", label: t("tabs.settings"), icon: <Settings2 className="size-4" /> },
    ];

    return (
        <div className={cn("mx-auto p-4 md:p-6", activeTab === "inbox" ? "w-full max-w-none" : "container max-w-3xl")}>
            <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{t("title")}</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">{t("subtitle")}</p>
            </div>
            <div className="flex items-center gap-1 p-1 bg-white dark:bg-white/5 border border-[#f5f5f5] dark:border-white/10 rounded-2xl w-full md:w-fit shadow-sm mb-6 overflow-x-auto no-scrollbar">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={cn(
                            "flex items-center gap-2 px-4 md:px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap shrink-0",
                            activeTab === tab.key
                                ? "bg-[#171717] dark:bg-white text-white dark:text-black shadow-lg"
                                : "text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white",
                        )}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>
            {activeTab === "decisions" ? (
                <DecisionFeed onOpenConversation={() => setActiveTab("inbox")} />
            ) : activeTab === "inbox" ? (
                <InboxShell />
            ) : (
                <div className="rounded-2xl border border-[#f5f5f5] bg-white shadow-sm dark:border-admin-dark-border dark:bg-admin-dark-surface overflow-hidden">
                    <BotSettings globalBotEnabled={true} onChanged={() => {}} />
                </div>
            )}
        </div>
    );
}
```

Nota: nesta task, criar `components/admin/cohost/DecisionFeed.tsx` como placeholder mínimo que compila (a Task 4 substitui o conteúdo):

```typescript
// components/admin/cohost/DecisionFeed.tsx (placeholder — substituído na task seguinte)
"use client";
export function DecisionFeed(_props: { onOpenConversation?: (reservationId: string) => void }) {
    return <div className="p-8 text-center text-sm text-[#a3a3a3]">…</div>;
}
```

- [ ] **Step 3: Sidebar (junto de Activity, ~linha 91) — só super_admin**

```typescript
                    ...(role === 'super_admin' ? [{ icon: Sparkles, label: "Co-Host", path: "/admin/cohost" }] : []),
```

(adicionar `Sparkles` ao import de lucide-react no topo do `AdminSidebar.tsx`.)

- [ ] **Step 4: Remover a tab inbox de Activity**

Em `app/[locale]/admin/activity/page.tsx`: remover o import `InboxShell` e `getCurrentUserRole`, o estado `showInbox`, o `useEffect` do role, a entrada `inbox` de `tabs`, o ramo `activeTab === "inbox"`, e voltar o default a `"log"`. O tipo passa a `type TabType = "log" | "owners";`. (O `ti = useTranslations("AiInbox")` também sai.)

- [ ] **Step 5: i18n — namespace `AdminCohost` nos 3 ficheiros**

`messages/en.json` (pt/he análogos; he pode = en):

```json
"AdminCohost": {
    "title": "Co-Host",
    "subtitle": "Your AI assistant drafts every reply — you approve, edit or ignore.",
    "tabs": { "decisions": "Decisions", "inbox": "Inbox", "settings": "Settings" }
}
```

pt: `"title": "Co-Host", "subtitle": "O assistente redige todas as respostas — tu aprovas, editas ou ignoras.", "tabs": { "decisions": "Decisões", "inbox": "Inbox", "settings": "Definições" }`.

- [ ] **Step 6: Verificar + commit**

Run: `npx tsc --noEmit && npm run build`
Expected: limpos; rota `/[locale]/admin/cohost` no manifest do build.

```bash
git add "app/[locale]/admin/cohost" components/admin/cohost/DecisionFeed.tsx components/admin/AdminSidebar.tsx "app/[locale]/admin/activity/page.tsx" messages/en.json messages/pt.json messages/he.json
git commit -m "feat(cohost): dedicated Co-Host module — route, sidebar entry, inbox moved out of Activity"
```

---

### Task 4: Decision feed UI (mobile-first)

**Files:**
- Modify: `components/admin/cohost/DecisionFeed.tsx` (substituir o placeholder)
- Create: `components/admin/cohost/DecisionCard.tsx`
- Modify: `messages/{en,pt,he}.json` (chaves `AdminCohost.feed.*`)

**Interfaces:**
- Consumes: `getDecisionFeed`, `getPendingDecisionCount`, `sendReply(reservationId, text, draftRowId?)`, `updateDraft(rowId, text)`, `dismissDraft(rowId)` de `@/app/actions/ai-inbox`; Supabase Realtime (padrão do `InboxShell` linhas 57–76).
- Produces: `DecisionFeed({ onOpenConversation }: { onOpenConversation?: (reservationId: string) => void })`; `DecisionCard({ card, onApprove, onDismiss, onOpen })`.

- [ ] **Step 1: DecisionCard**

```typescript
// components/admin/cohost/DecisionCard.tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, X, Pencil, MessageSquareText, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type Card = {
    rowId: string; reservationId: string; guestName: string | null;
    propertyName: string | null; incomingMessage: string; draft: string | null;
    decision: string | null; createdAt: string; checkIn: string | null; checkOut: string | null;
};

export function DecisionCard({ card, onApprove, onDismiss, onOpen }: {
    card: Card;
    onApprove: (rowId: string, reservationId: string, text: string) => Promise<void>;
    onDismiss: (rowId: string) => Promise<void>;
    onOpen: (reservationId: string) => void;
}) {
    const t = useTranslations("AdminCohost.feed");
    const [editing, setEditing] = useState(false);
    const [text, setText] = useState(card.draft ?? "");
    const [busy, setBusy] = useState<"approve" | "dismiss" | null>(null);
    const urgent = card.decision === "hard_rule";

    return (
        <div className="rounded-2xl border border-[#f5f5f5] bg-white p-4 shadow-sm dark:border-admin-dark-border dark:bg-admin-dark-surface">
            <div className="flex items-center justify-between gap-2 text-xs text-[#a3a3a3]">
                <span className="truncate font-semibold">
                    {card.guestName ?? "Guest"} · {card.propertyName ?? "—"}
                </span>
                {urgent && (
                    <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                        <AlertTriangle className="size-3" /> {t("needsYou")}
                    </span>
                )}
            </div>
            <p className="mt-2 rounded-xl bg-[#fafafa] p-3 text-sm text-[#171717] dark:bg-white/5 dark:text-admin-dark-text-primary">
                {card.incomingMessage}
            </p>
            {editing ? (
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={4}
                    className="mt-2 w-full rounded-xl border border-[#e5e5e5] p-3 text-sm outline-none focus:ring-1 focus:ring-[#171717] dark:border-white/10 dark:bg-transparent dark:text-white dark:focus:ring-white"
                />
            ) : (
                <p className="mt-2 whitespace-pre-wrap rounded-xl border border-dashed border-[#e5e5e5] p-3 text-sm text-[#404040] dark:border-white/10 dark:text-white/80">
                    {text || t("noDraft")}
                </p>
            )}
            <div className="mt-3 flex items-center gap-2">
                <button
                    disabled={!text.trim() || busy !== null}
                    onClick={async () => { setBusy("approve"); try { await onApprove(card.rowId, card.reservationId, text); } finally { setBusy(null); } }}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#171717] px-3 py-2.5 text-sm font-bold text-white transition-opacity disabled:opacity-50 dark:bg-white dark:text-black"
                >
                    <Check className="size-4" /> {busy === "approve" ? t("sending") : t("approveSend")}
                </button>
                <button
                    onClick={() => setEditing((v) => !v)}
                    className={cn("rounded-xl border px-3 py-2.5 text-sm font-semibold", editing ? "border-[#171717] dark:border-white" : "border-[#e5e5e5] text-[#737373] dark:border-white/10 dark:text-white/60")}
                    aria-pressed={editing}
                >
                    <Pencil className="size-4" />
                </button>
                <button
                    disabled={busy !== null}
                    onClick={async () => { setBusy("dismiss"); try { await onDismiss(card.rowId); } finally { setBusy(null); } }}
                    className="rounded-xl border border-[#e5e5e5] px-3 py-2.5 text-sm text-[#737373] dark:border-white/10 dark:text-white/60"
                    aria-label={t("ignore")}
                >
                    <X className="size-4" />
                </button>
                <button
                    onClick={() => onOpen(card.reservationId)}
                    className="rounded-xl border border-[#e5e5e5] px-3 py-2.5 text-sm text-[#737373] dark:border-white/10 dark:text-white/60"
                    aria-label={t("openConversation")}
                >
                    <MessageSquareText className="size-4" />
                </button>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: DecisionFeed (substituir o placeholder)**

```typescript
// components/admin/cohost/DecisionFeed.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { PartyPopper } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getDecisionFeed, sendReply, updateDraft, dismissDraft } from "@/app/actions/ai-inbox";
import { DecisionCard } from "./DecisionCard";

type Card = Awaited<ReturnType<typeof getDecisionFeed>>[number];

export function DecisionFeed({ onOpenConversation }: { onOpenConversation?: (reservationId: string) => void }) {
    const t = useTranslations("AdminCohost.feed");
    const [cards, setCards] = useState<Card[] | null>(null);

    const refresh = useCallback(async () => {
        try { setCards(await getDecisionFeed()); } catch { /* próximo tick */ }
    }, []);

    useEffect(() => {
        void refresh();
        const id = setInterval(() => void refresh(), 30_000);
        const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
        document.addEventListener("visibilitychange", onVisible);
        const channel = supabase
            .channel("cohost-feed-live")
            .on("postgres_changes", { event: "*", schema: "public", table: "ai_message_log" }, () => void refresh())
            .subscribe();
        return () => {
            clearInterval(id);
            document.removeEventListener("visibilitychange", onVisible);
            void supabase.removeChannel(channel);
        };
    }, [refresh]);

    const approve = useCallback(async (rowId: string, reservationId: string, text: string) => {
        await updateDraft(rowId, text);
        await sendReply(reservationId, text, rowId);
        void refresh();
    }, [refresh]);

    const dismiss = useCallback(async (rowId: string) => {
        await dismissDraft(rowId);
        void refresh();
    }, [refresh]);

    if (cards === null) {
        return (
            <div className="space-y-3" aria-hidden>
                {[...Array(3)].map((_, i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-[#f5f5f5] dark:bg-white/5" />)}
            </div>
        );
    }
    if (cards.length === 0) {
        return (
            <div className="rounded-2xl border border-[#f5f5f5] bg-white p-10 text-center shadow-sm dark:border-admin-dark-border dark:bg-admin-dark-surface">
                <PartyPopper className="mx-auto size-8 text-[#c5a059]" />
                <p className="mt-3 text-sm font-semibold text-[#171717] dark:text-white">{t("allClear")}</p>
                <p className="mt-1 text-xs text-[#a3a3a3]">{t("allClearHint")}</p>
            </div>
        );
    }
    return (
        <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-[#a3a3a3]">{t("pending", { count: cards.length })}</p>
            {cards.map((c) => (
                <DecisionCard key={c.rowId} card={c} onApprove={approve} onDismiss={dismiss}
                    onOpen={(rid) => onOpenConversation?.(rid)} />
            ))}
        </div>
    );
}
```

- [ ] **Step 3: i18n `AdminCohost.feed` (3 ficheiros)**

en: `"feed": { "pending": "{count} to review", "needsYou": "Needs you", "noDraft": "No draft — write a reply", "approveSend": "Approve & send", "sending": "Sending…", "ignore": "Ignore", "openConversation": "Open conversation", "allClear": "All clear — nothing needs you", "allClearHint": "New guest messages will appear here with a drafted reply." }`
pt: `"feed": { "pending": "{count} por rever", "needsYou": "Precisa de ti", "noDraft": "Sem draft — escreve a resposta", "approveSend": "Aprovar e enviar", "sending": "A enviar…", "ignore": "Ignorar", "openConversation": "Abrir conversa", "allClear": "Tudo em dia — nada precisa de ti", "allClearHint": "Novas mensagens de hóspedes aparecem aqui com a resposta redigida." }`
he: = en.

- [ ] **Step 4: Badge "N to review" no sidebar (spec §3)**

Em `components/admin/AdminSidebar.tsx`: para o item Co-Host (Task 3), acrescentar um badge com o count pendente. No topo do componente (é client), adicionar:

```typescript
    const [cohostPending, setCohostPending] = useState(0);
    useEffect(() => {
        if (role !== "super_admin") return;
        let alive = true;
        const load = () => { void getPendingDecisionCount().then((n) => { if (alive) setCohostPending(n); }).catch(() => {}); };
        load();
        const id = setInterval(load, 60_000);
        return () => { alive = false; clearInterval(id); };
    }, [role]);
```

(+ imports: `getPendingDecisionCount` de `@/app/actions/ai-inbox`; `useState`/`useEffect` se ainda não existirem.) No item Co-Host, estender o objeto com `badge: cohostPending` e, no JSX onde os itens rendem o label, mostrar quando existir:

```typescript
                        {"badge" in item && (item as { badge?: number }).badge ? (
                            <span className="ml-auto rounded-full bg-[#c5a059] px-1.5 py-0.5 text-[10px] font-bold text-white min-w-4 text-center">
                                {(item as { badge?: number }).badge}
                            </span>
                        ) : null}
```

(Adaptar ao shape real do render de itens do sidebar — o objetivo é um chip dourado à direita do label "Co-Host" quando `cohostPending > 0`.)

- [ ] **Step 5: Verificar + commit**

Run: `npx tsc --noEmit && npm run build`
Expected: limpos.

```bash
git add components/admin/cohost components/admin/AdminSidebar.tsx messages/en.json messages/pt.json messages/he.json
git commit -m "feat(cohost): mobile-first decision feed + sidebar to-review badge"
```

---

### Task 5: Controlo de postura no ContextPanel (3 segmentos)

**Files:**
- Modify: `components/admin/inbox/ContextPanel.tsx` (bloco do toggle, linhas ~85–110)
- Modify: `messages/{en,pt,he}.json` (chaves `AiInbox.posture*`)

**Interfaces:**
- Consumes: `setConversationPosture` (Task 2); `c.botPosture` no objeto conversation (Task 2).

- [ ] **Step 1: Substituir o toggle on/off pelo segmented de 3 posturas**

No lugar do bloco do switch (linhas ~85–110 — o `<button role="switch">` e labels `botOn/botOff`), pôr:

```typescript
                    <div className="flex items-center gap-1 rounded-lg border border-[#f5f5f5] p-0.5 dark:border-white/10">
                        {(["auto", "assist", "off"] as const).map((p) => (
                            <button
                                key={p}
                                onClick={async () => {
                                    await setConversationPosture(c.reservationId, p);
                                    props.onChanged();
                                }}
                                className={cn(
                                    "rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors",
                                    c.botPosture === p
                                        ? p === "off"
                                            ? "bg-red-500 text-white"
                                            : "bg-[#171717] text-white dark:bg-white dark:text-black"
                                        : "text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white",
                                )}
                                aria-pressed={c.botPosture === p}
                                title={t(`posture_${p}_hint`)}
                            >
                                {t(`posture_${p}`)}
                            </button>
                        ))}
                    </div>
```

(Se `c.botPosture` não existir no type local do ContextPanel, acrescentá-lo: `botPosture: 'auto' | 'assist' | 'off';`.)

- [ ] **Step 2: i18n `AiInbox` (3 ficheiros)**

en: `"posture_auto": "Auto", "posture_auto_hint": "Bot replies by itself (not in use yet)", "posture_assist": "Assist", "posture_assist_hint": "Bot drafts every reply — you send", "posture_off": "Off", "posture_off_hint": "Bot does nothing on this conversation"`
pt: `"posture_auto": "Auto", "posture_auto_hint": "O bot responde sozinho (ainda sem uso)", "posture_assist": "Assist", "posture_assist_hint": "O bot redige tudo — tu envias", "posture_off": "Off", "posture_off_hint": "O bot não faz nada nesta conversa"`
he: = en.

- [ ] **Step 3: Verificar + commit**

Run: `npx tsc --noEmit`
Expected: limpo.

```bash
git add components/admin/inbox/ContextPanel.tsx messages/en.json messages/pt.json messages/he.json
git commit -m "feat(cohost): 3-way posture control (auto/assist/off) in conversation panel"
```

---

### Task 6: Web push + fallback email

**Files:**
- Create: `supabase/migrations/20260716100000_cohost_push_subscriptions.sql`
- Create: `public/cohost-sw.js`
- Create: `lib/push.ts`
- Create: `components/admin/cohost/PushSettings.tsx`
- Modify: `app/actions/ai-inbox.ts` (actions `savePushSubscription`/`removePushSubscription`)
- Modify: `lib/beds24/bot-bridge.ts` (trigger após enfileirar draft)
- Modify: `app/[locale]/admin/cohost/page.tsx` (montar `PushSettings` na tab settings)
- Modify: `package.json` (dep `web-push`)

**Interfaces:**
- Consumes: `sendEmail({ to, subject, html })` de `@/lib/email`.
- Produces: `notifyNewDecision(input: { guestName: string | null; propertyName: string | null; preview: string }): Promise<void>` em `lib/push.ts`; actions `savePushSubscription(sub: { endpoint: string; keys: { p256dh: string; auth: string } }): Promise<{ ok: boolean }>` e `removePushSubscription(endpoint: string): Promise<{ ok: boolean }>`.
- Env vars novas: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `COHOST_NOTIFY_EMAIL` (fallback; se ausente usa `info@lovelymemories.pt`). Gerar par: `npx web-push generate-vapid-keys`. **Adicionar a `.env.local` E à Vercel (Production) — avisar o Marcelo.**

- [ ] **Step 1: Instalar dep + gerar chaves**

Run: `npm install web-push && npm install -D @types/web-push && npx web-push generate-vapid-keys`
Expected: par de chaves impresso → colocar em `.env.local` (`NEXT_PUBLIC_VAPID_PUBLIC_KEY=...`, `VAPID_PRIVATE_KEY=...`).

- [ ] **Step 2: Migração (aplicação MANUAL no Supabase)**

```sql
-- supabase/migrations/20260716100000_cohost_push_subscriptions.sql
create table if not exists public.cohost_push_subscriptions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    endpoint text not null unique,
    p256dh text not null,
    auth text not null,
    created_at timestamptz not null default now()
);
alter table public.cohost_push_subscriptions enable row level security;
-- Acesso só via service role (actions); sem policies para authenticated.
```

- [ ] **Step 3: Service worker**

```javascript
// public/cohost-sw.js — push do Co-Host (registado a partir de /admin/cohost)
self.addEventListener("push", (event) => {
    let data = { title: "Co-Host", body: "", url: "/en/admin/cohost" };
    try { data = { ...data, ...event.data.json() }; } catch { /* payload vazio */ }
    event.waitUntil(self.registration.showNotification(data.title, {
        body: data.body,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        data: { url: data.url },
    }));
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const url = event.notification.data?.url || "/en/admin/cohost";
    event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
        for (const client of list) {
            if (client.url.includes("/admin/cohost") && "focus" in client) return client.focus();
        }
        return clients.openWindow(url);
    }));
});
```

- [ ] **Step 4: `lib/push.ts` — enviar + prune + fallback email**

```typescript
// lib/push.ts — push do Co-Host. Nunca lança (chamado no caminho do webhook).
import webpush from "web-push";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendEmail } from "@/lib/email";

export async function notifyNewDecision(input: {
    guestName: string | null; propertyName: string | null; preview: string;
}): Promise<void> {
    try {
        const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        const priv = process.env.VAPID_PRIVATE_KEY;
        const title = `${input.guestName ?? "Guest"} · ${input.propertyName ?? "Co-Host"}`;
        const body = input.preview.slice(0, 120);

        let delivered = 0;
        if (pub && priv) {
            webpush.setVapidDetails("mailto:info@lovelymemories.pt", pub, priv);
            const supabase = await getSupabaseAdmin();
            const { data: subs } = await supabase
                .from("cohost_push_subscriptions")
                .select("id, endpoint, p256dh, auth");
            for (const s of subs ?? []) {
                try {
                    await webpush.sendNotification(
                        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                        JSON.stringify({ title, body, url: "/en/admin/cohost" }),
                    );
                    delivered++;
                } catch (e: unknown) {
                    const code = (e as { statusCode?: number }).statusCode;
                    // Subscription morta → limpar (rede de segurança do design §4)
                    if (code === 404 || code === 410) {
                        await supabase.from("cohost_push_subscriptions").delete().eq("id", s.id);
                    }
                }
            }
        }
        if (delivered === 0) {
            // Fallback: sem push entregue → email (design §4, rede de segurança)
            await sendEmail({
                to: process.env.COHOST_NOTIFY_EMAIL || "info@lovelymemories.pt",
                subject: `Co-Host: draft à espera — ${title}`,
                html: `<p><strong>${title}</strong></p><p>${body}</p><p><a href="https://www.lovelymemories.pt/en/admin/cohost">Abrir o Co-Host</a></p>`,
            });
        }
    } catch (e) {
        console.error("[cohost-push] notify failed:", e);
    }
}
```

- [ ] **Step 5: Actions de subscription (em `app/actions/ai-inbox.ts`, no fim)**

```typescript
// ── Co-Host: push subscriptions ───────────────────────────────────────────────

export async function savePushSubscription(sub: {
    endpoint: string; keys: { p256dh: string; auth: string };
}): Promise<{ ok: boolean }> {
    const user = await assertAdmin();
    const supabase = await getSupabaseAdmin();
    const { error } = await supabase.from('cohost_push_subscriptions').upsert({
        user_id: user.id,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
    }, { onConflict: 'endpoint' });
    return { ok: !error };
}

export async function removePushSubscription(endpoint: string): Promise<{ ok: boolean }> {
    await assertAdmin();
    const supabase = await getSupabaseAdmin();
    const { error } = await supabase.from('cohost_push_subscriptions').delete().eq('endpoint', endpoint);
    return { ok: !error };
}
```

- [ ] **Step 6: `PushSettings` (tab settings do co-host)**

```typescript
// components/admin/cohost/PushSettings.tsx
"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { BellRing, BellOff } from "lucide-react";
import { savePushSubscription, removePushSubscription } from "@/app/actions/ai-inbox";

function urlBase64ToUint8Array(base64: string): Uint8Array {
    const padding = "=".repeat((4 - (base64.length % 4)) % 4);
    const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(b64);
    return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function PushSettings() {
    const t = useTranslations("AdminCohost.push");
    const [state, setState] = useState<"unsupported" | "off" | "on" | "busy">("busy");

    useEffect(() => {
        (async () => {
            if (!("serviceWorker" in navigator) || !("PushManager" in window)) { setState("unsupported"); return; }
            const reg = await navigator.serviceWorker.register("/cohost-sw.js");
            const sub = await reg.pushManager.getSubscription();
            setState(sub ? "on" : "off");
        })().catch(() => setState("unsupported"));
    }, []);

    const enable = async () => {
        setState("busy");
        try {
            const perm = await Notification.requestPermission();
            if (perm !== "granted") { setState("off"); return; }
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
            });
            const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
            await savePushSubscription(json);
            setState("on");
        } catch { setState("off"); }
    };

    const disable = async () => {
        setState("busy");
        try {
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription();
            if (sub) { await removePushSubscription(sub.endpoint); await sub.unsubscribe(); }
        } finally { setState("off"); }
    };

    if (state === "unsupported") {
        return <p className="p-4 text-xs text-[#a3a3a3]">{t("unsupported")}</p>;
    }
    return (
        <div className="flex items-center justify-between gap-3 border-t border-[#f5f5f5] p-4 dark:border-white/10">
            <div>
                <p className="text-sm font-semibold text-[#171717] dark:text-white">{t("title")}</p>
                <p className="text-xs text-[#a3a3a3]">{state === "on" ? t("enabledHint") : t("disabledHint")}</p>
            </div>
            <button
                disabled={state === "busy"}
                onClick={state === "on" ? disable : enable}
                className="flex items-center gap-1.5 rounded-xl bg-[#171717] px-3 py-2 text-xs font-bold text-white disabled:opacity-50 dark:bg-white dark:text-black"
            >
                {state === "on" ? <BellOff className="size-3.5" /> : <BellRing className="size-3.5" />}
                {state === "on" ? t("disable") : t("enable")}
            </button>
        </div>
    );
}
```

Montar na tab settings de `app/[locale]/admin/cohost/page.tsx`, logo abaixo de `<BotSettings …/>` dentro do mesmo wrapper:

```typescript
                    <PushSettings />
```

(+ import `import { PushSettings } from "@/components/admin/cohost/PushSettings";`)

- [ ] **Step 7: Trigger no bot-bridge**

Em `lib/beds24/bot-bridge.ts`, no fim de `handleGuestMessage`, logo APÓS o update do caminho de fila (o bloco `// Modo 'drafts', ou needs_human …`), acrescentar:

```typescript
    // Push "há decisão nova" (fallback email lá dentro) — nunca lança.
    const { notifyNewDecision } = await import("@/lib/push");
    await notifyNewDecision({
        guestName: [booking?.firstName, booking?.lastName].filter(Boolean).join(" ") || null,
        propertyName: prop?.name ?? null,
        preview: msg.message!,
    });
```

(Também no ramo auto-send FALHADO — o update com `error: "auto-send failed"` — chamar o mesmo. NÃO chamar no auto-send com sucesso.)

- [ ] **Step 8: i18n `AdminCohost.push` (3 ficheiros)**

en: `"push": { "title": "Notifications on this device", "enable": "Enable", "disable": "Disable", "enabledHint": "You'll get a notification when a draft needs review.", "disabledHint": "Enable to get notified when a draft needs review.", "unsupported": "This browser doesn't support push. On iPhone, add the site to your Home Screen first (iOS 16.4+)." }`
pt: `"push": { "title": "Notificações neste dispositivo", "enable": "Ativar", "disable": "Desativar", "enabledHint": "Recebes uma notificação quando houver um draft por rever.", "disabledHint": "Ativa para seres notificado quando houver um draft por rever.", "unsupported": "Este browser não suporta push. No iPhone, adiciona primeiro o site ao ecrã inicial (iOS 16.4+)." }`
he: = en.

- [ ] **Step 9: Verificar + commit**

Run: `npx tsc --noEmit && npm run build`
Expected: limpos. Teste manual local (Chrome desktop, localhost conta como secure origin): ativar push nas settings do co-host → simular webhook (padrão dos testes do bot) → notificação aparece; sem subscriptions → email de fallback chega ao `COHOST_NOTIFY_EMAIL`.

```bash
git add supabase/migrations/20260716100000_cohost_push_subscriptions.sql public/cohost-sw.js lib/push.ts components/admin/cohost/PushSettings.tsx "app/[locale]/admin/cohost/page.tsx" app/actions/ai-inbox.ts lib/beds24/bot-bridge.ts messages/en.json messages/pt.json messages/he.json package.json package-lock.json
git commit -m "feat(cohost): web push on new decisions + email fallback (Resend)"
```

**⚠ Ao terminar: (1) migração `20260716100000_cohost_push_subscriptions.sql` manual no Supabase; (2) `NEXT_PUBLIC_VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`COHOST_NOTIFY_EMAIL` na Vercel Production.**

---

## E2E final (Marcelo, super_admin, porta 3001)
1. Sidebar mostra **Co-Host** → abre no feed de Decisões.
2. Simular mensagem de hóspede (webhook sim) → cartão aparece no feed (realtime) + notificação push (ou email fallback).
3. Aprovar → mensagem enviada (verificar no inbox) e cartão sai. Editar → texto alterado é o enviado. Ignorar → cartão sai sem envio.
4. ContextPanel: alternar Auto/Assist/Off; com Off, nova mensagem de hóspede NÃO gera draft; com Assist gera sempre.
5. Responder à mão no Airbnb numa conversa Auto → passa a Assist (e continua a redigir na mensagem seguinte).
6. Activity já não tem tab Inbox. Mobile: feed utilizável num ecrã de telemóvel; dark mode.
