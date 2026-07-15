"use client";

import { useState, useRef, useEffect } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameMonth, isToday, isWithinInterval, startOfDay, endOfDay, isSameDay, setMonth, setYear, addDays, differenceInCalendarDays } from "date-fns";
import { pt } from "date-fns/locale";
import { ChevronLeft, ChevronRight, User, Calendar as CalendarIcon, Info, Check, Filter, ChevronDown, Ban, MapPin, Users, Bed, Bath, X, Globe, Euro, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { ReservationDetailSheet } from "@/components/admin/ReservationDetailSheet";
import { Beds24BookingDetailSheet } from "@/components/admin/reservations/Beds24BookingDetailSheet";
import { getBeds24DailyPrices, type Beds24DayInfo } from "@/app/actions/beds24";
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
}

export function MultiCalendarView({ reservations, properties, propertyImages, locale = 'pt', blockedDates = [], onRefresh, canShowPrices = false }: MultiCalendarViewProps) {
    const t = useTranslations('AdminReservations.multiCalendar');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [rangeDays, setRangeDays] = useState<7 | 14 | 31>(31);
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

    // Janela visível: 31d = mês de calendário (comportamento clássico);
    // 7d/14d = janela deslizante a partir de currentDate (estilo Guesty/Hostaway).
    const rangeStart = rangeDays === 31 ? startOfMonth(currentDate) : startOfDay(currentDate);
    const rangeEnd = rangeDays === 31 ? endOfMonth(currentDate) : startOfDay(addDays(rangeStart, rangeDays - 1));
    const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });

    // Largura de célula por alcance: vistas curtas = células largas (espaço p/ preços).
    const cellWidth = rangeDays === 7 ? 120 : rangeDays === 14 ? 88 : 48;

    // Navigation: mês na 31d, salto de rangeDays dias nas curtas.
    const nextMonth = () => setCurrentDate(rangeDays === 31 ? addMonths(currentDate, 1) : addDays(currentDate, rangeDays));
    const prevMonth = () => setCurrentDate(rangeDays === 31 ? subMonths(currentDate, 1) : addDays(currentDate, -rangeDays));
    const goToToday = () => setCurrentDate(new Date());

    // Toggle "€ Preços" (super_admin; só vistas 7/14 — na 31d as células são estreitas demais)
    const [showPrices, setShowPrices] = useState(false);
    const [pricesByWindow, setPricesByWindow] = useState<Record<string, Record<string, Record<string, Beds24DayInfo>>>>({});
    const [pricesLoading, setPricesLoading] = useState(false);
    const windowKey = `${format(rangeStart, "yyyy-MM-dd")}|${format(rangeEnd, "yyyy-MM-dd")}`;
    const windowPrices = pricesByWindow[windowKey];

    useEffect(() => {
        if (!showPrices || !canShowPrices || rangeDays === 31 || windowPrices) return;
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
    }, [showPrices, canShowPrices, rangeDays, windowKey]); // eslint-disable-line react-hooks/exhaustive-deps

    // Linha em duas bandas quando o rail de preços está ativo (só 7/14d).
    const twoBand = showPrices && rangeDays !== 31;
    const rowHeight = twoBand ? 90 : 72;
    const barBandH = twoBand ? 62 : rowHeight;
    const railH = 28;
    const barCenter = barBandH / 2;

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

    const reservationsInMonth = Object.values(reservationsByProperty).flat();

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

    // Paralelogramo à Hospitable: arestas diagonais (~9px) no check-in/check-out ao
    // meio-dia; aresta reta quando a barra continua para fora do mês visível.
    const getBarClipPath = (startsBefore: boolean, endsAfter: boolean) => {
        const l = startsBefore ? 0 : 9;
        const r = endsAfter ? 0 : 9;
        return `polygon(${l}px 0, 100% 0, calc(100% - ${r}px) 100%, 0 100%)`;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600/20";
            case 'pending': return "bg-amber-200 hover:bg-amber-300 text-amber-950 border-amber-300/50";
            case 'checked-in': return "bg-blue-500 hover:bg-blue-600 text-white border-blue-600/20";
            case 'checked-out':
            case 'completed': return "bg-slate-400 hover:bg-slate-500 text-white border-slate-500/20";
            default: return "bg-slate-400 text-white border-slate-500/20";
        }
    };

    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Collapse the property sidebar on mobile so more day columns fit on screen.
    useEffect(() => {
        if (typeof window !== "undefined" && window.innerWidth < 768) {
            setIsSidebarOpen(false);
        }
    }, []);

    return (
        <div className="bg-white dark:bg-admin-dark-surface rounded-2xl border border-admin-border dark:border-admin-dark-border shadow-sm flex flex-col h-auto min-h-[600px] transition-all duration-300">
            {/* Header / Controls */}
            <div className="px-3 md:px-6 py-3 md:py-4 border-b border-admin-border dark:border-admin-dark-border flex items-center justify-between bg-white/50 dark:bg-admin-dark-surface/50 backdrop-blur-sm z-50 relative">

                <div className="flex items-center gap-4 w-1/3">
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

                <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3">
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
                    <span className="text-xs font-medium text-[#a3a3a3] bg-[#f5f5f5] dark:bg-admin-dark-bg px-3 py-1 rounded-full border border-admin-border hidden md:block">{t('reservationsCount', { count: reservationsInMonth.length })}</span>
                </div>

                <div className="flex items-center justify-end gap-6 w-1/3">
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
            <div className="flex-1 overflow-auto custom-scrollbar relative" ref={scrollContainerRef}>
                <div className="inline-block min-w-full">
                    {/* Calendar Header Row */}
                    <div className="sticky top-0 z-30 flex bg-[#fafafa] dark:bg-admin-dark-bg border-b border-admin-border dark:border-admin-dark-border h-[48px]">
                        <div className={cn("sticky left-0 z-40 bg-[#fafafa] dark:bg-admin-dark-bg border-r border-admin-border dark:border-admin-dark-border flex items-center justify-between px-3 transition-all duration-300", isSidebarOpen ? "w-[240px]" : "w-[80px]")}>
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
                            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1.5 rounded-md text-[#a3a3a3] hover:text-[#171717] transition-colors">
                                <ChevronLeft className={cn("size-4 transition-transform duration-300", !isSidebarOpen && "rotate-180")} />
                            </button>
                        </div>
                        {days.map((day) => (
                            <div key={day.toISOString()} style={{ width: cellWidth }} className={cn("flex-shrink-0 flex flex-col items-center justify-center border-r border-admin-border dark:border-admin-dark-border/50 transition-colors", isToday(day) ? "bg-amber-50/50 dark:bg-amber-500/10" : "")}>
                                <span className="text-[10px] font-bold text-[#a3a3a3] uppercase">{format(day, "EEE", { locale: dateLocale })}</span>
                                <span className={cn("text-sm font-bold mt-0.5 size-6 flex items-center justify-center rounded-full", isToday(day) ? "bg-[#171717] text-white dark:bg-white dark:text-black" : "text-[#171717] dark:text-white")}>{format(day, "d")}</span>
                            </div>
                        ))}
                    </div>

                    {/* Property Rows */}
                    <div className="divide-y divide-admin-border dark:divide-admin-dark-border">
                        {visiblePropertyIds.map((propId) => {
                            const propData = getPropData(propId);
                            return (
                                <div key={propId} style={{ height: rowHeight }} className="flex hover:bg-[#fafafa]/50 dark:hover:bg-white/5 transition-colors group">
                                    <div
                                        className={cn("sticky left-0 z-20 bg-white dark:bg-admin-dark-surface border-r border-admin-border dark:border-admin-dark-border flex items-center px-4 transition-all duration-300", isSidebarOpen ? "w-[240px]" : "w-[80px] justify-center")}
                                        onMouseEnter={(e) => {
                                            setHoveredPropertyId(propId);
                                            setMousePos({ x: e.clientX, y: e.clientY });
                                        }}
                                        onMouseLeave={() => setHoveredPropertyId(null)}
                                        onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
                                    >
                                        {isSidebarOpen ? (
                                            <div className="w-full text-left">
                                                <span className="text-xs font-bold text-[#171717] dark:text-white block truncate leading-tight">{propData.title}</span>
                                                <span className="text-[9px] text-[#a3a3a3] font-bold uppercase tracking-wider block truncate mt-1">
                                                    {propData.city || 'Sem Zona'}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="size-11 rounded-xl bg-[#f5f5f5] dark:bg-admin-dark-bg flex items-center justify-center overflow-hidden cursor-pointer hover:ring-2 ring-emerald-500/20 transition-all shadow-sm">
                                                {propData.mainImage ? <Image src={propData.mainImage} alt={propData.title} width={44} height={44} className="size-full object-cover" /> : <span className="text-xs font-bold text-[#a3a3a3]">{propData.title.substring(0, 2).toUpperCase()}</span>}
                                            </div>
                                        )}
                                    </div>
                                    <div className="relative flex flex-1">
                                        {days.map((day) => (
                                            <div key={day.toISOString()} style={{ width: cellWidth }} className={cn("flex-shrink-0 border-r border-admin-border dark:border-admin-dark-border/50 h-full relative", [0, 6].includes(day.getDay()) ? "bg-[#f8f8f8] dark:bg-white/[0.03]" : "")}>
                                                {isToday(day) && <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[2px] bg-red-500 z-10"><div className="absolute -top-1 -left-[3px] size-2 rounded-full bg-red-500" /></div>}
                                            </div>
                                        ))}
                                        {twoBand && (
                                            <div
                                                className="absolute inset-x-0 flex border-t border-admin-border dark:border-admin-dark-border/50 bg-[#fafafa]/70 dark:bg-white/[0.02] z-[5] pointer-events-none"
                                                style={{ top: barBandH, height: railH }}
                                            >
                                                {days.map((day) => {
                                                    const key = format(day, "yyyy-MM-dd");
                                                    const info: Beds24DayInfo | undefined = windowPrices?.[propId]?.[key];
                                                    return (
                                                        <div key={key} style={{ width: cellWidth }} className="flex-shrink-0 relative flex items-center justify-center border-r border-admin-border dark:border-admin-dark-border/40">
                                                            {info?.minStay != null && info.minStay > 1 && (
                                                                <span
                                                                    title={t("minStayNights", { count: info.minStay })}
                                                                    className="absolute left-1 top-0.5 flex items-center gap-0.5 text-[8px] font-bold text-[#c4c4c4] dark:text-white/30"
                                                                >
                                                                    <Moon className="size-2.5" />{info.minStay}
                                                                </span>
                                                            )}
                                                            {typeof info?.price === "number" && (
                                                                <span className={cn(
                                                                    "font-bold tabular-nums text-[#525252] dark:text-white/70",
                                                                    rangeDays === 7 ? "text-xs" : "text-[11px]",
                                                                    pricesLoading && "opacity-40",
                                                                )}>
                                                                    €{info.price}
                                                                </span>
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

                                            const today = startOfDay(new Date());
                                            const resCheckOutDate = startOfDay(new Date(res.check_out));

                                            let effectiveStatus = res.status;
                                            if (res.status === 'confirmed' && resCheckOutDate.getTime() <= today.getTime()) {
                                                effectiveStatus = 'completed';
                                            }

                                            const isBeds24 = !!res.is_beds24;

                                            return (
                                                <div
                                                    key={res.id}
                                                    onClick={() => { if (isBeds24) setSelectedBeds24Id(res.beds24_booking_id); else setSelectedReservation(res); }}
                                                    title={`${res.guest_name || t('guest')} · ${format(new Date(res.check_in), 'd MMM', { locale: dateLocale })} → ${format(new Date(res.check_out), 'd MMM', { locale: dateLocale })}`}
                                                    className={cn(
                                                        "absolute h-8 flex items-center px-3 z-10 transition-all",
                                                        isBeds24
                                                            ? "bg-rose-500 text-white cursor-pointer hover:brightness-105 animate-in fade-in duration-300"
                                                            : cn("cursor-pointer hover:brightness-110", getStatusColor(effectiveStatus)),
                                                    )}
                                                    style={{ left: `${style.left}px`, width: `${style.width}px`, top: barCenter, transform: "translateY(-50%)", clipPath: getBarClipPath(startsBefore, endsAfter) }}
                                                >
                                                    <div className="flex justify-between items-center w-full gap-2 overflow-hidden">
                                                        <span className="text-[10px] font-bold truncate shrink leading-none">{res.guest_name || t('guest')}</span>
                                                        <span className="flex items-center gap-1.5 shrink-0">
                                                            {res.total_price ? <span className="text-[10px] font-bold whitespace-nowrap leading-none">€{res.total_price}</span> : null}
                                                            {isBeds24 && <span className="rounded bg-white/25 px-1 py-px text-[8px] font-bold uppercase tracking-wider leading-none">Beds24</span>}
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
                                                        "absolute h-9 flex items-center px-3 z-0 transition-all",
                                                    )}
                                                    style={{
                                                        left: `${style.left}px`,
                                                        width: `${style.width}px`,
                                                        top: barCenter,
                                                        transform: "translateY(-50%)",
                                                        clipPath: getBarClipPath(startsBefore, endsAfter),
                                                        background: isAirbnb
                                                            ? 'repeating-linear-gradient(45deg, #ffe4e6, #ffe4e6 6px, #fecdd3 6px, #fecdd3 12px)'
                                                            : 'repeating-linear-gradient(45deg, #f1f5f9, #f1f5f9 6px, #e2e8f0 6px, #e2e8f0 12px)'
                                                    }}
                                                >
                                                    {isAirbnb ? (
                                                        <div className="flex items-center gap-1.5 overflow-hidden">
                                                            <div className="size-5 rounded-md bg-rose-500 flex items-center justify-center shrink-0 shadow-sm">
                                                                <Globe className="size-3 text-white" />
                                                            </div>
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
