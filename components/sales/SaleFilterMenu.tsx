'use client';

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, X } from 'lucide-react';

export type FilterOption = {
    /** '' is the "no filter" option. */
    value: string;
    label: string;
    sublabel?: string;
    icon?: ReactNode;
};

/**
 * Dropdown in the style of the home booking bar (HomeLocationPopover): a white panel under the
 * field on md+, a sheet from the bottom of the screen on phones. Keyboard: arrows move, Enter or
 * Space picks, Escape closes and returns focus to the field.
 */
export function SaleFilterMenu({
    label,
    valueLabel,
    title,
    options,
    value,
    onChange,
    variant = 'list',
    trigger = 'field',
    align = 'start',
    clearLabel,
    closeLabel,
    className = '',
}: {
    label: string;
    valueLabel: string;
    title: string;
    options: FilterOption[];
    value: string;
    onChange: (value: string) => void;
    variant?: 'list' | 'chips';
    trigger?: 'field' | 'pill';
    align?: 'start' | 'end';
    clearLabel?: string;
    closeLabel: string;
    className?: string;
}) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const listId = useId();
    const titleId = useId();

    const close = useCallback((returnFocus: boolean) => {
        setOpen(false);
        if (returnFocus) triggerRef.current?.focus();
    }, []);

    // Click outside closes; on phones the page behind the sheet stays still.
    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent | TouchEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) close(false);
        };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('touchstart', onDown);
        const isPhone = window.matchMedia('(max-width: 767px)').matches;
        const previous = document.body.style.overflow;
        if (isPhone) document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('touchstart', onDown);
            if (isPhone) document.body.style.overflow = previous;
        };
    }, [open, close]);

    // Opening puts focus on the current choice.
    useEffect(() => {
        if (!open) return;
        const i = Math.max(0, options.findIndex((o) => o.value === value));
        requestAnimationFrame(() => optionRefs.current[i]?.focus());
    }, [open, options, value]);

    const pick = (v: string) => {
        onChange(v);
        close(true);
    };

    const onListKey = (e: KeyboardEvent<HTMLDivElement>) => {
        const items = optionRefs.current.filter(Boolean) as HTMLButtonElement[];
        const at = items.indexOf(document.activeElement as HTMLButtonElement);
        const move = (to: number) => {
            e.preventDefault();
            items[(to + items.length) % items.length]?.focus();
        };
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') move(at + 1);
        else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') move(at - 1);
        else if (e.key === 'Home') move(0);
        else if (e.key === 'End') move(items.length - 1);
        else if (e.key === 'Escape') {
            e.preventDefault();
            close(true);
        } else if (e.key === 'Tab') close(false);
    };

    const onTriggerKey = (e: KeyboardEvent<HTMLButtonElement>) => {
        if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !open) {
            e.preventDefault();
            setOpen(true);
        }
    };

    const triggerProps = {
        ref: triggerRef,
        type: 'button' as const,
        'aria-haspopup': 'listbox' as const,
        'aria-expanded': open,
        'aria-controls': open ? listId : undefined,
        onClick: () => setOpen((o) => !o),
        onKeyDown: onTriggerKey,
    };

    return (
        <div
            ref={rootRef}
            // Focus leaving the menu (Tab, or another field) closes it, so only one is ever open.
            onBlur={(e) => {
                if (open && e.relatedTarget && !rootRef.current?.contains(e.relatedTarget as Node)) close(false);
            }}
            className={`relative ${open ? 'md:z-30' : ''} ${className}`}
        >
            {trigger === 'field' ? (
                <button
                    {...triggerProps}
                    className={`flex w-full min-h-[60px] flex-col justify-center gap-1 rounded-xl px-4 py-2.5 text-left transition-shadow lg:px-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b09e80] ${open ? 'ring-[1.5px] ring-inset ring-[#b09e80]' : 'hover:bg-[#f8f9fa]'}`}
                >
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6b7280]">{label}</span>
                    <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-base font-semibold text-[#192537] md:text-[15px]">{valueLabel}</span>
                        <ChevronDown aria-hidden="true" className={`h-4 w-4 shrink-0 text-[#b09e80] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                    </span>
                </button>
            ) : (
                <button
                    {...triggerProps}
                    aria-label={`${label}: ${valueLabel}`}
                    className={`flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full border bg-white px-4 text-[13px] font-semibold text-[#192537] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b09e80] ${open ? 'border-[#b09e80]' : 'border-[#dfe2e6] hover:border-[#b09e80]'}`}
                >
                    <span className="hidden font-medium text-[#6b7280] sm:inline">{label}:</span>
                    {valueLabel}
                    <ChevronDown aria-hidden="true" className={`h-4 w-4 text-[#b09e80] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                </button>
            )}

            <AnimatePresence>
                {open && (
                    <>
                        <motion.div
                            key="backdrop"
                            aria-hidden="true"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => close(false)}
                            className="fixed inset-0 z-[10000] bg-[#0a1128]/40 md:hidden"
                        />
                        <motion.div
                            key="panel"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 12 }}
                            transition={{ duration: 0.18, ease: 'easeOut' }}
                            className={`fixed inset-x-0 bottom-0 z-[10001] max-h-[80vh] overflow-y-auto rounded-t-3xl bg-white pb-[max(0.75rem,env(safe-area-inset-bottom))] text-[#192537] shadow-[0_-10px_40px_rgba(25,37,55,0.25)] md:absolute md:inset-x-auto md:bottom-auto md:top-full md:z-30 md:mt-3 md:max-h-none md:w-[300px] md:overflow-hidden md:rounded-2xl md:border md:border-gray-100 md:pb-0 md:shadow-[0_18px_40px_rgba(25,37,55,0.18)] ${align === 'end' ? 'md:right-0' : 'md:left-0'}`}
                        >
                            <div aria-hidden="true" className="mx-auto mt-2 h-1 w-10 rounded-full bg-[#e1e6ec] md:hidden" />
                            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3 md:px-4">
                                <h3 id={titleId} className="text-base font-bold md:text-[15px]">{title}</h3>
                                <button
                                    type="button"
                                    onClick={() => close(true)}
                                    aria-label={closeLabel}
                                    className="-mr-2 flex size-11 items-center justify-center rounded-full hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b09e80] md:hidden"
                                >
                                    <X aria-hidden="true" className="h-5 w-5" />
                                </button>
                            </div>

                            <div
                                id={listId}
                                role="listbox"
                                aria-labelledby={titleId}
                                aria-orientation={variant === 'chips' ? 'horizontal' : 'vertical'}
                                onKeyDown={onListKey}
                                className={variant === 'chips' ? 'flex flex-wrap gap-2 px-5 py-4 md:px-4' : 'py-1.5'}
                            >
                                {options.map((o, i) => {
                                    const selected = o.value === value;
                                    return variant === 'chips' ? (
                                        <button
                                            key={o.value || 'any'}
                                            ref={(el) => { optionRefs.current[i] = el; }}
                                            type="button"
                                            role="option"
                                            aria-selected={selected}
                                            onClick={() => pick(o.value)}
                                            className={`flex h-11 min-w-12 items-center justify-center rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b09e80] focus-visible:ring-offset-2 ${selected ? 'border-[#192537] bg-[#192537] text-white' : 'border-[#e1e6ec] hover:border-[#b09e80]'}`}
                                        >
                                            {o.label}
                                        </button>
                                    ) : (
                                        <button
                                            key={o.value || 'any'}
                                            ref={(el) => { optionRefs.current[i] = el; }}
                                            type="button"
                                            role="option"
                                            aria-selected={selected}
                                            onClick={() => pick(o.value)}
                                            className="group flex min-h-12 w-full items-center gap-3 px-5 py-2 text-left transition-colors hover:bg-[#f8f9fa] focus-visible:bg-[#f8f9fa] focus-visible:outline-none md:px-4"
                                        >
                                            {o.icon && (
                                                <span aria-hidden="true" className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#b09e80] transition-colors ${selected ? 'bg-[#b09e80]/15' : 'bg-[#f8f9fa] group-hover:bg-[#b09e80]/10'}`}>
                                                    {o.icon}
                                                </span>
                                            )}
                                            <span className="min-w-0 flex-1">
                                                <span className="block text-[15px] font-semibold leading-tight md:text-sm">{o.label}</span>
                                                {o.sublabel && <span className="mt-0.5 block text-xs font-medium text-[#6b7280]">{o.sublabel}</span>}
                                            </span>
                                            <Check aria-hidden="true" className={`h-4 w-4 shrink-0 text-[#b09e80] ${selected ? 'visible' : 'invisible'}`} />
                                        </button>
                                    );
                                })}
                            </div>

                            {clearLabel && value !== '' && (
                                <div className="flex justify-center border-t border-gray-100 p-1.5">
                                    <button
                                        type="button"
                                        onClick={() => pick('')}
                                        className="min-h-11 px-4 text-[11px] font-bold uppercase tracking-[0.2em] text-[#6b7280] transition-colors hover:text-[#7a6a4d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b09e80] rounded-full"
                                    >
                                        {clearLabel}
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
