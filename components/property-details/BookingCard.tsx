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
import { useRouter, useParams } from "next/navigation";
import { getPropertyAvailabilityDates } from "@/app/actions/property-actions";
import { parseDateLocal } from "@/lib/utils";

interface BookingCardProps {
    propertyId: string;
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
    adults: number;
    setAdults: (count: number) => void;
    childrenCount: number;
    setChildren: (count: number) => void;
    infants: number;
    setInfants: (count: number) => void;
    maxGuests?: number;
    availabilityStatus: { available: boolean; loading: boolean; error?: string };
    pricingRules?: {
        min_nights: number;
        cleaning_fee: number;
        weekly_discount_percent: number;
        monthly_discount_percent: number;
        city_tax_per_night: number;
    };
}

export function BookingCard({
    propertyId,
    slug,
    price,
    originalPrice,
    extraPrices,
    selectedExtras,
    onToggleExtra,
    selectedRange,
    onDateChange,
    adults,
    setAdults,
    childrenCount,
    setChildren,
    infants,
    setInfants,
    maxGuests = 10,
    availabilityStatus,
    pricingRules = {
        min_nights: 2,
        cleaning_fee: 85,
        weekly_discount_percent: 5,
        monthly_discount_percent: 15,
        city_tax_per_night: 2
    }
}: BookingCardProps) {
    const t = useTranslations('PropertyDetail');
    const router = useRouter();
    const params = useParams();
    const locale = params?.locale as string || 'en';

    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [isGuestSelectorOpen, setIsGuestSelectorOpen] = useState(false);
    const [isReserving, setIsReserving] = useState(false);
    const [unavailableDates, setUnavailableDates] = useState<DateRange[]>([]);

    useEffect(() => {
        if (!propertyId) return;
        const fetchDates = async () => {
            const result = await getPropertyAvailabilityDates(propertyId);
            if (result.success && result.dates) {
                // Ensure we convert strings back to Date if they were serialized
                // and avoid UTC shifts using our local-safe parser.
                const processedDates = result.dates.map((d: any) => ({
                    from: d.from ? parseDateLocal(d.from) : undefined,
                    to: d.to ? parseDateLocal(d.to) : undefined
                }));
                setUnavailableDates(processedDates);
            }
        };
        fetchDates();
    }, [propertyId]);

    const guestCount = adults + childrenCount + infants;

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
    }, [adults, childrenCount, infants]);

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

    // Core Price Logic (Mirroring lib/pricing.ts)
    const nightsStay = nights > 0 ? nights : 0;
    const baseSubtotal = price * nightsStay;

    // Determine Discount
    let activeDiscountPercent = 0;
    let discountLabel = "";

    if (nightsStay >= 28) {
        activeDiscountPercent = pricingRules.monthly_discount_percent;
        discountLabel = t('monthlyDiscount') || "Monthly Discount";
    } else if (nightsStay >= 7) {
        activeDiscountPercent = pricingRules.weekly_discount_percent;
        discountLabel = t('weeklyDiscount') || "Weekly Discount";
    }

    const discountAmount = activeDiscountPercent > 0 ? Math.round(baseSubtotal * (activeDiscountPercent / 100)) : 0;

    // City Tax Calculation (Tourist Tax)
    // Adults + Children, max 7 nights
    const cityTaxPerNight = pricingRules.city_tax_per_night ?? 2.00;
    const taxableGuests = adults + childrenCount;
    const taxableNights = Math.min(nightsStay, 7);
    const cityTaxTotal = cityTaxPerNight * taxableGuests * taxableNights;

    // Extras Calculation
    const breakfastPrice = extraPrices?.breakfast || 15;
    const transferPrice = extraPrices?.transfer || 55;

    // Use selected duration or default to 1 if missing
    const breakfastDays = selectedExtras?.breakfastDays || 1;

    const breakfastTotal = selectedExtras?.breakfast ? (breakfastPrice * guestCount * breakfastDays) : 0;
    const transferMultiplier = selectedExtras?.transferType === 'round_trip' ? 2 : 1;
    const transferTotal = selectedExtras?.transfer ? (transferPrice * transferMultiplier) : 0;

    const cleaningFee = pricingRules.cleaning_fee;
    const total = baseSubtotal - discountAmount + cleaningFee + cityTaxTotal + breakfastTotal + transferTotal;

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
            children: childrenCount,
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
                        {(originalPrice || 0) > 0 && (
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
                                        className="absolute right-0 top-full mt-3 w-56 bg-white/40 backdrop-blur-2xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-white/40 p-1.5 z-30 overflow-hidden"
                                    >
                                        <div className="flex flex-col gap-0.5">
                                            <button
                                                onClick={handleCopyLink}
                                                className="flex items-center gap-3 px-3 py-2.5 hover:bg-[#0a1128]/10 rounded-xl transition-all text-left group active:scale-95"
                                            >
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isCopied ? 'bg-green-500 text-white' : 'bg-[#0a1128] text-white shadow-lg group-hover:scale-105'}`}>
                                                    {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-[13px] text-[#0a1128] leading-tight">{isCopied ? t('share.copied') : t('share.copyLink')}</p>
                                                    <p className="text-[10px] text-[#0a1128]/50 font-medium">{t('share.publicly') || "Share publicly"}</p>
                                                </div>
                                            </button>

                                            <button
                                                onClick={handleWhatsApp}
                                                className="flex items-center gap-3 px-3 py-2.5 hover:bg-[#25D366]/5 rounded-xl transition-all text-left group active:scale-95"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-[#25D366]/20 text-[#25D366] flex items-center justify-center group-hover:bg-[#25D366] group-hover:text-white group-hover:scale-105 transition-all shadow-sm">
                                                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="font-bold text-[13px] text-[#0a1128] leading-tight">{t('share.whatsapp')}</p>
                                                    <p className="text-[10px] text-[#0a1128]/50 font-medium">{t('share.friends') || "Send to friends"}</p>
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
                        <span className="text-navy-900/60">€{price} × {t('nightsCount', { count: nightsStay })}</span>
                        <span className="font-semibold text-navy-950">€{baseSubtotal}</span>
                    </div>
                    {activeDiscountPercent > 0 && discountAmount > 0 && (
                        <div className="flex justify-between text-[#2d8653]">
                            <span className="flex items-center gap-2">
                                <span className="inline-block px-2 py-0.5 bg-green-50 text-[#2d8653] text-[10px] font-bold uppercase rounded-full">
                                    {activeDiscountPercent}% off
                                </span>
                                {discountLabel}
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
                        {cleaningFee === 0 ? (
                            <span className="text-[#2d8653] font-bold">{t('included')}</span>
                        ) : (
                            <span className="font-semibold text-navy-950">€{cleaningFee}</span>
                        )}
                    </div>

                    <div className="flex justify-between">
                        <span className="text-navy-900/60">{t('cityTax')}</span>
                        {cityTaxTotal === 0 ? (
                            <span className="text-[#2d8653] font-bold">{t('included')}</span>
                        ) : (
                            <span className="font-semibold text-navy-950">€{cityTaxTotal}</span>
                        )}
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

                {/* Availability Warnings */}
                <AnimatePresence>
                    {!availabilityStatus.available && !availabilityStatus.loading && selectedRange?.from && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-4 overflow-hidden"
                        >
                            <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex gap-3 text-red-600">
                                <X className="w-5 h-5 flex-shrink-0" />
                                <div className="text-xs">
                                    <p className="font-bold uppercase tracking-tight mb-0.5">{t('notAvailable')}</p>
                                    <p className="opacity-80">{availabilityStatus.error ? t(availabilityStatus.error) : 'This property is not bookable for the selected criteria.'}</p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Book Button */}
                <Button
                    variant="luxury"
                    className="w-full h-14 text-base font-bold rounded-full hover:scale-[1.02] transition-transform flex items-center justify-center gap-3"
                    disabled={isReserving || (!availabilityStatus.available && !availabilityStatus.loading && !!selectedRange?.from) || availabilityStatus.loading || nights === 0}
                    onClick={handleReserve}
                >
                    {availabilityStatus.loading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Checking...</span>
                        </>
                    ) : isReserving ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            {t('reserving') || "Preparing checkout..."}
                        </>
                    ) : !availabilityStatus.available && !!selectedRange?.from ? (
                        <span>{t('notAvailable') || "Not available"}</span>
                    ) : (
                        (!selectedRange?.from || !selectedRange?.to || nights === 0)
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
                children={childrenCount}
                setChildren={setChildren}
                infants={infants}
                setInfants={setInfants}
                maxGuests={maxGuests}
            />

            {/* Calendar Popover */}
            {/* Calendar Popover */}
            <BookingCalendarPopover
                isOpen={isCalendarOpen}
                onClose={() => setIsCalendarOpen(false)}
                selectedRange={selectedRange}
                onSelect={onDateChange || (() => { })}
                disabledDates={unavailableDates}
                minNights={pricingRules?.min_nights || 1}
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
