"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Globe, User, Calendar as CalendarIcon, ArrowUpRight } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils";

interface OwnerSyncDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    batchData: {
        batch_id: string;
        reservations: any[];
    } | null;
}

export function OwnerSyncDetailModal({ isOpen, onClose, batchData }: OwnerSyncDetailModalProps) {
    const t = useTranslations('ActivityTypes');
    const locale = useLocale();

    if (!batchData) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-4xl bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        {/* Header */}
                        <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-50/50 rounded-2xl">
                                    <Globe className="w-6 h-6 text-indigo-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-[#0A1128]">{t('airbnbSyncDetails')}</h2>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs font-semibold text-gray-500 group-hover:text-gray-600 transition-colors">
                                            {new Date(batchData.reservations[0].check_in).toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
                                        </span>
                                        <span className="w-1 h-1 rounded-full bg-gray-300" />
                                        <span className="text-xs font-medium text-gray-400">
                                            {batchData.reservations.length} {t('guest')}{batchData.reservations.length !== 1 ? 's' : ''}
                                        </span>
                                        <span className="w-1 h-1 rounded-full bg-gray-300" />
                                        <span className="text-[10px] font-medium text-gray-300 uppercase tracking-tighter">
                                            ID: {batchData.batch_id.slice(0, 8).toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>

                        {/* Table Container */}
                        <div className="flex-1 overflow-auto p-8 custom-scrollbar">
                            <div className="border border-gray-100 rounded-3xl overflow-hidden shadow-sm bg-gray-50/30">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-white border-b border-gray-100">
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('guest')}</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('dates')}</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">{t('gross')}</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">{t('fee')}</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">{t('net')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 bg-white">
                                        {batchData.reservations.map((res: any, idx: number) => (
                                            <tr key={res.id || idx} className="hover:bg-gray-50/50 transition-colors group">
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="size-8 rounded-full bg-gray-100 flex items-center justify-center">
                                                            <User className="w-4 h-4 text-gray-400" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-[#0A1128]">{res.guest_name}</p>
                                                            <p className="text-[10px] font-medium text-gray-400 truncate max-w-[150px]">{res.property_name}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-8">
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('in')}</span>
                                                            <p className="text-xs font-medium text-gray-600">
                                                                {new Date(res.check_in).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('out')}</span>
                                                            <p className="text-xs font-medium text-gray-600">
                                                                {new Date(res.check_out).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <p className="text-sm font-bold text-gray-400">€{Number(res.total_price).toLocaleString()}</p>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <p className="text-sm font-bold text-rose-400/80">-€{Number(res.service_fee).toLocaleString()}</p>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <p className="text-sm font-semibold text-emerald-600/90">€{Number(res.net_amount).toLocaleString()}</p>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-8 bg-gray-50/50 border-t border-gray-100 flex justify-between items-center sticky bottom-0 z-10">
                            <div className="flex gap-8">
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('totalPayout')}</p>
                                    <p className="text-2xl font-bold text-emerald-600/90">
                                        €{batchData.reservations.reduce((sum, r) => sum + (Number(r.net_amount) || 0), 0).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="px-8 py-4 bg-[#0A1128] text-white rounded-2xl font-bold text-sm hover:opacity-90 transition-opacity active:scale-95"
                            >
                                {t('close')}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
