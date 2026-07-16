# Co-Host Home Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cartões do feed compactos (título/resumo por LLM) com detalhe em sheet responsivo, e o Overview `/admin` fundido com o Co-Host (banner + chegadas reais + estado das propriedades).

**Architecture:** Nova lib `ai-card-meta` (LLM leve + fallback puro) alimenta 3 colunas novas no `ai_message_log`; o feed passa a cartões compactos que abrem um `DecisionDetailSheet` (bottom sheet mobile / painel lateral desktop) reutilizando as server actions existentes. O Overview client-page é reescrito sobre uma server action única `getOverviewData()` com helpers puros de estado (`lib/overview-status.ts`).

**Tech Stack:** Next.js 16 App Router, Supabase (migrações MANUAIS), next-intl (en/pt/he), framer-motion (padrão Beds24BookingDetailSheet), date-fns.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-16-cohost-home-redesign-design.md`. Mockups aprovados: artifact v3-fusao-overview.
- Migrações SQL: criar o ficheiro APENAS — aplicação é manual no dashboard Supabase; avisar no fim da task.
- Ficheiros `'use server'` (app/actions/*) só EXPORTAM funções async — tipos definidos localmente sem `export`.
- Rollout: tudo o que é Co-Host = **super_admin only**; `/admin` (Overview) já é super_admin-only (redirect client-side existente — manter). `getOverviewData` guarda com o padrão `assertAdmin` de `app/actions/ai-inbox.ts` (INBOX_ROLES=['super_admin']).
- i18n: strings novas em `messages/en.json`, `messages/pt.json`, `messages/he.json` (he = en), chaves em paridade.
- Card meta NUNCA bloqueia: qualquer falha do LLM → fallback heurístico; o feed nunca depende do LLM para renderizar.
- Verificação por task: `npx tsc --noEmit` limpo; testes por script `npx tsx scripts/<file>.ts` (exit 1 em falha); `npm run build` nas tasks com rotas/páginas.
- Commits `feat(cohost): ...` no branch atual (main local); NUNCA push.

---

### Task 1: Card meta (LLM leve + fallback) + migração + bridge + feed action

**Files:**
- Create: `lib/ai-card-meta.ts`
- Create: `scripts/test-card-fallback.ts`
- Create: `supabase/migrations/20260716120000_cohost_card_meta.sql`
- Modify: `lib/ai-messaging.ts` (novo export `completeText`)
- Modify: `lib/beds24/bot-bridge.ts` (guardar card meta nos 2 caminhos de fila)
- Modify: `app/actions/ai-inbox.ts` (`getDecisionFeed` devolve os campos com fallback)

**Interfaces:**
- Produces: `type CardMeta = { title: string; summary: string; why: string | null }`; `buildCardFallback(guestName: string | null, incomingMessage: string): CardMeta` (puro); `generateCardMeta(input: { guestMessage: string; draft: string | null; guestName: string | null; propertyName: string | null }): Promise<CardMeta | null>` (LLM; null em falha) — ambos em `lib/ai-card-meta.ts`.
- Produces: `completeText(system: string, user: string): Promise<string>` em `lib/ai-messaging.ts` — chamada LLM genérica com a MESMA cadeia provider/retry/fallover do `draftReply` (OpenAI→Gemini conforme provider setting).
- Produces: itens de `getDecisionFeed()` ganham `cardTitle: string; cardSummary: string; cardWhy: string | null` (fallback já aplicado no server).

- [ ] **Step 1: Teste do fallback (falha primeiro)**

```typescript
// scripts/test-card-fallback.ts — npx tsx; exit 1 em falha
import { buildCardFallback } from '../lib/ai-card-meta';

let fail = 0;
const t = (name: string, ok: boolean) => { if (!ok) { console.error(`FAIL ${name}`); fail++; } };

const a = buildCardFallback('Maria', 'Olá! A que horas posso fazer o check-in? E qual é a password do wifi?');
t('title = 1ª linha truncada', a.title === 'Olá! A que horas posso fazer o check-in?'.slice(0, 44));
t('summary = preview', a.summary.startsWith('Olá! A que horas posso'));
t('why null', a.why === null);

const b = buildCardFallback(null, 'linha1 com um texto mesmo muito longo que ultrapassa claramente os quarenta e quatro caracteres\nlinha2');
t('só 1ª linha', !b.title.includes('linha2'));
t('trunca com ellipsis', b.title.length <= 45 && b.title.endsWith('…'));

const c = buildCardFallback('X', '   ');
t('mensagem vazia → título default', c.title === 'Nova mensagem');

console.log(fail === 0 ? 'PASS' : `${fail} failures`);
process.exit(fail === 0 ? 0 : 1);
```

- [ ] **Step 2: Correr e ver falhar** — `npx tsx scripts/test-card-fallback.ts` → erro módulo inexistente.

- [ ] **Step 3: Implementar `lib/ai-card-meta.ts`**

```typescript
// lib/ai-card-meta.ts — meta dos cartões do decision feed. Ficheiro normal (tipos exportáveis).
import { completeText } from "@/lib/ai-messaging";

