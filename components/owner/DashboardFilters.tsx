"use client";

import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { Building2, Calendar, ChevronDown, Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";

interface Property {
    id: string;
    title: { [key: string]: string } | string;
    slug: string;
}

interface DashboardFiltersProps {
    properties: Property[];
    locale: string;
}

export const DashboardFilters = ({ properties, locale }: DashboardFiltersProps) => {
    const t = useTranslations('OwnerDashboard.Filters');
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [openDropdown, setOpenDropdown] = useState<'property' | 'year' | 'month' | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Current filter values from URL
    const currentProperty = searchParams.get('property') || 'all';
    const currentYear = searchParams.get('year') || new Date().getFullYear().toString();
    const currentMonth = searchParams.get('month') || 'all';

    const selectedProperty = properties.find(p => p.id === currentProperty);
    const propertyLabel = selectedProperty 
        ? (typeof selectedProperty.title === 'string' ? selectedProperty.title : selectedProperty.title[locale] || selectedProperty.title['en'])
        : t('allProperties');

    // Close dropdowns on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpenDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const updateFilter = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value === 'all' || !value) {
            params.delete(key);
        } else {
            params.set(key, value);
        }
        // Reset page when filtering
        params.delete('page');
        
        router.replace(`${pathname}?${params.toString()}`);
        setOpenDropdown(null);
    };

    const clearFilters = () => {
        router.replace(pathname);
        setOpenDropdown(null);
    };

    const years = [2026, 2025, 2024];
    const months = Array.from({ length: 12 }, (_, i) => i + 1);

    return (
        <div className="flex flex-wrap items-center gap-3 mb-6" ref={dropdownRef}>
            {/* Property Filter */}
            <div className="relative">
                <button
                    onClick={() => setOpenDropdown(openDropdown === 'property' ? null : 'property')}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all border",
                        currentProperty !== 'all' 
                            ? "bg-blue-50 border-blue-100 text-blue-700" 
                            : "bg-white border-gray-100 text-[#0A1128] hover:border-gray-200"
                    )}
                >
                    <Building2 className="size-4 opacity-60" />
                    <span className="max-w-[150px] truncate">{propertyLabel}</span>
                    <ChevronDown className={cn("size-3.5 transition-transform", openDropdown === 'property' && "rotate-180")} />
                </button>

                <AnimatePresence>
                    {openDropdown === 'property' && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute top-full left-0 mt-2 w-[240px] bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-50 overflow-hidden"
                        >
                            <button
                                onClick={() => updateFilter('property', 'all')}
                                className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                            >
                                {t('allProperties')}
                            </button>
                            {properties.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => updateFilter('property', p.id)}
                                    className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors truncate"
                                >
                                    {typeof p.title === 'string' ? p.title : p.title[locale] || p.title['en']}
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Year Filter */}
            <div className="relative">
                <button
                    onClick={() => setOpenDropdown(openDropdown === 'year' ? null : 'year')}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-gray-100 text-[#0A1128] text-sm font-bold hover:border-gray-200 transition-all"
                >
                    <Calendar className="size-4 opacity-60" />
                    {currentYear}
                    <ChevronDown className={cn("size-3.5 transition-transform", openDropdown === 'year' && "rotate-180")} />
                </button>

                <AnimatePresence>
                    {openDropdown === 'year' && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute top-full left-0 mt-2 w-[120px] bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-50"
                        >
                            {years.map(y => (
                                <button
                                    key={y}
                                    onClick={() => updateFilter('year', y.toString())}
                                    className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                                >
                                    {y}
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Month Filter */}
            <div className="relative min-w-[180px]">
                <button
                    onClick={() => setOpenDropdown(openDropdown === 'month' ? null : 'month')}
                    className={cn(
                        "w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all border",
                        currentMonth !== 'all' 
                            ? "bg-blue-50 border-blue-100 text-blue-700" 
                            : "bg-white border-gray-100 text-[#0A1128] hover:border-gray-200"
                    )}
                >
                    <div className="flex items-center gap-2">
                        <Filter className="size-4 opacity-60" />
                        <span className="capitalize">
                            {currentMonth === 'all' ? t('allMonths') : new Date(2000, parseInt(currentMonth) - 1).toLocaleString(locale === 'pt' ? 'pt-PT' : 'en-US', { month: 'long' })}
                        </span>
                    </div>
                    <ChevronDown className={cn("size-3.5 transition-transform", openDropdown === 'month' && "rotate-180")} />
                </button>

                <AnimatePresence>
                    {openDropdown === 'month' && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute top-full left-0 mt-2 w-full max-h-[300px] overflow-y-auto bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-50 custom-scrollbar"
                        >
                            <button
                                onClick={() => updateFilter('month', 'all')}
                                className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                            >
                                {t('allMonths')}
                            </button>
                            {months.map(m => (
                                <button
                                    key={m}
                                    onClick={() => updateFilter('month', m.toString())}
                                    className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors capitalize"
                                >
                                    {new Date(2000, m - 1).toLocaleString(locale === 'pt' ? 'pt-PT' : 'en-US', { month: 'long' })}
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Clear Filters */}
            {(currentProperty !== 'all' || currentMonth !== 'all') && (
                <button
                    onClick={clearFilters}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                >
                    <X className="size-3.5" />
                    {t('clearFilters')}
                </button>
            )}
        </div>
    );
};
