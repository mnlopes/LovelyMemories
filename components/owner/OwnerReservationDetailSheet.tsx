"use client";

import { X, Calendar, Home, CreditCard, Receipt, FileText, Globe } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";

interface OwnerReservationDetailSheetProps {
    activity: any | null;
    onClose: () => void;
}

export function OwnerReservationDetailSheet({ activity, onClose }: OwnerReservationDetailSheetProps) {
    const t = useTranslations('RecentActivity');
    const params = useParams();
    const locale = (params?.locale as string) || 'en';

    if (!activity || activity.type !== 'booking') return null;

    const metadata = activity.metadata || {};
    const isAirbnb = !!metadata.is_airbnb;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat(locale === 'pt' ? 'pt-PT' : 'en-US', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount);
    };

    return (
        <AnimatePresence>
            {activity && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100]"
                    />
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-[101] flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {isAirbnb && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-rose-50 text-rose-600 border border-rose-100 flex items-center gap-1">
                                        <Globe className="size-3" />
                                        AIRBNB
                                    </span>
                                )}
                                <h3 className="text-lg font-bold text-[#0A1128]">
                                    {activity.subtitle.split(' · ')[0]}
                                </h3>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-colors"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            {/* Trip Info Card */}
                            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                        <Home className="size-4" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{t('stay')}</p>
                                        <p className="text-sm font-bold text-[#0A1128]">
                                            {activity.subtitle.split(' · ')[1]}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                        <Calendar className="size-4" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">REGISTO</p>
                                        <p className="text-sm font-bold text-[#0A1128]">{activity.date}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Financial Breakdown */}
                            <section className="space-y-4">
                                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    <CreditCard className="size-3" />
                                    DETALHE FINANCEIRO
                                </div>
                                
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">{t('stay')} (Gross)</span>
                                        <span className="font-bold text-[#0A1128]">{formatCurrency(metadata.gross_amount || 0)}</span>
                                    </div>

                                    {isAirbnb && (
                                        <>
                                            <div className="flex justify-between items-center text-xs pl-4 border-l-2 border-gray-100">
                                                <span className="text-gray-400">Base Price</span>
                                                <span className="font-medium text-gray-600">{formatCurrency(metadata.base_price || 0)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs pl-4 border-l-2 border-gray-100">
                                                <span className="text-gray-400">{t('cleaning')}</span>
                                                <span className="font-medium text-gray-600">{formatCurrency(metadata.cleaning_fee || 0)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm text-rose-600 bg-rose-50/50 p-2 rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    <Receipt className="size-4 opacity-50" />
                                                    <span className="font-medium">{t('fees')}</span>
                                                </div>
                                                <span className="font-bold">-{formatCurrency(metadata.service_fee || 0)}</span>
                                            </div>
                                        </>
                                    )}

                                    <div className="pt-4 border-t border-gray-100 mt-4">
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">{t('net')}</p>
                                                <p className="text-xs text-gray-400">Total Payout</p>
                                            </div>
                                            <p className="text-3xl font-black text-emerald-600">
                                                {formatCurrency(metadata.net_amount || metadata.gross_amount || 0)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100/50 flex gap-3">
                                <FileText className="size-5 text-amber-600 shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-800 leading-relaxed">
                                    Os valores apresentados são baseados nos dados fornecidos pelo Airbnb no momento da sincronização.
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-gray-100">
                            <button
                                onClick={onClose}
                                className="w-full py-4 bg-[#0A1128] text-white rounded-2xl font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-blue-900/10"
                            >
                                Fechar Detalhes
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
