"use client";

import { useTranslations } from "next-intl";
import { Utensils, Car, Sparkles, MessageSquare, ShieldCheck, Ticket, Check, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ConciergeSectionProps {
    services?: {
        chef?: boolean;
        chauffeur?: boolean;
        spa?: boolean;
        tours?: boolean;
        security?: boolean;
        events?: boolean;
    };
    prices?: {
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
    onUpdateBreakfastDays?: (days: number) => void;
    onUpdateTransferType?: (type: 'one_way' | 'round_trip') => void;
    maxBreakfastDays?: number;
}

export function ConciergeSection({ services, prices, selectedExtras, onToggleExtra, onUpdateBreakfastDays, onUpdateTransferType, maxBreakfastDays }: ConciergeSectionProps) {
    const t = useTranslations('PropertyDetail');

    // General Services (Just info)
    const availableServices = [
        { icon: Utensils, label: t('concierge.chef') || "Private Chef", available: services?.chef ?? true },
        { icon: Car, label: t('concierge.chauffeur') || "Chauffeur Service", available: services?.chauffeur ?? true },
        { icon: Sparkles, label: t('concierge.spa'), available: services?.spa ?? true },
        { icon: Ticket, label: t('concierge.tours'), available: services?.tours ?? true },
        { icon: ShieldCheck, label: t('concierge.security'), available: services?.security ?? true },
        { icon: MessageSquare, label: t('concierge.more'), available: true },
    ].filter(s => s.available);

    return (
        <section className="py-10 border-t border-[#E1E6EC]">
            <div className="flex flex-col gap-8">

                {/* Header */}
                <div className="space-y-4 max-w-2xl">
                    <h2 className="text-3xl font-playfair font-bold text-navy-950">
                        {t('concierge.title')}
                    </h2>
                    <p className="text-navy-900/70 leading-relaxed text-lg">
                        {t('concierge.description')}
                    </p>
                </div>

                {/* Interactive Premium Services */}
                {prices && onToggleExtra && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Breakfast Card */}
                        <div
                            onClick={() => onToggleExtra('breakfast')}
                            className={`
                                relative p-6 rounded-2xl border transition-all select-none cursor-pointer
                                ${selectedExtras?.breakfast
                                    ? 'bg-[#B08D4A]/10 border-[#B08D4A] shadow-md'
                                    : 'bg-white border-[#E1E6EC] hover:border-[#B08D4A]/50 hover:shadow-lg'}
                        `}>
                            {/* Card Header */}
                            <div>
                                <div className="flex items-start justify-between mb-4">
                                    <div className={`p-3 rounded-full transition-colors ${selectedExtras?.breakfast ? 'bg-[#B08D4A] text-white' : 'bg-[#B08D4A]/10 text-[#B08D4A]'}`}>
                                        <Utensils className="h-6 w-6" />
                                    </div>
                                    {selectedExtras?.breakfast ? (
                                        <span className="flex items-center gap-1.5 text-navy-900 font-bold text-sm bg-white/50 px-3 py-1 rounded-full">
                                            <Check className="h-4 w-4" />
                                            {t('concierge.added')}
                                        </span>
                                    ) : (
                                        <span className="text-navy-900/40 text-sm font-medium">{t('concierge.dailyService')}</span>
                                    )}
                                </div>
                                <h3 className="text-xl font-bold text-navy-950 mb-1">{t('concierge.breakfastTitle')}</h3>
                                <p className="text-navy-900/60 text-sm mb-4">{t('concierge.breakfastDesc')}</p>
                            </div>

                            {/* Price & Controls */}
                            <div className="flex items-end justify-between">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-lg font-bold text-navy-950">€{prices.breakfast}</span>
                                    <span className="text-xs text-navy-900/50">{t('concierge.perGuestNight')}</span>
                                </div>

                                {/* Full Stay Only - No Counter */}
                                {selectedExtras?.breakfast && (
                                    <div className="flex items-center gap-2 bg-navy-900/5 px-3 py-1.5 rounded-lg border border-navy-900/10">
                                        <span className="text-xs font-bold text-navy-900 uppercase tracking-wide">
                                            {t('concierge.entireStayIncluded')}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Transfer Card */}
                        <div
                            onClick={() => onToggleExtra('transfer')}
                            className={`
                                relative p-6 rounded-2xl border transition-all cursor-pointer group select-none
                                ${selectedExtras?.transfer
                                    ? 'bg-[#B08D4A]/10 border-[#B08D4A] shadow-md'
                                    : 'bg-white border-[#E1E6EC] hover:border-[#B08D4A]/50 hover:shadow-lg'}
                        `}>
                            <div className="flex items-start justify-between mb-4">
                                <div className={`p-3 rounded-full transition-colors ${selectedExtras?.transfer ? 'bg-[#B08D4A] text-white' : 'bg-[#B08D4A]/10 text-[#B08D4A]'}`}>
                                    <Car className="h-6 w-6" />
                                </div>
                                {selectedExtras?.transfer ? (
                                    <span className="flex items-center gap-1.5 text-navy-900 font-bold text-sm bg-white/50 px-3 py-1 rounded-full">
                                        <Check className="h-4 w-4" />
                                        {t('concierge.added')}
                                    </span>
                                ) : (
                                    <span className="text-navy-900/40 text-sm font-medium">{t('booking.oneWay')}</span>
                                )}
                            </div>
                            <h3 className="text-xl font-bold text-navy-950 mb-1">{t('concierge.transferTitle')}</h3>
                            <p className="text-navy-900/60 text-sm mb-4">{t('concierge.transferDesc')}</p>
                            <div className="flex items-end justify-between gap-4">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-lg font-bold text-navy-950">
                                        €{selectedExtras?.transferType === 'round_trip' ? (prices.transfer || 0) * 2 : prices.transfer}
                                    </span>
                                    <span className="text-xs text-navy-900/50">/ {selectedExtras?.transferType === 'round_trip' ? t('booking.roundTrip') : t('booking.oneWay')}</span>
                                </div>

                                {/* Transfer Type Selection - Positioned on the right */}
                                {selectedExtras?.transfer && onUpdateTransferType && (
                                    <div className="flex gap-1 p-1 bg-gray-50 border border-gray-100 rounded-xl" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={() => onUpdateTransferType('one_way')}
                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${selectedExtras.transferType === 'one_way' || !selectedExtras.transferType ? 'bg-navy-900 text-white shadow-md' : 'text-navy-900/40 hover:text-navy-900 hover:bg-white'}`}
                                        >
                                            {t('booking.oneWayShort')}
                                        </button>
                                        <button
                                            onClick={() => onUpdateTransferType('round_trip')}
                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${selectedExtras.transferType === 'round_trip' ? 'bg-navy-900 text-white shadow-md' : 'text-navy-900/40 hover:text-navy-900 hover:bg-white'}`}
                                        >
                                            {t('booking.roundTripShort')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Other Services List */}
                <div className="bg-navy-900/5 rounded-2xl p-8">
                    <h3 className="font-medium text-xs uppercase tracking-widest text-[#B08D4A] mb-6">
                        {t('concierge.vipServices')}
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-12">
                        {availableServices.map((service, index) => (
                            <div key={index} className="flex items-center gap-4 group">
                                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                                    <service.icon className="w-5 h-5 text-[#B08D4A]" />
                                </div>
                                <span className="font-medium text-navy-950">{service.label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Disclaimer Box */}
                    <div className="mt-8 pt-8 border-t border-navy-900/5 flex items-start gap-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-navy-900 mt-2 shrink-0 animate-pulse" />
                        <p className="text-sm text-navy-900/60 leading-relaxed">
                            {t('concierge.disclaimer')} <button className="font-bold text-navy-950 hover:underline underline-offset-4 decoration-navy-900">{t('concierge.contactButton')}</button>
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
