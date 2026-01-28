"use client";

import { useEffect, useState, useRef } from 'react';
import { Plus, Minus } from "lucide-react";
import { useTranslations } from "next-intl";

export const GuestSelectorWrapper = () => {
    const t = useTranslations('GuestSelector');
    const [isGuestSelectorOpen, setIsGuestSelectorOpen] = useState(false);
    const [adults, setAdults] = useState(0);
    const [infants, setInfants] = useState(0);
    const [coords, setCoords] = useState<{ top: number; left: number; placement: 'top' | 'bottom' }>({ top: 0, left: 0, placement: 'bottom' });
    const [mounted, setMounted] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const openRef = useRef(isGuestSelectorOpen);

    useEffect(() => { openRef.current = isGuestSelectorOpen; }, [isGuestSelectorOpen]);

    useEffect(() => {
        setMounted(true);

        const handleGlobalClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;

            // 1. Check if click is inside the Selector Dropdown (Wrapper) -> Do nothing
            if (wrapperRef.current && wrapperRef.current.contains(target as Node)) {
                return;
            }

            // 2. Check if click is on the Toggle Button (Delegation)
            const toggleBtn = target.closest('.yith-wcbk-people-selector__toggle-handler') as HTMLElement;

            if (toggleBtn) {
                // Click on Toggle
                e.preventDefault();
                e.stopPropagation();

                // Calculate position based on THIS specific toggle button
                const parentContainer = document.querySelector('main.relative') as HTMLElement;
                if (toggleBtn && parentContainer) {
                    const rect = toggleBtn.getBoundingClientRect();
                    const parentRect = parentContainer.getBoundingClientRect();
                    const windowHeight = window.innerHeight;
                    const spaceBelow = windowHeight - rect.bottom;
                    const spaceAbove = rect.top;

                    // Preference: Bottom unless tight
                    const placement = (spaceBelow < 350 && spaceAbove > 350) ? 'top' : 'bottom';

                    setCoords({
                        top: placement === 'bottom' ? (rect.bottom - parentRect.top) : (rect.top - parentRect.top),
                        left: (rect.left - parentRect.left),
                        placement
                    });
                }

                setIsGuestSelectorOpen(prev => !prev);
                return;
            }

            // 3. Click elsewhere -> Close if open (using Ref to avoid dep cycle)
            if (openRef.current) {
                setIsGuestSelectorOpen(false);
            }
        };

        // Use capture to ensure we handle it
        document.addEventListener('click', handleGlobalClick, true);

        return () => {
            document.removeEventListener('click', handleGlobalClick, true);
        };
    }, []);

    const totalGuests = adults + infants;

    useEffect(() => {
        const totalsSpans = document.querySelectorAll('.yith-wcbk-people-selector__totals');
        totalsSpans.forEach(totalsSpan => {
            // Need a reference to translations in a way that respects the current logic
            // Since we're manipulating DOM directly (legacy sync), we just use the t hook values
            const label = totalGuests > 0
                ? `${totalGuests} ${totalGuests === 1 ? t('person') : t('people')}`
                : t('people'); // Or just keep the placeholder logic from BookingBar/Mobile

            // Actually, the placeholder should probably be "Select people" if 0
            // but let's stick to what's consistent. 
            // The BookingBar has its own "Select people" translation.
            // Let's just update the count correctly.
            if (totalGuests > 0) {
                totalsSpan.textContent = `${totalGuests} ${totalGuests === 1 ? t('person') : t('people')}`;
            }
        });
    }, [totalGuests, t]);

    if (!mounted) return null;

    return (
        <div
            ref={wrapperRef}
            style={{
                position: 'absolute',
                top: `${coords.top + (coords.placement === 'bottom' ? 10 : -10)}px`,
                left: `${coords.left - 20}px`,
                zIndex: 40,
                display: isGuestSelectorOpen ? 'block' : 'none',
                transform: coords.placement === 'top' ? 'translateY(-100%)' : 'none'
            }}
            className="w-[230px] bg-white shadow-[0_25px_60px_rgba(0,0,0,0.18)] rounded-2xl p-6 border border-gray-100 text-left animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => { e.stopPropagation(); }}
        >
            <div className="space-y-6">
                {/* ADULTS */}
                <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest select-none font-sans">{t('adults')}</span>
                    <div className="flex items-center gap-3">
                        <div
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAdults(Math.max(0, adults - 1)); }}
                            className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center hover:border-[#B09E80] hover:text-[#B09E80] text-gray-300 transition-all cursor-pointer select-none active:scale-90"
                        >
                            <Minus className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-bold w-5 text-center text-navy-950 select-none font-sans tabular-nums leading-none">{adults}</span>
                        <div
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAdults(adults + 1); }}
                            className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center hover:border-[#B09E80] hover:text-[#B09E80] text-gray-300 transition-all cursor-pointer select-none active:scale-95"
                        >
                            <Plus className="w-4 h-4" />
                        </div>
                    </div>
                </div>

                {/* INFANTS */}
                <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest select-none font-sans">{t('infants')}</span>
                    <div className="flex items-center gap-3">
                        <div
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setInfants(Math.max(0, infants - 1)); }}
                            className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center hover:border-[#B09E80] hover:text-[#B09E80] text-gray-300 transition-all cursor-pointer select-none active:scale-90"
                        >
                            <Minus className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-bold w-5 text-center text-navy-950 select-none font-sans tabular-nums leading-none">{infants}</span>
                        <div
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setInfants(infants + 1); }}
                            className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center hover:border-[#B09E80] hover:text-[#B09E80] text-gray-300 transition-all cursor-pointer select-none active:scale-95"
                        >
                            <Plus className="w-4 h-4" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-center items-center mt-6 pt-4 border-t border-gray-100">
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setAdults(0);
                        setInfants(0);
                    }}
                    className="text-[10px] font-bold text-gray-300 hover:text-[#B09E80] transition-colors uppercase tracking-widest py-0.5"
                >
                    {t('clear')}
                </button>
            </div>
        </div>
    );
};