export type CardMeta = { title: string; summary: string; why: string | null };

/** Fallback heurístico puro — o feed NUNCA depende do LLM para renderizar. */
export function buildCardFallback(_guestName: string | null, incomingMessage: string): CardMeta {
    const firstLine = (incomingMessage ?? "").split("\n")[0]?.trim() ?? "";
    const title = firstLine.length === 0
        ? "Nova mensagem"
        : firstLine.length > 44 ? `${firstLine.slice(0, 44)}…` : firstLine;
    const summary = (incomingMessage ?? "").trim().slice(0, 160) || "Nova mensagem do hóspede.";
    return { title, summary, why: null };
}

const SYSTEM = `És o assistente de um backoffice de alojamento local. Recebes a mensagem de um hóspede e o rascunho de resposta preparado. Devolve APENAS JSON válido (sem markdown), em PORTUGUÊS de Portugal:
{"title":"2 a 4 palavras que identificam o assunto (ex.: Early check-in + Wi-Fi)","summary":"1-2 frases: o que o hóspede quer e o que o rascunho propõe","why":"1 frase curta: porque é que responder a isto importa"}`;

/** Chamada LLM leve pós-decisão. NUNCA lança — null em qualquer falha (o chamador usa o fallback). */
export async function generateCardMeta(input: {
    guestMessage: string; draft: string | null; guestName: string | null; propertyName: string | null;
}): Promise<CardMeta | null> {
    try {
        const user = [
            `Hóspede: ${input.guestName ?? "?"} · Propriedade: ${input.propertyName ?? "?"}`,
            `Mensagem do hóspede:\n${input.guestMessage}`,
            input.draft ? `Rascunho preparado:\n${input.draft}` : "Sem rascunho (escalado para humano).",
        ].join("\n\n");
        const raw = await completeText(SYSTEM, user);
        const jsonStr = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
        const parsed = JSON.parse(jsonStr) as Partial<CardMeta>;
        if (typeof parsed.title !== "string" || typeof parsed.summary !== "string") return null;
        return {
            title: parsed.title.trim().slice(0, 60),
            summary: parsed.summary.trim().slice(0, 220),
            why: typeof parsed.why === "string" && parsed.why.trim() ? parsed.why.trim().slice(0, 160) : null,
        };
    } catch {
        return null;
    }
}
```

- [ ] **Step 4: Correr o teste** — `npx tsx scripts/test-card-fallback.ts` → `PASS`.

- [ ] **Step 5: `completeText` em `lib/ai-messaging.ts`**

Ler o corpo de `draftReply` (linha ~477) e as suas `draftWithOpenAI`/`draftWithGeminiChain`: `completeText(system, user)` reutiliza a MESMA resolução de provider, retry e fallover, mas com mensagens raw em vez de `DraftContext`. Se as funções internas estiverem acopladas ao `DraftContext`, extrair o miolo (o fetch ao provider com system+messages) para privados `completeWithOpenAI(system: string, user: string)` / `completeWithGemini(system: string, user: string, modelName: string)` seguindo exatamente os mesmos endpoints/headers/env vars/params que os existentes usam, e fazer `draftReply` e `completeText` partilharem esse miolo (refactor puro do lado do draft — output byte-idêntico para o mesmo input). `completeText` lança em falha total (o chamador `generateCardMeta` apanha).

- [ ] **Step 6: Migração (criar ficheiro; aplicação MANUAL)**

```sql
-- supabase/migrations/20260716120000_cohost_card_meta.sql
-- Meta dos cartões do decision feed (título/resumo/porquê, gerados por LLM pós-decisão;
-- fallback heurístico no server quando null).
alter table public.ai_message_log add column if not exists card_title text;
alter table public.ai_message_log add column if not exists card_summary text;
alter table public.ai_message_log add column if not exists card_why text;
```

- [ ] **Step 7: Bridge guarda a meta**

Em `lib/beds24/bot-bridge.ts`, no `handleGuestMessage`: imediatamente ANTES do update do caminho de fila (o bloco `// Modo 'drafts', ou needs_human…`), calcular:

```typescript
    const draftText = decision.action === "auto_send" ? decision.reply : decision.draft;
    const { generateCardMeta } = await import("@/lib/ai-card-meta");
    const cardMeta = await generateCardMeta({
        guestMessage: msg.message!,
        draft: draftText,
        guestName: [booking?.firstName, booking?.lastName].filter(Boolean).join(" ") || null,
        propertyName: prop?.name ?? null,
    });
```

