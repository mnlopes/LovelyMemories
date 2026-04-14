"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, FileSpreadsheet, Calendar, ChevronDown, Download, AlertCircle, Check, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { exportPropertyMonthlyData } from "@/app/actions/owner-export";
import { cn } from "@/lib/utils";

interface ExportMonthlyDataModalProps {
    isOpen: boolean;
    onClose: () => void;
    propertyId: string;
    propertyName: string;
}

interface DropdownProps {
    label: string;
    value: number;
    options: { label: string; value: number }[];
    onChange: (value: number) => void;
}

function CustomDropdown({ label, value, options, onChange }: DropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => opt.value === value);

    return (
        <div className="space-y-2" ref={containerRef}>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">
                {label}
            </label>
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={cn(
                        "w-full h-12 px-4 bg-gray-50 border-none rounded-2xl text-sm font-medium text-[#0A1128] flex items-center justify-between transition-all outline-none",
                        isOpen ? "ring-2 ring-indigo-100 bg-white shadow-sm" : "hover:bg-gray-100"
                    )}
                >
                    <span className="truncate">{selectedOption?.label}</span>
                    <motion.div
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                    </motion.div>
                </button>

                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 4, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                            className="absolute z-50 left-0 right-0 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden max-h-60 overflow-y-auto"
                        >
                            <div className="p-1">
                                {options.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => {
                                            onChange(option.value);
                                            setIsOpen(false);
                                        }}
                                        className={cn(
                                            "w-full px-3 py-2.5 rounded-xl text-left text-sm transition-all flex items-center justify-between group",
                                            value === option.value 
                                                ? "bg-indigo-50 text-indigo-600 font-semibold" 
                                                : "text-gray-600 hover:bg-gray-50 hover:text-[#0A1128]"
                                        )}
                                    >
                                        {option.label}
                                        {value === option.value && (
                                            <Check className="w-4 h-4 text-indigo-400" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

export function ExportMonthlyDataModal({ 
    isOpen, 
    onClose, 
    propertyId, 
    propertyName 
}: ExportMonthlyDataModalProps) {
    const t = useTranslations('OwnerProperties');
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const monthOptions = [
        { label: "Janeiro", value: 1 },
        { label: "Fevereiro", value: 2 },
        { label: "Março", value: 3 },
        { label: "Abril", value: 4 },
        { label: "Maio", value: 5 },
        { label: "Junho", value: 6 },
        { label: "Julho", value: 7 },
        { label: "Agosto", value: 8 },
        { label: "Setembro", value: 9 },
        { label: "Outubro", value: 10 },
        { label: "Novembro", value: 11 },
        { label: "Dezembro", value: 12 }
    ];

    const currentYear = new Date().getFullYear();
    const yearOptions = [
        { label: String(currentYear), value: currentYear },
        { label: String(currentYear - 1), value: currentYear - 1 },
        { label: String(currentYear - 2), value: currentYear - 2 }
    ];

    const handleDownload = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await exportPropertyMonthlyData(propertyId, month, year);
            
            if (result.success && result.csvContent) {
                const blob = new Blob([result.csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.setAttribute("href", url);
                link.setAttribute("download", result.filename);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                onClose();
            }
        } catch (err) {
            console.error("Download error:", err);
            setError("Ocorreu um erro ao gerar o ficheiro. Tente novamente.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence mode="wait">
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-[#0A1128]/40 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-xl bg-white rounded-[40px] shadow-2xl"
                    >
                        {/* Header */}
                        <div className="p-10 pb-6 border-b border-gray-50 bg-white rounded-t-[40px]">
                            <div className="flex items-center justify-between mb-6">
                                <div className="p-4 bg-indigo-50/50 rounded-2xl">
                                    <FileSpreadsheet className="w-7 h-7 text-indigo-400" />
                                </div>
                                <button 
                                    onClick={onClose}
                                    className="p-2 hover:bg-gray-50 rounded-full transition-colors"
                                >
                                    <X className="w-6 h-6 text-gray-400" />
                                </button>
                            </div>
                            <h2 className="text-2xl font-bold text-[#0A1128] font-playfair">
                                {t('exportModal.title')}
                            </h2>
                            <p className="text-base text-gray-400 mt-2 font-light leading-relaxed">
                                {t('exportModal.subtitle')}
                            </p>
                        </div>

                        {/* Content */}
                        <div className="p-10 pt-8 space-y-10">
                            <div className="grid grid-cols-2 gap-8">
                                <CustomDropdown 
                                    label={t('exportModal.month')}
                                    value={month}
                                    options={monthOptions}
                                    onChange={setMonth}
                                />

                                <CustomDropdown 
                                    label={t('exportModal.year')}
                                    value={year}
                                    options={yearOptions}
                                    onChange={setYear}
                                />
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 p-4 bg-red-50 text-red-600 rounded-2xl text-sm animate-in fade-in slide-in-from-top-2">
                                    <AlertCircle className="size-4 shrink-0" />
                                    <p>{error}</p>
                                </div>
                            )}

                            <div className="space-y-4 pb-2">
                                <button
                                    onClick={handleDownload}
                                    disabled={isLoading}
                                    className="w-full h-16 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300 text-white rounded-2xl text-[12px] font-black uppercase tracking-[0.2em] shadow-lg shadow-indigo-100 transition-all transform active:scale-[0.98] flex items-center justify-center gap-3 group"
                                >
                                    {isLoading ? (
                                        <Loader2 className="size-6 animate-spin" />
                                    ) : (
                                        <>
                                            <Download className="size-6 group-hover:translate-y-0.5 transition-transform" />
                                            {t('exportModal.download')}
                                        </>
                                    )}
                                </button>

                                <button
                                    onClick={onClose}
                                    disabled={isLoading}
                                    className="w-full h-14 bg-transparent text-gray-400 hover:text-gray-600 rounded-2xl text-[12px] font-bold uppercase tracking-[0.2em] transition-all"
                                >
                                    {t('exportModal.cancel')}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
