"use client";
import React, { useEffect, useRef } from "react";
import { X, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";

interface HomeLocationPopoverProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (location: string) => void;
    placement?: 'bottom-start' | 'top-start' | 'bottom-center' | 'top-center';
}

export const HomeLocationPopover = ({
    isOpen,
    onClose,
    onSelect,
    placement = 'bottom-start'
}: HomeLocationPopoverProps) => {
    const t = useTranslations('BookingBar');
    const popoverRef = useRef<HTMLDivElement>(null);

    // Click outside listener
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
            case 'bottom-start':
                return "lg:left-0 lg:top-full lg:mt-4";
            case 'top-start':
                return "lg:left-0 lg:bottom-full lg:mb-4";
            case 'bottom-center':
                return "lg:left-1/2 lg:-translate-x-1/2 lg:top-full lg:mt-4";
            case 'top-center':
                return "lg:left-1/2 lg:-translate-x-1/2 lg:bottom-full lg:mb-4";
            default:
                return "lg:left-0 lg:top-full lg:mt-4";
        }
    };

    const locations = [
        { name: "Porto", region: "North" },
        { name: "Lisboa", region: "Center" },
        { name: "Algarve", region: "South" }
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop (Mobile only) */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[100] bg-navy-950/20 backdrop-blur-[2px] lg:hidden"
                    />

                    <motion.div
                        ref={popoverRef}
                        initial={{ opacity: 0, scale: 0.95, y: placement?.startsWith('top') ? 10 : -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: placement?.startsWith('top') ? 10 : -10 }}
                        className={`fixed lg:absolute inset-x-4 lg:inset-x-0 bottom-24 lg:bottom-auto lg:top-auto z-[110] bg-white rounded-2xl shadow-xl w-auto lg:w-[320px] mx-auto lg:mx-0 overflow-hidden border border-gray-100 ${getPositionClasses()}`}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between py-3 px-4 border-b border-gray-100 bg-white">
                            <h3 className="text-lg font-bold text-navy-950 font-montserrat">
                                {t('destinationLabel') || 'Destination'}
                            </h3>
                            <button
                                type="button"
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors lg:hidden"
                            >
                                <X className="h-5 w-5 text-navy-950" />
                            </button>
                        </div>

                        {/* Location List */}
                        <div className="py-2 bg-white">
                            {locations.map((loc) => (
                                <button
                                    type="button"
                                    key={loc.name}
                                    onClick={() => {
                                        onSelect(loc.name);
                                        onClose();
                                    }}
                                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group"
                                >
                                    <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-[#b09e80] group-hover:bg-[#b09e80]/10 transition-colors">
                                        <MapPin className="h-5 w-5" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-navy-950 text-base leading-tight">
                                            {loc.name}
                                        </p>
                                        <p className="text-xs text-navy-900/40 font-medium">
                                            Portugal
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Footer (Actions) */}
                        <div className="p-2 border-t border-gray-100 flex items-center justify-center bg-white">
                            <button
                                type="button"
                                onClick={() => onSelect('')}
                                className="text-[10px] font-bold text-navy-900/40 hover:text-[#b09e80] uppercase tracking-[0.2em] transition-all py-1 border-b border-transparent hover:border-[#b09e80]"
                            >
                                {t('clearLocation') || 'CLEAR DESTINATION'}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
