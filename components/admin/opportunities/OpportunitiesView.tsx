"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { pt } from "date-fns/locale";
import { Sparkles } from "lucide-react";
import { OpportunitiesCalendar } from "@/components/admin/opportunities/OpportunitiesCalendar";
import type { OpportunitiesData } from "@/app/actions/opportunities";

/**
 * Miolo do modo Opportunities da Overview: cartões de noites órfãs por urgência +
 * calendário dedicado por baixo. Selecionar um cartão filtra o calendário para essa
 * casa; clicar de novo (ou o ✕ do chip) limpa o filtro e mostra todas as casas.
 */
export function OpportunitiesView({ data, locale }: { data: OpportunitiesData; locale: string }) {
    const t = useTranslations("AdminOpportunities");
    const dateLocale = locale === "pt" ? pt : undefined;
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const today = new Date();
    const daysUntil = (iso: string) => {
        const d = differenceInCalendarDays(parseISO(iso), today);
        if (d <= 0) return t("nowGap");
        if (d === 1) return t("inDaysOne");
        return t("inDays", { count: d });
    };

    if (data.opportunities.length === 0) {
        return (
            <div className="bg-admin-surface rounded-2xl border border-admin-border p-12 text-center shadow-sm">
                <Sparkles className="size-6 text-[#c5a059] mx-auto mb-3" />
                <p className="text-sm font-bold text-admin-text-primary">{t("emptyTitle")}</p>
                <p className="text-xs text-admin-text-secondary mt-1">{t("emptySub")}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Cartões de oportunidades por urgência */}
            <div className="bg-admin-surface rounded-2xl border-[1.5px] border-[#c5a059] overflow-hidden shadow-sm">
                <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-admin-border flex-wrap">
                    <span className="text-sm font-bold text-admin-text-primary flex items-center gap-2">
                        <Sparkles className="size-4 text-[#c5a059]" />
                        {t("title")}
                        <span className="text-[10.5px] font-bold text-[#a9863f] bg-[#c5a059]/14 rounded-full px-2 py-0.5">{data.opportunities.length}</span>
                    </span>
                    <span className="text-[11px] text-admin-text-secondary">{t("subtitle")}</span>
                </div>
                <div className="flex gap-2.5 p-3 overflow-x-auto scrollbar-hide">
                    {data.opportunities.map((o) => {
                        const active = selectedId === o.id;
                        return (
                            <button
                                key={o.id}
                                onClick={() => setSelectedId(active ? null : o.id)}
                                className={`shrink-0 w-[184px] text-left rounded-xl border-[1.5px] p-3 transition-colors ${active
                                    ? "border-[#c5a059] bg-[#c5a059]/[0.07]"
                                    : "border-admin-border bg-admin-surface hover:border-[#c5a059]/50"}`}
                            >
                                <div className="flex items-center gap-2 mb-1.5">
                                    <div className="size-7 rounded-md bg-admin-bg bg-cover bg-center shrink-0 border border-admin-border" style={{ backgroundImage: o.image ? `url(${o.image})` : undefined }} />
                                    <p className="text-[12px] font-bold text-admin-text-primary leading-tight truncate">{o.propertyTitle}</p>
                                </div>
                                <p className="text-[11px] text-admin-text-secondary">
                                    {format(parseISO(o.gapStart), "d MMM", { locale: dateLocale })} → {format(parseISO(o.gapEnd), "d MMM", { locale: dateLocale })}
                                </p>
                                <div className="flex items-center justify-between mt-2">
                                    <span className="text-[9.5px] font-bold text-[#8a3b1d] bg-[#faece7] rounded-full px-2 py-0.5">
                                        {o.nights === 1 ? t("oneNight") : t("nNights", { count: o.nights })}
                                    </span>
                                    <span className="text-[9px] text-admin-text-secondary">{daysUntil(o.gapStart)}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Calendário filtrável */}
            <OpportunitiesCalendar
                rows={data.rows}
                opportunities={data.opportunities}
                windowFrom={data.windowFrom}
                windowTo={data.windowTo}
                selectedId={selectedId}
                locale={locale}
                onClearFilter={() => setSelectedId(null)}
            />
        </div>
    );
}
