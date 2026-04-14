'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Option {
    label: string;
    value: string;
}

interface HistoryDropdownProps {
    options: Option[];
    value: string;
    onSelect: (value: string) => void;
    placeholder: string;
    className?: string;
}

export function HistoryDropdown({ options, value, onSelect, placeholder, className }: HistoryDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Find current label
    const selectedOption = options.find(opt => opt.value === value);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={containerRef} className={cn("relative", className)}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center justify-between gap-2 px-3 py-1.5 bg-white dark:bg-admin-dark-bg border rounded-lg transition-all duration-200 text-sm font-medium text-left",
                    isOpen 
                        ? "border-admin-accent ring-2 ring-admin-accent/5" 
                        : "border-[#f5f5f5] dark:border-admin-dark-border hover:border-admin-accent/50",
                    !selectedOption && "text-[#a3a3a3]"
                )}
            >
                <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
                <ChevronDown className={cn("shrink-0 size-4 text-[#a3a3a3] transition-transform duration-200", isOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-50 mt-2 bg-white dark:bg-admin-dark-surface border border-[#f5f5f5] dark:border-admin-dark-border rounded-xl shadow-xl overflow-hidden min-w-[150px]"
                    >
                        <div className="max-h-64 overflow-y-auto p-1 custom-scrollbar">
                            <button
                                type="button"
                                onClick={() => {
                                    onSelect("");
                                    setIsOpen(false);
                                }}
                                className={cn(
                                    "flex items-center justify-between w-full px-3 py-2 text-sm rounded-lg transition-colors text-left",
                                    value === "" 
                                        ? "bg-admin-accent/10 text-admin-accent font-medium" 
                                        : "text-[#404040] dark:text-admin-dark-text-secondary hover:bg-[#f5f5f5] dark:hover:bg-white/5"
                                )}
                            >
                                <span>{placeholder}</span>
                                {value === "" && <Check className="size-4 shrink-0" />}
                            </button>

                            {options.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => {
                                        onSelect(opt.value);
                                        setIsOpen(false);
                                    }}
                                    className={cn(
                                        "flex items-center justify-between w-full px-3 py-2 text-sm rounded-lg transition-colors text-left",
                                        value === opt.value 
                                            ? "bg-admin-accent/10 text-admin-accent font-medium" 
                                            : "text-[#404040] dark:text-admin-dark-text-secondary hover:bg-[#f5f5f5] dark:hover:bg-white/5"
                                    )}
                                >
                                    <span>{opt.label}</span>
                                    {value === opt.value && <Check className="size-4 shrink-0" />}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
