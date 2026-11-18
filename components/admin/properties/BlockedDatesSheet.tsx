"use client";

import { useEffect, useState } from "react";
import { format, addDays } from "date-fns";
import { pt, enGB } from "date-fns/locale";
import { useTranslations } from "next-intl";
import { useFormContext } from "react-hook-form";
import { Calendar as CalendarIcon, Loader2, Trash2, AlertCircle } from "lucide-react";
import { DayPicker, DateRange } from "react-day-picker";
import { useParams } from "next/navigation";

import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { createBlockedDate, deleteBlockedDate, getUnavailableDates, BlockedDate, ReservationDate } from "@/app/actions/blocked-dates";
import { toast } from "sonner";
import { parseDateLocal } from "@/lib/utils";

export function BlockedDatesSheet({
    propertyId,
    blockedDates,
    reservations,
    onUpdate
}: {
    propertyId: string;
    blockedDates: BlockedDate[];
    reservations: ReservationDate[];
    onUpdate: () => void;
}) {
    const t = useTranslations('PropertyEditor');
    const [isOpen, setIsOpen] = useState(false);
    const [selectedRange, setSelectedRange] = useState<DateRange | undefined>();
    const [reason, setReason] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const params = useParams();
    // Default to enGB if locale isn't available or strictly 'pt'
    const dateLocale = params?.locale === 'pt' ? pt : enGB;

    const handleBlockDates = async () => {
        if (!selectedRange?.from || !selectedRange?.to || !reason) {
            toast.error(t('pricing.selectRangeError'));
            return;
        }

        setIsLoading(true);
        // L-14: the days picked here are the nights to block, last one included. blocked_dates
        // stores end_date like a check-out (first free day), as the site, the iCal imports and
        // the export to Airbnb all read it, so the last picked day becomes end_date - 1.
        const result = await createBlockedDate({
            property_id: propertyId,
            start_date: format(selectedRange.from, 'yyyy-MM-dd'),
            end_date: format(addDays(selectedRange.to, 1), 'yyyy-MM-dd'),
            reason: reason
        });

        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success(t('pricing.blockSuccess'));
            setReason("");
            setSelectedRange(undefined);
            onUpdate();
            setIsOpen(false);
        }
        setIsLoading(false);
    };

    // Occupied NIGHTS: from the first day to the day before the end (check-out / end_date is
    // free, L-14). A check-out day can start a block, as it can start a booking on the site.
    const nights = (start: string, end: string) => {
        const from = parseDateLocal(start);
        const endDay = parseDateLocal(end);
        if (!from || !endDay) return null;
        const last = addDays(endDay, -1);
        return { from, to: last < from ? from : last };
    };
    const occupied = [
        ...reservations.map(r => nights(r.check_in, r.check_out)),
        ...blockedDates.map(b => nights(b.start_date, b.end_date))
    ].filter((r): r is { from: Date; to: Date } => r !== null);

    const disabledDays = occupied;

    // Modifiers to style reservations differently if needed (optional)
    const modifiers = {
        booked: occupied
    };

    const modifiersStyles = {
        booked: {
            color: "#dc2626", // Red-600
            fontWeight: "bold" as const,
            textDecoration: "line-through",
            textDecorationColor: "#dc2626",
            textDecorationThickness: "2px",
            backgroundColor: "#fef2f2" // Red-50
        }
    };

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen} modal={false}>
            <SheetTrigger asChild>
                <button
                    type="button"
                    className="text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-lg bg-[#171717] dark:bg-white text-white dark:text-black hover:opacity-80 transition-all shadow-lg shadow-black/5"
                >
                    {t('pricing.managementCalendar')}
                </button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>{t('pricing.blockedDatesTitle')}</SheetTitle>
                    <SheetDescription>
                        {t('pricing.blockedDatesDesc')}
                    </SheetDescription>
                </SheetHeader>

                <div className="mt-8 space-y-8">
                    {/* Add New Block */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-navy-900 dark:text-white uppercase tracking-wider">{t('pricing.addNewBlock')}</h4>

                        <div className="bg-white dark:bg-admin-dark-surface border dark:border-white/10 rounded-xl p-4 flex justify-center">
                            <DayPicker
                                mode="range"
                                selected={selectedRange}
                                onSelect={setSelectedRange}
                                disabled={disabledDays}
                                modifiers={modifiers}
                                modifiersStyles={modifiersStyles}
                                locale={dateLocale}
                                classNames={{
                                    day_selected: "bg-navy-900 text-white hover:bg-navy-800 dark:hover:bg-gray-700",
                                    day_range_start: "rounded-l-md bg-navy-900 text-white",
                                    day_range_end: "rounded-r-md bg-navy-900 text-white",
                                    day_range_middle: "!bg-navy-900/10 dark:!bg-white !text-navy-900 dark:!text-black !rounded-none",
                                    day_today: "font-bold text-navy-900 dark:text-white",
                                    caption: "text-navy-900 dark:text-white font-bold",
                                    head_cell: "text-gray-500 dark:text-gray-400 font-medium text-xs uppercase",
                                    day: "text-navy-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-md",
                                }}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">{t('pricing.reasonLabel')}</label>
                            <input
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder={t('pricing.reasonPlaceholder')}
                                className="w-full p-3 bg-gray-50 dark:bg-white/5 border dark:border-white/10 rounded-lg text-sm outline-none focus:ring-2 focus:ring-navy-900/20 dark:focus:ring-white/20 text-navy-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                            />
                        </div>

                        <Button
                            onClick={handleBlockDates}
                            disabled={isLoading || !selectedRange?.from || !reason}
                            className="w-full bg-navy-900 hover:bg-navy-800 text-white dark:bg-white dark:text-navy-900 dark:hover:bg-gray-100"
                        >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {t('pricing.blockDatesAction')}
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
