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
