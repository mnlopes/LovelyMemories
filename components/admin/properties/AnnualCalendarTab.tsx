"use client";

import { useState, useEffect } from "react";
import { format, startOfYear, endOfYear, eachMonthOfInterval, getDay, getDaysInMonth, isToday, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { pt, enUS } from "date-fns/locale";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface AnnualCalendarTabProps {
    propertyId: string;
    activeLang?: string;
}

export default function AnnualCalendarTab({ propertyId, activeLang = 'en' }: AnnualCalendarTabProps) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [reservations, setReservations] = useState<any[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [blockedDates, setBlockedDates] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const dateLocale = activeLang === 'pt' ? pt : enUS;

    // View state
    const currentYear = new Date().getFullYear();
    const years = [currentYear, currentYear + 1];

    useEffect(() => {
        const fetchAvailability = async () => {
            if (!propertyId || propertyId === 'new') {
                setIsLoading(false);
                return;
            }

            Promise.all([
                supabase
                    .from('reservations')
                    .select('id, check_in, check_out, status, guest_name')
                    .eq('property_id', propertyId)
                    .neq('status', 'cancelled'),
                supabase
                    .from('blocked_dates')
                    .select('id, start_date, end_date')
                    .eq('property_id', propertyId)
            ]).then(([resResult, blockResult]) => {
                if (!resResult.error) setReservations(resResult.data || []);
                if (!blockResult.error) setBlockedDates(blockResult.data || []);
                setIsLoading(false);
            });
        };

        fetchAvailability();
    }, [propertyId]);

    const isDateUnavailable = (date: Date) => {
        const d = startOfDay(date);
        
        // Check reservations
        const hasReservation = reservations.some(res => {
            const start = startOfDay(new Date(res.check_in));
            const end = startOfDay(new Date(res.check_out));
            // A checkout day is typically available for a new check-in, 
            // but for the visual calendar it's considered part of the reserved block if it spans over it.
            return d >= start && d < end;
        });

        if (hasReservation) return true;

        // Check blocked dates
        const isBlocked = blockedDates.some(block => {
            const start = startOfDay(new Date(block.start_date));
            const end = startOfDay(new Date(block.end_date));
            return d >= start && d <= end;
        });

        return isBlocked;
    };

    // Calculate segments of continuous unavailability to draw the pills
    const getMonthSegments = (year: number, month: number) => {
        const segments: { start: number, end: number, startRow: number, startCol: number, isCurrentWeekHighlight?: boolean }[] = [];
        const daysInMonth = getDaysInMonth(new Date(year, month));
        const firstDayOfWeek = getDay(new Date(year, month, 1)); // 0 = Sunday
        
        // We'll use Monday as the start of the week for European standard, 
        // but for simpler calculation, let's keep getDay() and shift if needed.
        // Let's assume standard Sunday=0 indexing for now, or shift for Monday=0.
        // Airbnb uses Monday as first day often.
        const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Monday=0, Sunday=6
        
        let currentSegment = null;
        
        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(year, month, day);
            const isUnavail = isDateUnavailable(currentDate);

            // Calculate grid row/col
            const totalPosition = startOffset + (day - 1);
            const row = Math.floor(totalPosition / 7);
            const col = totalPosition % 7;
            
            // To be accurate, we need to track segments per row to break the pill when wrapping
            
            if (isUnavail) {
                if (!currentSegment) {
                    currentSegment = { start: day, end: day, startRow: row, startCol: col };
                } else if (col === 0) {
                    // Line break, push previous and start new
                    segments.push({ ...currentSegment });
                    currentSegment = { start: day, end: day, startRow: row, startCol: col };
                } else {
                    currentSegment.end = day;
                }
            } else {
                if (currentSegment) {
                    segments.push({ ...currentSegment });
                    currentSegment = null;
                }
            }
        }
        
        if (currentSegment) {
            segments.push(currentSegment);
        }

        return { segments, startOffset, daysInMonth };
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-20">
                <Loader2 className="size-8 animate-spin text-[#a3a3a3]" />
            </div>
        );
    }

    const todayDate = new Date();

    return (
        <div className="max-w-[1000px] mx-auto py-8 px-4">
            
            <div className="flex flex-col gap-16">
                {years.map(year => {
                    const months = eachMonthOfInterval({
                        start: startOfYear(new Date(year, 0, 1)),
                        end: endOfYear(new Date(year, 0, 1))
                    });

                    return (
                        <div key={year}>
                            {/* Year Title (only for future years) */}
                            {year !== currentYear && (
                                <h2 className="text-xl font-bold text-[#222222] mb-8">{year}</h2>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-10">
                                {months.map(monthDate => {
                                    const monthIndex = monthDate.getMonth();
                                    const { segments, startOffset, daysInMonth } = getMonthSegments(year, monthIndex);
                                    
                                    // Total rows needed:
                                    const totalCells = startOffset + daysInMonth;
                                    const rows = Math.ceil(totalCells / 7);

                                    return (
                                        <div key={monthIndex} className="flex flex-col">
                                            <h3 className="text-[15px] font-semibold text-[#222222] mb-4 capitalize">
                                                {format(monthDate, 'MMM', { locale: dateLocale })}
                                            </h3>
                                            
                                            <div className="relative" style={{ height: rows * 20 + 'px', width: '7 * 20px' }}>
                                                {/* Draw dots network */}
                                                {Array.from({ length: daysInMonth }).map((_, i) => {
                                                    const day = i + 1;
                                                    const pos = startOffset + i;
                                                    const r = Math.floor(pos / 7);
                                                    const c = pos % 7;
                                                    const isTargetToday = isToday(new Date(year, monthIndex, day));
                                                    
                                                    return (
                                                        <div 
                                                            key={`dot-${day}`}
                                                            className="absolute flex items-center justify-center pointer-events-none"
                                                            style={{ 
                                                                top: r * 20, 
                                                                left: c * 20,
                                                                width: 20,
                                                                height: 20
                                                            }}
                                                        >
                                                            {/* Base Dot */}
                                                            <div className={`size-1 rounded-full ${isTargetToday ? 'bg-black opacity-0' : 'bg-[#e0e0e0]'}`} />
                                                            
                                                            {/* Today Indicator (if no reservation pill covers it, we will draw a special styling later, or just black dot) */}
                                                            {isTargetToday && !isDateUnavailable(new Date(year, monthIndex, day)) && (
                                                                <div className="absolute size-5 border border-black rounded-full flex items-center justify-center">
                                                                     <div className="size-1 bg-black rounded-full" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}

                                                {/* Draw Reservation Pills */}
                                                {segments.map((seg, idx) => {
                                                    const cStart = (startOffset + seg.start - 1) % 7;
                                                    const widthCells = (seg.end - seg.start) + 1;

                                                    // Airbnb uses a reddish pink for active/current items or maybe just selected dates. Let's use it for the current week highlight if the screenshot red bar means that.
                                                    // In the screenshot, there is ONE red bar with a black dot, highlighting today's reservation.
                                                    const containsToday = seg.start <= todayDate.getDate() && seg.end >= todayDate.getDate() && monthIndex === todayDate.getMonth() && year === todayDate.getFullYear();
                                                    
                                                    return (
                                                        <div
                                                            key={`seg-${idx}`}
                                                            className={`absolute h-2.5 rounded-full z-10 ${containsToday ? 'bg-[#ff385c]' : 'bg-[#222222]'}`}
                                                            style={{
                                                                top: seg.startRow * 20 + (20 - 10) / 2, // Centered vertically in the 20px cell
                                                                left: cStart * 20 + 5, // 5px padding from cell edge to make the pill nicely rounded over the dot
                                                                width: widthCells * 20 - 10, // width covering cells minus padding
                                                            }}
                                                        >
                                                            {containsToday && (
                                                                <div 
                                                                    className="absolute size-[5px] bg-black rounded-full border border-white"
                                                                    style={{
                                                                        top: '50%',
                                                                        transform: 'translateY(-50%)',
                                                                        left: `${((todayDate.getDate() - seg.start) * 20) + 5}px` // precise positioning of the today dot within the pill
                                                                    }}
                                                                />
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
                    );
                })}
            </div>
            
            <div className="fixed bottom-10 right-10">
                <button 
                    onClick={() => {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="bg-white border border-[#dddddd] shadow-lg hover:shadow-xl rounded-full px-6 py-3 text-sm font-semibold text-[#222222] transition-all flex items-center gap-2"
                >
                    <span className="text-lg leading-none mb-0.5">↑</span> Today
                </button>
            </div>
        </div>
    );
}

