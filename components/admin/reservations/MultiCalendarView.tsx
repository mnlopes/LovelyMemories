"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, eachDayOfInterval, addMonths, subMonths, isSameMonth, isToday, isWithinInterval, startOfDay, endOfDay, isSameDay, setMonth, setYear, addDays, differenceInCalendarDays } from "date-fns";
import { pt } from "date-fns/locale";
import { ChevronLeft, ChevronRight, User, Calendar as CalendarIcon, Info, Check, Filter, ChevronDown, Ban, MapPin, Users, Bed, Bath, X, Euro } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { ReservationDetailSheet } from "@/components/admin/ReservationDetailSheet";
import { Beds24BookingDetailSheet } from "@/components/admin/reservations/Beds24BookingDetailSheet";
import { getBeds24DailyPrices, type Beds24DayInfo } from "@/app/actions/beds24";
import { getBarClipPath, getReservationStatusColor, effectiveReservationStatus, AIRBNB_HATCH, BLOCK_HATCH, ChannelBadge, CalendarDayPrice } from "@/components/admin/reservations/calendar-bar-visuals";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface MultiCalendarViewProps {
    reservations: any[];
    properties: { [key: string]: any }; // Map of ID -> Property Object
    propertyImages?: { [key: string]: string }; // Optional map of ID -> Image URL if available
    locale?: string;
    blockedDates?: any[];
    onRefresh?: () => void;
    canShowPrices?: boolean;
    initialRange?: 7 | 14 | 31;
}

