"use client";

import { useState, useEffect } from "react";
import { Calendar, Users, Share2, MessageCircle, Baby, Copy, Check, X, Plus, Minus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useTranslations } from "next-intl";
import { DateRange } from "react-day-picker";
import { format, differenceInDays } from "date-fns";
import { pt, enGB } from "date-fns/locale";
import { BookingCalendarPopover } from "./BookingCalendarPopover";
import { BookingGuestPopover } from "./BookingGuestPopover";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";

interface BookingCardProps {
    slug: string;
    price: number;
    originalPrice?: number;
    discount?: number;
    extraPrices?: {
        breakfast?: number;
        transfer?: number;
    };
    selectedExtras?: {
        breakfast: boolean;
        breakfastDays: number;
        transfer: boolean;
        transferType?: 'one_way' | 'round_trip';
    };
    onToggleExtra?: (key: 'breakfast' | 'transfer') => void;
    selectedRange?: DateRange;
    onDateChange?: (range: DateRange | undefined) => void;
}

export function BookingCard({
    slug,
    price,
    originalPrice,
    discount,
    extraPrices,
    selectedExtras,
    onToggleExtra,
    selectedRange,
    onDateChange
}: BookingCardProps) {
    const t = useTranslations('PropertyDetail');
    const router = useRouter();
    const params = useParams();
    const locale = params?.locale as string || 'en';

    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    const [guestCount, setGuestCount] = useState(0);
    const [adults, setAdults] = useState(1);
    const [infants, setInfants] = useState(0);
    const [isGuestSelectorOpen, setIsGuestSelectorOpen] = useState(false);
    const [isReserving, setIsReserving] = useState(false);

    // Share feature state
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    const handleCopyLink = () => {
        if (typeof window !== 'undefined') {
            navigator.clipboard.writeText(window.location.href);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }
    };

    const handleWhatsApp = () => {
        if (typeof window !== 'undefined') {
            const url = encodeURIComponent(window.location.href);
            const text = encodeURIComponent(`Check out this amazing place I found on Lovely Memories: ${url}`);
            window.open(`https://wa.me/?text=${text}`, '_blank');
        }
    };

    // Sync total guest count
    useEffect(() => {
        setGuestCount(adults + infants);
    }, [adults, infants]);

    // Update legacy inputs only if they exist
    useEffect(() => {
        const updateGuestInputs = () => {
            const fields = document.querySelectorAll('.yith-wcbk-people-selector__field');
            fields.forEach(field => {
                const title = field.querySelector('.yith-wcbk-people-selector__field__title')?.textContent?.trim()?.toLowerCase();
                const input = field.querySelector('input.yith-wcbk-people-selector__field__value') as HTMLInputElement;
                if (input) {
                    if (title?.includes('adult')) {
                        input.value = adults.toString();
                    } else if (title?.includes('infant') || title?.includes('child')) {
                        input.value = infants.toString();
                    }
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                }
            });

            // Also update the totals span for visual parity if needed
            const totalsSpan = document.querySelector('.yith-wcbk-people-selector__totals');
            if (totalsSpan) {
                // Formatting matches what plugin expects to parse
                totalsSpan.textContent = `${adults} adults${infants > 0 ? `, ${infants} infants` : ""}`;
            }
        };

        updateGuestInputs();
    }, [adults, infants]);

    // Clean up plugin CSS conflicts
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
            .yith-wcbk-people-selector-content, 
            .yith-wcbk-people-selector__content, 
            .yith-wcbk-people-selector-drop,
            .yith-wcbk-people-selector-picker {
                display: none !important;
            }
        `;
        document.head.appendChild(style);
        return () => {
            document.head.removeChild(style);
        };
    }, []);

    const nights = selectedRange?.from && selectedRange?.to
        ? differenceInDays(selectedRange.to, selectedRange.from)
        : 0;

    // Default to 1 night if nothing selected for display purposes, but total is 0
    const displayedNights = nights > 0 ? nights : 1;

    // Core Price
    const subtotal = price * nights;
    const discountAmount = discount ? Math.round(subtotal * (discount / 100)) : 0;

    // Extras Calculation
    const breakfastPrice = extraPrices?.breakfast || 15;
    const transferPrice = extraPrices?.transfer || 55;

    // Use selected duration or default to 1 if missing
    const breakfastDays = selectedExtras?.breakfastDays || 1;

    const breakfastTotal = selectedExtras?.breakfast ? (breakfastPrice * guestCount * breakfastDays) : 0;
    const transferMultiplier = selectedExtras?.transferType === 'round_trip' ? 2 : 1;
    const transferTotal = selectedExtras?.transfer ? (transferPrice * transferMultiplier) : 0;

    const total = subtotal - discountAmount + breakfastTotal + transferTotal;

    const formatDateRange = () => {
        const dateLocale = locale === 'pt' ? pt : enGB;
        if (selectedRange?.from && selectedRange?.to) {
            return `${format(selectedRange.from, 'd MMM', { locale: dateLocale })} - ${format(selectedRange.to, 'd MMM', { locale: dateLocale })}`;
        }
        return t('selectDates') || "Select dates";
    };

    const handleReserve = () => {
        if (!selectedRange?.from || !selectedRange?.to) {
            setIsCalendarOpen(true);
            return;
        }

        // If guests are 0, we should probably toggle the guest selector or just allow "Reserve" to handle validation?
        // User didn't specify strict guest enforcement for *this* specific "Check Availability" button logic, 
        // but generally we need guests.
        // For now, I'll stick to the button text logic requested.

        setIsReserving(true);

        setIsReserving(true);

        const checkIn = format(selectedRange.from, 'yyyy-MM-dd');
        const checkOut = format(selectedRange.to, 'yyyy-MM-dd');

        // Import dynamically to avoid SSR issues if necessary, but utility has client checks
        const { saveBookingSession } = require("@/lib/booking-session");

        const bookingCode = saveBookingSession({
            slug,
            checkIn,
            checkOut,
            adults,
            infants,
            selectedExtras,
            extraPrices
        });

        // Small delay to ensure the loading state is visible and feels responsive
        setTimeout(() => {
            router.push(`/${locale}/booking/checkout?code=${bookingCode}`);
        }, 300);
    };

    return (
        <div className="relative z-20 space-y-5">
            {/* Main Booking Card */}
            <div className="bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.06)] border border-[#E1E6EC] p-6 text-navy-950">
                {/* Price Header */}
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-baseline gap-2">
                        {originalPrice && (
                            <span className="text-navy-900/40 line-through text-sm">€{originalPrice}</span>
                        )}
                        <span className="text-3xl font-bold text-navy-950">€{price}</span>
                        <span className="text-navy-900/60">/{t('perNight')}</span>
                    </div>

                    {/* Premium Share Button */}
                    <div className="relative">
                        <button
                            onClick={() => setIsShareOpen(!isShareOpen)}
                            className={`p-2.5 rounded-full transition-all hover:scale-110 relative z-30 ${isShareOpen ? 'bg-[#0a1128] text-white' : 'bg-[#F0F4F8] hover:bg-[#E1E6EC] text-navy-950'}`}
                        >
                            <Share2 className="h-5 w-5" />
                        </button>

                        <AnimatePresence>
                            {isShareOpen && (
                                <>
                                    {/* Backdrop to close */}
                                    <div
                                        className="fixed inset-0 z-20"
                                        onClick={() => setIsShareOpen(false)}
                                    />

                                    {/* Popover */}
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                        className="absolute right-0 top-full mt-3 w-64 bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-2 z-30 overflow-hidden"
                                    >
                                        <div className="flex flex-col gap-1">
                                            <button
                                                onClick={handleCopyLink}
                                                className="flex items-center gap-3 px-4 py-3 hover:bg-[#0a1128]/5 rounded-xl transition-colors text-left group"
                                            >
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isCopied ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-navy-900/60 group-hover:bg-[#0a1128] group-hover:text-white'}`}>
                                                    {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm text-navy-950">{isCopied ? t('share.copied') : t('share.copyLink')}</p>
                                                    <p className="text-[10px] text-navy-900/40">{t('share.publicly')}</p>
                                                </div>
                                            </button>

                                            <button
                                                onClick={handleWhatsApp}
                                                className="flex items-center gap-3 px-4 py-3 hover:bg-[#25D366]/10 rounded-xl transition-colors text-left group"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-[#25D366]/20 text-[#25D366] flex items-center justify-center group-hover:bg-[#25D366] group-hover:text-white transition-colors">
                                                    <MessageCircle className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm text-navy-950">{t('share.whatsapp')}</p>
                                                    <p className="text-[10px] text-navy-900/40">{t('share.friends')}</p>
                                                </div>
                                            </button>
                                        </div>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Date & Guests Selector */}
                <div id="guest-selector-wrapper" className="space-y-3 mb-4 relative">
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setIsCalendarOpen(true)}
                            className={`flex items-center gap-3 px-4 py-3 border rounded-xl hover:bg-white transition-all text-left group
                                ${selectedRange?.from ? 'bg-[#B08D4A]/10 border-[#B08D4A]/50' : 'bg-gray-50 border-[#E1E6EC]'}
                            `}
                        >
                            <Calendar className={`h-5 w-5 transition-colors ${selectedRange?.from ? 'text-[#B08D4A]' : 'text-navy-900/40 group-hover:text-[#B08D4A]'}`} />
                            <div className="min-w-0 flex-1">
                                <p className="text-[10px] uppercase tracking-wide text-navy-900/40 font-bold truncate">{t('arrival') || t('checkIn') || "Check-in"}</p>
                                <span className="text-xs font-medium text-navy-950 truncate block">
                                    {selectedRange?.from ? format(selectedRange.from, 'd MMM') : t('addDate') || "Add date"}
                                </span>
                            </div>
                        </button>
                        <button
                            onClick={() => setIsCalendarOpen(true)}
                            className={`flex items-center gap-3 px-4 py-3 border rounded-xl hover:bg-white transition-all text-left group
                                ${selectedRange?.to ? 'bg-[#B08D4A]/10 border-[#B08D4A]/50' : 'bg-gray-50 border-[#E1E6EC]'}
                            `}
                        >
                            <Calendar className={`h-5 w-5 flex-shrink-0 transition-colors ${selectedRange?.to ? 'text-[#B08D4A]' : 'text-navy-900/40 group-hover:text-[#B08D4A]'}`} />
                            <div className="min-w-0 flex-1">
                                <p className="text-[10px] uppercase tracking-wide text-navy-900/40 font-bold truncate">{t('departure') || t('checkOut') || "Check-out"}</p>
                                <span className="text-xs font-medium text-navy-950 truncate block">
                                    {selectedRange?.to ? format(selectedRange.to, 'd MMM') : t('addDate') || "Add date"}
                                </span>
                            </div>
                        </button>
                    </div>
                    <div id="guest-selector-anchor" className="relative group/anchor">
                        <button
                            onClick={() => setIsGuestSelectorOpen(!isGuestSelectorOpen)}
                            className={`w-full flex items-center gap-4 px-5 py-3 border rounded-xl hover:bg-white transition-all text-left group
                                ${guestCount > 0 ? 'bg-[#B08D4A]/10 border-[#B08D4A]/50' : 'bg-gray-50 border-[#E1E6EC]'}
                            `}
                        >
                            <div className={`flex items-center gap-1.5 transition-colors ${guestCount > 0 ? 'text-[#B08D4A]' : 'text-navy-900/40 group-hover:text-[#B08D4A]'}`}>
                                <Users className="h-5 w-5" />
                                {infants > 0 && (
                                    <div className="flex items-center -ml-1">
                                        <Baby className="h-4 w-4" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] uppercase tracking-wide text-navy-900/40 font-bold">{t('guests')}</p>
                                <span className="yith-wcbk-people-selector__totals" style={{ display: 'none' }}></span>
                                <span className="text-sm font-medium text-navy-950">
                                    {guestCount > 0
                                        ? `${guestCount} ${guestCount === 1 ? t('guestSelector.person') : t('guestSelector.people')}`
                                        : t('addDate')
                                    }
                                </span>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Price Breakdown */}
                <div className="space-y-2 mb-4 text-sm">
                    <div className="flex justify-between">
                        <span className="text-navy-900/60">€{price} × {nights} {t('nightsCount', { count: nights })}</span>
                        <span className="font-semibold text-navy-950">€{subtotal}</span>
                    </div>
                    {discount && discountAmount > 0 && (
                        <div className="flex justify-between text-[#2d8653]">
                            <span className="flex items-center gap-2">
                                <span className="inline-block px-2 py-0.5 bg-green-50 text-[#2d8653] text-[10px] font-bold uppercase rounded-full">
                                    {discount}% off
                                </span>
                                {t('weeklyDiscount')}
                            </span>
                            <span className="font-bold">−€{discountAmount}</span>
                        </div>
                    )}

                    {/* Additional Services */}
                    {(selectedExtras?.breakfast || selectedExtras?.transfer) && (
                        <div className="py-2.5 my-2 border-y border-dashed border-[#E1E6EC] space-y-2 animate-in fade-in slide-in-from-top-2">
                            <h4 className="font-bold text-[10px] uppercase tracking-widest text-[#B08D4A]">{t('booking.additionalServices')}</h4>

                            {selectedExtras.breakfast && (
                                <div className="relative flex justify-between text-navy-950/80 group hover:bg-gray-50 rounded-lg px-2 -mx-2 py-1 transition-colors">
                                    <div className="flex items-center gap-2 pl-6 transition-all">
                                        {onToggleExtra && (
                                            <button
                                                onClick={() => onToggleExtra('breakfast')}
                                                className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-navy-900/30 hover:text-red-500 hover:bg-red-50 rounded-l-lg"
                                                title="Remove"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        )}
                                        <span>{t('booking.breakfastStay')}</span>
                                    </div>
                                    <span className="font-medium">€{breakfastTotal}</span>
                                </div>
                            )}

                            {selectedExtras.transfer && (
                                <div className="relative flex justify-between text-navy-950/80 group hover:bg-gray-50 rounded-lg px-2 -mx-2 py-1 transition-colors">
                                    <div className="flex items-center gap-2 pl-6 transition-all">
                                        {onToggleExtra && (
                                            <button
                                                onClick={() => onToggleExtra('transfer')}
                                                className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-navy-900/30 hover:text-red-500 hover:bg-red-50 rounded-l-lg"
                                                title="Remove"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        )}
                                        <span>{t('booking.transfer')} ({selectedExtras.transferType === 'round_trip' ? t('booking.roundTripShort') : t('booking.oneWayShort')})</span>
                                    </div>
                                    <span className="font-medium">€{transferTotal}</span>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex justify-between">
                        <span className="text-navy-900/60">{t('cleaningFee')}</span>
                        <span className="text-[#2d8653] font-bold">{t('included')}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-navy-900/60">{t('taxes')}</span>
                        <span className="text-[#2d8653] font-bold">{t('included')}</span>
                    </div>
                    <div className="h-px bg-gray-100 my-2" />
                    <div className="flex justify-between items-baseline mb-1">
                        <span className="font-bold text-navy-950 uppercase text-xs tracking-widest">{t('total')}</span>
                        <div className="flex flex-col items-end">
                            <span className="text-4xl font-bold text-navy-950 tracking-tighter">€{total}</span>
                            <span className="text-[10px] text-navy-900/40 font-medium">{t('booking.vatIncluded')}</span>
                        </div>
                    </div>
                </div>

                {/* Legacy Sync Effect & Hidden Inputs */}
                <div className="hidden">
                    <input type="text" className="yith-wcbk-booking-start-date" readOnly />
                    <input type="text" className="yith-wcbk-booking-end-date" readOnly />
                </div>
                <SyncLegacyInputs range={selectedRange} />

                {/* Book Button */}
                <Button
                    variant="luxury"
                    className="w-full h-14 text-base font-bold rounded-full hover:scale-[1.02] transition-transform flex items-center justify-center gap-3"
                    disabled={isReserving}
                    onClick={handleReserve}
                >
                    {isReserving ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            {t('reserving') || "Preparing checkout..."}
                        </>
                    ) : (
                        (!selectedRange?.from || !selectedRange?.to)
                            ? (t('checkAvailability') || "Check availability")
                            : (t('reserveNow') || "Reserve now")
                    )}
                </Button>

                <p className="text-center text-xs text-navy-900/40 mt-3 flex items-center justify-center gap-2 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2d8653] animate-pulse" />
                    {t('wontBeCharged')}
                </p>
            </div>

            {/* Host Contact Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#E1E6EC] p-6 flex flex-col gap-4">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#F0FDF4] border border-[#DCFCE7] flex items-center justify-center flex-shrink-0 animate-pulse">
                        <MessageCircle className="h-5 w-5 text-[#3d8c63]" />
                    </div>
                    <div>
                        <h4 className="font-bold text-navy-950 mb-1">{t('questions')}</h4>
                        <p className="text-xs text-navy-900/60 leading-relaxed">
                            {t('askHostDesc')}{" "}
                            <button className="text-[#3d8c63] hover:underline font-bold inline-flex items-center gap-1">
                                {t('sendMessage')}
                            </button>
                        </p>
                    </div>
                </div>
            </div>

            {/* Guest Popover */}
            <BookingGuestPopover
                isOpen={isGuestSelectorOpen}
                onClose={() => setIsGuestSelectorOpen(false)}
                adults={adults}
                setAdults={setAdults}
                infants={infants}
                setInfants={setInfants}
            />

            {/* Calendar Popover */}
            <BookingCalendarPopover
                isOpen={isCalendarOpen}
                onClose={() => setIsCalendarOpen(false)}
                selectedRange={selectedRange}
                onSelect={onDateChange || (() => { })}
            />
        </div >
    );
}

function SyncLegacyInputs({ range }: { range: DateRange | undefined }) {
    useEffect(() => {
        if (!range?.from) return;

        const updateInput = (selector: string, date: Date | undefined) => {
            const inputs = document.querySelectorAll(selector);
            inputs.forEach(inputElement => {
                const input = inputElement as HTMLInputElement;
                const val = date ? format(date, 'dd.MM.yyyy') : '';
                input.value = val;
                input.dispatchEvent(new Event('change', { bubbles: true }));
                input.dispatchEvent(new Event('input', { bubbles: true }));

                // Also update formatted helper if exists
                if (input.id) {
                    const formatted = document.getElementById(`${input.id}--formatted`) as HTMLInputElement;
                    if (formatted) formatted.value = val;
                }
            });
        };

        updateInput('.yith-wcbk-booking-start-date', range.from);
        updateInput('.yith-wcbk-booking-end-date', range.to);
    }, [range]);

    return null;
}
