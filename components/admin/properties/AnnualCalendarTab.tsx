"use client";

import { useState, useEffect, useRef } from "react";
import {
    format, startOfYear, endOfYear, eachMonthOfInterval, getDay,
    getDaysInMonth, isToday, startOfDay, addMonths, subMonths,
    getMonth, getYear, isSameDay, differenceInCalendarDays
} from "date-fns";
import { pt, enUS } from "date-fns/locale";
import { Loader2, ChevronLeft, ChevronRight, LayoutGrid, CalendarDays, Tag, Moon } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface AnnualCalendarTabProps {
    propertyId: string;
    activeLang?: string;
}

type CalendarView = "annual" | "monthly";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Res = any;

interface Bar {
    resId: string;
    guestName: string;
    totalPrice: number | null;
    checkIn: Date;
    checkOut: Date;
    nights: number;
    row: number;
    colStart: number;
    colEnd: number;
    isStart: boolean;
    isEnd: boolean;
    containsToday: boolean;
    stackIndex: number;
    status: string;
}

export default function AnnualCalendarTab({ propertyId, activeLang = "en" }: AnnualCalendarTabProps) {
    const [reservations, setReservations] = useState<Res[]>([]);
    const [blockedDates, setBlockedDates] = useState<Res[]>([]);
    const [pricePerNight, setPricePerNight] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const dateLocale = activeLang === "pt" ? pt : enUS;

    const [view, setView] = useState<CalendarView>("annual");
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const scrollRef = useRef<HTMLDivElement>(null);
    const currentYear = new Date().getFullYear();
    const years = [currentYear, currentYear + 1];

    // Hover state
    const [hoveredBar, setHoveredBar] = useState<Bar | null>(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const tooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!propertyId || propertyId === "new") { setIsLoading(false); return; }
        Promise.all([
            supabase.from("reservations")
                .select("id, check_in, check_out, status, guest_name, total_price")
                .eq("property_id", propertyId)
                .neq("status", "cancelled"),
            supabase.from("blocked_dates").select("id, start_date, end_date").eq("property_id", propertyId),
            supabase.from("properties").select("price_per_night").eq("id", propertyId).single(),
        ]).then(([resResult, blockResult, propResult]) => {
            if (!resResult.error) setReservations(resResult.data || []);
            if (!blockResult.error) setBlockedDates(blockResult.data || []);
            if (!propResult.error && propResult.data) setPricePerNight(propResult.data.price_per_night);
            setIsLoading(false);
        });
    }, [propertyId]);

    const isDateUnavailable = (date: Date) => {
        const d = startOfDay(date);
        if (reservations.some(r => d >= startOfDay(new Date(r.check_in)) && d < startOfDay(new Date(r.check_out)))) return true;
        if (blockedDates.some(b => d >= startOfDay(new Date(b.start_date)) && d <= startOfDay(new Date(b.end_date)))) return true;
        return false;
    };

    // Only actual guest reservations (excludes blocked_dates) — used for annual mini-month bars
    const isDateReserved = (date: Date) => {
        const d = startOfDay(date);
        return reservations.some(r => d >= startOfDay(new Date(r.check_in)) && d < startOfDay(new Date(r.check_out)));
    };

    const getMonthSegments = (year: number, month: number) => {
        const segments: { start: number; end: number; startRow: number; startCol: number }[] = [];
        const daysInMonth = getDaysInMonth(new Date(year, month));
        const firstDay = getDay(new Date(year, month, 1));
        const startOffset = firstDay === 0 ? 6 : firstDay - 1;
        let seg: { start: number; end: number; startRow: number; startCol: number } | null = null;

        for (let day = 1; day <= daysInMonth; day++) {
            const reserved = isDateReserved(new Date(year, month, day));
            const pos = startOffset + (day - 1);
            const row = Math.floor(pos / 7);
            const col = pos % 7;
            if (reserved) {
                if (!seg) seg = { start: day, end: day, startRow: row, startCol: col };
                else if (col === 0) { segments.push({ ...seg }); seg = { start: day, end: day, startRow: row, startCol: col }; }
                else seg.end = day;
            } else {
                if (seg) { segments.push({ ...seg }); seg = null; }
            }
        }
        if (seg) segments.push(seg);
        return { segments, startOffset, daysInMonth };
    };

    if (isLoading) return (
        <div className="flex items-center justify-center p-20">
            <Loader2 className="size-8 animate-spin text-[#a3a3a3]" />
        </div>
    );

    const todayDate = new Date();

    // ─── View Toggle ─────────────────────────────────────
    const ViewToggle = () => (
        <div className="flex items-center gap-0.5 bg-[#f3f3f3] dark:bg-white/10 p-1 rounded-xl">
            {([["annual", "Year", LayoutGrid], ["monthly", "Month", CalendarDays]] as const).map(([v, label, Icon]) => (
                <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-200 
                        ${view === v
                            ? "bg-white dark:bg-admin-dark-surface text-[#171717] dark:text-white shadow-sm"
                            : "text-[#999] hover:text-[#171717] dark:hover:text-white"
                        }`}
                >
                    <Icon className="size-3.5" />
                    {label}
                </button>
            ))}
        </div>
    );

    // ─── Monthly View ─────────────────────────────────────
    if (view === "monthly") {
        const year = getYear(currentMonth);
        const month = getMonth(currentMonth);
        const daysInMonth = getDaysInMonth(currentMonth);
        const firstDay = getDay(new Date(year, month, 1));
        const startOffset = firstDay === 0 ? 6 : firstDay - 1;
        const totalRows = Math.ceil((startOffset + daysInMonth) / 7);
        const DAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

        // Build bars
        const bars: Bar[] = [];
        const resOrder: string[] = [];

        reservations.forEach((res) => {
            const resStart = startOfDay(new Date(res.check_in));
            const resEnd = startOfDay(new Date(res.check_out));
            const monthStart = new Date(year, month, 1);
            const monthEndExcl = new Date(year, month + 1, 1);

            if (resEnd <= monthStart || resStart >= monthEndExcl) return;
            if (!resOrder.includes(res.id)) resOrder.push(res.id);

            const clampedStart = resStart < monthStart ? monthStart : resStart;
            const clampedEnd = resEnd > monthEndExcl ? monthEndExcl : resEnd;
            const nights = differenceInCalendarDays(resEnd, resStart);

            let dayPointer = new Date(clampedStart);
            while (dayPointer < clampedEnd) {
                const dayNum = dayPointer.getDate();
                const pos = startOffset + dayNum - 1;
                const row = Math.floor(pos / 7);
                const col = pos % 7;
                const daysLeftInRow = 6 - col;
                const daysLeftInSeg = Math.floor((clampedEnd.getTime() - dayPointer.getTime()) / 86400000) - 1;
                const extent = Math.min(daysLeftInRow, daysLeftInSeg);
                const colEnd = col + extent;
                const rowStart = dayPointer;
                const rowEnd = new Date(year, month, dayNum + extent);

                let containsToday = false;
                for (let d = 0; d <= extent; d++) {
                    if (isToday(new Date(year, month, dayNum + d))) { containsToday = true; break; }
                }

                bars.push({
                    resId: res.id,
                    guestName: res.guest_name || "Guest",
                    totalPrice: res.total_price || null,
                    checkIn: resStart,
                    checkOut: resEnd,
                    nights,
                    row,
                    colStart: col,
                    colEnd,
                    isStart: isSameDay(rowStart, resStart),
                    isEnd: isSameDay(rowEnd, new Date(resEnd.getTime() - 86400000)),
                    containsToday,
                    stackIndex: 0,
                    status: res.status || "confirmed",
                });

                dayPointer = new Date(year, month, dayNum + extent + 1);
            }
        });

        // Stack assignment
        const rowBarGroups: Record<number, Bar[]> = {};
        bars.forEach(b => { if (!rowBarGroups[b.row]) rowBarGroups[b.row] = []; rowBarGroups[b.row].push(b); });
        Object.values(rowBarGroups).forEach(rowBars => {
            const seen: string[] = [];
            rowBars.sort((a, b) => resOrder.indexOf(a.resId) - resOrder.indexOf(b.resId));
            rowBars.forEach(bar => {
                if (!seen.includes(bar.resId)) seen.push(bar.resId);
                bar.stackIndex = seen.indexOf(bar.resId);
            });
        });

        const BAR_H = 22;
        const BAR_GAP = 2;
        const DATE_AREA = 30;
        const ROW_H = DATE_AREA + 3 * (BAR_H + BAR_GAP) + 8;

        const handleBarMouseEnter = (e: React.MouseEvent, bar: Bar) => {
            if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
            setHoveredBar(bar);
            setTooltipPos({ x: e.clientX, y: e.clientY });
        };

        const handleBarMouseMove = (e: React.MouseEvent) => {
            setTooltipPos({ x: e.clientX, y: e.clientY });
        };

        const handleBarMouseLeave = () => {
            tooltipTimeoutRef.current = setTimeout(() => setHoveredBar(null), 150);
        };

        return (
            <div className="flex flex-col h-full relative">
                {/* Header */}
                <div className="sticky top-0 z-20 bg-white dark:bg-admin-dark-surface border-b border-[#eeeeee] dark:border-admin-dark-border px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                            className="p-1.5 rounded-lg hover:bg-[#f5f5f5] dark:hover:bg-white/10 text-[#bbb] hover:text-[#171717] dark:hover:text-white transition-colors">
                            <ChevronLeft className="size-4" />
                        </button>
                        <span className="text-sm font-bold text-[#171717] dark:text-white min-w-[130px] text-center capitalize">
                            {format(currentMonth, "MMMM yyyy", { locale: dateLocale })}
                        </span>
                        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                            className="p-1.5 rounded-lg hover:bg-[#f5f5f5] dark:hover:bg-white/10 text-[#bbb] hover:text-[#171717] dark:hover:text-white transition-colors">
                            <ChevronRight className="size-4" />
                        </button>
                        <button onClick={() => {
                            if (view === "monthly") setCurrentMonth(new Date());
                            else scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                            className="ml-2 px-3 py-1 text-[11px] font-bold border border-[#e5e5e5] dark:border-white/20 rounded-lg text-[#444] dark:text-white hover:bg-[#f5f5f5] dark:hover:bg-white/10 transition-colors">
                            Today
                        </button>
                        {pricePerNight && (
                            <span className="ml-2 text-[10px] font-bold text-[#a3a3a3] bg-[#f5f5f5] dark:bg-white/10 px-2 py-1 rounded-lg">
                                €{pricePerNight}<span className="font-normal">/night</span>
                            </span>
                        )}
                    </div>
                    <ViewToggle />
                </div>

                {/* Day labels */}
                <div className="grid grid-cols-7 bg-white dark:bg-admin-dark-surface border-b border-[#eeeeee] dark:border-admin-dark-border sticky top-[57px] z-10">
                    {DAY_LABELS.map((d, i) => (
                        <div key={i} className={`py-2.5 text-center text-[10px] font-bold uppercase tracking-widest ${i >= 5 ? "text-[#bbb]" : "text-[#aaa]"}`}>{d}</div>
                    ))}
                </div>

                {/* Calendar rows */}
                {/* Calendar rows */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto bg-white dark:bg-admin-dark-bg">
                    {Array.from({ length: totalRows }).map((_, rowIndex) => {
                        const rowBars = (rowBarGroups[rowIndex] || []);

                        return (
                            <div
                                key={`row-${rowIndex}`}
                                className="grid grid-cols-7 border-b border-[#eeeeee] dark:border-white/[0.07] relative"
                                style={{ minHeight: ROW_H }}
                            >
                                {/* Day cells */}
                                {Array.from({ length: 7 }).map((_, colIndex) => {
                                    const pos = rowIndex * 7 + colIndex;
                                    const dayNum = pos - startOffset + 1;
                                    const valid = dayNum >= 1 && dayNum <= daysInMonth;
                                    const date = valid ? new Date(year, month, dayNum) : null;
                                    const isT = date ? isToday(date) : false;
                                    const unavail = date ? isDateUnavailable(date) : false;
                                    const isWeekend = colIndex >= 5;

                                    return (
                                        <div
                                            key={`cell-${colIndex}`}
                                            className={`relative border-r border-[#eeeeee] dark:border-white/[0.07] last:border-r-0 transition-colors
                                                ${!valid ? "bg-[#fafafa] dark:bg-white/[0.01]" : ""}
                                                ${isWeekend && valid ? "bg-[#fafafa]/60 dark:bg-white/[0.02]" : ""}
                                            `}
                                        >
                                            {valid && (
                                                <div className="flex flex-col items-center pt-1.5 pb-0.5 gap-0.5">
                                                    {/* Date number */}
                                                    <span className={`w-6 h-6 flex items-center justify-center text-[11px] font-semibold rounded-full
                                                        ${isT
                                                            ? "bg-[#222] dark:bg-white text-white dark:text-black"
                                                            : isWeekend
                                                                ? "text-[#999] dark:text-admin-dark-text-secondary"
                                                                : "text-[#222] dark:text-admin-dark-text-primary"
                                                        }`}>
                                                        {dayNum}
                                                    </span>
                                                    {/* Price — show unless day has an actual guest reservation */}
                                                    {pricePerNight && date && !isDateReserved(date) && (
                                                        <span className="text-[8px] font-semibold text-[#bbb] dark:text-admin-dark-text-secondary leading-none">
                                                            €{pricePerNight}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {/* Reservation bars layer */}
                                <div className="absolute inset-x-0 pointer-events-none" style={{ top: DATE_AREA, bottom: 0 }}>
                                    {rowBars.map((bar, bi) => {
                                        if (bar.stackIndex >= 3) return null;
                                        const leftPct = (bar.colStart / 7) * 100;
                                        const widthPct = ((bar.colEnd - bar.colStart + 1) / 7) * 100;
                                        const topPx = bar.stackIndex * (BAR_H + BAR_GAP);
                                        const isActive = bar.containsToday;
                                        const showName = bar.isStart || bar.colStart === 0;

                                        return (
                                            <div
                                                key={`bar-${bi}`}
                                                className="absolute pointer-events-auto cursor-pointer group/bar transition-all duration-150 hover:brightness-90 active:scale-[0.99]"
                                                style={{
                                                    left: `calc(${leftPct}% + ${bar.isStart ? 5 : 0}px)`,
                                                    width: `calc(${widthPct}% - ${(bar.isStart ? 5 : 0) + (bar.isEnd ? 5 : 0)}px)`,
                                                    top: topPx,
                                                    height: BAR_H,
                                                    borderRadius: `${bar.isStart ? "14px" : "3px"} ${bar.isEnd ? "14px" : "3px"} ${bar.isEnd ? "14px" : "3px"} ${bar.isStart ? "14px" : "3px"}`,
                                                    backgroundColor: isActive ? "#ff385c" : "#222222",
                                                    zIndex: 5,
                                                    boxShadow: isActive
                                                        ? "0 2px 8px rgba(255,56,92,0.35)"
                                                        : "0 1px 4px rgba(0,0,0,0.12)",
                                                }}
                                                onMouseEnter={(e) => handleBarMouseEnter(e, bar)}
                                                onMouseMove={handleBarMouseMove}
                                                onMouseLeave={handleBarMouseLeave}
                                            >
                                                {/* Name and Price container */}
                                                <div className="absolute inset-y-0 left-3 right-3 flex items-center justify-between pointer-events-none overflow-hidden gap-2">
                                                    {showName && (
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                            {/* Guest initial avatar */}
                                                            <span className={`size-4 rounded-full flex-shrink-0 flex items-center justify-center text-[8px] font-bold border
                                                                ${isActive ? "border-white/30 bg-white/20 text-white" : "border-white/20 bg-white/15 text-white"}`}>
                                                                {bar.guestName.charAt(0).toUpperCase()}
                                                            </span>
                                                            <span className="text-[11px] font-semibold text-white truncate leading-none">
                                                                {bar.guestName}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {/* Price on last segment */}
                                                    {bar.isEnd && bar.totalPrice && (
                                                        <span className="text-[10px] font-bold text-white/90 shrink-0">
                                                            €{bar.totalPrice.toLocaleString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Hover Tooltip */}
                {hoveredBar && (
                    <ReservationTooltip
                        bar={hoveredBar}
                        pos={tooltipPos}
                        pricePerNight={pricePerNight}
                        onMouseEnter={() => tooltipTimeoutRef.current && clearTimeout(tooltipTimeoutRef.current)}
                        onMouseLeave={() => setHoveredBar(null)}
                    />
                )}
            </div>
        );
    }

    // ─── Annual View ──────────────────────────────────────
    return (
        <div className="flex flex-col h-full">
            <div className="sticky top-0 z-20 bg-white dark:bg-admin-dark-surface border-b border-[#eeeeee] dark:border-admin-dark-border px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
                        className="text-sm font-bold text-[#222] dark:text-white hover:text-[#ff385c] transition-colors"
                    >
                        {currentYear}
                    </button>
                    <span className="text-[#ddd] text-xs">·</span>
                    <button 
                        onClick={() => {
                            const year2Start = document.getElementById(`year-${currentYear + 1}`);
                            year2Start?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                        }}
                        className="text-sm font-semibold text-[#bbb] hover:text-[#222] dark:hover:text-white transition-colors"
                    >
                        {currentYear + 1}
                    </button>
                </div>
                <ViewToggle />
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto">
                <div className="w-full px-8 py-5">
                    <div className="flex flex-col gap-8">
                        {years.map((year) => {
                            const months = eachMonthOfInterval({
                                start: startOfYear(new Date(year, 0)),
                                end: endOfYear(new Date(year, 0)),
                            });
                            return (
                                <div key={year} id={`year-${year}`}>
                                    {year !== currentYear && (
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="h-px flex-1 bg-[#e8e8e8] dark:bg-white/10" />
                                            <span className="text-[10px] font-bold text-[#bbb] uppercase tracking-widest">{year}</span>
                                            <div className="h-px flex-1 bg-[#e8e8e8] dark:bg-white/10" />
                                        </div>
                                    )}
                                    <div className="grid grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-5">
                                        {months.map((monthDate) => {
                                            const monthIndex = monthDate.getMonth();
                                            const { segments, startOffset, daysInMonth } = getMonthSegments(year, monthIndex);
                                            const rows = Math.ceil((startOffset + daysInMonth) / 7);
                                            const ROW_H = 18;

                                            return (
                                                <div key={monthIndex} className="flex flex-col group">
                                                    <button className="w-full text-left" onClick={() => { setCurrentMonth(new Date(year, monthIndex, 1)); setView("monthly"); }}>
                                                        <h3 className="text-[12px] font-bold text-[#444] dark:text-admin-dark-text-secondary mb-1.5 capitalize flex items-center gap-1">
                                                            {format(monthDate, "MMM", { locale: dateLocale })}
                                                            <span className="opacity-0 group-hover:opacity-100 transition-all duration-150 text-[8px] text-blue-500 font-bold uppercase tracking-wider">
                                                                View →
                                                            </span>
                                                        </h3>
                                                    </button>

                                                    <div
                                                        className="relative w-full cursor-pointer"
                                                        style={{ height: rows * ROW_H }}
                                                        onClick={() => { setCurrentMonth(new Date(year, monthIndex, 1)); setView("monthly"); }}
                                                    >
                                                        {/* Dot grid — past=light, future=dark, today=hidden (handled separately below) */}
                                                        <div className="absolute inset-0 grid grid-cols-7 pointer-events-none">
                                                            {/* Empty offset cells */}
                                                            {Array.from({ length: startOffset }).map((_, i) => (
                                                                <div key={`e${i}`} style={{ height: ROW_H }} />
                                                            ))}
                                                            {/* Day dots */}
                                                            {Array.from({ length: daysInMonth }).map((_, i) => {
                                                                const day = i + 1;
                                                                const d = startOfDay(new Date(year, monthIndex, day));
                                                                const isTargetToday = isToday(d);
                                                                const isPast = !isTargetToday && d < startOfDay(todayDate);
                                                                const dotColor = isTargetToday
                                                                    ? "opacity-0"                              // hidden — today has its own indicator
                                                                    : isPast
                                                                        ? "bg-[#d8d8d8] dark:bg-white/15"     // past: light gray
                                                                        : "bg-[#888] dark:bg-white/50";        // future: darker
                                                                return (
                                                                    <div key={`dot-${day}`} className="flex items-center justify-center" style={{ height: ROW_H }}>
                                                                        <div className={`size-[3px] rounded-full ${dotColor}`} />
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>

                                                        {/* Reservation pills — percentage based */}
                                                        {segments.map((seg, idx) => {
                                                            const colStart = (startOffset + seg.start - 1) % 7;
                                                            const widthCells = seg.end - seg.start + 1;
                                                            const leftPct = (colStart / 7) * 100;
                                                            const widthPct = (widthCells / 7) * 100;
                                                            const containsToday =
                                                                seg.start <= todayDate.getDate() &&
                                                                seg.end >= todayDate.getDate() &&
                                                                monthIndex === todayDate.getMonth() &&
                                                                year === todayDate.getFullYear();
                                                            return (
                                                                <div
                                                                    key={`seg-${idx}`}
                                                                    className={`absolute h-[7px] rounded-full z-10 ${containsToday ? "bg-[#ff385c]" : "bg-[#222] dark:bg-white/85"}`}
                                                                    style={{
                                                                        top: seg.startRow * ROW_H + (ROW_H / 2) - 3.5,
                                                                        left: `calc(${leftPct}% + 2px)`,
                                                                        width: `calc(${widthPct}% - 4px)`,
                                                                    }}
                                                                />
                                                            );
                                                        })}

                                                        {/* Today indicator — rendered LAST so it's on top of pills */}
                                                        {monthIndex === todayDate.getMonth() && year === todayDate.getFullYear() && (() => {
                                                            const pos = startOffset + todayDate.getDate() - 1;
                                                            const row = Math.floor(pos / 7);
                                                            const col = pos % 7;
                                                            return (
                                                                <div
                                                                    className="absolute pointer-events-none z-20 flex items-center justify-center"
                                                                    style={{
                                                                        top: row * ROW_H,
                                                                        left: `${(col / 7) * 100}%`,
                                                                        width: `${100 / 7}%`,
                                                                        height: ROW_H,
                                                                    }}
                                                                >
                                                                    <div className="size-[7px] rounded-full bg-[#ff385c] shadow-[0_0_0_2px_white]" />
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="fixed bottom-6 right-6 z-30">
                <button
                    onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
                    className="bg-white dark:bg-admin-dark-surface border border-[#ddd] dark:border-admin-dark-border shadow-lg hover:shadow-xl rounded-full px-5 py-2.5 text-xs font-bold text-[#222] dark:text-white transition-all flex items-center gap-2"
                >
                    <span className="text-base leading-none">↑</span> Today
                </button>
            </div>
        </div>
    );
}

// ─── Tooltip Component ────────────────────────────────────────────────────────
function ReservationTooltip({
    bar,
    pos,
    pricePerNight,
    onMouseEnter,
    onMouseLeave,
}: {
    bar: Bar;
    pos: { x: number; y: number };
    pricePerNight: number | null;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
}) {
    const isActive = bar.containsToday;

    const tooltipStyle: React.CSSProperties = {
        position: "fixed",
        zIndex: 9999,
        left: pos.x + 16,
        top: Math.max(8, pos.y - 80),
        pointerEvents: "auto",
    };

    // Flip left if near right edge
    if (typeof window !== "undefined" && pos.x + 280 > window.innerWidth) {
        tooltipStyle.left = pos.x - 280;
    }

    return (
        <div
            style={tooltipStyle}
            className="w-64 bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-2xl border border-[#f0f0f0] dark:border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            {/* Color strip */}
            <div className={`h-1.5 w-full ${isActive ? "bg-[#ff385c]" : "bg-[#222]"}`} />

            <div className="p-4 space-y-3">
                {/* Guest */}
                <div className="flex items-center gap-3">
                    <div className={`size-10 rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0 ${isActive ? "bg-[#ff385c]" : "bg-[#222]"}`}>
                        {bar.guestName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p className="text-sm font-bold text-[#171717] dark:text-white leading-tight">{bar.guestName}</p>
                        <p className={`text-[10px] font-semibold mt-0.5 capitalize
                            ${bar.status === "confirmed" ? "text-green-500" : bar.status === "pending" ? "text-amber-500" : "text-[#aaa]"}`}>
                            {bar.status === "confirmed" ? "Confirmed" : bar.status === "pending" ? "Pending" : bar.status}
                        </p>
                    </div>
                </div>

                <div className="h-px bg-[#f0f0f0] dark:bg-white/10" />

                {/* Dates */}
                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-[#f9f9f9] dark:bg-white/5 rounded-xl p-2.5">
                        <p className="text-[9px] font-bold text-[#aaa] uppercase tracking-widest mb-0.5">Check-in</p>
                        <p className="text-[12px] font-bold text-[#171717] dark:text-white">{format(bar.checkIn, "d MMM")}</p>
                    </div>
                    <div className="bg-[#f9f9f9] dark:bg-white/5 rounded-xl p-2.5">
                        <p className="text-[9px] font-bold text-[#aaa] uppercase tracking-widest mb-0.5">Check-out</p>
                        <p className="text-[12px] font-bold text-[#171717] dark:text-white">{format(bar.checkOut, "d MMM")}</p>
                    </div>
                </div>

                {/* Nights + Price */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        <Moon className="size-3.5 text-[#aaa]" />
                        <span className="text-[12px] font-semibold text-[#555] dark:text-[#aaa]">{bar.nights} night{bar.nights !== 1 ? "s" : ""}</span>
                    </div>
                    {bar.totalPrice ? (
                        <div className="flex items-center gap-1">
                            <Tag className="size-3 text-[#aaa]" />
                            <span className="text-[13px] font-bold text-[#171717] dark:text-white">€{bar.totalPrice?.toLocaleString()}</span>
                        </div>
                    ) : pricePerNight ? (
                        <div className="flex items-center gap-1">
                            <Tag className="size-3 text-[#aaa]" />
                            <span className="text-[13px] font-bold text-[#171717] dark:text-white">~€{(pricePerNight * bar.nights).toLocaleString()}</span>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