e acrescentar ao objeto do update de fila: `card_title: cardMeta?.title ?? null, card_summary: cardMeta?.summary ?? null, card_why: cardMeta?.why ?? null,`. No ramo de auto-send FALHADO (update com `error: "auto-send failed"`), acrescentar os mesmos 3 campos calculando a meta da mesma forma nesse ramo (pode mover o cálculo para antes do `if` do auto-send e reutilizar — MAS só quando o resultado NÃO for auto-send com sucesso; para evitar a chamada desperdiçada no sucesso, calcular lazy: no ramo de sucesso não chamar). Estrutura recomendada: calcular `cardMeta` no início dos ramos que enfileiram (fila e falha), não antes do envio.

- [ ] **Step 8: `getDecisionFeed` devolve meta com fallback**

Em `app/actions/ai-inbox.ts`: adicionar `card_title, card_summary, card_why` ao select de `getDecisionFeed`; importar `buildCardFallback` de `@/lib/ai-card-meta` (import de valor é permitido — só EXPORTS estão restringidos); no map:

```typescript
        const fb = (r.card_title && r.card_summary)
            ? null
            : buildCardFallback((r.guest_name as string | null) ?? null, r.incoming_message as string);
        // …dentro do objeto devolvido:
        cardTitle: (r.card_title as string | null) ?? fb!.title,
        cardSummary: (r.card_summary as string | null) ?? fb!.summary,
        cardWhy: (r.card_why as string | null) ?? (fb ? fb.why : null),
```

(e alargar o tipo local `DecisionCard` com `cardTitle: string; cardSummary: string; cardWhy: string | null`).

- [ ] **Step 9: Verificar + commit**

Run: `npx tsx scripts/test-card-fallback.ts && npx tsc --noEmit`
Expected: PASS + limpo.

```bash
git add lib/ai-card-meta.ts lib/ai-messaging.ts scripts/test-card-fallback.ts supabase/migrations/20260716120000_cohost_card_meta.sql lib/beds24/bot-bridge.ts app/actions/ai-inbox.ts
git commit -m "feat(cohost): LLM card meta (title/summary/why) with pure fallback"
```

**⚠ Avisar no fim: migração `20260716120000_cohost_card_meta.sql` manual no Supabase.**

---

### Task 2: Feed compacto + DecisionDetailSheet + concluídas + saudação

**Files:**
- Modify: `components/admin/cohost/DecisionCard.tsx` (reescrever compacto)
- Create: `components/admin/cohost/DecisionDetailSheet.tsx`
- Modify: `components/admin/cohost/DecisionFeed.tsx` (seleção + sheet + concluídas + header saudação)
- Modify: `app/actions/ai-inbox.ts` (novos `getRecentCompleted` e `getCohostContext`)
- Modify: `messages/{en,pt,he}.json` (`AdminCohost.feed.*` novas chaves)

**Interfaces:**
- Consumes: `cardTitle/cardSummary/cardWhy` (Task 1); `sendReply(reservationId, text, draftRowId?)`, `updateDraft(rowId, text)`, `dismissDraft(rowId)` existentes; padrão de sheet de `components/admin/reservations/Beds24BookingDetailSheet.tsx` (framer-motion, overlay z-[100], painel z-[101]).
- Produces (server actions em ai-inbox.ts, ambos `assertAdmin`):
  - `getRecentCompleted(): Promise<Array<{ rowId: string; guestName: string | null; propertyName: string | null; sentAt: string; auto: boolean }>>` — `ai_message_log` `status='sent'`, `sent_at >= now-24h`, `.not('reservation_ref','like','%-%')`, order sent_at desc, limit 10; `auto = decision === 'auto_sent'`; propertyName = `property_code`.
  - `getCohostContext(): Promise<{ firstName: string; pending: number; staying: number; arrivalsToday: number }>` — firstName do `profiles.full_name` do user atual (primeira palavra; fallback 'lá' não — fallback ao email antes do @); pending = mesma query do `getPendingDecisionCount`; staying = count `reservations` com `status in ('confirmed','checked-in')` e `check_in <= hoje` e `check_out > hoje`; arrivalsToday = count `reservations` confirmadas com `check_in = hoje` + count `blocked_dates` com `source='airbnb_booking'` e `start_date = hoje`. Datas em `yyyy-MM-dd` (date-fns `format`).
- Produces (componentes): `DecisionCard({ card, onOpen })` compacto; `DecisionDetailSheet({ card, onClose, onApprove, onDismiss, onOpenConversation })`.

- [ ] **Step 1: `DecisionCard` compacto (substituir o conteúdo do ficheiro)**

