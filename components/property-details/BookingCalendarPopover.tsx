"use client";

import React, { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DayPicker, DateRange } from "react-day-picker";
import { format, differenceInDays, startOfToday } from "date-fns";
import { pt, enGB } from "date-fns/locale";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/Button";

interface BookingCalendarPopoverProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (range: DateRange | undefined) => void;
    selectedRange: DateRange | undefined;
    placement?: 'side' | 'bottom-start' | 'bottom-end' | 'bottom-center' | 'top-start' | 'top-end' | 'top-center';
    numberOfMonths?: number;
}

export function BookingCalendarPopover({
    isOpen,
    onClose,
    onSelect,
    selectedRange,
    placement = 'side',
    numberOfMonths = 2,
}: BookingCalendarPopoverProps) {
    const t = useTranslations('PropertyDetail');
    const params = useParams();
    const localeCode = params?.locale as string || 'en';
    const dateLocale = localeCode === 'pt' ? pt : enGB;

    const [month, setMonth] = useState<Date>(new Date());
    const today = startOfToday();
    const popoverRef = React.useRef<HTMLDivElement>(null);

    // Calculate nights
    const nights = selectedRange?.from && selectedRange?.to
        ? differenceInDays(selectedRange.to, selectedRange.from)
        : 0;

    // Reset month view when opened
    useEffect(() => {
        if (isOpen && selectedRange?.from) {
            setMonth(selectedRange.from);
        }
    }, [isOpen, selectedRange]);

    // Click outside listener for desktop
    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen, onClose]);

    const getPositionClasses = () => {
        switch (placement) {
            case 'side':
                return "lg:absolute lg:right-full lg:top-0 lg:mr-8 lg:left-auto lg:translate-x-0";
            case 'bottom-start':
                return "lg:absolute lg:left-0 lg:top-full lg:mt-4";
            case 'bottom-end':
                return "lg:absolute lg:right-0 lg:top-full lg:mt-4";
            case 'bottom-center':
                return "lg:absolute lg:left-1/2 lg:-translate-x-1/2 lg:top-full lg:mt-4 lg:right-auto";
            case 'top-start':
                return "lg:absolute lg:left-0 lg:bottom-full lg:mb-4";
            case 'top-end':
                return "lg:absolute lg:right-0 lg:bottom-full lg:mb-4";
            case 'top-center':
                return "lg:absolute lg:left-1/2 lg:-translate-x-1/2 lg:bottom-full lg:mb-4 lg:right-auto";
            default:
                return "lg:absolute lg:left-1/2 lg:-translate-x-1/2 lg:top-full lg:mt-4 lg:right-auto";
        }
    };

    const widthClass = numberOfMonths === 1 ? "lg:w-[300px]" : "lg:w-[700px]";
    const isCompact = numberOfMonths === 1;

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

                    {/* Content - Anchored appropriately based on placement */}
                    <motion.div
                        ref={popoverRef}
                        initial={{ opacity: 0, scale: 0.95, y: placement?.startsWith('top') ? 10 : (placement?.startsWith('bottom') ? -10 : 0), x: placement === 'side' ? 20 : 0 }}
                        animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: placement?.startsWith('top') ? 10 : (placement?.startsWith('bottom') ? -10 : 0), x: placement === 'side' ? 20 : 0 }}
                        className={`fixed inset-x-4 bottom-24 lg:inset-auto z-[110] bg-white rounded-2xl shadow-xl w-auto ${widthClass} mx-auto lg:mx-0 overflow-hidden border border-gray-100 ${getPositionClasses()}`}
                    >
                        {/* Header - Only show if not compact */}
                        {!isCompact && (
                            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-white">
                                <div>
                                    <h3 className="text-xl font-bold text-navy-950 font-montserrat">
                                        {selectedRange?.from && selectedRange?.to
                                            ? `${format(selectedRange.from, 'd MMM', { locale: dateLocale })} - ${format(selectedRange.to, 'd MMM', { locale: dateLocale })}`
                                            : (t('selectDates') || 'Select dates')}
                                    </h3>
                                    <p className="text-sm text-navy-900/40 font-medium">
                                        {nights > 0
                                            ? `${nights} ${t('nightsCount', { count: nights })}`
                                            : t('minStay') || 'Minimum stay 2 nights'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={onClose}
                                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                    >
                                        <X className="h-6 w-6 text-navy-950" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Calendar Area */}
                        <div className={`${isCompact ? 'p-3' : 'p-6 lg:p-8'} flex justify-center bg-white overflow-hidden luxury-calendar`}>
                            <DayPicker
                                mode="range"
                                selected={selectedRange}
                                onSelect={onSelect}
                                numberOfMonths={numberOfMonths}
                                month={month}
                                onMonthChange={setMonth}
                                disabled={{ before: today }}
                                locale={dateLocale}
                                classNames={{
                                    root: "luxury-calendar-root",
                                    months: "flex flex-col md:flex-row gap-8 justify-center",
                                    month: `space-y-4 ${isCompact ? 'w-full' : 'min-w-[300px]'}`,
                                    month_caption: "flex justify-center pt-1 relative items-center mb-4",
                                    caption_label: "text-sm font-bold text-navy-950 font-montserrat",
                                    nav: "flex items-center",
                                    button_previous: "absolute left-0 z-10 p-1 hover:bg-gray-50 rounded-full transition-colors",
                                    button_next: "absolute right-0 z-10 p-1 hover:bg-gray-50 rounded-full transition-colors",
                                    month_grid: "w-full border-collapse",
                                    weekdays: "grid grid-cols-7 w-full mb-1",
                                    weekday: "text-gray-400 font-medium text-[9px] uppercase tracking-widest text-center py-1",
                                    weeks: "space-y-0",
                                    week: "grid grid-cols-7 w-full",
                                    hidden: "invisible",
                                    cell: "p-0 m-0",
                                    day: `rdp-day-custom w-full h-full p-0 font-medium flex items-center justify-center text-navy-900 border-none relative cursor-pointer overflow-visible focus:outline-none isolate ${isCompact ? 'text-xs' : 'text-sm'}`,
                                    day_button: "rdp-day_button w-full h-full flex items-center justify-center",
                                    range_start: "luxury-range-start !text-white",
                                    range_end: "luxury-range-end !text-white",
                                    range_middle: "luxury-range-middle !text-[#B08D4A]",
                                    selected: "date-is-selected",
                                    today: "luxury-today text-[#B08D4A] font-bold",
                                    outside: "text-gray-300 opacity-20",
                                    disabled: "text-gray-200 opacity-10 cursor-not-allowed",
                                }}
                                components={{
                                    Chevron: ({ orientation }) => orientation === "left" ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />,
                                }}
                                showOutsideDays={false}
                                weekStartsOn={1}
                            />
                        </div>

                        {/* Footer (Actions) */}
                        <div className={`${isCompact ? 'p-3' : 'p-6'} border-t border-gray-100 flex items-center justify-center bg-white`}>
                            <button
                                onClick={() => onSelect(undefined)}
                                className="text-[10px] font-bold text-navy-900/40 hover:text-[#B08D4A] uppercase tracking-[0.2em] transition-all py-2 border-b border-transparent hover:border-[#B08D4A]"
                            >
                                {t('clearDates')}
                            </button>
                        </div>

                        {/* Custom overrides for luxury range appearance */}
                        <style jsx global>{`
                            .luxury-calendar-root {
                                width: 100%;
                            }
                            /* Strict Grid & Layout */
                            .rdp-weekdays, .rdp-week {
                                display: grid !important;
                                grid-template-columns: repeat(7, 1fr) !important;
                                width: 100% !important;
                                margin: 0 !important;
                                padding: 0 !important;
                            }
                            
                            /* The Day Cell: 100% Clickable & Isolated Stack */
                            .rdp-day-custom {
                                position: relative !important;
                                width: 100% !important;
                                height: 100% !important;
                                min-height: 44px !important;
                                padding: 0 !important;
                                margin: 0 !important;
                                display: flex !important;
                                align-items: center !important;
                                justify-content: center !important;
                                background: transparent !important;
                                cursor: pointer;
                                isolate: isolate; /* Create a controlled stacking context */
                                color: #192537 !important;
                                font-weight: 500;
                                border: 0 !important;
                                outline: 0 !important;
                                box-shadow: none !important;
                                -webkit-tap-highlight-color: transparent !important;
                                transition: none !important; /* Prevent ghosting during state changes */
                            }

                            .luxury-calendar-root .rdp-day_button {
                                width: 100% !important;
                                height: 100% !important;
                                min-height: 44px !important;
                                display: flex !important;
                                align-items: center !important;
                                justify-content: center !important;
                                margin: 0 !important;
                                padding: 0 !important;
                            }
                            
                            /* Total Focus & Shadow Eradication (Global Reset) */
                            .luxury-calendar-root *,
                            .luxury-calendar-root button,
                            .luxury-calendar-root button:focus,
                            .luxury-calendar-root button:active,
                            .luxury-calendar-root button:focus-visible,
                            .luxury-calendar-root [role="gridcell"],
                            .luxury-calendar-root [role="gridcell"] button,
                            .rdp-day-custom,
                            .rdp-day-custom:focus, 
                            .rdp-day-custom:active, 
                            .rdp-day-custom:focus-visible {
                                outline: 0 !important;
                                outline-offset: 0 !important;
                                border: 0 !important;
                                box-shadow: none !important;
                                background-color: transparent !important;
                                -webkit-appearance: none !important;
                                appearance: none !important;
                                transition: none !important; /* Kill all transition delays */
                            }
                            
                            /* Layer 1: Selection Bar Underlay (Bottom) */
                            .luxury-range-middle::before,
                            .luxury-range-start::before,
                            .luxury-range-end::before {
                                content: '';
                                position: absolute;
                                inset: 0;
                                background-color: #FDF8F0;
                                z-index: -2;
                            }
                            
                            /* Rounded Caps for the Selection Bar Underlay */
                            .luxury-range-start::before { border-radius: 100px 0 0 100px !important; }
                            .luxury-range-end::before { border-radius: 0 100px 100px 0 !important; }
                            .luxury-range-start.luxury-range-end::before { border-radius: 100px !important; }

                            /* Layer 2: The "Ball" (Hover OR Selected Start/End) (Middle) */
                            .rdp-day-custom::after {
                                content: '';
                                position: absolute;
                                top: 50%;
                                left: 50%;
                                transform: translate(-50%, -50%);
                                width: 40px;
                                height: 40px;
                                border-radius: 50%;
                                z-index: -1;
                                opacity: 0;
                                transition: all 0.2s ease;
                                pointer-events: none;
                            }
                            
                            /* Soft Gold Hover Ball */
                            .rdp-day-custom:hover:not(.disabled)::after {
                                opacity: 1;
                                background-color: rgba(176, 141, 74, 0.08); /* Soft Gold */
                            }
                            
                            /* Solid Gold Ball for Selected Start/End */
                            .luxury-range-start::after,
                            .luxury-range-end::after {
                                opacity: 1 !important;
                                background: linear-gradient(135deg, #B08D4A 0%, #8E6E35 100%) !important;
                                box-shadow: 0 4px 12px rgba(176, 141, 74, 0.3) !important;
                                border: 1.5px solid rgba(255, 255, 255, 0.2) !important;
                                z-index: -1 !important;
                            }

                            /* Layer 3: Text Content (Top - Guaranteed by isolate + negative z-index) */
                            .luxury-range-start,
                            .luxury-range-end {
                                color: white !important;
                                font-weight: 700 !important;
                            }
                            
                            .luxury-range-middle {
                                color: #B08D4A !important;
                                font-weight: 700 !important;
                            }

                            /* Today's indicator */
                            .luxury-today {
                                position: relative;
                            }
                            .luxury-today:not(.luxury-range-start):not(.luxury-range-end)::after {
                                content: '';
                                position: absolute;
                                bottom: 6px;
                                left: 50%;
                                transform: translateX(-50%);
                                width: 4px;
                                height: 4px;
                                background-color: #B08D4A;
                                border-radius: 50%;
                                opacity: 0.6;
                            }
                            
                            /* Hide scrollbar */
                            .luxury-calendar::-webkit-scrollbar { display: none; }
                            .luxury-calendar { -ms-overflow-style: none; scrollbar-width: none; }

                            @media (max-width: 1024px) {
                                .rdp-day-custom { height: 44px !important; }
                                .rdp-day-custom::after {
                                    width: 38px;
                                    height: 38px;
                                }
                            }

                            /* Compact mode overrides */
                            ${isCompact ? `
                                .rdp-day-custom {
                                    height: 36px !important;
                                    min-height: 36px !important;
                                }
                                .rdp-day-custom::after {
                                    width: 30px !important;
                                    height: 30px !important;
                                }
                                .luxury-calendar-root .rdp-day_button {
                                    min-height: 36px !important;
                                }
                            ` : ''}
                        `}</style>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
