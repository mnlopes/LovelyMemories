"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { format, parseISO, addDays, differenceInCalendarDays, isSameDay } from "date-fns";
import { pt } from "date-fns/locale";
import { ChevronLeft, ChevronRight, X, AlertTriangle } from "lucide-react";
import { Link } from "@/i18n/routing";
import { getBarClipPath, AIRBNB_HATCH, ChannelBadge, getReservationStatusColor } from "@/components/admin/reservations/calendar-bar-visuals";
import type { OpportunityItem, OpportunityRow } from "@/app/actions/opportunities";

const VISIBLE_DAYS = 14;

/**
 * Timeline dedicada do modo Opportunities. Barras de ocupação com o MESMO visual dos
 * outros calendários (clip-path diagonal + hatch + selo de canal). As noites órfãs são
 * assinaladas só pela borda dourada a pulsar (heartbeat) + triângulo de alerta; clicar
 * abre um popover com o detalhe. Filtra por casa quando há uma oportunidade selecionada.
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

    const [offset, setOffset] = useState(0);
    const [popover, setPopover] = useState<{ item: OpportunityItem; x: number; y: number } | null>(null);

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
    const place = (start: string, end: string) => {
        const s = differenceInCalendarDays(parseISO(start), parseISO(viewStartISO));
        const e = differenceInCalendarDays(parseISO(end), parseISO(viewStartISO));
        const col = Math.max(0, s);
        const colEnd = Math.min(VISIBLE_DAYS, e);
        const span = colEnd - col;
        if (span <= 0) return null;
        return { col, span, startsBefore: s < 0, endsAfter: e > VISIBLE_DAYS };
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

    const openPopover = (item: OpportunityItem, e: React.MouseEvent) => {
        e.stopPropagation();
        setPopover({ item, x: e.clientX, y: e.clientY });
    };

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
                <div>
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
                                        <div key={i} className={`border-r border-admin-border/50 ${isSameDay(d, today) ? "bg-admin-bg/40" : ""}`} style={{ gridColumn: i + 1, gridRow: 1 }} />
                                    ))}

                                    {/* Barras de ocupação — mesmo visual dos outros calendários (clip-path + hatch) */}
                                    {row.blocks.map((b, bi) => {
                                        const p = place(b.start, b.end);
                                        if (!p) return null;
                                        const airbnb = b.kind === "airbnb";
                                        return (
                                            <div
                                                key={bi}
                                                className={`self-center h-7 flex items-center px-2 z-[2] overflow-hidden ${airbnb ? "" : getReservationStatusColor("confirmed")}`}
                                                style={{
                                                    gridColumn: `${p.col + 1} / span ${p.span}`,
                                                    gridRow: 1,
                                                    clipPath: getBarClipPath(p.startsBefore, p.endsAfter),
                                                    ...(airbnb ? { background: AIRBNB_HATCH } : {}),
                                                }}
                                            >
                                                {airbnb ? (
                                                    <div className="flex items-center gap-1.5 overflow-hidden">
                                                        <ChannelBadge kind="airbnb-box" />
                                                        <span className="text-[10px] font-bold text-rose-800 dark:text-rose-200 truncate">Airbnb</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] font-bold truncate leading-none">{t("direct")}</span>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* Noite órfã — mesma forma/altura das barras (clip-path + h-7, centrada),
                                        preenchimento dourado leve a pulsar (heartbeat) + triângulo de alerta */}
                                    {rowGaps.map((g) => {
                                        const p = place(g.gapStart, g.gapEnd);
                                        if (!p) return null;
                                        return (
                                            <button
                                                key={g.id}
                                                onClick={(e) => openPopover(g, e)}
                                                title={t("legendGap")}
                                                className="gap-heartbeat self-center h-7 flex items-center justify-center z-[3] overflow-hidden"
                                                style={{ gridColumn: `${p.col + 1} / span ${p.span}`, gridRow: 1, clipPath: getBarClipPath(p.startsBefore, p.endsAfter), background: "rgba(197,160,89,.16)" }}
                                            >
                                                <AlertTriangle className="gap-heartbeat-icon size-3.5 text-[#a9863f]" />
                                            </button>
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
                    <span className="w-5 h-3.5 inline-flex items-center justify-center" style={{ background: "rgba(197,160,89,.24)", clipPath: getBarClipPath(false, false) }}>
                        <AlertTriangle className="size-2 text-[#a9863f]" />
                    </span>
                    {t("legendGap")}
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <span className="w-5 h-3 inline-block" style={{ background: AIRBNB_HATCH, clipPath: getBarClipPath(false, false) }} />
                    {t("legendBooked")}
                </span>
            </div>

            {/* Popover de detalhe do gap (fixed — escapa aos overflow/scroll) */}
            {popover && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setPopover(null)} />
                    <GapPopover
                        item={popover.item}
                        x={popover.x}
                        y={popover.y}
                        locale={locale}
                        onClose={() => setPopover(null)}
                    />
                </>
            )}
        </div>
    );
}

function GapPopover({ item, x, y, locale, onClose }: { item: OpportunityItem; x: number; y: number; locale: string; onClose: () => void }) {
    const t = useTranslations("AdminOpportunities");
    const dateLocale = locale === "pt" ? pt : undefined;
    const W = 250, H = 200;
    const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
    const vh = typeof window !== "undefined" ? window.innerHeight : 800;
    const left = x + W + 16 > vw ? x - W : x;
    const top = y + 12 + H > vh ? y - H - 12 : y + 12; // flip para cima perto do fundo
    const lastFreeNight = addDays(parseISO(item.gapEnd), -1);

    return (
        <div
            className="fixed z-50 w-[250px] rounded-xl border border-admin-border bg-admin-surface overflow-hidden shadow-xl"
            style={{ left: Math.max(8, left), top: Math.max(8, top) }}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="bg-[#14161a] px-4 py-2.5">
                <p className="text-[12.5px] font-bold text-white truncate">{item.propertyTitle}</p>
                <p className="text-[10.5px] text-white/60">{item.city ?? "—"}</p>
            </div>
            <div className="p-3.5">
                <div className="flex items-baseline gap-1.5 mb-2">
                    <span className="text-xl font-bold text-[#a9863f]">{item.nights}</span>
                    <span className="text-[12px] text-admin-text-secondary">{item.nights === 1 ? t("unitNight") : t("unitNights")}</span>
                </div>
                <div className="text-[11px] space-y-1">
                    <Line label={t("popFreeNights")} value={item.nights === 1
                        ? format(parseISO(item.gapStart), "d MMM", { locale: dateLocale })
                        : `${format(parseISO(item.gapStart), "d")}–${format(lastFreeNight, "d MMM", { locale: dateLocale })}`} />
                    <Line label={t("popOut")} value={format(parseISO(item.gapStart), "d MMM", { locale: dateLocale })} />
                    <Line label={t("popNextArrival")} value={format(parseISO(item.gapEnd), "d MMM", { locale: dateLocale })} />
                </div>
                <div className="flex gap-2 mt-3">
                    <Link
                        href={`/admin/properties/${item.propertyId}?tab=calendar`}
                        onClick={onClose}
                        className="flex-1 text-center text-[11px] font-bold text-admin-text-primary border border-admin-border rounded-lg py-1.5 hover:bg-admin-bg transition-colors"
                    >
                        {t("popOpenCalendar")}
                    </Link>
                    <span
                        title={t("popMakeBookableSoon")}
                        className="flex-1 text-center text-[10px] font-bold text-admin-text-secondary/60 border border-dashed border-admin-border rounded-lg py-1.5 leading-tight cursor-not-allowed"
                    >
                        {t("popMakeBookable")}
                    </span>
                </div>
            </div>
        </div>
    );
}

function Line({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between gap-2">
            <span className="text-admin-text-secondary">{label}</span>
            <span className="font-semibold text-admin-text-primary">{value}</span>
        </div>
    );
}
