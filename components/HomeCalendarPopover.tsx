"use client";

import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DayPicker, DateRange, useNavigation, useDayPicker, CaptionProps } from "react-day-picker";
import { format, differenceInDays, startOfToday, addMonths, subMonths, subDays, addDays, isSameDay, startOfDay } from "date-fns";
import { pt, enGB } from "date-fns/locale";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";

interface HomeCalendarPopoverProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (date: Date | DateRange | undefined) => void;
    selectedDate?: Date; // For single mode
    selectedRange?: DateRange; // For range mode
    selectionMode?: 'single' | 'range';
    defaultMonth?: Date; // Month to open on when nothing is selected yet (e.g. departure opens on the arrival month)
    placement?: 'side' | 'bottom-start' | 'bottom-end' | 'bottom-center' | 'top-start' | 'top-end' | 'top-center';
    numberOfMonths?: number;
    disabledDates?: any;
    title?: string;
    subtitle?: string;
}


export function HomeCalendarPopover({
    isOpen,
    onClose,
    onSelect,
    selectedDate,
    selectedRange,
    selectionMode = 'range',
    defaultMonth,
    placement: initialPlacement = 'bottom-start',
    numberOfMonths = 1,
    disabledDates,
    title,
    subtitle,
}: HomeCalendarPopoverProps) {
    const t = useTranslations('PropertyDetail');
    const params = useParams();
    const localeCode = params?.locale as string || 'en';
    const dateLocale = localeCode === 'pt' ? pt : enGB;

    // Custom Caption for Homepage Calendar - Centered Navigation < Month >
    const HomeCustomCaption = (props: any) => {
        const { goToMonth, nextMonth, previousMonth } = useNavigation();
        const displayDate = props.displayMonth;

        return (
            <div className="flex items-center justify-between px-2 py-2 w-full relative mb-0">
                <button
                    type="button"
                    disabled={!previousMonth}
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        previousMonth && goToMonth(previousMonth);
                    }}
                    className="p-1 hover:bg-gray-100 rounded-full text-navy-900 disabled:opacity-20 transition-colors z-10"
                    aria-label="Previous Month"
                >
                    <ChevronLeft className="h-5 w-5" />
                </button>

                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                    <span className="text-lg font-bold text-navy-950 font-montserrat capitalize">
                        {displayDate ? format(displayDate, 'MMMM yyyy', { locale: dateLocale }) :
                            (props.calendarMonth ? format(props.calendarMonth.date, 'MMMM yyyy', { locale: dateLocale }) : 'Month Year')}
                    </span>
                </div>

                <button
                    type="button"
                    disabled={!nextMonth}
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        nextMonth && goToMonth(nextMonth);
                    }}
                    className="p-1 hover:bg-gray-100 rounded-full text-navy-900 disabled:opacity-20 transition-colors z-10"
                    aria-label="Next Month"
                >
                    <ChevronRight className="h-5 w-5" />
                </button>
            </div>
        );
    }

    const [month, setMonth] = useState<Date>(new Date());
    const today = startOfToday();
    const popoverRef = React.useRef<HTMLDivElement>(null);
    const [placement, setPlacement] = useState(initialPlacement);

    // Set placement from prop
    useEffect(() => {
        setPlacement(initialPlacement);
    }, [initialPlacement]);

    // Calculate nights for range mode
    // nights removed

    // Normalize disabledDates to an array for safe iteration/some calls
    const normalizedDisabledDates = Array.isArray(disabledDates)
        ? disabledDates
        : (disabledDates ? [disabledDates] : []);

    // Reset month view when opened
    useEffect(() => {
        if (isOpen) {
            if (selectionMode === 'range' && selectedRange?.from) {
                setMonth(selectedRange.from);
            } else if (selectionMode === 'single' && selectedDate) {
                setMonth(selectedDate);
            } else {
                setMonth(defaultMonth ?? new Date());
            }
        }
    }, [isOpen, selectedRange, selectedDate, selectionMode, defaultMonth]);

    // Click outside listener
    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;

            // If the element was removed from the DOM during the click (common with re-renders)
            // we assume it was an internal click and don't close.
            if (!document.contains(target)) return;

            if (popoverRef.current && !popoverRef.current.contains(target)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen, onClose]);

    const getPositionClasses = () => {
        switch (placement) {
            case 'bottom-start':
                return "lg:left-0 lg:top-full lg:mt-4";
            case 'bottom-end':
                return "lg:right-0 lg:top-full lg:mt-4";
            case 'bottom-center':
                return "lg:left-1/2 lg:-translate-x-1/2 lg:top-full lg:mt-4";
            case 'top-start':
                return "lg:left-0 lg:bottom-full lg:mb-4";
            case 'top-end':
                return "lg:right-0 lg:bottom-full lg:mb-4";
            case 'top-center':
                return "lg:left-1/2 lg:-translate-x-1/2 lg:bottom-full lg:mb-4";
            default:
                return "lg:left-0 lg:top-full lg:mt-4";
        }
    };

    const widthClass = numberOfMonths === 1 ? "w-[320px]" : "w-[650px]";

    // Header Text Helper
    // getHeaderText removed

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop (Visible only on mobile) */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[100] bg-navy-950/20 backdrop-blur-[2px] lg:hidden"
                    />

                    {/* Content */}
                    <motion.div
                        ref={popoverRef}
                        onMouseDown={(e) => e.stopPropagation()}
                        initial={{ opacity: 0, scale: 0.95, y: placement?.startsWith('top') ? 10 : -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: placement?.startsWith('top') ? 10 : -10 }}
                        className={`fixed lg:absolute inset-x-4 lg:inset-x-0 bottom-24 lg:bottom-auto lg:top-auto z-[110] bg-white rounded-2xl shadow-xl ${widthClass} mx-auto lg:mx-0 overflow-hidden border border-gray-100 ${getPositionClasses()}`}
                    >
                        {/* Header with Navigation */}
                        <div className="flex items-center justify-between py-3 px-4 border-b border-gray-100 bg-white relative h-14">
                            {/* Navigation Arrows & Month title moved here */}
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setMonth(prev => subMonths(prev, 1))}
                                    className="p-1.5 hover:bg-gray-100 rounded-full text-navy-900 transition-colors"
                                    aria-label="Previous Month"
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <span className="text-lg font-bold text-navy-950 font-montserrat capitalize">
                                    {format(month, 'MMMM yyyy', { locale: dateLocale })}
                                </span>
                            </div>

                            <div className="flex items-center gap-1 relative z-10">
                                <button
                                    type="button"
                                    onClick={() => setMonth(prev => addMonths(prev, 1))}
                                    className="p-1.5 hover:bg-gray-100 rounded-full text-navy-900 transition-colors mr-2"
                                    aria-label="Next Month"
                                >
                                    <ChevronRight className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        {/* Calendar */}
                        <div className="pt-0 px-3 pb-3 bg-white overflow-hidden w-full">
                            {selectionMode === 'single' ? (
                                <DayPicker
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={onSelect as any}
                                    numberOfMonths={numberOfMonths}
                                    month={month}
                                    onMonthChange={setMonth}
                                    disabled={(date) => {
                                        const d = startOfDay(date);
                                        const t = startOfToday();
                                        if (d <= t) return true;

                                        // Respect before/after bounds (e.g. departure must be after arrival)
                                        const isOutOfBounds = (normalizedDisabledDates).some((item: any) => {
                                            if (item?.before && d < startOfDay(item.before)) return true;
                                            if (item?.after && d > startOfDay(item.after)) return true;
                                            return false;
                                        });
                                        if (isOutOfBounds) return true;

                                        const isMiddleNight = (normalizedDisabledDates).some((item: any) => {
                                            if (item?.from && item?.to) {
                                                const from = startOfDay(item.from);
                                                const to = startOfDay(item.to);
                                                return d > from && d < to;
                                            }
                                            if (item instanceof Date) return isSameDay(startOfDay(item), d);
                                            return false;
                                        });

                                        const isInRange = (normalizedDisabledDates).some((item: any) => {
                                            if (item?.from && item?.to) {
                                                return isSameDay(startOfDay(item.from), d) || isSameDay(startOfDay(item.to), d);
                                            }
                                            return false;
                                        });

                                        return isMiddleNight || isInRange;
                                    }}
                                    locale={dateLocale}
                                    components={{
                                        Caption: () => null,
                                        MonthCaption: () => null,
                                        Nav: () => null
                                    } as any}
                                    classNames={{
                                        root: "luxury-calendar-root is-single w-full",
                                        months: "flex flex-col md:flex-row gap-8 justify-center w-full",
                                        month: "space-y-4 w-full",
                                        table: "w-full border-collapse",
                                        head_row: "grid grid-cols-7 w-full mb-2 place-items-center",
                                        head_cell: "text-gray-400 font-medium text-[10px] uppercase tracking-widest text-center py-1",
                                        row: "grid grid-cols-7 w-full mt-1 place-items-center",
                                        cell: "text-center p-0 relative focus-within:relative focus-within:z-20 flex justify-center items-center h-9 w-full",
                                        day: "w-9 h-9 text-sm p-0 font-medium flex items-center justify-center text-navy-900 border-none relative cursor-pointer hover:bg-gray-50 rounded-full focus:outline-none",
                                        day_button: "w-full h-full flex items-center justify-center rounded-full",
                                        day_selected: "bg-transparent",
                                        day_today: "text-[#B08D4A] font-bold",
                                        day_outside: "text-gray-300 opacity-20",
                                        day_disabled: "text-navy-900/40 cursor-not-allowed",
                                        day_hidden: "invisible",
                                    }}
                                    modifiers={{
                                        past: (date) => startOfDay(date) <= startOfToday(),
                                    }}
                                    modifiersClassNames={{
                                        selected: "!bg-[#B08D4A] !text-white hover:!bg-[#92743a]",
                                        today: "text-[#B08D4A] font-bold",
                                        outside: "text-gray-300 opacity-20",
                                        disabled: "text-navy-900/40 cursor-not-allowed",
                                        past: "day_past",
                                    }}
                                    showOutsideDays={false}
                                    weekStartsOn={1}
                                />
                            ) : (
                                <DayPicker
                                    mode="range"
                                    selected={selectedRange}
                                    onSelect={onSelect as any}
                                    numberOfMonths={numberOfMonths}
                                    month={month}
                                    onMonthChange={setMonth}
                                    disabled={(() => {
                                        const base = [];
                                        base.push({ before: today });

                                        // Process disabledRanges into granular sets
                                        const middleNights: Date[] = [];
                                        const checkInDays: Date[] = [];
                                        const checkOutDays: Date[] = [];

                                        (normalizedDisabledDates).forEach((d: any) => {
                                            if (d?.from && d?.to) {
                                                checkInDays.push(d.from);
                                                checkOutDays.push(d.to);

                                                let current = addDays(d.from, 1);
                                                while (current < d.to) {
                                                    middleNights.push(new Date(current));
                                                    current = addDays(current, 1);
                                                }
                                            } else if (d instanceof Date) {
                                                middleNights.push(d);
                                            }
                                        });

                                        // Always block middle nights
                                        base.push(...middleNights);

                                        if (selectionMode === 'range' && (!selectedRange?.from || (selectedRange.to && selectedRange.from.getTime() !== selectedRange.to.getTime()))) {
                                            // Selecting START: block check-in days
                                            base.push(...checkInDays);
                                        } else if (selectionMode === 'range' && selectedRange?.from) {
                                            // Selecting END: block check-out days + enforce overlap prevention
                                            base.push(...checkOutDays);

                                            const nextBlocked = (normalizedDisabledDates)
                                                .map((d: any) => d?.from || (d instanceof Date ? d : null))
                                                .filter((d: any) => d && d > selectedRange.from!)
                                                .sort((a: any, b: any) => a!.getTime() - b!.getTime())[0];

                                            if (nextBlocked) {
                                                base.push({ after: nextBlocked } as any);
                                            }
                                        }

                                        return base;
                                    })()}
                                    locale={dateLocale}
                                    components={{
                                        Caption: () => null,
                                        MonthCaption: () => null,
                                        Nav: () => null
                                    } as any}
                                    classNames={{
                                        root: "luxury-calendar-root is-range w-full",
                                        months: "flex flex-col md:flex-row gap-8 justify-center w-full",
                                        month: "space-y-4 w-full",
                                        table: "w-full border-collapse",
                                        head_row: "grid grid-cols-7 w-full mb-2 place-items-center",
                                        head_cell: "text-gray-400 font-medium text-[10px] uppercase tracking-widest text-center py-1",
                                        row: "grid grid-cols-7 w-full mt-1 place-items-center",
                                        cell: "text-center p-0 relative focus-within:relative focus-within:z-20 flex justify-center items-center h-9 w-full",
                                        day: "w-9 h-9 text-sm p-0 font-medium flex items-center justify-center text-navy-900 border-none relative cursor-pointer hover:bg-gray-50 rounded-full focus:outline-none",
                                        day_button: "w-full h-full flex items-center justify-center rounded-full",
                                        day_selected: "bg-transparent",
                                        day_today: "text-[#B08D4A] font-bold",
                                        day_outside: "text-gray-300 opacity-20",
                                        day_disabled: "text-navy-900/40 cursor-not-allowed",
                                        day_hidden: "invisible",
                                    }}
                                    modifiers={{
                                        booked: (date) => {
                                            const d = startOfDay(date);
                                            const middleNights: Date[] = [];
                                            (normalizedDisabledDates).forEach((item: any) => {
                                                if (item?.from && item?.to) {
                                                    let curr = addDays(startOfDay(item.from), 1);
                                                    while (curr < startOfDay(item.to)) {
                                                        middleNights.push(new Date(curr));
                                                        curr = addDays(curr, 1);
                                                    }
                                                } else if (item instanceof Date) {
                                                    middleNights.push(startOfDay(item));
                                                }
                                            });
                                            return middleNights.some(mn => isSameDay(mn, d));
                                        },
                                        past: (date) => startOfDay(date) <= startOfToday(),
                                        blocked: (date) => {
                                            const d = startOfDay(date);
                                            const t = startOfToday();
                                            if (d <= t) return false;

                                            if (selectedRange?.from && (!selectedRange.to || isSameDay(selectedRange.from, selectedRange.to))) {
                                                const nextFrom = (normalizedDisabledDates)
                                                    .map((item: any) => item?.from || (item instanceof Date ? item : null))
                                                    .filter((f: any) => f && startOfDay(f) > startOfDay(selectedRange.from!))
                                                    .sort((a: any, b: any) => a.getTime() - b.getTime())[0];

                                                if (nextFrom && d > startOfDay(nextFrom)) return true;
                                            }
                                            return false;
                                        }
                                    }}
                                    modifiersClassNames={{
                                        selected: "!bg-[#B08D4A] !text-white hover:!bg-[#92743a]",
                                        today: "text-[#B08D4A] font-bold",
                                        outside: "text-gray-300 opacity-20",
                                        disabled: "text-navy-900/40 cursor-not-allowed",
                                        booked: "day_booked",
                                        past: "day_past",
                                        blocked: "day_blocked",
                                    }}
                                    showOutsideDays={false}
                                    weekStartsOn={1}
                                />
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-2 border-t border-gray-100 flex items-center justify-center bg-white">
                            <button
                                type="button"
                                onClick={() => onSelect(undefined)}
                                className="text-[10px] font-bold text-navy-900/40 hover:text-[#B08D4A] uppercase tracking-[0.2em] transition-all py-1 border-b border-transparent hover:border-[#B08D4A]"
                            >
                                {t('clearDates')}
                            </button>
                        </div>

                        <style jsx global>{`
                            .luxury-calendar-root {
                                width: 100% !important;
                            }
                            /* Container Expansion */
                            .rdp-root, .rdp-months, .rdp-month, .rdp-month_grid, .rdp-weeks, table {
                                width: 100% !important;
                                max-width: 100% !important;
                                display: block !important;
                                margin: 0 !important;
                                padding: 0 !important;
                                gap: 0 !important;
                            }

                            .day_past {
                                opacity: 0.25 !important;
                            }

                            .day_blocked button,
                            .day_blocked [role="button"] {
                                text-decoration: line-through !important;
                                text-decoration-color: rgba(0,0,0,0.5) !important;
                                text-decoration-thickness: 1.5px !important;
                                color: #192537 !important;
                                opacity: 0.5 !important;
                                cursor: not-allowed !important;
                            }

                            .day_past button,
                            .day_past [role="button"] {
                                color: #9ca3af !important;
                                cursor: not-allowed !important;
                            }
                            
                            /* Range Styles (Bar) */
                            
                            /* Header and Body rows should be 7-column grids */
                            .rdp-weekdays, .rdp-week, tr {
                                display: grid !important;
                                grid-template-columns: repeat(7, 1fr) !important;
                                width: 100% !important;
                                margin: 0 !important;
                                padding: 0 !important;
                                border: none !important;
                            }
                            
                            /* The Head/Body containers */
                            thead, .rdp-head, .rdp-tbody {
                                display: block !important;
                                width: 100% !important;
                            }
                            
                            /* Individual Cells alignment */
                            .rdp-weekday, .rdp-day, .rdp-day-custom, td, th {
                                display: flex !important;
                                align-items: center !important;
                                justify-content: center !important;
                                width: 36px !important;
                                height: 36px !important;
                                padding: 0 !important;
                                margin: 0 !important;
                                border: none !important;
                            }

                            /* Root Variable Override */
                            .rdp {
                                --rdp-cell-size: 100% !important;
                                width: 100% !important;
                                margin: 0 !important;
                            }

                            /* Hide default buttons if they appear */
                            .rdp-button_reset {
                                appearance: none;
                                background: transparent;
                                border: none;
                                margin: 0;
                                padding: 0;
                            }

                            /* Range selected styles override - ONLY for range mode */
                            .luxury-calendar-root.is-range .rdp-day_selected {
                                background-color: transparent !important;
                            }
                            
                            /* Single selected styles override - Ensure visible background */
                            .luxury-calendar-root.is-single .rdp-day_selected {
                                background-color: #B08D4A !important;
                                color: white !important;
                                border-radius: 50% !important;
                            }

                            /* Range start/end/middle visualization */
                            .luxury-range-start {
                                background-color: #B08D4A !important;
                                color: white !important;
                                border-top-left-radius: 9999px !important;
                                border-bottom-left-radius: 9999px !important;
                            }
                            .luxury-range-end {
                                background-color: #B08D4A !important;
                                color: white !important;
                                border-top-right-radius: 9999px !important;
                                border-bottom-right-radius: 9999px !important;
                            }
                            .luxury-range-middle {
                                background-color: #F9F5F0 !important; /* Light Gold/Beige */
                                color: #B08D4A !important;
                                border-radius: 0 !important;
                            }
                            
                            /* Selected Day Circle (Single/Edges) */
                            .date-is-selected {
                                background-color: #B08D4A !important;
                                color: white !important;
                                border-radius: 50% !important;
                            }

                            /* Booked (Reserved) Days Styling - Light Red Ball */
                            .day_booked {
                                background-color: #fef2f2 !important;
                                color: #991b1b !important;
                                opacity: 1 !important;
                                border: 1.5px solid #fee2e2 !important;
                                border-radius: 50% !important;
                            }
                            
                            .day_booked button,
                            .day_booked [role="button"] {
                                color: #000000 !important;
                                font-weight: 500 !important;
                                text-decoration: line-through !important;
                                text-decoration-thickness: 1px !important;
                                opacity: 0.6 !important;
                            }
                        `}</style>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
