"use client";

import { X, User, Home, Calendar, Phone, Mail, Clock, CreditCard, Receipt, ExternalLink, FileText, Printer, ChevronRight, Check, Ban, History } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useParams } from "next/navigation";
import { updateReservationStatus } from "@/app/actions/admin-reservation-actions";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { ActivityTimeline } from "./ActivityTimeline";

interface ReservationDetailSheetProps {
    reservation: any | null;
    onClose: () => void;
    onRefresh?: () => void;
}

export function ReservationDetailSheet({ reservation, onClose, onRefresh }: ReservationDetailSheetProps) {
    const t = useTranslations('AdminReservations.detail');
    const params = useParams();
    const locale = (params?.locale as string) || 'en';
    const [isNavigating, setIsNavigating] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [confirmingStatus, setConfirmingStatus] = useState<'confirmed' | 'cancelled' | null>(null);
    const [showHistory, setShowHistory] = useState(false);

    if (!reservation) return null;

    const handleStatusUpdate = async (newStatus: 'confirmed' | 'cancelled') => {
        if (!confirmingStatus) {
            setConfirmingStatus(newStatus);
            return;
        }

        setIsUpdating(true);
        try {
            await updateReservationStatus(reservation.id, newStatus);
            toast.success(newStatus === 'confirmed' ? t('successApprove') : t('successReject'));
            if (onRefresh) onRefresh();
            onClose();
        } catch (error: any) {
            toast.error(t('unexpectedError'));
        } finally {
            setIsUpdating(false);
            setConfirmingStatus(null);
        }
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'N/A';
        try {
            return format(new Date(dateStr), "dd MMM yyyy", { locale: locale === 'pt' ? pt : undefined });
        } catch (e) {
            return dateStr;
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat(locale === 'pt' ? 'pt-PT' : 'en-US', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount);
    };

    return (
        <AnimatePresence>
            <motion.div
                key="overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-transparent z-[100]"
            />
            <motion.div
                key="panel"
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="fixed right-0 top-0 h-full w-full max-w-xl bg-white dark:bg-admin-dark-surface shadow-2xl z-[101] flex flex-col overflow-hidden"
            >
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-white/10 flex items-center justify-between bg-white dark:bg-admin-dark-surface sticky top-0 z-10">
                    <div>
                        <div className="flex items-center gap-3">
                            <span className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border",
                                reservation.status === 'confirmed' ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/30" :
                                    reservation.status === 'pending' ? "bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-100 dark:border-yellow-500/30" :
                                        "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-500/30"
                            )}>
                                {reservation.status?.toUpperCase()}
                            </span>
                            <span className={cn(
                                "size-2 rounded-full shrink-0",
                                reservation.status === 'confirmed' ? "bg-emerald-500" :
                                    reservation.status === 'pending' ? "bg-yellow-500" : "bg-rose-500"
                            )} />
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                                {reservation.guest_name}
                            </h2>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            ID: {reservation.reference_id}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowHistory(!showHistory)}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                                showHistory
                                    ? "bg-[#B08D4A] text-white border-[#B08D4A]"
                                    : "text-[#B08D4A] border-[#B08D4A]/20 hover:bg-[#B08D4A]/5"
                            )}
                        >
                            <History className="size-3.5" />
                            {t('history')}
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl text-gray-400 transition-colors"
                        >
                            <X className="size-6" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {showHistory ? (
                        <ActivityTimeline resourceId={reservation.id} resourceType="RESERVATION" />
                    ) : (
                        <>
                            {/* Main Grid: Trip & Guest Info */}
                            <div className="grid grid-cols-1 gap-4">
                                {/* Dates & Property Combined */}
                                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg">
                                            <Calendar className="size-4" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase font-bold">{t('stay')}</p>
                                            <p className="text-sm font-bold text-gray-900 dark:text-white">
                                                {formatDate(reservation.check_in)} - {formatDate(reservation.check_out)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="h-8 w-px bg-gray-200 dark:bg-white/10 mx-2" />
                                    <div className="flex items-center gap-3 text-right">
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase font-bold">{t('property')}</p>
                                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[150px]">
                                                {reservation.property_name || reservation.properties?.title?.[locale] || reservation.properties?.title?.en || reservation.properties?.title?.pt || reservation.property?.title || 'Unknown'}
                                            </p>
                                        </div>
                                        <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg">
                                            <Home className="size-4" />
                                        </div>
                                    </div>
                                </div>

                                {/* Guest Contact & Services */}
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Contact Info */}
                                    <div className="p-4 rounded-2xl border border-gray-100 dark:border-white/10 space-y-3">
                                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{t('guestDetails')}</p>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Mail className="size-3.5 text-gray-400" />
                                                <span className="text-xs font-medium dark:text-gray-300 truncate" title={reservation.guest_email}>{reservation.guest_email || 'No email'}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Phone className="size-3.5 text-gray-400" />
                                                <span className="text-xs font-medium dark:text-gray-300">{reservation.guest_phone || 'No phone'}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Clock className="size-3.5 text-gray-400" />
                                                <span className="text-xs font-medium dark:text-gray-300">{reservation.arrival_time || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Services Compact */}
                                    <div className="p-4 rounded-2xl border border-gray-100 dark:border-white/10 space-y-3">
                                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{t('extras')}</p>
                                        <div className="space-y-2.5">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-gray-500 dark:text-gray-400">{t('breakfast')}</span>
                                                <span className={cn("font-bold px-1.5 py-0.5 rounded", reservation.breakfast_total > 0 ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500")}>
                                                    {reservation.breakfast_total > 0 ? t('yes') : t('no')}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-gray-500 dark:text-gray-400">Transfer</span>
                                                <div className="flex items-center gap-2">
                                                    {reservation.transfer_total > 0 && reservation.transfer_type && (
                                                        <span className="text-[9px] font-bold uppercase tracking-widest text-[#B08D4A] bg-[#B08D4A]/5 px-2 py-0.5 rounded border border-[#B08D4A]/10">
                                                            {reservation.transfer_type === 'round_trip' ? t('roundTrip') : t('oneWay')}
                                                        </span>
                                                    )}
                                                    <span className={cn("font-bold px-1.5 py-0.5 rounded", reservation.transfer_total > 0 ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500")}>
                                                        {reservation.transfer_total > 0 ? t('yes') : t('no')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Price Breakdown (Compact) */}
                            <div className="mt-2 p-4 rounded-2xl border border-gray-100 dark:border-white/10 space-y-2.5 bg-gray-50/50 dark:bg-white/5">
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-500 dark:text-gray-400">{t('stay')}</span>
                                    <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(reservation.base_price || 0)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-500 dark:text-gray-400">{t('cleaningFee')}</span>
                                    <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(reservation.cleaning_fee || 0)}</span>
                                </div>
                                {reservation.city_tax_total > 0 && (
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-500 dark:text-gray-400">{t('cityTax')}</span>
                                        <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(reservation.city_tax_total)}</span>
                                    </div>
                                )}
                                {reservation.discount_amount > 0 && (
                                    <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400">
                                        <span>{t('discount')}</span>
                                        <span className="font-bold">-{formatCurrency(reservation.discount_amount)}</span>
                                    </div>
                                )}
                                {(reservation.breakfast_total > 0) && (
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-500 dark:text-gray-400">{t('breakfast')}</span>
                                        <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(reservation.breakfast_total)}</span>
                                    </div>
                                )}
                                {(reservation.transfer_total > 0) && (
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-500 dark:text-gray-400">Transfer</span>
                                        <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(reservation.transfer_total)}</span>
                                    </div>
                                )}
                                <div className="h-px bg-gray-200 dark:bg-white/10 my-1" />
                                <div className="flex justify-between items-end">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{t('total')}</span>
                                    <span className="text-2xl font-black text-gray-900 dark:text-white">{formatCurrency(reservation.total_price || 0)}</span>
                                </div>
                            </div>

                            {/* Guest Breakdown (Compact) */}
                            <section className="space-y-4">
                                <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10">
                                    <div className="flex items-center gap-2 text-gray-400 font-bold text-[10px] uppercase tracking-wider">
                                        <User className="size-3.5" /> {t('guests')}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {[
                                            reservation.adults > 0 && `${reservation.adults} ${t('adults')}`,
                                            reservation.children > 0 && `${reservation.children} ${t('children')}`,
                                            reservation.infants > 0 && `${reservation.infants} ${t('infants')}`
                                        ].filter(Boolean).map((text: any, i) => (
                                            <span key={i} className="px-2 py-1 rounded bg-white dark:bg-gray-800 border border-gray-100 dark:border-white/10 text-[10px] font-bold text-gray-900 dark:text-white shadow-sm">
                                                {text}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </section>

                            {/* Billing Info */}
                            {(reservation.billing_address || reservation.billing_vat) && (
                                <section className="space-y-4">
                                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">{t('billingDetails')}</h3>
                                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 flex gap-4">
                                        <div className="size-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                                            <Receipt className="size-5" />
                                        </div>
                                        <div className="text-sm space-y-1">
                                            <p className="font-bold text-gray-900 dark:text-white">{reservation.guest_name}</p>
                                            {reservation.billing_address && <p className="text-gray-500 dark:text-gray-400">{reservation.billing_address}</p>}
                                            {(reservation.billing_zip || reservation.billing_city) && (
                                                <p className="text-gray-500 dark:text-gray-400">{reservation.billing_zip} {reservation.billing_city}</p>
                                            )}
                                            {reservation.billing_country && <p className="text-gray-500 dark:text-gray-400">{reservation.billing_country}</p>}
                                            {reservation.billing_vat && (
                                                <p className="font-bold text-gray-900 dark:text-white mt-1">{t('vat')}: <span className="font-mono">{reservation.billing_vat}</span></p>
                                            )}
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* Observations */}
                            {reservation.special_requests && (
                                <section className="space-y-4">
                                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">{t('observations')}</h3>
                                    <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-500/5 border-l-4 border-amber-500 italic text-sm text-gray-700 dark:text-gray-300">
                                        "{reservation.special_requests}"
                                    </div>
                                </section>
                            )}
                        </>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="p-6 border-t border-gray-100 dark:border-white/10 bg-white dark:bg-admin-dark-surface space-y-3">
                    {reservation.status === 'pending' && !confirmingStatus && (
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <button
                                onClick={() => handleStatusUpdate('confirmed')}
                                disabled={isUpdating}
                                className="flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-all disabled:opacity-50"
                            >
                                <Check className="size-4" />
                                {t('approveAction')}
                            </button>
                            <button
                                onClick={() => handleStatusUpdate('cancelled')}
                                disabled={isUpdating}
                                className="flex items-center justify-center gap-2 py-3 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 text-rose-600 rounded-xl font-bold text-xs transition-all disabled:opacity-50"
                            >
                                <Ban className="size-4" />
                                {t('rejectAction')}
                            </button>
                        </div>
                    )}

                    {confirmingStatus && (
                        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 mb-3 animate-in fade-in zoom-in duration-200">
                            <p className="text-xs font-bold text-center mb-3 dark:text-white">
                                {t('confirmPrompt', { action: confirmingStatus === 'confirmed' ? 'APROVAR' : 'REJEITAR' })}
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => handleStatusUpdate(confirmingStatus)}
                                    disabled={isUpdating}
                                    className={cn(
                                        "py-2.5 rounded-xl font-bold text-xs text-white transition-all flex items-center justify-center gap-2",
                                        confirmingStatus === 'confirmed' ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                                    )}
                                >
                                    {isUpdating && <div className="size-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
                                    {t('confirmButton', { action: confirmingStatus === 'confirmed' ? 'Confirmar' : 'Rejeitar' })}
                                </button>
                                <button
                                    onClick={() => setConfirmingStatus(null)}
                                    disabled={isUpdating}
                                    className="py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl font-bold text-xs text-gray-500 hover:text-gray-700 dark:hover:text-white transition-all"
                                >
                                    {t('cancelButton')}
                                </button>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={() => {
                            setIsNavigating(true);
                            window.location.href = `/${locale}/admin/reservations/${reservation.id}`;
                        }}
                        disabled={isNavigating || isUpdating}
                        className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#171717] dark:bg-white text-white dark:text-black rounded-2xl font-bold text-sm hover:scale-[1.01] transition-all shadow-lg active:scale-95 disabled:opacity-70"
                    >
                        {isNavigating ? (
                            <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                            <FileText className="size-4" />
                        )}
                        {isNavigating ? t('loading') : t('viewFullPage')}
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
