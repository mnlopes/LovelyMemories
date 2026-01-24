"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { Plus, Minus } from "lucide-react";

export const GuestSelectorWrapper = () => {
    const [isGuestSelectorOpen, setIsGuestSelectorOpen] = useState(false);
    const [adults, setAdults] = useState(0);
    const [infants, setInfants] = useState(0);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const [mounted, setMounted] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const updatePosition = useCallback(() => {
        // Encontra o seletor legado
        const legacySelector = document.querySelector('.yith-wcbk-people-selector__toggle-handler') as HTMLElement;
        // Encontra o contentor pai relativo (neste caso, o <main className="relative"> da página)
        // Precisamos do elemento pai para calcular o offset relativo
        const parentContainer = document.querySelector('main.relative') as HTMLElement;

        if (legacySelector && parentContainer) {
            const rect = legacySelector.getBoundingClientRect();
            const parentRect = parentContainer.getBoundingClientRect();

            // Calcula a posição relativa ao offset do pai
            // Isto torna o valor independente do scroll da janela!
            // Top = Distância do topo do botão até o topo do pai + Altura do botão + Espalo extra
            setCoords({
                top: (rect.bottom - parentRect.top),
                left: (rect.left - parentRect.left)
            });
        }
    }, []);

    useEffect(() => {
        setMounted(true);
        // Atualizar posição inicial com delay para garantir renderização do legado
        setTimeout(updatePosition, 100);

        const attachSelector = () => {
            const legacySelector = document.querySelector('.yith-wcbk-people-selector__toggle-handler') as HTMLElement;
            if (legacySelector) {
                const handleLegacyClick = (e: MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();

                    // Recalcula antes de abrir
                    updatePosition();
                    setIsGuestSelectorOpen(prev => !prev);
                };
                legacySelector.addEventListener('click', handleLegacyClick, true);

                // Apenas resize é necessário, scroll é automático pelo fluxo do DOM
                window.addEventListener('resize', updatePosition, true);

                return () => {
                    legacySelector.removeEventListener('click', handleLegacyClick, true);
                    window.removeEventListener('resize', updatePosition, true);
                };
            }
        };

        const timer = setTimeout(attachSelector, 500);
        return () => clearTimeout(timer);
    }, [updatePosition]);

    // CLOSE ON CLICK OUTSIDE
    useEffect(() => {
        if (!isGuestSelectorOpen) return;

        const handleClickOutside = (e: MouseEvent) => {
            const legacySelector = document.querySelector('.yith-wcbk-people-selector__toggle-handler');

            if (
                wrapperRef.current &&
                !wrapperRef.current.contains(e.target as Node) &&
                legacySelector &&
                !legacySelector.contains(e.target as Node)
            ) {
                setIsGuestSelectorOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside, true);
        return () => document.removeEventListener('mousedown', handleClickOutside, true);
    }, [isGuestSelectorOpen]);

    const totalGuests = adults + infants;

    useEffect(() => {
        const totalsSpan = document.querySelector('.yith-wcbk-people-selector__totals');
        if (totalsSpan) {
            totalsSpan.textContent = totalGuests > 0 ? `${totalGuests} ${totalGuests === 1 ? 'person' : 'people'}` : 'Select people';
        }
    }, [totalGuests]);

    if (!mounted) return null;

    return (
        <div
            ref={wrapperRef}
            style={{
                position: 'absolute',
                top: `${coords.top + 10}px`,
                left: `${coords.left - 20}px`,
                zIndex: 40,
                display: isGuestSelectorOpen ? 'block' : 'none'
            }}
            className="w-[230px] bg-white shadow-[0_25px_60px_rgba(0,0,0,0.18)] rounded-2xl p-6 border border-gray-100 text-left animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => { e.stopPropagation(); }}
        >
            <div className="space-y-6">
                {/* ADULTS */}
                <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest select-none font-sans">Adults</span>
                    <div className="flex items-center gap-3">
                        <div
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAdults(Math.max(0, adults - 1)); }}
                            className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center hover:border-[#AD9C7E] hover:text-[#AD9C7E] text-gray-300 transition-all cursor-pointer select-none active:scale-90"
                        >
                            <Minus className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-bold w-5 text-center text-navy-950 select-none font-sans tabular-nums leading-none">{adults}</span>
                        <div
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAdults(adults + 1); }}
                            className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center hover:border-[#AD9C7E] hover:text-[#AD9C7E] text-gray-300 transition-all cursor-pointer select-none active:scale-95"
                        >
                            <Plus className="w-4 h-4" />
                        </div>
                    </div>
                </div>

                {/* INFANTS */}
                <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest select-none font-sans">Infants</span>
                    <div className="flex items-center gap-3">
                        <div
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setInfants(Math.max(0, infants - 1)); }}
                            className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center hover:border-[#AD9C7E] hover:text-[#AD9C7E] text-gray-300 transition-all cursor-pointer select-none active:scale-90"
                        >
                            <Minus className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-bold w-5 text-center text-navy-950 select-none font-sans tabular-nums leading-none">{infants}</span>
                        <div
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setInfants(infants + 1); }}
                            className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center hover:border-[#AD9C7E] hover:text-[#AD9C7E] text-gray-300 transition-all cursor-pointer select-none active:scale-95"
                        >
                            <Plus className="w-4 h-4" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-50 flex justify-end">
                <div
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsGuestSelectorOpen(false); }}
                    className="text-[10px] font-black text-[#AD9C7E] hover:text-[#93856b] uppercase tracking-[0.2em] cursor-pointer select-none transition-all font-sans"
                >
                    Confirm
                </div>
            </div>
        </div>
    );
};