```typescript
// components/admin/cohost/DecisionCard.tsx
"use client";

import { useTranslations } from "next-intl";
import { differenceInCalendarDays, startOfDay } from "date-fns";
import { AlertTriangle } from "lucide-react";

type Card = {
    rowId: string; reservationId: string; guestName: string | null;
    propertyName: string | null; incomingMessage: string; draft: string | null;
    decision: string | null; createdAt: string; checkIn: string | null; checkOut: string | null;
    cardTitle: string; cardSummary: string; cardWhy: string | null;
};

/** Contexto temporal do hóspede: chega em N dias / em estadia / saiu. */
export function stayContext(checkIn: string | null, checkOut: string | null, t: ReturnType<typeof useTranslations<never>>): string | null {
    if (!checkIn || !checkOut) return null;
    const today = startOfDay(new Date());
    const inD = differenceInCalendarDays(startOfDay(new Date(checkIn)), today);
    const outD = differenceInCalendarDays(startOfDay(new Date(checkOut)), today);
    if (inD > 1) return t("arrivesInDays", { count: inD });
    if (inD === 1) return t("arrivesTomorrow");
    if (inD === 0) return t("arrivesToday");
    if (outD > 0) return t("staying");
    if (outD === 0) return t("departsToday");
    return t("departed");
}

export function DecisionCard({ card, onOpen }: { card: Card; onOpen: (card: Card) => void }) {
    const t = useTranslations("AdminCohost.feed");
    const urgent = card.decision === "hard_rule";
    const ctx = stayContext(card.checkIn, card.checkOut, t as never);
    const eyebrow = [card.guestName ?? t("guestFallback"), card.propertyName, ctx].filter(Boolean).join(" · ");

    return (
        <button
            onClick={() => onOpen(card)}
            className="w-full text-left rounded-2xl border border-[#f5f5f5] bg-white p-4 shadow-sm transition-colors hover:border-[#e5e5e5] dark:border-admin-dark-border dark:bg-admin-dark-surface dark:hover:border-white/20"
        >
            <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[10px] font-bold uppercase tracking-wider text-[#a3a3a3]">{eyebrow}</span>
                {urgent && (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                        <AlertTriangle className="size-3" /> {t("needsYou")}
                    </span>
                )}
            </div>
            <p className="mt-1.5 text-[16px] font-extrabold tracking-tight text-[#171717] dark:text-white">{card.cardTitle}</p>
            <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-[#737373] dark:text-white/60">{card.cardSummary}</p>
            <span className="mt-3 inline-block rounded-full bg-[#f5f5f5] px-3.5 py-1.5 text-xs font-bold text-[#171717] dark:bg-white/10 dark:text-white">
                {t("review")}
            </span>
        </button>
    );
}
```

- [ ] **Step 2: `DecisionDetailSheet`**

