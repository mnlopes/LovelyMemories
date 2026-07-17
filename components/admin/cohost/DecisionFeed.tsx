// components/admin/cohost/DecisionFeed.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { PartyPopper, Check, Inbox } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { getDecisionFeed, getRecentCompleted, getCohostContext, sendReply, updateDraft, dismissDraft } from "@/app/actions/ai-inbox";
import { DecisionCard } from "./DecisionCard";
import { DecisionDetailSheet } from "./DecisionDetailSheet";

type Card = Awaited<ReturnType<typeof getDecisionFeed>>[number];
type CompletedItem = Awaited<ReturnType<typeof getRecentCompleted>>[number];
type CohostContext = Awaited<ReturnType<typeof getCohostContext>>;

export function DecisionFeed({ onOpenConversation, initialDecisionId }: { onOpenConversation?: (reservationId: string) => void; initialDecisionId?: string | null }) {
    const t = useTranslations("AdminCohost.feed");
    const params = useParams();
    const locale = (params?.locale as string) || "en";
    const dateLocale = locale === "pt" ? pt : undefined;
    const [cards, setCards] = useState<Card[] | null>(null);
    const [completed, setCompleted] = useState<CompletedItem[]>([]);
    const [context, setContext] = useState<CohostContext | null>(null);
    const [selected, setSelected] = useState<Card | null>(null);
    const consumedDeepLink = useRef(false);

    const refresh = useCallback(async () => {
        try { setCards(await getDecisionFeed()); } catch { /* próximo tick */ }
        try { setCompleted(await getRecentCompleted()); } catch { /* fail-soft */ }
    }, []);

    useEffect(() => {
        void refresh();
        getCohostContext().then(setContext).catch(() => { /* saudação sem contexto é aceitável */ });
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

    // Deep-link de notificação: abre o cartão assim que o feed carrega (uma vez).
    useEffect(() => {
        if (consumedDeepLink.current || !initialDecisionId || cards === null) return;
        consumedDeepLink.current = true;
        const match = cards.find((c) => c.rowId === initialDecisionId);
        if (match) setSelected(match);
    }, [initialDecisionId, cards]);

    const approve = useCallback(async (rowId: string, reservationId: string, text: string) => {
        const updateRes = await updateDraft(rowId, text);
        if (!updateRes.ok) {
            toast.error(t("sendFailed"));
            void refresh();
            return;
        }
        const sendRes = await sendReply(reservationId, text, rowId);
        if (!sendRes.ok) {
            toast.error(t("sendFailed"));
        } else {
            toast.success(t("sent"));
            setSelected(null);
        }
        void refresh();
    }, [refresh, t]);

    const dismiss = useCallback(async (rowId: string) => {
        const res = await dismissDraft(rowId);
        if (!res.ok) {
            toast.error(t("dismissFailed"));
        } else {
            setSelected(null);
        }
        void refresh();
    }, [refresh, t]);

    const openConversation = useCallback((reservationId: string) => {
        setSelected(null);
        onOpenConversation?.(reservationId);
    }, [onOpenConversation]);

    const greeting = (() => {
        if (!context) return null;
        const hour = new Date().getHours();
        const key = hour < 12 ? "greetingMorning" : hour < 19 ? "greetingAfternoon" : "greetingEvening";
        return t(key, { name: context.firstName });
    })();

    // Linha de contexto sem contadores a zero (o "por rever" vive na pill dourada).
    const contextParts = context
        ? [
            context.staying > 0 ? t("ctxStaying", { count: context.staying }) : null,
            context.arrivalsToday > 0 ? t("ctxArriving", { count: context.arrivalsToday }) : null,
        ].filter(Boolean)
        : [];

    return (
        <div className="space-y-3">
            {context && (
                <div className="mb-1 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-xl font-extrabold tracking-tight text-[#171717] dark:text-white">{greeting}</p>
                        {contextParts.length > 0 && (
                            <p className="mt-0.5 text-sm text-[#737373] dark:text-white/60">{contextParts.join(" · ")}</p>
                        )}
                    </div>
                    {context.pending > 0 && (
                        <span className="mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#faf3e6] px-3 py-1 text-xs font-bold text-[#8a6a2f] dark:bg-[#c5a059]/15 dark:text-[#e0c088]">
                            <Inbox className="size-3.5" />
                            {t("pending", { count: context.pending })}
                        </span>
                    )}
                </div>
            )}

            {cards === null ? (
                <div className="space-y-3" aria-hidden>
                    {[...Array(3)].map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-[#f5f5f5] dark:bg-white/5" />)}
                </div>
            ) : cards.length === 0 ? (
                <div className="rounded-2xl border border-[#f5f5f5] bg-white p-10 text-center shadow-sm dark:border-admin-dark-border dark:bg-admin-dark-surface">
                    <PartyPopper className="mx-auto size-8 text-[#c5a059]" />
                    <p className="mt-3 text-sm font-semibold text-[#171717] dark:text-white">{t("allClear")}</p>
                    <p className="mt-1 text-xs text-[#a3a3a3]">{t("allClearHint")}</p>
                </div>
            ) : (
                <>
                    {cards.map((c) => (
                        <DecisionCard key={c.rowId} card={c} onOpen={setSelected} />
                    ))}
                </>
            )}

            {completed.length > 0 && (
                <div className="mt-6 space-y-2">
                    <p className="text-xs font-bold uppercase tracking-widest text-[#a3a3a3]">{t("completed")}</p>
                    {completed.map((c) => (
                        <div key={c.rowId} className="flex items-center gap-2 rounded-xl border border-[#f5f5f5] bg-white px-3.5 py-2.5 text-[13px] text-[#737373] shadow-sm dark:border-admin-dark-border dark:bg-admin-dark-surface dark:text-white/60">
                            <Check className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                            <span className="truncate">
                                {t("completedLine", {
                                    name: c.guestName ?? t("guestFallback"),
                                    time: formatDistanceToNow(new Date(c.sentAt), { addSuffix: true, locale: dateLocale }),
                                })}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            <DecisionDetailSheet
                card={selected}
                onClose={() => setSelected(null)}
                onApprove={approve}
                onDismiss={dismiss}
                onOpenConversation={openConversation}
            />
        </div>
    );
}
