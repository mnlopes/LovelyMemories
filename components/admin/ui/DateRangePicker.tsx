"use client";

import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/Calendar";
import { useTranslations } from "next-intl";

interface DateRangePickerProps {
    date: DateRange | undefined;
    setDate: (date: DateRange | undefined) => void;
}

export function DateRangePicker({ date, setDate }: DateRangePickerProps) {
    const t = useTranslations('AdminReservations.datePicker');
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={containerRef}>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${date?.from
                        ? 'bg-[#171717] text-white border-[#171717]'
                        : 'bg-white border-[#f5f5f5] text-[#171717] hover:bg-[#fafafa]'
                        }`}
                >
                    <CalendarIcon className="size-4" />
                    {date?.from ? (
                        date.to ? (
                            <>
                                {format(date.from, "dd MMM, y", { locale: pt })} - {format(date.to, "dd MMM, y", { locale: pt })}
                            </>
                        ) : (
                            format(date.from, "dd MMM, y", { locale: pt })
                        )
                    ) : (
                        <span>{t('pickRange')}</span>
                    )}
                </button>

                {date?.from && (
                    <button
                        onClick={() => setDate(undefined)}
                        className="p-2 text-[#a3a3a3] hover:text-[#171717] hover:bg-gray-100 rounded-lg transition-colors"
                        title={t('clearFilter')}
                    >
                        <X className="size-4" />
                    </button>
                )}
            </div>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 z-50 bg-white border border-[#f5f5f5] rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 w-auto min-w-[300px]">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={(newDate) => {
                            setDate(newDate);
                        }}
                        numberOfMonths={1}
                    />
                </div>
            )}
        </div>
    );
}