```typescript
// components/admin/cohost/DecisionDetailSheet.tsx
"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { X, Check, MessageSquareText, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

type Card = {
    rowId: string; reservationId: string; guestName: string | null;
    propertyName: string | null; incomingMessage: string; draft: string | null;
    decision: string | null; createdAt: string; checkIn: string | null; checkOut: string | null;
    cardTitle: string; cardSummary: string; cardWhy: string | null;
};

export function DecisionDetailSheet({ card, onClose, onApprove, onDismiss, onOpenConversation }: {
    card: Card | null;
    onClose: () => void;
    onApprove: (rowId: string, reservationId: string, text: string) => Promise<void>;
    onDismiss: (rowId: string) => Promise<void>;
    onOpenConversation: (reservationId: string) => void;
}) {
    const t = useTranslations("AdminCohost.feed");
    const [text, setText] = useState("");
    const [busy, setBusy] = useState<"approve" | "dismiss" | null>(null);
    useEffect(() => { setText(card?.draft ?? ""); setBusy(null); }, [card?.rowId]); // eslint-disable-line react-hooks/exhaustive-deps
    if (!card) return null;

    const fmt = (d: string | null) => (d ? format(new Date(d), "EEE, d MMM") : "—");

    return (
        <AnimatePresence>
            <motion.div key="dd-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={onClose} className="fixed inset-0 z-[100] bg-black/25" />
            {/* mobile: bottom sheet · md+: painel lateral direito */}
            <motion.div
                key={`dd-${card.rowId}`}
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="fixed inset-x-0 bottom-0 z-[101] flex max-h-[88%] flex-col rounded-t-3xl bg-white shadow-2xl dark:bg-admin-dark-surface md:inset-x-auto md:inset-y-0 md:right-0 md:max-h-none md:w-full md:max-w-md md:rounded-none"
            >
                <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-gray-200 md:hidden dark:bg-white/10" />
                <div className="flex items-start justify-between gap-3 border-b border-[#f5f5f5] p-5 dark:border-white/10">
                    <div className="min-w-0">
                        <h2 className="text-lg font-extrabold tracking-tight text-[#171717] dark:text-white">{card.cardTitle}</h2>
                        <p className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-wider text-[#a3a3a3]">
                            {[card.guestName ?? t("guestFallback"), card.propertyName].filter(Boolean).join(" · ")}
                        </p>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/5 dark:hover:text-white">
                        <X className="size-4" />
                    </button>
                </div>
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
                    <div className="overflow-hidden rounded-2xl border border-[#f5f5f5] dark:border-white/10">
                        {[
                            [t("profileGuest"), card.guestName ?? t("guestFallback")],
                            [t("profileStay"), `${fmt(card.checkIn)} → ${fmt(card.checkOut)}`],
                            [t("profileProperty"), card.propertyName ?? "—"],
                        ].map(([k, v]) => (
                            <div key={k} className="flex justify-between border-b border-[#f5f5f5] px-4 py-2.5 text-[13px] last:border-b-0 dark:border-white/10">
                                <span className="font-semibold text-[#a3a3a3]">{k}</span>
                                <span className="font-bold text-[#171717] dark:text-white">{v}</span>
                            </div>
                        ))}
                    </div>
                    {card.cardWhy && (
                        <div className="rounded-2xl bg-[#f7f1e6] p-4 text-[12.5px] text-[#171717] dark:bg-[#2a2517] dark:text-white/90">
                            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-[#c5a059]">{t("whyMatters")}</p>
                            {card.cardWhy}
                        </div>
                    )}
                    <div className="rounded-2xl bg-[#fafafa] p-4 text-[13px] dark:bg-white/5">
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#a3a3a3]">{t("guestMessage")}</p>
                        <p className="whitespace-pre-wrap text-[#171717] dark:text-white/90">{card.incomingMessage}</p>
                    </div>
                    <div className="rounded-2xl border-2 border-dashed border-[#e5e5e5] p-4 dark:border-white/10">
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#c5a059]">{t("draftLabel")}</p>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            rows={6}
                            className="w-full resize-y bg-transparent text-[13px] leading-relaxed text-[#171717] outline-none dark:text-white"
                            placeholder={t("noDraft")}
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2 border-t border-[#f5f5f5] p-4 dark:border-white/10">
                    <button
                        disabled={!text.trim() || busy !== null}
                        onClick={async () => { setBusy("approve"); try { await onApprove(card.rowId, card.reservationId, text); } finally { setBusy(null); } }}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-[#171717] px-4 py-3.5 text-sm font-extrabold text-white transition-opacity disabled:opacity-50 dark:bg-white dark:text-black"
                    >
                        <Check className="size-4" /> {busy === "approve" ? t("sending") : t("approveSend")}
                    </button>
                    <button
                        disabled={busy !== null}
                        onClick={async () => { setBusy("dismiss"); try { await onDismiss(card.rowId); } finally { setBusy(null); } }}
                        className="rounded-2xl border border-[#e5e5e5] p-3.5 text-[#737373] dark:border-white/10 dark:text-white/60"
                        aria-label={t("ignore")}
                    >
                        <Trash2 className="size-4" />
                    </button>
                    <button
                        onClick={() => onOpenConversation(card.reservationId)}
                        className="rounded-2xl border border-[#e5e5e5] p-3.5 text-[#737373] dark:border-white/10 dark:text-white/60"
                        aria-label={t("openConversation")}
                    >
                        <MessageSquareText className="size-4" />
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
```

- [ ] **Step 3: Actions `getRecentCompleted` + `getCohostContext`** (fim de `app/actions/ai-inbox.ts`, contratos exatos no bloco Interfaces; ambos começam com `await assertAdmin()`; usar `getSupabaseAdmin()`; datas com `format(new Date(), 'yyyy-MM-dd')` de date-fns).

- [ ] **Step 4: `DecisionFeed` reescrito** — mantém realtime/polling/refresh e os handlers approve/dismiss com toasts EXATAMENTE como estão (commit 8caf385); muda: (a) header de saudação no topo (só na tab Decisões): `t("greetingMorning"/"greetingAfternoon"/"greetingEvening", { name })` por hora local (<12/<19/else) + linha `t("contextLine", { pending, staying, arrivals })` com dados de `getCohostContext()` (fetch no mount, silencioso em falha); (b) estado `selected: Card | null`; cartões renderizam `DecisionCard` compacto com `onOpen={setSelected}`; monta `<DecisionDetailSheet card={selected} … />` — `onApprove` fecha o sheet no sucesso (`setSelected(null)` após os toasts), `onDismiss` idem, `onOpenConversation` chama o prop existente `onOpenConversation` E fecha; (c) secção concluídas: `getRecentCompleted()` no refresh, render sob o feed (título eyebrow `t("completed")`, cartões pequenos ✓ `t("completedLine", { name, time })` — time relativo com `formatDistanceToNow` de date-fns, locale pt quando locale=pt).

- [ ] **Step 5: i18n `AdminCohost.feed` (3 ficheiros, he=en)** — adicionar:

```json
"review": "Review reply", "arrivesInDays": "arrives in {count} days", "arrivesTomorrow": "arrives tomorrow",
"arrivesToday": "arrives today", "staying": "staying now", "departsToday": "departs today", "departed": "departed",
"profileGuest": "Guest", "profileStay": "Stay", "profileProperty": "Property", "whyMatters": "Why this matters",
"guestMessage": "Guest message", "draftLabel": "Co-Host reply — edit freely", "completed": "Completed",
"completedLine": "Reply sent to {name} · {time}", "greetingMorning": "Good morning, {name}",
"greetingAfternoon": "Good afternoon, {name}", "greetingEvening": "Good evening, {name}",
"contextLine": "{pending} to review · {staying} staying · {arrivals} arriving today"
```

