"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { format, parseISO, addDays, differenceInCalendarDays, isSameDay } from "date-fns";
import { pt } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Flag, X } from "lucide-react";
import type { OpportunityItem, OpportunityRow } from "@/app/actions/opportunities";

const VISIBLE_DAYS = 14;

/**
 * Timeline dedicada do modo Opportunities (não reutiliza o MultiCalendarView, que traz
 * demasiada chrome). Mostra uma janela de VISIBLE_DAYS dias (navegável) dentro dos 60,
 * uma linha por casa com as barras de ocupação (reservas + Airbnb) e as noites órfãs
 * realçadas a dourado. Filtra por casa quando há uma oportunidade selecionada.
 */
export function OpportunitiesCalendar({
    rows, opportunities, windowFrom, windowTo, selectedId, locale, onClearFilter,
}: {
    rows: OpportunityRow[];
    opportunities: OpportunityItem[];
    windowFrom: string;
    windowTo: string;
    selectedId: string | null;
    locale: string;
    onClearFilter: () => void;
}) {
    const t = useTranslations("AdminOpportunities");
    const dateLocale = locale === "pt" ? pt : undefined;

    const selected = selectedId ? opportunities.find((o) => o.id === selectedId) ?? null : null;

    const maxStart = useMemo(() => {
        const lastStart = differenceInCalendarDays(parseISO(windowTo), parseISO(windowFrom)) - VISIBLE_DAYS;
        return Math.max(0, lastStart);
    }, [windowFrom, windowTo]);

    // Offset (em dias desde windowFrom) do início da janela visível.
    const [offset, setOffset] = useState(0);

    // Ao selecionar uma oportunidade, centra a janela no gap.
    useEffect(() => {
        if (!selected) return;
        const gapOff = differenceInCalendarDays(parseISO(selected.gapStart), parseISO(windowFrom));
        setOffset(Math.min(maxStart, Math.max(0, gapOff - 4)));
    }, [selected, windowFrom, maxStart]);

    const viewStart = addDays(parseISO(windowFrom), offset);
    const days = Array.from({ length: VISIBLE_DAYS }, (_, i) => addDays(viewStart, i));
    const viewStartISO = format(viewStart, "yyyy-MM-dd");
    const today = new Date();

    const visibleRows = selected ? rows.filter((r) => r.propertyId === selected.propertyId) : rows;

    // Coloca um intervalo [start, end) na grelha visível; null se fora de vista.
    const place = (start: string, end: string): { col: number; span: number } | null => {
        const s = differenceInCalendarDays(parseISO(start), parseISO(viewStartISO));
        const e = differenceInCalendarDays(parseISO(end), parseISO(viewStartISO));
        const col = Math.max(0, s);
        const colEnd = Math.min(VISIBLE_DAYS, e);
        const span = colEnd - col;
        if (span <= 0) return null;
        return { col, span };
    };

    const gapsByProperty = useMemo(() => {
        const m = new Map<string, OpportunityItem[]>();
        for (const o of opportunities) {
            const list = m.get(o.propertyId) ?? [];
            list.push(o);
            m.set(o.propertyId, list);
        }
        return m;
    }, [opportunities]);

    return (
        <div className="bg-admin-surface rounded-2xl border border-admin-border overflow-hidden shadow-sm">
            {/* Toolbar: chip de filtro + navegação */}
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-admin-border flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                    {selected ? (
                        <>
                            <button
                                onClick={onClearFilter}
                                className="inline-flex items-center gap-1.5 text-[11.5px] font-bold rounded-full px-2.5 py-1 text-[#a9863f] bg-[#c5a059]/12 border border-[#c5a059]/35 hover:bg-[#c5a059]/20 transition-colors"
                            >
                                {selected.propertyTitle}
                                <X className="size-3" />
                            </button>
                            <span className="text-[11px] text-admin-text-secondary truncate">
                                {t("centeredOn", { date: format(parseISO(selected.gapStart), "EEE, d MMM", { locale: dateLocale }) })}
                            </span>
                        </>
                    ) : (
                        <span className="text-[11.5px] text-admin-text-secondary">
                            {t("showingAll", { count: rows.length })}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[11px] text-admin-text-secondary">
                        {format(days[0], "d MMM", { locale: dateLocale })} — {format(days[VISIBLE_DAYS - 1], "d MMM", { locale: dateLocale })}
                    </span>
                    <div className="flex gap-1">
                        <button
                            onClick={() => setOffset((o) => Math.max(0, o - VISIBLE_DAYS))}
                            disabled={offset <= 0}
                            className="p-1 rounded-md text-admin-text-secondary hover:text-admin-text-primary hover:bg-admin-bg disabled:opacity-30 transition-colors"
                            aria-label="‹"
                        ><ChevronLeft className="size-4" /></button>
                        <button
                            onClick={() => setOffset((o) => Math.min(maxStart, o + VISIBLE_DAYS))}
                            disabled={offset >= maxStart}
                            className="p-1 rounded-md text-admin-text-secondary hover:text-admin-text-primary hover:bg-admin-bg disabled:opacity-30 transition-colors"
                            aria-label="›"
                        ><ChevronRight className="size-4" /></button>
                    </div>
                </div>
            </div>

            {/* Cabeçalho dos dias */}
            <div className="flex border-b border-admin-border bg-admin-bg">
                <div className="w-[132px] shrink-0 border-r border-admin-border" />
                <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${VISIBLE_DAYS}, 1fr)` }}>
                    {days.map((d, i) => {
                        const isToday = isSameDay(d, today);
                        return (
                            <div key={i} className={`text-center py-1.5 text-[9px] ${isToday ? "text-admin-text-primary font-bold" : "text-admin-text-secondary"}`}>
                                <div className="uppercase">{format(d, "EEEEE", { locale: dateLocale })}</div>
                                <div className="text-[11px]">{format(d, "d")}</div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Linhas */}
            {visibleRows.length === 0 ? (
                <div className="py-12 text-center text-sm text-admin-text-secondary">{t("emptyCalendar")}</div>
            ) : (
                <div className="max-h-[420px] overflow-y-auto">
                    {visibleRows.map((row) => {
                        const rowGaps = gapsByProperty.get(row.propertyId) ?? [];
                        return (
                            <div key={row.propertyId} className="flex items-stretch h-[58px] border-b border-admin-border last:border-b-0">
                                <div className="w-[132px] shrink-0 border-r border-admin-border flex items-center gap-2 px-2.5">
                                    <div className="size-7 rounded-md bg-admin-bg bg-cover bg-center shrink-0 border border-admin-border" style={{ backgroundImage: row.image ? `url(${row.image})` : undefined }} />
                                    <div className="min-w-0">
                                        <p className="text-[12px] font-bold text-admin-text-primary truncate leading-tight">{row.title}</p>
                                        <p className="text-[9px] text-admin-text-secondary truncate">{row.city ?? "—"}</p>
                                    </div>
                                </div>
                                <div className="flex-1 grid relative" style={{ gridTemplateColumns: `repeat(${VISIBLE_DAYS}, 1fr)` }}>
                                    {days.map((d, i) => (
                                        <div key={i} className={`border-r border-admin-border/50 ${isSameDay(d, today) ? "bg-admin-bg/40" : ""}`} style={{ gridColumn: i + 1 }} />
                                    ))}

                                    {/* Realce das noites órfãs (fundo dourado + bandeira) */}
                                    {rowGaps.map((g) => {
                                        const p = place(g.gapStart, g.gapEnd);
                                        if (!p) return null;
                                        return (
                                            <div
                                                key={g.id}
                                                className="self-stretch relative z-[1]"
                                                style={{ gridColumn: `${p.col + 1} / span ${p.span}`, background: "rgba(197,160,89,.15)", borderTop: "2px solid #c5a059" }}
                                            >
                                                <Flag className="size-2.5 text-[#c5a059] absolute top-1 left-1" fill="#c5a059" />
                                            </div>
                                        );
                                    })}

                                    {/* Barras de ocupação */}
                                    {row.blocks.map((b, bi) => {
                                        const p = place(b.start, b.end);
                                        if (!p) return null;
                                        const airbnb = b.kind === "airbnb";
                                        return (
                                            <div
                                                key={bi}
                                                className={`self-center mx-0.5 h-6 rounded-md border flex items-center px-2 text-[10px] font-bold z-[2] overflow-hidden whitespace-nowrap ${airbnb
                                                    ? "text-rose-600 border-rose-200 dark:text-rose-300 dark:border-rose-500/40"
                                                    : "bg-slate-500 text-white border-slate-500"}`}
                                                style={{ gridColumn: `${p.col + 1} / span ${p.span}`, ...(airbnb ? { background: "repeating-linear-gradient(45deg,#fbe3e6,#fbe3e6 5px,#f9d2d7 5px,#f9d2d7 10px)" } : {}) }}
                                            >
                                                {airbnb ? "Airbnb" : t("direct")}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Legenda */}
            <div className="flex items-center gap-4 px-4 py-2.5 border-t border-admin-border text-[10.5px] text-admin-text-secondary">
                <span className="inline-flex items-center gap-1.5">
                    <span className="w-3.5 h-3 rounded-sm inline-block" style={{ background: "rgba(197,160,89,.16)", borderTop: "2px solid #c5a059" }} />
                    {t("legendGap")}
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <span className="w-3.5 h-3 rounded-sm inline-block border border-rose-200" style={{ background: "repeating-linear-gradient(45deg,#fbe3e6,#fbe3e6 3px,#f9d2d7 3px,#f9d2d7 6px)" }} />
                    {t("legendBooked")}
                </span>
            </div>
        </div>
    );
}