export function MultiCalendarView({ reservations, properties, propertyImages, locale = 'pt', blockedDates = [], onRefresh, canShowPrices = false, initialRange = 31 }: MultiCalendarViewProps) {
    const t = useTranslations('AdminReservations.multiCalendar');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [rangeDays, setRangeDays] = useState<7 | 14 | 31>(initialRange);
    const [selectedReservation, setSelectedReservation] = useState<any | null>(null);
    const [selectedBeds24Id, setSelectedBeds24Id] = useState<number | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Filters State
    const [filteredPropertyIds, setFilteredPropertyIds] = useState<string[]>([]);
    const [selectedRegion, setSelectedRegion] = useState<string>("all");
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isRegionFilterOpen, setIsRegionFilterOpen] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);
    const regionFilterRef = useRef<HTMLDivElement>(null);
    const [hoveredPropertyId, setHoveredPropertyId] = useState<string | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    // Date Picker State
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const datePickerRef = useRef<HTMLDivElement>(null);
    const availableYears = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i);
    const months = Array.from({ length: 12 }, (_, i) => i);

    // Close dropdowns on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setIsFilterOpen(false);
            }
            if (regionFilterRef.current && !regionFilterRef.current.contains(event.target as Node)) {
                setIsRegionFilterOpen(false);
            }
            if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
                setIsDatePickerOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const dateLocale = locale === 'pt' ? pt : undefined;

    // Mobile: 7 dias fixos, colunas ajustadas à largura do ecrã (sem scroll horizontal).
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia("(max-width: 767px)");
        const update = () => setIsMobile(mq.matches);
        update();
        mq.addEventListener("change", update);
        return () => mq.removeEventListener("change", update);
    }, []);

    const [containerW, setContainerW] = useState(0);
    useEffect(() => {
        const el = scrollContainerRef.current;
        if (!el) return;
        const ro = new ResizeObserver(() => setContainerW(el.clientWidth));
        ro.observe(el);
        setContainerW(el.clientWidth);
        return () => ro.disconnect();
    }, []);

    // Swipe horizontal no mobile: salta 7 dias (mantém as setas). Um pequeno
    // "nudge" das linhas dá a sensação de transição sem remontar (não perde scroll).
    const touchStart = useRef<{ x: number; y: number } | null>(null);
    const [nudge, setNudge] = useState(0);
    const onTouchStart = (e: React.TouchEvent) => {
        if (!isMobile) return;
        const t = e.touches[0];
        touchStart.current = { x: t.clientX, y: t.clientY };
    };
    const onTouchEnd = (e: React.TouchEvent) => {
        if (!isMobile || !touchStart.current) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - touchStart.current.x;
        const dy = t.clientY - touchStart.current.y;
        touchStart.current = null;
        // Só conta como swipe se for claramente horizontal (não confundir com scroll vertical).
        if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
        if (dx < 0) { nextMonth(); setNudge(22); } else { prevMonth(); setNudge(-22); }
        // Double rAF: garante que o offset inicial pinta antes de animar para 0.
        requestAnimationFrame(() => requestAnimationFrame(() => setNudge(0)));
    };

    const getPropData = (id: string) => {
        const prop = properties[id];
        if (!prop) return { id, title: id, city: '', mainImage: propertyImages?.[id] || '', is_multi_unit: false };
        if (typeof prop === 'string') return { id, title: prop, city: '', mainImage: propertyImages?.[id] || '', is_multi_unit: false };
        return {
            id: prop.id || id,
            title: prop.title || id,
            city: prop.city?.toString() || '',
            mainImage: prop.mainImage || prop.images?.[0]?.url || propertyImages?.[id] || '',
            bedrooms: prop.bedrooms || 0,
            bathrooms: prop.bathrooms || 0,
            max_guests: prop.max_guests || 0,
            address: prop.address || '',
            is_multi_unit: prop.is_multi_unit || false
        };
    };

    // Mobile força 7 dias (o seletor 7/14/31 é desktop-only).
    const effRange = isMobile ? 7 : rangeDays;

    // Janela visível: 31d = mês de calendário (comportamento clássico);
    // 7d/14d = semanas alinhadas a segunda-feira (segunda→domingo), não a começar em currentDate.
    const rangeStart = effRange === 31 ? startOfMonth(currentDate) : startOfWeek(currentDate, { weekStartsOn: 1 });
    const rangeEnd = effRange === 31 ? endOfMonth(currentDate) : startOfDay(addDays(rangeStart, effRange - 1));
    const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });

    // Largura de célula: no mobile calculada para os 7 dias caberem no ecrã
    // (largura do contentor − rail de 44px, ÷7); no desktop por alcance.
    const MOBILE_RAIL_W = 44;
    const cellWidth = isMobile
        ? Math.max(36, Math.floor(((containerW || 360) - MOBILE_RAIL_W) / 7))
        : effRange === 7 ? 120 : effRange === 14 ? 88 : 48;

    // Navigation: mês na 31d, salto de effRange dias nas curtas.
    const nextMonth = () => setCurrentDate(effRange === 31 ? addMonths(currentDate, 1) : addDays(currentDate, effRange));
    const prevMonth = () => setCurrentDate(effRange === 31 ? subMonths(currentDate, 1) : addDays(currentDate, -effRange));
    const goToToday = () => setCurrentDate(new Date());

    // Toggle "€ Preços" (super_admin; só vistas 7/14 — na 31d as células são estreitas demais)
    const [showPrices, setShowPrices] = useState(false);
    const [pricesByWindow, setPricesByWindow] = useState<Record<string, Record<string, Record<string, Beds24DayInfo>>>>({});
    const [pricesLoading, setPricesLoading] = useState(false);
    const windowKey = `${format(rangeStart, "yyyy-MM-dd")}|${format(rangeEnd, "yyyy-MM-dd")}`;
    const windowPrices = pricesByWindow[windowKey];

    useEffect(() => {
        if (!showPrices || !canShowPrices || effRange === 31 || windowPrices) return;
        let cancelled = false;
        setPricesLoading(true);
        // endDate exclusivo do getRoomCalendar → +1 dia para incluir a última noite visível
        getBeds24DailyPrices(format(rangeStart, "yyyy-MM-dd"), format(addDays(rangeEnd, 1), "yyyy-MM-dd"))
            .then((r) => {
                if (cancelled) return;
                if (r.ok) {
                    setPricesByWindow((prev) => ({ ...prev, [windowKey]: r.prices }));
                } else {
                    toast.error(t("pricesError"));
                    setShowPrices(false);
                }
            })
            .finally(() => { if (!cancelled) setPricesLoading(false); });
        return () => { cancelled = true; };
    }, [showPrices, canShowPrices, effRange, windowKey]); // eslint-disable-line react-hooks/exhaustive-deps

    // Rail de preços ativo (só 7/14d). O rail só se materializa nas linhas COM dados
    // (propriedades ligadas ao Beds24) — as restantes ficam a 72px, sem banda vazia.
    const twoBand = showPrices && effRange !== 31;
    const railH = isMobile ? 22 : 28;

    // Propriedades ligadas conhecidas (união das janelas já carregadas). São estáveis
    // entre semanas, por isso ao mudar de semana sabemos QUAIS linhas terão rail e
    // mostramos skeleton nelas enquanto a nova janela carrega (sem salto de altura).
    const linkedPropIds = useMemo(() => {
        const s = new Set<string>();
        for (const w of Object.values(pricesByWindow)) for (const pid of Object.keys(w)) s.add(pid);
        return s;
    }, [pricesByWindow]);

    // Filtering logic
    const allPropertyIds = Object.keys(properties).filter(id => !getPropData(id).is_multi_unit);
    const allRegions = Array.from(new Set(
        allPropertyIds.map(id => getPropData(id).city)
            .filter(city => city && city.trim().length > 0)
    )).sort();

    const visiblePropertyIds = allPropertyIds.filter(id => {
        const propData = getPropData(id);
        const matchesRegion = selectedRegion === "all" || propData.city === selectedRegion;
        const matchesProperty = filteredPropertyIds.length === 0 || filteredPropertyIds.includes(id);
        return matchesRegion && matchesProperty;
    });

    const togglePropertyFilter = (id: string) => {
        setFilteredPropertyIds(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const clearFilters = () => {
        setFilteredPropertyIds([]);
        setSelectedRegion("all");
    };

    // Group reservations filtered by month
    const reservationsByProperty = reservations
        .filter(res => {
            if (res.status === 'cancelled') return false;
            // Filter out airbnb and owner blocks here as they are handled below by the blocked_dates loop
            if (res.status === 'airbnb' || res.status === 'owner_block') return false;

            if (!visiblePropertyIds.includes(res.property_id)) return false;
            const checkIn = new Date(res.check_in);
            const checkOut = new Date(res.check_out);
            return !(checkOut <= rangeStart || checkIn >= rangeEnd);
        })
        .reduce((acc, res) => {
            const propId = res.property_id;
            if (!acc[propId]) acc[propId] = [];
            acc[propId].push(res);
            return acc;
        }, {} as { [key: string]: any[] });

    const visibleBlockedDates = blockedDates?.filter(b => {
        if (!visiblePropertyIds.includes(b.property_id)) return false;
        const start = new Date(b.start_date);
        const end = new Date(b.end_date);
        return !(end <= rangeStart || start >= rangeEnd);
    });

    // Bar style calculation — por índice de dia na janela (funciona através de meses)
    const getBarStyle = (startDateStr: string, endDateStr: string) => {
        const checkIn = new Date(startDateStr);
        const checkOut = new Date(endDateStr);

        const d_checkIn = startOfDay(checkIn);
        const d_checkOut = startOfDay(checkOut);
        const d_rangeStart = startOfDay(rangeStart);
        const d_rangeEnd = startOfDay(rangeEnd);

        const effectiveStart = d_checkIn < d_rangeStart ? d_rangeStart : d_checkIn;
        const effectiveEnd = d_checkOut > d_rangeEnd ? d_rangeEnd : d_checkOut;

        const startIdx = differenceInCalendarDays(effectiveStart, d_rangeStart);
        const endIdx = differenceInCalendarDays(effectiveEnd, d_rangeStart);

        let leftPos = startIdx * cellWidth;
        if (isSameDay(effectiveStart, checkIn)) leftPos += (cellWidth / 2) + 2;

        let rightPos = (endIdx + 1) * cellWidth;
        if (isSameDay(effectiveEnd, checkOut)) {
            rightPos = endIdx * cellWidth + (cellWidth / 2) - 2;
        }

        const width = rightPos - leftPos;
        return { left: leftPos, width: Math.max(width, 10) };
    };

    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Collapse the property sidebar on mobile so more day columns fit on screen.
    useEffect(() => {
        if (typeof window !== "undefined" && window.innerWidth < 768) {
            setIsSidebarOpen(false);
        }
    }, []);

    return (
        <div className="bg-white dark:bg-admin-dark-surface rounded-2xl border border-admin-border dark:border-admin-dark-border shadow-sm flex flex-col h-auto min-h-[440px] md:min-h-[600px] transition-all duration-300">
            {/* Header / Controls */}
            <div className="px-3 md:px-6 py-3 md:py-4 border-b border-admin-border dark:border-admin-dark-border flex items-center justify-between bg-white/50 dark:bg-admin-dark-surface/50 backdrop-blur-sm z-[14] relative">

                <div className="flex items-center gap-4 w-auto md:w-1/3 min-w-0">
                    <div className="relative" ref={datePickerRef}>
                        <button
                            onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                            className="flex items-center gap-2 text-base md:text-xl font-bold text-[#171717] dark:text-admin-dark-text-primary capitalize hover:bg-[#fafafa] dark:hover:bg-admin-dark-bg px-2 py-1 rounded-lg transition-colors"
                        >
                            {rangeDays === 31
                                ? format(currentDate, "MMMM yyyy", { locale: dateLocale })
                                : `${format(rangeStart, "d MMM", { locale: dateLocale })} – ${format(rangeEnd, "d MMM", { locale: dateLocale })}`}
                            <ChevronDown className="size-4 text-[#a3a3a3]" />
                        </button>
                        {isDatePickerOpen && (
                            <div className="absolute top-12 left-0 w-64 bg-white dark:bg-admin-dark-surface border border-admin-border dark:border-admin-dark-border rounded-xl shadow-xl z-50 p-4 animate-in fade-in zoom-in-95 duration-200">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-3 gap-2">
                                        {availableYears.map(year => (
                                            <button key={year} onClick={() => setCurrentDate(setYear(currentDate, year))} className={cn("px-2 py-1 text-xs font-bold rounded-md transition-colors", currentDate.getFullYear() === year ? "bg-[#171717] text-white dark:bg-white dark:text-black" : "text-[#a3a3a3] hover:bg-[#fafafa]")}>{year}</button>
                                        ))}
                                    </div>
                                    <div className="h-px bg-admin-border dark:bg-admin-dark-border" />
                                    <div className="grid grid-cols-3 gap-2">
                                        {months.map(month => (
                                            <button key={month} onClick={() => { setCurrentDate(setMonth(currentDate, month)); setIsDatePickerOpen(false); }} className={cn("px-2 py-1 text-xs font-medium rounded-md capitalize", currentDate.getMonth() === month ? "bg-[#171717] text-white dark:bg-white dark:text-black" : "text-[#171717] dark:text-admin-dark-text-primary hover:bg-[#fafafa]")}>{format(new Date(2000, month, 1), 'MMM', { locale: dateLocale })}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Mobile: navegação compacta ‹ Hoje › + € (o resto dos controlos é desktop) */}
                <div className="flex md:hidden items-center gap-1.5 shrink-0">
                    <div className="flex items-center gap-0.5 bg-[#f5f5f5] dark:bg-admin-dark-bg p-0.5 rounded-lg border border-[#eeeeee] dark:border-admin-dark-border">
                        <button onClick={prevMonth} className="p-1.5 rounded-md text-[#171717] dark:text-white" aria-label="‹"><ChevronLeft className="size-4" /></button>
                        <button onClick={goToToday} className="px-2 py-1 text-xs font-bold text-[#171717] dark:text-white">{t('today')}</button>
                        <button onClick={nextMonth} className="p-1.5 rounded-md text-[#171717] dark:text-white" aria-label="›"><ChevronRight className="size-4" /></button>
                    </div>
                    {canShowPrices && (
                        <button
                            onClick={() => setShowPrices((v) => !v)}
                            aria-label={t("prices")}
                            aria-pressed={showPrices}
                            className={cn(
                                "flex items-center justify-center size-8 rounded-lg border transition-all",
                                showPrices
                                    ? "bg-[#171717] dark:bg-white text-white dark:text-black border-[#171717] dark:border-white"
                                    : "bg-white dark:bg-admin-dark-bg text-[#a3a3a3] border-[#eeeeee] dark:border-admin-dark-border",
                            )}
                        >
                            <Euro className="size-3.5" />
                        </button>
                    )}
                </div>

                <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-3">
                    <div className="relative" ref={regionFilterRef}>
                        <button onClick={() => setIsRegionFilterOpen(!isRegionFilterOpen)} className={cn("hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-wider transition-all", selectedRegion !== "all" ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400" : "bg-white dark:bg-admin-dark-bg text-[#a3a3a3] border-[#eeeeee] hover:text-[#171717]")}>
                            <MapPin className="size-3" />
                            {selectedRegion === "all" ? t('allZones') : selectedRegion}
                            <ChevronDown className={cn("size-3 transition-transform", isRegionFilterOpen && "rotate-180")} />
                        </button>
                        {isRegionFilterOpen && (
                            <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-admin-dark-surface border border-admin-border dark:border-admin-dark-border rounded-xl shadow-xl z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                <button onClick={() => { setSelectedRegion("all"); setIsRegionFilterOpen(false); }} className={cn("w-full px-4 py-2 text-left text-xs font-bold transition-all hover:bg-gray-50", selectedRegion === "all" ? "text-blue-600 bg-blue-50" : "text-[#a3a3a3]")}>{t('allZones')}</button>
                                <div className="h-px bg-admin-border dark:bg-admin-dark-border my-1" />
                                {allRegions.map(region => (
                                    <button key={region} onClick={() => { setSelectedRegion(region); setIsRegionFilterOpen(false); }} className={cn("w-full px-4 py-2 text-left text-xs font-bold transition-all hover:bg-gray-50", selectedRegion === region ? "text-blue-600 bg-blue-50" : "text-[#a3a3a3]")}>{region}</button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="w-px h-4 bg-[#eeeeee] dark:bg-admin-dark-border hidden md:block" />
                    <div className="flex items-center gap-1 bg-[#f5f5f5] dark:bg-admin-dark-bg p-1 rounded-lg border border-[#eeeeee]">
                        <button onClick={prevMonth} className="p-1 hover:bg-white dark:hover:bg-admin-dark-surface rounded-md shadow-sm transition-all text-[#171717] dark:text-white"><ChevronLeft className="size-4" /></button>
                        <button onClick={goToToday} className="px-3 py-1 text-xs font-bold text-[#171717] dark:text-white hover:bg-white dark:hover:bg-admin-dark-surface rounded-md shadow-sm transition-all">{t('today')}</button>
                        <button onClick={nextMonth} className="p-1 hover:bg-white dark:hover:bg-admin-dark-surface rounded-md shadow-sm transition-all text-[#171717] dark:text-white"><ChevronRight className="size-4" /></button>
                    </div>
                    <div className="flex items-center gap-0.5 bg-[#f5f5f5] dark:bg-admin-dark-bg p-1 rounded-lg border border-[#eeeeee] dark:border-admin-dark-border">
                        {([7, 14, 31] as const).map((r) => (
                            <button
                                key={r}
                                onClick={() => setRangeDays(r)}
                                className={cn(
                                    "px-2.5 py-1 text-xs font-bold rounded-md transition-all",
                                    rangeDays === r
                                        ? "bg-white dark:bg-admin-dark-surface text-[#171717] dark:text-white shadow-sm"
                                        : "text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white",
                                )}
                            >
                                {t(`range${r}`)}
                            </button>
                        ))}
                    </div>
                    {canShowPrices && (
                        <button
                            onClick={() => setShowPrices((v) => !v)}
                            disabled={rangeDays === 31}
                            title={rangeDays === 31 ? t("pricesDisabledHint") : undefined}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all",
                                rangeDays === 31
                                    ? "text-[#d4d4d4] dark:text-white/20 border-[#f5f5f5] dark:border-admin-dark-border cursor-not-allowed"
                                    : showPrices
                                        ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/30"
                                        : "bg-white dark:bg-admin-dark-bg text-[#a3a3a3] border-[#eeeeee] dark:border-admin-dark-border hover:text-[#171717] dark:hover:text-white",
                            )}
                        >
                            <Euro className="size-3" />
                            {t("prices")}
                        </button>
                    )}
                </div>

                <div className="hidden md:flex items-center justify-end gap-6 w-1/3">
                    <div className="hidden lg:flex items-center gap-4 text-[10px] font-medium text-[#a3a3a3]">
                        <div className="flex items-center gap-1.5"><div className="size-2 rounded-full bg-emerald-500"></div>{t('legend.confirmed')}</div>
                        <div className="flex items-center gap-1.5"><div className="size-2 rounded-full bg-blue-500"></div>{t('legend.checkedIn')}</div>
                        <div className="flex items-center gap-1.5"><div className="size-2 rounded-full bg-amber-400"></div>{t('legend.pending')}</div>
                        <div className="flex items-center gap-1.5"><div className="size-2 rounded-full border border-slate-200 bg-slate-50" style={{ background: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(148,163,184,0.1) 2px, rgba(148,163,184,0.1) 4px)' }}></div>{t('legend.blocked')}</div>
                        <div className="flex items-center gap-1.5"><div className="size-2 rounded-full border border-rose-200 bg-rose-50" style={{ background: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(244,63,94,0.1) 2px, rgba(244,63,94,0.1) 4px)' }}></div>Airbnb</div>
                        {reservations.some((r: any) => r.is_beds24) && (
                            <div className="flex items-center gap-1.5"><div className="size-2 rounded-full bg-rose-500"></div>{t('legend.beds24')}</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Calendar Area */}
            <div className="flex-1 overflow-auto custom-scrollbar relative" ref={scrollContainerRef} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
                <div className="inline-block min-w-full">
                    {/* Calendar Header Row */}
                    <div className="sticky top-0 z-[12] flex bg-[#fafafa] dark:bg-admin-dark-bg border-b border-admin-border dark:border-admin-dark-border h-[40px] md:h-[48px]">
                        <div className={cn("sticky left-0 z-[13] bg-[#fafafa] dark:bg-admin-dark-bg border-r border-admin-border dark:border-admin-dark-border flex items-center justify-center md:justify-between px-1 md:px-3 transition-all duration-300", isSidebarOpen ? "w-[240px]" : "w-[44px] md:w-[80px]")}>
                            <div className="relative" ref={filterRef}>
                                <button onClick={() => setIsFilterOpen(!isFilterOpen)} className={cn("flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-bold transition-all border", filteredPropertyIds.length > 0 ? "bg-[#171717] text-white" : "bg-white text-[#171717] border-[#eeeeee] dark:bg-admin-dark-surface dark:text-white hover:bg-[#fafafa]")}>
                                    <Filter className="size-3.5" />
                                    {isSidebarOpen && <span className="animate-in fade-in duration-300">{filteredPropertyIds.length > 0 ? `${filteredPropertyIds.length}` : t('filter')}</span>}
                                </button>
                                {isFilterOpen && (
                                    <div className="absolute left-0 top-10 w-64 bg-white dark:bg-admin-dark-surface border border-admin-border dark:border-admin-dark-border rounded-xl shadow-xl z-50 p-2 animate-in fade-in zoom-in-95 duration-200">
                                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-1 space-y-1">
                                            {allPropertyIds.map(id => (
                                                <div key={id} className="flex items-center gap-3 px-2 py-2 hover:bg-[#fafafa] rounded-lg cursor-pointer transition-colors" onClick={() => togglePropertyFilter(id)}>
                                                    <div className={cn("size-4 rounded border flex items-center justify-center transition-colors", (filteredPropertyIds.length === 0 || filteredPropertyIds.includes(id)) ? "bg-[#171717] border-[#171717] dark:bg-white" : "border-[#e5e5e5] bg-transparent")}>
                                                        {(filteredPropertyIds.length === 0 || filteredPropertyIds.includes(id)) && <Check className="size-3 text-white dark:text-black" />}
                                                    </div>
                                                    <span className="text-xs font-medium text-[#171717] dark:text-white line-clamp-1">{getPropData(id).title}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="hidden md:block p-1.5 rounded-md text-[#a3a3a3] hover:text-[#171717] transition-colors">
                                <ChevronLeft className={cn("size-4 transition-transform duration-300", !isSidebarOpen && "rotate-180")} />
                            </button>
                        </div>
                        {days.map((day) => (
                            <div key={day.toISOString()} style={{ width: cellWidth }} className={cn("flex-shrink-0 flex flex-col items-center justify-center border-r border-admin-border dark:border-admin-dark-border/50 transition-colors", isToday(day) ? "bg-amber-50/50 dark:bg-amber-500/10" : "")}>
                                <span className="text-[8px] md:text-[10px] font-bold text-[#a3a3a3] uppercase">{format(day, "EEE", { locale: dateLocale })}</span>
                                <span className={cn("text-xs md:text-sm font-bold mt-0.5 size-5 md:size-6 flex items-center justify-center rounded-full", isToday(day) ? "bg-[#171717] text-white dark:bg-white dark:text-black" : "text-[#171717] dark:text-white")}>{format(day, "d")}</span>
                            </div>
                        ))}
                    </div>

                    {/* Property Rows */}
                    <div
                        className="divide-y divide-admin-border dark:divide-admin-dark-border"
                        style={isMobile ? { transform: `translateX(${nudge}px)`, transition: nudge === 0 ? "transform 200ms ease-out" : "none" } : undefined}
                    >
                        {visiblePropertyIds.map((propId) => {
                            const propData = getPropData(propId);
                            // Duas bandas só nas linhas com preços (ligadas): barra 62px + rail 28px.
                            const rowPrices = twoBand ? windowPrices?.[propId] : undefined;
                            // Linha ligada cuja janela ainda está a carregar → rail em skeleton (sem salto).
                            const rowLoading = twoBand && !rowPrices && pricesLoading && linkedPropIds.has(propId);
                            const hasRail = !!rowPrices || rowLoading;
                            const bandH = isMobile ? 44 : 62;
                            const baseRowH = isMobile ? 48 : 72;
                            const rowHeight = hasRail ? bandH + railH : baseRowH;
                            const barBandH = hasRail ? bandH : rowHeight;
                            const barCenter = barBandH / 2;
                            // Mobile: preço só nas noites LIVRES — numa noite reservada não é acionável
                            // e escondê-lo faz os buracos vendáveis saltar à vista.
                            let occupiedNights: Set<string> | null = null;
                            if (isMobile && hasRail) {
                                occupiedNights = new Set<string>();
                                const addSpan = (s: string, e: string) => {
                                    const from = startOfDay(new Date(s));
                                    const to = startOfDay(new Date(e));
                                    for (let d = from < rangeStart ? rangeStart : from; d < to && d <= rangeEnd; d = addDays(d, 1)) {
                                        occupiedNights!.add(format(d, "yyyy-MM-dd"));
                                    }
                                };
                                for (const r of reservationsByProperty[propId] ?? []) addSpan(r.check_in, r.check_out);
                                for (const b of (visibleBlockedDates ?? []).filter((bl: any) => bl.property_id === propId)) addSpan(b.start_date, b.end_date);
                            }
                            return (
                                <div key={propId} style={{ height: rowHeight }} className="flex hover:bg-[#fafafa]/50 dark:hover:bg-white/5 transition-colors group">
                                    <div
                                        className={cn("sticky left-0 z-[11] bg-white dark:bg-admin-dark-surface border-r border-admin-border dark:border-admin-dark-border flex items-center px-1 md:px-4 transition-all duration-300", isSidebarOpen ? "w-[240px]" : "w-[44px] md:w-[80px] justify-center")}
                                        onMouseEnter={(e) => {
                                            setHoveredPropertyId(propId);
                                            setMousePos({ x: e.clientX, y: e.clientY });
                                        }}
                                        onMouseLeave={() => setHoveredPropertyId(null)}
                                        onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
                                    >
                                        {isSidebarOpen ? (
                                            <Link href={`/admin/properties/${propId}?tab=calendar`} className="w-full text-left hover:opacity-80 transition-opacity">
                                                <span className="text-xs font-bold text-[#171717] dark:text-white block truncate leading-tight">{propData.title}</span>
                                                <span className="text-[9px] text-[#a3a3a3] font-bold uppercase tracking-wider block truncate mt-1">
                                                    {propData.city || 'Sem Zona'}
                                                </span>
                                            </Link>
                                        ) : (
                                            <div className="size-8 md:size-11 rounded-lg md:rounded-xl bg-[#f5f5f5] dark:bg-admin-dark-bg flex items-center justify-center overflow-hidden cursor-pointer hover:ring-2 ring-emerald-500/20 transition-all shadow-sm">
                                                {propData.mainImage ? <Image src={propData.mainImage} alt={propData.title} width={44} height={44} className="size-full object-cover" /> : <span className="text-xs font-bold text-[#a3a3a3]">{propData.title.substring(0, 2).toUpperCase()}</span>}
                                            </div>
                                        )}
                                    </div>
                                    <div className="relative flex flex-1">
                                        {days.map((day) => (
                                            <div key={day.toISOString()} style={{ width: cellWidth }} className={cn("flex-shrink-0 border-r border-admin-border dark:border-admin-dark-border/50 h-full relative", [0, 6].includes(day.getDay()) ? "bg-[#f8f8f8] dark:bg-white/[0.03]" : "")}>
                                                {isToday(day) && <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px md:w-[2px] bg-red-500/50 md:bg-red-500 z-10"><div className="hidden md:block absolute -top-1 -left-[3px] size-2 rounded-full bg-red-500" /></div>}
                                            </div>
                                        ))}
                                        {hasRail && (
                                            <div
                                                className="absolute inset-x-0 flex border-t border-dashed border-[#f0f0f0] dark:border-white/[0.05] bg-[#fafafa]/70 dark:bg-white/[0.02] z-[5] pointer-events-none"
                                                style={{ top: barBandH, height: railH }}
                                            >
                                                {days.map((day) => {
                                                    const key = format(day, "yyyy-MM-dd");
                                                    const info: Beds24DayInfo | undefined = rowPrices?.[key];
                                                    return (
                                                        <div key={key} style={{ width: cellWidth }} className="flex-shrink-0 relative flex items-center justify-center border-r border-admin-border dark:border-admin-dark-border/40">
                                                            {rowLoading ? (
                                                                <div className="h-3 w-9 rounded bg-[#e5e5e5] dark:bg-white/10 animate-pulse" />
                                                            ) : (
                                                                <CalendarDayPrice
                                                                    // Mobile: sem lua (min-stay) e preço só em noite livre.
                                                                    info={isMobile
                                                                        ? { price: occupiedNights?.has(key) ? null : (info?.price ?? null), minStay: null }
                                                                        : (info ?? { price: null, minStay: null })}
                                                                    align="center"
                                                                    priceClassName={isMobile ? "text-[10px]" : effRange === 7 ? "text-xs" : "text-[11px]"}
                                                                    minStayTitle={info?.minStay != null ? t("minStayNights", { count: info.minStay }) : undefined}
                                                                />
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        {reservationsByProperty[propId]?.map((res: any) => {
                                            const style = getBarStyle(res.check_in, res.check_out);
                                            const resStart = startOfDay(new Date(res.check_in)).getTime();
                                            const resEnd = startOfDay(new Date(res.check_out)).getTime();
                                            const viewStart = startOfDay(rangeStart).getTime();
                                            const viewEnd = startOfDay(rangeEnd).getTime();
                                            
                                            const startsBefore = resStart < viewStart;
                                            const endsAfter = resEnd > viewEnd;

                                            const effectiveStatus = effectiveReservationStatus(res.status, res.check_out);

                                            const isBeds24 = !!res.is_beds24;

                                            return (
                                                <div
                                                    key={res.id}
                                                    onClick={() => { if (isBeds24) setSelectedBeds24Id(res.beds24_booking_id); else setSelectedReservation(res); }}
                                                    title={`${res.guest_name || t('guest')} · ${format(new Date(res.check_in), 'd MMM', { locale: dateLocale })} → ${format(new Date(res.check_out), 'd MMM', { locale: dateLocale })}`}
                                                    className={cn(
                                                        "absolute h-7 md:h-8 flex items-center px-1.5 md:px-3 z-10 transition-all",
                                                        isBeds24
                                                            ? "bg-rose-500 text-white cursor-pointer hover:brightness-105 animate-in fade-in duration-300"
                                                            : cn("cursor-pointer hover:brightness-110", getReservationStatusColor(effectiveStatus)),
                                                    )}
                                                    style={{ left: `${style.left}px`, width: `${style.width}px`, top: barCenter, transform: "translateY(-50%)", clipPath: getBarClipPath(startsBefore, endsAfter) }}
                                                >
                                                    <div className="flex justify-between items-center w-full gap-2 overflow-hidden">
                                                        <span className="text-[10px] font-bold truncate shrink leading-none">{res.guest_name || t('guest')}</span>
                                                        <span className="flex items-center gap-1.5 shrink-0">
                                                            {res.total_price ? <span className="hidden md:inline text-[10px] font-bold whitespace-nowrap leading-none">€{res.total_price}</span> : null}
                                                            {isBeds24 && (res.is_airbnb ? <ChannelBadge kind="airbnb-circle" /> : <ChannelBadge kind="beds24" />)}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {visibleBlockedDates?.filter(b => b.property_id === propId).map(block => {
                                            const style = getBarStyle(block.start_date, block.end_date);
                                            const isAirbnb = block.source === 'airbnb_booking';
                                            const blockStart = startOfDay(new Date(block.start_date)).getTime();
                                            const blockEnd = startOfDay(new Date(block.end_date)).getTime();
                                            const viewStart = startOfDay(rangeStart).getTime();
                                            const viewEnd = startOfDay(rangeEnd).getTime();

                                            const startsBefore = blockStart < viewStart;
                                            const endsAfter = blockEnd > viewEnd;

                                            return (
                                                <div
                                                    key={block.id}
                                                    className={cn(
                                                        "absolute h-7 md:h-9 flex items-center px-1.5 md:px-3 z-0 transition-all",
                                                    )}
                                                    style={{
                                                        left: `${style.left}px`,
                                                        width: `${style.width}px`,
                                                        top: barCenter,
                                                        transform: "translateY(-50%)",
                                                        clipPath: getBarClipPath(startsBefore, endsAfter),
                                                        background: isAirbnb ? AIRBNB_HATCH : BLOCK_HATCH,
                                                    }}
                                                >
                                                    {isAirbnb ? (
                                                        <div className="flex items-center gap-1.5 overflow-hidden">
                                                            <ChannelBadge kind="airbnb-box" />
                                                            <span className="text-[10px] font-bold text-rose-800 dark:text-rose-200 truncate">
                                                                Airbnb
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5 overflow-hidden">
                                                            <Ban className="size-3.5 text-slate-500 shrink-0" />
                                                            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 truncate uppercase tracking-wider">
                                                                {block.reason || t('blocked')}
                                                            </span>
                                                        </div>
                                                    )}
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

            {/* Legenda compacta (mobile; a completa vive no header desktop) */}
            <div className="flex md:hidden items-center justify-center gap-3 px-3 py-2 border-t border-admin-border dark:border-admin-dark-border text-[9px] font-medium text-[#a3a3a3]">
                <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-emerald-500" />{t('legend.confirmed')}</span>
                {reservations.some((r: any) => r.is_beds24) && (
                    <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-rose-500" />{t('legend.beds24')}</span>
                )}
                <span className="flex items-center gap-1"><span className="size-2 rounded-full" style={{ background: AIRBNB_HATCH }} />Airbnb</span>
                <span className="flex items-center gap-1"><span className="size-2 rounded-full" style={{ background: BLOCK_HATCH }} />{t('legend.blocked')}</span>
            </div>

            {visiblePropertyIds.length === 0 && <div className="h-[400px] flex flex-col items-center justify-center text-[#a3a3a3]"><Filter className="size-8 mb-4 opacity-50" /><p>{t('noProperties')}</p></div>}

            {/* Sheets and Overlays */}
            <ReservationDetailSheet reservation={selectedReservation} onClose={() => setSelectedReservation(null)} onRefresh={onRefresh} />
            <Beds24BookingDetailSheet beds24BookingId={selectedBeds24Id} onClose={() => setSelectedBeds24Id(null)} />

            {/* Premium Property Tooltip */}
            {hoveredPropertyId && (
                <div
                    className="fixed z-[9999] pointer-events-none animate-in fade-in zoom-in-95 duration-200"
                    style={{
                        left: `${mousePos.x + 20}px`,
                        top: `${Math.min(mousePos.y - 120, typeof window !== 'undefined' ? window.innerHeight - 340 : 0)}px`
                    }}
                >
                    <div className="w-[300px] bg-white dark:bg-admin-dark-bg rounded-2xl shadow-2xl border border-admin-border dark:border-admin-dark-border overflow-hidden backdrop-blur-md">
                        <div className="relative h-32 bg-gray-100 dark:bg-admin-dark-surface">
                            {getPropData(hoveredPropertyId).mainImage ? (
                                <Image src={getPropData(hoveredPropertyId).mainImage} alt="Property" fill className="object-cover" />
                            ) : (
                                <div className="flex items-center justify-center h-full text-[#a3a3a3] opacity-20"><CalendarIcon className="size-8" /></div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <div className="absolute bottom-3 left-4 right-4">
                                <span className="px-1.5 py-0.5 rounded-md bg-white/20 backdrop-blur-md text-white text-[8px] font-bold uppercase tracking-wider mb-1 inline-block">
                                    {getPropData(hoveredPropertyId).city || 'Lovely Memories'}
                                </span>
                                <h2 className="text-sm font-bold text-white leading-tight truncate">{getPropData(hoveredPropertyId).title}</h2>
                            </div>
                        </div>
                        <div className="p-4 bg-white/80 dark:bg-admin-dark-bg/80">
                            <div className="flex items-center justify-between pb-3 border-b border-admin-border dark:border-admin-dark-border mb-3">
                                <div className="flex flex-col items-center gap-0.5">
                                    <Users className="size-3.5 text-blue-500" />
                                    <span className="text-[9px] font-bold text-[#171717] dark:text-white">{getPropData(hoveredPropertyId).max_guests} {t('pax')}</span>
                                </div>
                                <div className="flex flex-col items-center gap-0.5">
                                    <Bed className="size-3.5 text-emerald-500" />
                                    <span className="text-[9px] font-bold text-[#171717] dark:text-white">{getPropData(hoveredPropertyId).bedrooms} {t('bedrooms')}</span>
                                </div>
                                <div className="flex flex-col items-center gap-0.5">
                                    <Bath className="size-3.5 text-purple-500" />
                                    <span className="text-[9px] font-bold text-[#171717] dark:text-white">{getPropData(hoveredPropertyId).bathrooms} {t('bathrooms')}</span>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <MapPin className="size-3 text-[#a3a3a3] shrink-0 mt-0.5" />
                                <p className="text-[10px] font-medium text-[#171717] dark:text-admin-dark-text-primary leading-snug line-clamp-2">
                                    {getPropData(hoveredPropertyId).address}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