pt: `"review": "Rever resposta", "arrivesInDays": "chega em {count} dias", "arrivesTomorrow": "chega amanhã", "arrivesToday": "chega hoje", "staying": "em estadia", "departsToday": "sai hoje", "departed": "saiu", "profileGuest": "Hóspede", "profileStay": "Estadia", "profileProperty": "Propriedade", "whyMatters": "Porque importa", "guestMessage": "Mensagem do hóspede", "draftLabel": "Resposta do Co-Host — edita à vontade", "completed": "Concluídas", "completedLine": "Resposta enviada a {name} · {time}", "greetingMorning": "Bom dia, {name}", "greetingAfternoon": "Boa tarde, {name}", "greetingEvening": "Boa noite, {name}", "contextLine": "{pending} por rever · {staying} em estadia · {arrivals} chegadas hoje"`.

- [ ] **Step 6: Verificar + commit**

Run: `npx tsc --noEmit && npm run build`
Expected: limpos.

```bash
git add components/admin/cohost app/actions/ai-inbox.ts messages/en.json messages/pt.json messages/he.json
git commit -m "feat(cohost): compact Lodgify-style cards + responsive detail sheet + completed + greeting"
```

---

### Task 3: Helpers de estado + `getOverviewData`

**Files:**
- Create: `lib/overview-status.ts`
- Create: `scripts/test-overview-status.ts`
- Create: `app/actions/overview.ts`

**Interfaces:**
- Produces (puros, `lib/overview-status.ts`):
  - `type StayStatus = 'arrives_today' | 'departs_tomorrow' | 'staying' | 'arrives_soon'`
  - `deriveStayStatus(checkIn: string, checkOut: string, todayISO: string): StayStatus | null` — null se fora da janela de interesse (checkOut < hoje, ou checkIn > hoje+7)
  - `derivePropertyToday(stays: Array<{ check_in: string; check_out: string }>, todayISO: string): 'occupied' | 'arrives_today' | 'free'`
- Produces (`app/actions/overview.ts`, 'use server', guard = padrão assertAdmin super_admin copiado de ai-inbox.ts):
  - `getOverviewData(): Promise<OverviewData>` com tipo local NÃO exportado:
```typescript
type OverviewData = {
    firstName: string;
    counts: { staying: number; arrivalsToday: number; departuresTomorrow: number; pending: number };
    cohost: { pending: { rowId: string; title: string }[]; alert: { kind: 'send_failed' | 'stale_draft'; label: string } | null } | null;
    stays: { guestName: string; propertyTitle: string; propertyImage: string | null; checkIn: string; checkOut: string; guests: number | null; status: 'arrives_today' | 'departs_tomorrow' | 'staying' | 'arrives_soon' }[];
    properties: { id: string; title: string; city: string | null; image: string | null; today: 'occupied' | 'arrives_today' | 'free'; nextArrival: string | null; pendingCount: number }[];
};
```
  - Fontes: `reservations` (status in confirmed/checked-in, janela `check_out >= hoje` e `check_in <= hoje+7`) + `blocked_dates` (`source='airbnb_booking'`, mesma janela, guestName='Airbnb'); `properties` ativos não multi-unit (`id,title,city,images,is_active,is_multi_unit`) com título/city localizados pelo padrão `getTranslation` de `app/[locale]/admin/reservations/page.tsx:163`; imagem = `images[0].url ?? images[0]`; `cohost.pending` = 3 primeiros do feed com `card_title` (fallback `buildCardFallback`); alert = 1º de: `ai_message_log status='failed'` nas 24h (`send_failed`) senão draft com `created_at < now-24h` (`stale_draft`); `pendingCount` por propriedade: `ai_message_log` drafts agrupados por `reservation_ref` → `ai_conversation.external_property_id` → `beds24_properties.internal_property_id`; `stays` ordenados por (status: arrives_today, departs_tomorrow, staying, arrives_soon) e depois check_in, máx 8; `firstName` = 1ª palavra de `profiles.full_name` do user (fallback: parte antes do @ do email).

- [ ] **Step 1: Teste dos helpers (falha primeiro)**

