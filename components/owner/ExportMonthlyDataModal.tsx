"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, FileSpreadsheet, Calendar, ChevronDown, Download, AlertCircle, Check, Loader2 } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { exportPropertyMonthlyData, exportPropertyMonthlyDataRaw } from "@/app/actions/owner-export";
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
    const locale = useLocale();
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const monthOptions = [
        { label: locale === 'en' ? "January" : "Janeiro", value: 1 },
        { label: locale === 'en' ? "February" : "Fevereiro", value: 2 },
        { label: locale === 'en' ? "March" : "Março", value: 3 },
        { label: locale === 'en' ? "April" : "Abril", value: 4 },
        { label: locale === 'en' ? "May" : "Maio", value: 5 },
        { label: locale === 'en' ? "June" : "Junho", value: 6 },
        { label: locale === 'en' ? "July" : "Julho", value: 7 },
        { label: locale === 'en' ? "August" : "Agosto", value: 8 },
        { label: locale === 'en' ? "September" : "Setembro", value: 9 },
        { label: locale === 'en' ? "October" : "Outubro", value: 10 },
        { label: locale === 'en' ? "November" : "Novembro", value: 11 },
        { label: locale === 'en' ? "December" : "Dezembro", value: 12 }
    ].filter(opt => {
        if (year < currentYear) return true;
        return opt.value <= currentMonth;
    });

    const yearOptions = [
        { label: String(currentYear), value: currentYear },
        { label: String(currentYear - 1), value: currentYear - 1 },
        { label: String(currentYear - 2), value: currentYear - 2 }
    ];

    // Ensure selected month is valid for the selected year
    useEffect(() => {
        if (year === currentYear && month > currentMonth) {
            setMonth(currentMonth);
        }
    }, [year, month, currentMonth]);

    const handleDownload = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await exportPropertyMonthlyData(propertyId, month, year, locale);
            
            if (result.success && result.csvContent) {
                // Add UTF-8 BOM for Excel compatibility (0xEF, 0xBB, 0xBF)
                const BOM = new Uint8Array([0xEF, 0xBB, 0xBF]);
                const blob = new Blob([BOM, result.csvContent], { type: 'text/csv;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.setAttribute("href", url);
                link.setAttribute("download", result.filename);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                
                // Cleanup
                setTimeout(() => {
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                }, 100);

                onClose();
            }
        } catch (err) {
            console.error("Download error:", err);
            setError("Ocorreu um erro ao gerar o ficheiro. Tente novamente.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadPDF = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await exportPropertyMonthlyDataRaw(propertyId, month, year, locale);
            
            if (result.success && result.rows) {
                // Dynamic imports to avoid SSR issues if this component was SSR
                const jsPDF = (await import('jspdf')).default;
                const autoTable = (await import('jspdf-autotable')).default;

                const doc = new jsPDF('landscape');
                
                // Helper to load and tint the logo SVG
                const loadLogoBase64 = (): Promise<string | null> => {
                    return new Promise((resolve) => {
                        const img = new window.Image();
                        img.crossOrigin = "Anonymous";
                        img.onload = () => {
                            const canvas = document.createElement("canvas");
                            // The logo is wide, approximate aspect ratio 3:1
                            canvas.width = 300;
                            canvas.height = 100;
                            const ctx = canvas.getContext("2d");
                            if (ctx) {
                                // Apply the navy color filter used in the sidebar
                                ctx.filter = 'brightness(0) saturate(100%) invert(8%) sepia(35%) saturate(1210%) hue-rotate(188deg) brightness(96%) contrast(97%)';
                                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                                resolve(canvas.toDataURL("image/png"));
                            } else {
                                resolve(null);
                            }
                        };
                        img.onerror = () => resolve(null);
                        img.src = "/legacy/home/images/logo.svg";
                    });
                };

                const logoData = await loadLogoBase64();
                
                let currentY = 20;

                if (logoData) {
                    // Add logo only, slightly reduced size
                    doc.addImage(logoData, 'PNG', 14, 14, 48, 16);
                    currentY = 38;
                } else {
                    // Fallback if logo fails to load
                    doc.setTextColor(176, 158, 128); // #B09E80 Copper
                    doc.setFontSize(22);
                    doc.setFont("helvetica", "bold");
                    doc.text("Lovely Memories", 14, 25);
                    currentY = 38;
                }
                
                // Add Property Name
                doc.setTextColor(10, 17, 40); // #0A1128 Navy
                doc.setFontSize(14);
                doc.setFont("helvetica", "bold");
                doc.text(result.propertyName || 'Property Report', 14, currentY);
                
                doc.setFont("helvetica", "normal");
                doc.setFontSize(10);
                doc.setTextColor(100); 
                const monthName = monthOptions.find(o => o.value === month)?.label || month;
                const reportTitleText = locale === 'en' ? `Monthly Report: ${monthName} ${year}` : `Relatório Mensal: ${monthName} ${year}`;
                doc.text(reportTitleText, 14, currentY + 6);
                
                // Calculate Totals
                let totalNights = 0;
                let totalGross = 0;
                let totalCleaning = 0;
                let totalFees = 0;
                let totalNet = 0;

                result.rows.forEach(row => {
                    totalNights += Number(row[7]) || 0;
                    totalGross += Number(row[8]) || 0;
                    totalCleaning += Number(row[9]) || 0;
                    totalFees += Number(row[10]) || 0;
                    totalNet += Number(row[11]) || 0;
                });

                const totalsRow = [
                    "", "", "", "", "", "", 
                    "TOTAL", // Column 6 (Guests index, serves as label)
                    totalNights,
                    totalGross.toFixed(2),
                    totalCleaning.toFixed(2),
                    totalFees.toFixed(2),
                    totalNet.toFixed(2)
                ];

                // Generate table with clean theme (no vertical lines)
                autoTable(doc, {
                    startY: currentY + 12,
                    head: [result.headers],
                    body: result.rows,
                    foot: [totalsRow],
                    theme: 'plain', // Removes all grid lines for a much cleaner look
                    styles: {
                        fontSize: 8,
                        cellPadding: 3, // Reduced from 5 to prevent text wrapping in columns
                        textColor: [40, 40, 40]
                    },
                    headStyles: {
                        fillColor: [10, 17, 40], // #0A1128 Navy
                        textColor: 255,
                        fontStyle: 'bold',
                        halign: 'center'
                    },
                    footStyles: {
                        fillColor: [176, 158, 128], // #B09E80 Copper
                        textColor: 255,
                        fontStyle: 'bold',
                        fontSize: 9, // Slightly smaller than 10 to ensure it fits, but larger than 8
                        halign: 'right'
                    },
                    columnStyles: {
                        0: { halign: 'center' },
                        6: { halign: 'center' }, // Guests
                        7: { halign: 'center' }, // Nights
                        8: { halign: 'right' },  // Gross
                        9: { halign: 'right' },  // Cleaning
                        10: { halign: 'right' }, // Fees
                        11: { halign: 'right' }  // Net
                    },
                    alternateRowStyles: {
                        fillColor: [248, 250, 252] // light slate gray for clean stripes
                    }
                });

                doc.save(result.filename);
                onClose();
            }
        } catch (err) {
            console.error("PDF Download error:", err);
            setError("Ocorreu um erro ao gerar o PDF. Tente novamente.");
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
                                    onClick={handleDownloadPDF}
                                    disabled={isLoading}
                                    className="w-full h-16 bg-white border-2 border-indigo-100 hover:border-indigo-200 text-indigo-500 rounded-2xl text-[12px] font-black uppercase tracking-[0.2em] transition-all transform active:scale-[0.98] flex items-center justify-center gap-3 group"
                                >
                                    {isLoading ? (
                                        <Loader2 className="size-6 animate-spin text-indigo-500" />
                                    ) : (
                                        <>
                                            <Download className="size-6 text-indigo-400 group-hover:translate-y-0.5 transition-transform" />
                                            {t('exportModal.downloadPdf')}
                                        </>
                                    )}
                                </button>

                                <button
                                    onClick={onClose}
                                    disabled={isLoading}
                                    className="w-full h-14 bg-transparent text-gray-400 hover:text-gray-600 rounded-2xl text-[12px] font-bold uppercase tracking-[0.2em] transition-all mt-4"
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
