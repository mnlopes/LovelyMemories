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