```typescript
// scripts/test-overview-status.ts — npx tsx; exit 1 em falha
import { deriveStayStatus, derivePropertyToday } from '../lib/overview-status';

let fail = 0;
const t = (n: string, ok: boolean) => { if (!ok) { console.error(`FAIL ${n}`); fail++; } };
const today = '2026-07-16';

t('chega hoje', deriveStayStatus('2026-07-16', '2026-07-19', today) === 'arrives_today');
t('sai amanhã', deriveStayStatus('2026-07-14', '2026-07-17', today) === 'departs_tomorrow');
t('em estadia', deriveStayStatus('2026-07-14', '2026-07-21', today) === 'staying');
t('chega em breve', deriveStayStatus('2026-07-18', '2026-07-22', today) === 'arrives_soon');
t('fora de janela (passado)', deriveStayStatus('2026-07-01', '2026-07-10', today) === null);
t('fora de janela (>7d)', deriveStayStatus('2026-07-30', '2026-08-02', today) === null);
t('sai HOJE ainda ocupada até checkout → staying', deriveStayStatus('2026-07-14', '2026-07-16', today) === 'staying');

t('ocupada', derivePropertyToday([{ check_in: '2026-07-14', check_out: '2026-07-21' }], today) === 'occupied');
t('chega hoje', derivePropertyToday([{ check_in: '2026-07-16', check_out: '2026-07-19' }], today) === 'arrives_today');
t('livre', derivePropertyToday([{ check_in: '2026-07-20', check_out: '2026-07-22' }], today) === 'free');
t('vazio → livre', derivePropertyToday([], today) === 'free');

console.log(fail === 0 ? 'PASS' : `${fail} failures`);
process.exit(fail === 0 ? 0 : 1);
```

- [ ] **Step 2: Ver falhar** — `npx tsx scripts/test-overview-status.ts`.

- [ ] **Step 3: Implementar `lib/overview-status.ts`**

```typescript
// lib/overview-status.ts — estado derivado das estadias para o Overview. Puro; datas ISO yyyy-MM-dd.
export type StayStatus = 'arrives_today' | 'departs_tomorrow' | 'staying' | 'arrives_soon';

const addDaysISO = (iso: string, n: number): string => {
    const d = new Date(`${iso}T00:00:00`);
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
};

export function deriveStayStatus(checkIn: string, checkOut: string, todayISO: string): StayStatus | null {
    if (checkOut < todayISO) return null;                       // já saiu
    if (checkIn > addDaysISO(todayISO, 7)) return null;         // longe demais
    if (checkIn === todayISO) return 'arrives_today';
    if (checkIn < todayISO) {
        return checkOut === addDaysISO(todayISO, 1) ? 'departs_tomorrow' : 'staying';
    }
    return 'arrives_soon';
}

export function derivePropertyToday(
    stays: Array<{ check_in: string; check_out: string }>,
    todayISO: string,
): 'occupied' | 'arrives_today' | 'free' {
    if (stays.some((s) => s.check_in === todayISO)) return 'arrives_today';
    if (stays.some((s) => s.check_in < todayISO && s.check_out > todayISO)) return 'occupied';
    return 'free';
}
```

- [ ] **Step 4: Ver passar** — `npx tsx scripts/test-overview-status.ts` → `PASS`.

- [ ] **Step 5: Implementar `app/actions/overview.ts`** conforme o contrato do bloco Interfaces (uma action; queries em paralelo com `Promise.all`; nunca lança — em erro devolve estrutura vazia com `firstName` e zeros; comentários PT).

- [ ] **Step 6: Verificar + commit**

Run: `npx tsx scripts/test-overview-status.ts && npx tsc --noEmit`

```bash
git add lib/overview-status.ts scripts/test-overview-status.ts app/actions/overview.ts
git commit -m "feat(cohost): overview data action + pure stay-status helpers"
```

---

### Task 4: Overview page — fusão

**Files:**
- Modify: `app/[locale]/admin/page.tsx` (reescrever o conteúdo mantendo o gate super_admin client-side existente, linhas 13–43)
- Modify: `messages/{en,pt,he}.json` (novo namespace `AdminOverview`)

