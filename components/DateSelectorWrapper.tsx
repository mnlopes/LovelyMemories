"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { format } from "date-fns";
import { CustomCalendar } from "@/components/CustomCalendar";
import { useTranslations } from "next-intl";

export const DateSelectorWrapper = () => {
    const t = useTranslations('GuestSelector');
    const [openInput, setOpenInput] = useState<'arrival' | 'departure' | null>(null);
    const [arrivalDate, setArrivalDate] = useState<Date | undefined>();
    const [departureDate, setDepartureDate] = useState<Date | undefined>();
    const [coords, setCoords] = useState<{ top: number; left: number; placement: 'top' | 'bottom' }>({ top: 0, left: 0, placement: 'bottom' });
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [mounted, setMounted] = useState(false);

    // Função para atualizar inputs legados
    const updateLegacyInput = (type: 'arrival' | 'departure', date: Date | undefined) => {
        // Usa classes estáveis em vez de IDs dinâmicos
        const selector = type === 'arrival'
            ? '.yith-wcbk-booking-start-date'
            : '.yith-wcbk-booking-end-date';

        const inputs = document.querySelectorAll(selector);

        inputs.forEach((inputElement) => {
            const input = inputElement as HTMLInputElement;

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
        });
    };

    const updatePosition = useCallback((target: HTMLElement) => {
        const parentContainer = document.querySelector('main.relative') as HTMLElement;
        if (target && parentContainer) {
            const rect = target.getBoundingClientRect();
            const parentRect = parentContainer.getBoundingClientRect();
            const windowHeight = window.innerHeight;
            const spaceBelow = windowHeight - rect.bottom;
            const spaceAbove = rect.top;

            // Auto-flip if less than 420px below and we have space above
            const placement = (spaceBelow < 420 && spaceAbove > 420) ? 'top' : 'bottom';

            setCoords({
                top: placement === 'bottom' ? (rect.bottom - parentRect.top) : (rect.top - parentRect.top),
                left: (rect.left - parentRect.left),
                placement
            });
        }
    }, []);

    useEffect(() => {
        setMounted(true);

        // Attach listeners to legacy inputs
        const attachListeners = () => {
            const arrivalInputs = document.querySelectorAll('.yith-wcbk-booking-start-date');
            const departureInputs = document.querySelectorAll('.yith-wcbk-booking-end-date');

            if (arrivalInputs.length === 0 && departureInputs.length === 0) return false;

            arrivalInputs.forEach((arrivalInput) => {
                const htmlArrivalInput = arrivalInput as HTMLElement;
                if ((htmlArrivalInput as any)._listenerAttached) return;

                const handleClick = (e: Event) => {
                    e.preventDefault();
                    e.stopPropagation();
                    updatePosition(htmlArrivalInput);
                    setOpenInput('arrival');
                    const jqueryDatePicker = document.getElementById('ui-datepicker-div');
                    if (jqueryDatePicker) jqueryDatePicker.style.display = 'none';
                };

                htmlArrivalInput.addEventListener('click', handleClick, true);
                htmlArrivalInput.addEventListener('mousedown', handleClick, true);
                htmlArrivalInput.addEventListener('focus', handleClick, true);

                const parent = htmlArrivalInput.parentElement;
                if (parent) parent.addEventListener('click', handleClick, true);

                (htmlArrivalInput as any)._listenerAttached = true;
                (htmlArrivalInput as any)._reactCleanup = () => {
                    htmlArrivalInput.removeEventListener('click', handleClick, true);
                    htmlArrivalInput.removeEventListener('mousedown', handleClick, true);
                    htmlArrivalInput.removeEventListener('focus', handleClick, true);
                    if (parent) parent.removeEventListener('click', handleClick, true);
                };
            });

            departureInputs.forEach((departureInput) => {
                const htmlDepartureInput = departureInput as HTMLElement;
                if ((htmlDepartureInput as any)._listenerAttached) return;

                const handleClick = (e: Event) => {
                    e.preventDefault();
                    e.stopPropagation();
                    updatePosition(htmlDepartureInput);
                    setOpenInput('departure');
                    const jqueryDatePicker = document.getElementById('ui-datepicker-div');
                    if (jqueryDatePicker) jqueryDatePicker.style.display = 'none';
                };

                htmlDepartureInput.addEventListener('click', handleClick, true);
                htmlDepartureInput.addEventListener('mousedown', handleClick, true);
                htmlDepartureInput.addEventListener('focus', handleClick, true);

                const parent = htmlDepartureInput.parentElement;
                if (parent) parent.addEventListener('click', handleClick, true);

                (htmlDepartureInput as any)._listenerAttached = true;
                (htmlDepartureInput as any)._reactCleanup = () => {
                    htmlDepartureInput.removeEventListener('click', handleClick, true);
                    htmlDepartureInput.removeEventListener('mousedown', handleClick, true);
                    htmlDepartureInput.removeEventListener('focus', handleClick, true);
                    if (parent) parent.removeEventListener('click', handleClick, true);
                };
            });

            return true;
        };

        const attached = attachListeners();
        let interval: any = null;
        if (!attached) {
            interval = setInterval(() => {
                if (attachListeners()) clearInterval(interval);
            }, 500);
        }

        // Global style override para esconder o datepicker do jQuery UI
        const style = document.createElement('style');
        style.innerHTML = `
            #ui-datepicker-div { display: none !important; }
            .yith-wcbk-date-picker-wrapper .yith-icon { pointer-events: none; }
        `;
        document.head.appendChild(style);

        return () => {
            if (interval) clearInterval(interval);
            // Cleanup melhorado
            const arrivalInputs = document.querySelectorAll('.yith-wcbk-booking-start-date');
            const departureInputs = document.querySelectorAll('.yith-wcbk-booking-end-date');

            arrivalInputs.forEach(el => { if ((el as any)._reactCleanup) (el as any)._reactCleanup(); });
            departureInputs.forEach(el => { if ((el as any)._reactCleanup) (el as any)._reactCleanup(); });

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

            // Se a nova data de chegada for posterior ou igual à partida atual, limpa a partida
            if (date && departureDate && date >= departureDate) {
                setDepartureDate(undefined);
                updateLegacyInput('departure', undefined);
            }
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
                top: `${coords.top + (coords.placement === 'bottom' ? 10 : -10)}px`,
                left: `${coords.left}px`,
                zIndex: 100,
                transform: coords.placement === 'top' ? 'translateY(-100%)' : 'none'
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
                    className="text-[10px] font-bold text-gray-300 hover:text-[#B09E80] transition-colors uppercase tracking-widest py-0.5"
                >
                    {t('clear')}
                </button>
            </div>
        </div>
    );
};
