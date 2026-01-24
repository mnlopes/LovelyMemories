"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { format } from "date-fns";
import { CustomCalendar } from "@/components/CustomCalendar";

export const DateSelectorWrapper = () => {
    const [openInput, setOpenInput] = useState<'arrival' | 'departure' | null>(null);
    const [arrivalDate, setArrivalDate] = useState<Date | undefined>();
    const [departureDate, setDepartureDate] = useState<Date | undefined>();
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [mounted, setMounted] = useState(false);

    // Função para atualizar inputs legados
    const updateLegacyInput = (type: 'arrival' | 'departure', date: Date | undefined) => {
        // Usa classes estáveis em vez de IDs dinâmicos
        const selector = type === 'arrival'
            ? '.yith-wcbk-booking-start-date'
            : '.yith-wcbk-booking-end-date';

        // Input principal (hidden value or text)
        const input = document.querySelector(selector) as HTMLInputElement;
        // O formatted input geralmente tem a mesma classe + '--formatted' no ID ou é um sibling.
        // Verificando HTML: id="...-formatted" class="...yith-wcbk-date-picker--formatted..."
        // Vamos tentar encontrar o formatted pelo ID do input se possível, ou procurar pela classe formatted adjacente

        let formattedInput: HTMLInputElement | null = null;
        if (input && input.id) {
            formattedInput = document.getElementById(`${input.id}--formatted`) as HTMLInputElement;
        }

        if (input && date) {
            // O plugin YITH parece usar dd.mm.yy por defeito ou dd/mm/yyyy
            // Vamos usar dd.mm.yyyy para match com screenshot e tentar garantir compatibilidade
            const val = format(date, 'dd.MM.yyyy');
            input.value = val;

            // Disparar eventos para garantir que o YITH/WooCommerce detetam a mudança
            input.dispatchEvent(new Event('change', { bubbles: true }));
            input.dispatchEvent(new Event('input', { bubbles: true }));

            if (formattedInput) {
                formattedInput.value = val;
            }
        } else if (input && !date) {
            input.value = '';
            input.dispatchEvent(new Event('change', { bubbles: true }));
            if (formattedInput) formattedInput.value = '';
        }
    };

    const updatePosition = useCallback((target: HTMLElement) => {
        const parentContainer = document.querySelector('main.relative') as HTMLElement;
        if (target && parentContainer) {
            const rect = target.getBoundingClientRect();
            const parentRect = parentContainer.getBoundingClientRect();

            setCoords({
                top: (rect.bottom - parentRect.top),
                left: (rect.left - parentRect.left)
            });
        }
    }, []);

    useEffect(() => {
        setMounted(true);

        // Attach listeners to legacy inputs
        const attachListeners = () => {
            // Seletores genéricos mais robustos
            const arrivalInputs = document.querySelectorAll('.yith-wcbk-booking-start-date');
            const departureInputs = document.querySelectorAll('.yith-wcbk-booking-end-date');

            // Precisamos garantir que estamos a pegar nos inputs visíveis da home (não do sidebar se houver)
            // Normalmente o primeiro é o da Hero.
            const arrivalInput = arrivalInputs[0] as HTMLElement;
            const departureInput = departureInputs[0] as HTMLElement;

            if (arrivalInput) {
                console.log("DateSelectorWrapper: Attaching to Arrival Input", arrivalInput);
                const handleClick = (e: Event) => {
                    e.preventDefault();
                    e.stopPropagation(); // Importante para parar o jQuery UI

                    updatePosition(arrivalInput);
                    setOpenInput('arrival');

                    // Força bruta para fechar o datepicker do jQuery se ele aparecer
                    const jqueryDatePicker = document.getElementById('ui-datepicker-div');
                    if (jqueryDatePicker) jqueryDatePicker.style.display = 'none';
                };

                // Adicionar listener no parent wrapper também, caso o input esteja coberto
                const parent = arrivalInput.parentElement;

                arrivalInput.addEventListener('click', handleClick, true);
                arrivalInput.addEventListener('mousedown', handleClick, true); // Mousedown dispara antes do click
                arrivalInput.addEventListener('focus', handleClick, true);

                if (parent) {
                    parent.addEventListener('click', handleClick, true);
                }

                (arrivalInput as any)._reactCleanup = () => {
                    arrivalInput.removeEventListener('click', handleClick, true);
                    arrivalInput.removeEventListener('mousedown', handleClick, true);
                    arrivalInput.removeEventListener('focus', handleClick, true);
                    if (parent) parent.removeEventListener('click', handleClick, true);
                };
            }

            if (departureInput) {
                console.log("DateSelectorWrapper: Attaching to Departure Input", departureInput);
                const handleClick = (e: Event) => {
                    e.preventDefault();
                    e.stopPropagation();
                    updatePosition(departureInput);
                    setOpenInput('departure');

                    const jqueryDatePicker = document.getElementById('ui-datepicker-div');
                    if (jqueryDatePicker) jqueryDatePicker.style.display = 'none';
                };

                const parent = departureInput.parentElement;

                departureInput.addEventListener('click', handleClick, true);
                departureInput.addEventListener('mousedown', handleClick, true);
                departureInput.addEventListener('focus', handleClick, true);

                if (parent) {
                    parent.addEventListener('click', handleClick, true);
                }

                (departureInput as any)._reactCleanup = () => {
                    departureInput.removeEventListener('click', handleClick, true);
                    departureInput.removeEventListener('mousedown', handleClick, true);
                    departureInput.removeEventListener('focus', handleClick, true);
                    if (parent) parent.removeEventListener('click', handleClick, true);
                };
            }
        };

        const timer = setTimeout(attachListeners, 1000); // Aumentado para 1s para garantir

        // Global style override para esconder o datepicker do jQuery UI
        const style = document.createElement('style');
        style.innerHTML = `
            #ui-datepicker-div { display: none !important; }
            .yith-wcbk-date-picker-wrapper .yith-icon { pointer-events: none; }
        `;
        document.head.appendChild(style);

        return () => {
            clearTimeout(timer);
            // Cleanup melhorado
            const arrivalInputs = document.querySelectorAll('.yith-wcbk-booking-start-date');
            const departureInputs = document.querySelectorAll('.yith-wcbk-booking-end-date');

            if (arrivalInputs[0] && (arrivalInputs[0] as any)._reactCleanup) (arrivalInputs[0] as any)._reactCleanup();
            if (departureInputs[0] && (departureInputs[0] as any)._reactCleanup) (departureInputs[0] as any)._reactCleanup();

            if (document.head.contains(style)) document.head.removeChild(style);
        };
    }, [updatePosition]);

    // Close on click outside
    useEffect(() => {
        if (!openInput) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                // Ignore clicks on legacy inputs themselves (let their listener handle it)
                // Precisamos atualizar esta check também para usar classes
                if ((e.target as Element).closest('.yith-wcbk-booking-start-date') ||
                    (e.target as Element).closest('.yith-wcbk-booking-end-date')) {
                    return;
                }

                setOpenInput(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside, true); // Capture phase para apanhar antes
        return () => document.removeEventListener('mousedown', handleClickOutside, true);
    }, [openInput]);


    const handleDateSelect = (date: Date | undefined) => {
        if (openInput === 'arrival') {
            setArrivalDate(date);
            updateLegacyInput('arrival', date);
        } else if (openInput === 'departure') {
            setDepartureDate(date);
            updateLegacyInput('departure', date);
        }
    };

    if (!mounted || !openInput) return null;

    return (
        <div
            ref={wrapperRef}
            style={{
                position: 'absolute',
                top: `${coords.top + 10}px`,
                left: `${coords.left}px`,
                zIndex: 40
            }}
            className="bg-white shadow-[0_10px_40px_rgba(0,0,0,0.15)] rounded-xl p-3 border border-gray-100 animate-in fade-in zoom-in-95 duration-200 min-w-[280px]"
            onMouseDown={(e) => e.stopPropagation()}
        >
            <CustomCalendar
                value={openInput === 'arrival' ? arrivalDate : departureDate}
                onChange={(val) => {
                    handleDateSelect(val);
                }}
                minDate={openInput === 'departure' && arrivalDate ? arrivalDate : new Date()}
            />

            <div className="flex justify-center items-center mt-2 pt-2 border-t border-gray-100">
                <button
                    onClick={() => {
                        handleDateSelect(undefined);
                    }}
                    className="text-[10px] font-bold text-gray-300 hover:text-[#C5A059] transition-colors uppercase tracking-widest py-0.5"
                >
                    Clear
                </button>
            </div>
        </div>
    );
};