**Interfaces:**
- Consumes: `getOverviewData()` (Task 3); `Link` de `@/i18n/routing` (NUNCA next/link direto).
- Estrutura (mockup v3-fusao-overview): mantém secção header com o botão "New Property" EXATAMENTE como está (mesmo markup); título passa a saudação `t("greetingMorning"/"Afternoon"/"Evening", { name })` + subtítulo `data longa (format(new Date(), 'EEEE, d MMM', locale pt/en/he)) · t("contextLine", { staying, arrivals, departures })`.
- **Banner Co-Host** (render só se `data.cohost !== null`): container `rounded-[20px] bg-[#14161a] dark:bg-black text-white p-6 flex flex-wrap items-center gap-5 shadow-sm`; ícone Sparkles em quadrado `bg-[#c5a059]/15 text-[#c5a059] rounded-2xl size-11`; título `t("cohostTitle")` + badge branco `t("toReview", { count })`; sub `t("cohostSub", { count })`; chips = `cohost.pending` titles (`bg-white/10 border border-white/15 rounded-full px-3 py-1 text-[11px] font-bold`) + chip do alert (`border-red-400/40 text-red-300`) quando existir; CTA `<Link href="/admin/cohost">` `bg-[#c5a059] text-[#14161a] rounded-2xl px-5 py-3 text-[12.5px] font-extrabold` `t("openCohost")`.
- **Chegadas & Partidas**: secrow `t("staysTitle")` + `<Link href="/admin/reservations">`{t("seeCalendar")}`</Link>`; grid `grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4`; cartão = imagem `h-24` (`<img src={propertyImage}>` com fallback `bg-[#f5f5f5] dark:bg-white/5`) com chip de estado sobreposto (`arrives_today`→verde `t("chipArrivesToday")`, `departs_tomorrow`→cinza `t("chipDepartsTomorrow")`, `staying`→âmbar `t("chipStaying")`, `arrives_soon`→verde `t("chipArrives", { day: format(checkIn, 'EEE') })`), corpo = nome bold, propriedade sub, meta datas+hóspedes com divisória (o mockup); vazio → `t("noStays")`.
- **Estado das propriedades**: secrow `t("propertiesTitle")` + `<Link href="/admin/properties">`; tabela como o mockup (thumb 34px, nome+cidade, chip today `t("stOccupied"/"stArrivesToday"/"stFree")`, próxima chegada formatada ou "—", coluna Co-Host `t("toReview", { count })` a dourado quando `pendingCount>0` senão "—" (coluna inteira só render quando `data.cohost !== null`), célula final `<Link href={/admin/properties/${id}}>` com `MoreHorizontal`).
- Loading: skeletons pulse nas 3 secções; erro → manter página com zeros (a action nunca lança).
- Mobile: tudo empilha (grid-cols-1); banner com wrap.

- [ ] **Step 1: Reescrever a página** conforme acima, mantendo o bloco de auth existente intacto e o estado `isAuthorized`; fetch `getOverviewData()` num useEffect após autorização; estado `data: OverviewDataLike | null` (tipo local estrutural inferido de `Awaited<ReturnType<typeof getOverviewData>>`).

- [ ] **Step 2: i18n `AdminOverview` (3 ficheiros, he=en)**

en:
```json
"AdminOverview": {
    "greetingMorning": "Good morning, {name} 👋", "greetingAfternoon": "Good afternoon, {name} 👋", "greetingEvening": "Good evening, {name} 👋",
    "contextLine": "{staying} staying · {arrivals} arriving today · {departures} departing tomorrow",
    "newProperty": "New Property",
    "cohostTitle": "Your Co-Host", "toReview": "{count} to review",
    "cohostSub": "Drafted {count} replies waiting for your approval.",
    "openCohost": "Open Co-Host →",
    "staysTitle": "Arrivals & Departures", "seeCalendar": "See calendar →", "noStays": "No arrivals or departures in the next 7 days.",
    "chipArrivesToday": "Arrives today", "chipDepartsTomorrow": "Departs tomorrow", "chipStaying": "Staying", "chipArrives": "Arrives {day}",
    "datesLabel": "Dates", "guestsLabel": "Guests",
    "propertiesTitle": "Property status", "seeAll": "See all →",
    "colProperty": "Property", "colToday": "Today", "colNextArrival": "Next arrival", "colCohost": "Co-Host",
    "stOccupied": "Occupied", "stArrivesToday": "Arrives today", "stFree": "Free"
}
```
pt: `"greetingMorning": "Bom dia, {name} 👋", "greetingAfternoon": "Boa tarde, {name} 👋", "greetingEvening": "Boa noite, {name} 👋", "contextLine": "{staying} em estadia · {arrivals} chegadas hoje · {departures} partidas amanhã", "newProperty": "Nova Propriedade", "cohostTitle": "O teu Co-Host", "toReview": "{count} por rever", "cohostSub": "Redigiu {count} respostas à espera da tua aprovação.", "openCohost": "Abrir Co-Host →", "staysTitle": "Chegadas & Partidas", "seeCalendar": "Ver calendário →", "noStays": "Sem chegadas ou partidas nos próximos 7 dias.", "chipArrivesToday": "Chega hoje", "chipDepartsTomorrow": "Sai amanhã", "chipStaying": "Em estadia", "chipArrives": "Chega {day}", "datesLabel": "Datas", "guestsLabel": "Hóspedes", "propertiesTitle": "Estado das propriedades", "seeAll": "Ver todas →", "colProperty": "Propriedade", "colToday": "Hoje", "colNextArrival": "Próx. chegada", "colCohost": "Co-Host", "stOccupied": "Ocupada", "stArrivesToday": "Chega hoje", "stFree": "Livre"`.

- [ ] **Step 3: Verificar + commit**

Run: `npx tsc --noEmit && npm run build`
Expected: limpos; rota `/[locale]/admin` compila. Confirmar também no report que o landing de super_admin já é `/admin` (é — o próprio page.tsx só autoriza super_admin; nenhum redirect novo é preciso — registar no report).

```bash
git add "app/[locale]/admin/page.tsx" messages/en.json messages/pt.json messages/he.json
git commit -m "feat(cohost): Overview fused — co-host banner, real arrivals & property status"
```
