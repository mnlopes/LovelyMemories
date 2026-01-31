"use client";

import React, { useEffect, useRef } from "react";
import { X, Plus, Minus, Users, Baby } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";

interface BookingGuestPopoverProps {
    isOpen: boolean;
    onClose: () => void;
    adults: number;
    setAdults: (count: number) => void;
    infants: number;
    setInfants: (count: number) => void;
    placement?: 'side' | 'bottom' | 'bottom-start' | 'bottom-end' | 'bottom-center' | 'top-start' | 'top-end' | 'top-center';
}

export function BookingGuestPopover({
    isOpen,
    onClose,
    adults,
    setAdults,
    infants,
    setInfants,
    placement = 'side',
}: BookingGuestPopoverProps) {
    const t = useTranslations('PropertyDetail');
    const popoverRef = useRef<HTMLDivElement>(null);

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
            case 'bottom':
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
                        className={`fixed inset-x-4 bottom-24 lg:inset-auto z-[110] bg-white rounded-3xl shadow-2xl w-auto lg:w-[380px] mx-auto lg:mx-0 overflow-hidden border border-gray-100 ${getPositionClasses()}`}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between py-3 px-5 border-b border-gray-100 bg-white">
                            <div>
                                <h3 className="text-lg font-bold text-navy-950 font-montserrat">
                                    {t('guests') || 'Guests'}
                                </h3>
                                <p className="text-xs text-navy-900/40 font-medium">
                                    {adults + infants} {(adults + infants) === 1 ? t('guestSelector.person') : t('guestSelector.people')}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X className="h-5 w-5 text-navy-950" />
                            </button>
                        </div>

                        {/* Guest Selection Area */}
                        <div className="p-8 space-y-8 bg-white">
                            {/* Adults row */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-navy-900/40">
                                        <Users className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-navy-950">{t('guestSelector.adults')}</p>
                                        <p className="text-[10px] text-navy-900/40">{t('guestSelector.ages13')}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setAdults(Math.max(1, adults - 1))}
                                        disabled={adults <= 1}
                                        className="w-9 h-9 rounded-full border border-[#E1E6EC] flex items-center justify-center hover:border-[#B08D4A] hover:bg-[#B08D4A]/5 text-navy-950 hover:text-[#B08D4A] transition-all disabled:opacity-20 active:scale-90"
                                    >
                                        <Minus className="h-4 w-4" />
                                    </button>
                                    <span className="w-4 text-center font-bold text-navy-950 text-base">{adults}</span>
                                    <button
                                        type="button"
                                        onClick={() => setAdults(adults + 1)}
                                        className="w-9 h-9 rounded-full border border-[#E1E6EC] flex items-center justify-center hover:border-[#B08D4A] hover:bg-[#B08D4A]/5 text-navy-950 hover:text-[#B08D4A] transition-all active:scale-90"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Infants row */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-navy-900/40">
                                        <Baby className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-navy-950">{t('guestSelector.infants')}</p>
                                        <p className="text-[10px] text-navy-900/40">{t('guestSelector.under2')}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setInfants(Math.max(0, infants - 1))}
                                        disabled={infants <= 0}
                                        className="w-9 h-9 rounded-full border border-[#E1E6EC] flex items-center justify-center hover:border-[#B08D4A] hover:bg-[#B08D4A]/5 text-navy-950 hover:text-[#B08D4A] transition-all disabled:opacity-20 active:scale-90"
                                    >
                                        <Minus className="h-4 w-4" />
                                    </button>
                                    <span className="w-4 text-center font-bold text-navy-950 text-base">{infants}</span>
                                    <button
                                        type="button"
                                        onClick={() => setInfants(infants + 1)}
                                        className="w-9 h-9 rounded-full border border-[#E1E6EC] flex items-center justify-center hover:border-[#B08D4A] hover:bg-[#B08D4A]/5 text-navy-950 hover:text-[#B08D4A] transition-all active:scale-90"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Footer (Actions) */}
                        <div className="p-2 border-t border-gray-100 flex items-center justify-center bg-white">
                            <button
                                type="button"
                                onClick={() => {
                                    setAdults(1);
                                    setInfants(0);
                                }}
                                className="text-[10px] font-bold text-navy-900/40 hover:text-[#B08D4A] uppercase tracking-[0.2em] transition-all py-1 border-b border-transparent hover:border-[#B08D4A]"
                            >
                                {t('guestSelector.clear')}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
