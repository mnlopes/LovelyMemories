"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { pt } from "date-fns/locale";
import { Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { OpportunitiesCalendar } from "@/components/admin/opportunities/OpportunitiesCalendar";
import type { OpportunitiesData } from "@/app/actions/opportunities";

/**
 * Miolo do modo Opportunities da Overview: toggle de janela 30/60 dias + cartões de
 * noites órfãs por urgência (com scroll horizontal por setas) + calendário dedicado.
 * Selecionar um cartão filtra o calendário; o ✕ do chip limpa e mostra todas as casas.
 */
export function OpportunitiesView({
    data, locale, days, onDaysChange,
}: {
    data: OpportunitiesData;
    locale: string;
    days: 30 | 60;
    onDaysChange: (d: 30 | 60) => void;
}) {
    const t = useTranslations("AdminOpportunities");
    const dateLocale = locale === "pt" ? pt : undefined;
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [minNights, setMinNights] = useState<1 | 2 | 3 | 4 | 5>(1);
    const cardsRef = useRef<HTMLDivElement>(null);

    // Filtro por tamanho mínimo do gap — client-side sobre os dados já carregados (instantâneo).
    const opps = data.opportunities.filter((o) => o.nights >= minNights);
    const propIds = new Set(opps.map((o) => o.propertyId));
    const rows = data.rows.filter((r) => propIds.has(r.propertyId));

    const today = new Date();
    const daysUntil = (iso: string) => {
        const d = differenceInCalendarDays(parseISO(iso), today);
        if (d <= 0) return t("nowGap");
        if (d === 1) return t("inDaysOne");
        return t("inDays", { count: d });
    };

    const scrollCards = (dir: -1 | 1) => cardsRef.current?.scrollBy({ left: dir * 400, behavior: "smooth" });

    const controls = (
        <div className="flex items-center gap-2">
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-admin-text-secondary">{t("minGapLabel")}</span>
            <div className="flex gap-0.5 bg-admin-bg border border-admin-border rounded-lg p-0.5">
                {([1, 2, 3, 4, 5] as const).map((n) => (
                    <button
                        key={n}
                        onClick={() => setMinNights(n)}
                        className={`text-[11px] font-bold rounded-md px-2 py-1 transition-colors ${minNights === n
                            ? "bg-admin-surface text-admin-text-primary shadow-sm"
                            : "text-admin-text-secondary hover:text-admin-text-primary"}`}
                    >
                        {n}+
                    </button>
                ))}
            </div>
            <span className="w-px h-4 bg-admin-border" />
            <div className="flex gap-0.5 bg-admin-bg border border-admin-border rounded-lg p-0.5">
                {([30, 60] as const).map((d) => (
                    <button
                        key={d}
                        onClick={() => onDaysChange(d)}
                        className={`text-[11px] font-bold rounded-md px-2.5 py-1 transition-colors ${days === d
                            ? "bg-admin-surface text-admin-text-primary shadow-sm"
                            : "text-admin-text-secondary hover:text-admin-text-primary"}`}
                    >
                        {t("windowDays", { count: d })}
                    </button>
                ))}
            </div>
        </div>
    );

    if (opps.length === 0) {
        return (
            <div className="space-y-4">
                <div className="bg-admin-surface rounded-2xl border border-admin-border p-3 flex items-center justify-between flex-wrap gap-2">
                    <span className="text-sm font-bold text-admin-text-primary flex items-center gap-2">
                        <Sparkles className="size-4 text-[#c5a059]" />{t("title")}
                    </span>
                    {controls}
                </div>
                <div className="bg-admin-surface rounded-2xl border border-admin-border p-12 text-center shadow-sm">
                    <Sparkles className="size-6 text-[#c5a059] mx-auto mb-3" />
                    <p className="text-sm font-bold text-admin-text-primary">{t("emptyTitle")}</p>
                    <p className="text-xs text-admin-text-secondary mt-1">{t("emptySubDays", { count: days })}</p>
                </div>
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
                        <span className="text-[10.5px] font-bold text-[#a9863f] bg-[#c5a059]/14 rounded-full px-2 py-0.5">{opps.length}</span>
                    </span>
                    {controls}
                </div>
                <div className="relative">
                    <div ref={cardsRef} className="flex gap-2.5 p-3 overflow-x-auto scroll-smooth scrollbar-hide">
                        {opps.map((o) => {
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
                    {/* Setas de scroll (o container esconde a scrollbar) */}
                    <button
                        onClick={() => scrollCards(-1)}
                        aria-label="‹"
                        className="absolute left-1 top-1/2 -translate-y-1/2 size-7 rounded-full bg-admin-surface border border-admin-border shadow-sm flex items-center justify-center text-admin-text-secondary hover:text-admin-text-primary"
                    ><ChevronLeft className="size-4" /></button>
                    <button
                        onClick={() => scrollCards(1)}
                        aria-label="›"
                        className="absolute right-1 top-1/2 -translate-y-1/2 size-7 rounded-full bg-admin-surface border border-admin-border shadow-sm flex items-center justify-center text-admin-text-secondary hover:text-admin-text-primary"
                    ><ChevronRight className="size-4" /></button>
                </div>
            </div>

            {/* Calendário filtrável */}
            <OpportunitiesCalendar
                rows={rows}
                opportunities={opps}
                windowFrom={data.windowFrom}
                windowTo={data.windowTo}
                selectedId={selectedId}
                locale={locale}
                onClearFilter={() => setSelectedId(null)}
            />
        </div>
    );
}
