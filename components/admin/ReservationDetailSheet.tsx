"use client";

import { X, User, Home, Calendar, Phone, Mail, Clock, CreditCard, Receipt, ExternalLink, FileText, Printer, ChevronRight, Check, Ban, History, Globe } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { format, startOfDay } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useParams } from "next/navigation";
import { updateReservationStatus, resendCancellationEmail } from "@/app/actions/admin-reservation-actions";
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
    const [isResending, setIsResending] = useState(false);
    const [ownerInfo, setOwnerInfo] = useState<{ full_name: string; email: string; phone?: string } | null>(null);

    useEffect(() => {
        if (reservation?.status === 'owner_block') {
            import('@/lib/supabase').then(({ supabase }) => {
                const fetchOwnerInfo = (ownerId: string) => {
                    supabase
                        .from('profiles')
                        .select('full_name, email, phone')
                        .eq('id', ownerId)
                        .single()
                        .then(({ data }) => setOwnerInfo(data));
                };

                if (reservation?.properties?.owner_id) {
                    fetchOwnerInfo(reservation.properties.owner_id);
                } else if (reservation?.property_id) {
                    supabase
                        .from('properties')
                        .select('owner_id')
                        .eq('id', reservation.property_id)
                        .single()
                        .then(({ data: propData }) => {
                            if (propData?.owner_id) {
                                fetchOwnerInfo(propData.owner_id);
                            }
                        });
                }
            });
        }
    }, [reservation]);

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

    const handleResendCancellation = async () => {
        setIsResending(true);
        try {
            await resendCancellationEmail(reservation.id);
            toast.success(t('resendCancellationSuccess'));
        } catch (error: any) {
            toast.error(error?.message || t('unexpectedError'));
        } finally {
            setIsResending(false);
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

    const checkOutDate = new Date(reservation.check_out);
    const today = startOfDay(new Date());

    // Determine effective status purely for UI: if check out has passed and it was confirmed, it's completed (unless it's a block!)
    let effectiveStatus = reservation.status;
    if (!reservation.is_manual_block && reservation.status === 'confirmed' && startOfDay(checkOutDate).getTime() <= today.getTime()) {
        effectiveStatus = 'completed';
    }

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
                <div className="p-4 md:p-6 border-b border-gray-100 dark:border-white/10 flex items-center justify-between gap-2 bg-white dark:bg-admin-dark-surface sticky top-0 z-10">
                    <div className="min-w-0 flex-1">
                        {reservation.status === 'owner_block' ? (
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-3">
                                    <span className="px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest border bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30">
                                        OWNER BLOCK
                                    </span>
                                    <h2 className="text-xl font-black text-gray-900 dark:text-white truncate">
                                        {ownerInfo ? ownerInfo.full_name : (reservation.guest_name || 'Owner')}
                                    </h2>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-3">
                                    {reservation.is_airbnb ? (
                                        <span className="px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest border bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/30 flex items-center gap-1.5">
                                            <Globe className="size-3" />
                                            AIRBNB
                                        </span>
                                    ) : (
                                        <span className={cn(
                                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border",
                                            effectiveStatus === 'confirmed' ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/30" :
                                                effectiveStatus === 'checked-in' ? "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-500/30" :
                                                    effectiveStatus === 'completed' || effectiveStatus === 'checked-out' ? "bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/20" :
                                                        effectiveStatus === 'pending' ? "bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-100 dark:border-yellow-500/30" :
                                                            "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-500/30"
                                        )}>
                                            {String(effectiveStatus || 'pending').replace('_', ' ').toUpperCase()}
                                        </span>
                                    )}
                                    <span className={cn(
                                        "size-2 rounded-full shrink-0",
                                        effectiveStatus === 'confirmed' ? "bg-emerald-500" :
                                            effectiveStatus === 'checked-in' ? "bg-blue-500" :
                                                effectiveStatus === 'completed' || effectiveStatus === 'checked-out' ? "bg-gray-400" :
                                                    effectiveStatus === 'pending' ? "bg-yellow-500" : "bg-rose-500"
                                    )} />
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                                        {reservation.is_airbnb ? 'Airbnb Reservation' : reservation.guest_name}
                                    </h2>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    ID: {reservation.reference_id}
                                </p>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={() => setShowHistory(!showHistory)}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                                showHistory
                                    ? "bg-[#B08D4A] text-white border-[#B08D4A]"
                                    : "text-[#B08D4A] border-[#B08D4A]/20 hover:bg-[#B08D4A]/5"
                            )}
                        >
                            <History className="size-3.5 shrink-0" />
                            <span className="hidden sm:inline">{t('history')}</span>
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
                                {/* Mobile: empilhado (data em cima, propriedade em baixo); desktop: lado a lado. */}
                                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg shrink-0">
                                            <Calendar className="size-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] text-gray-400 uppercase font-bold">{t('stay')}</p>
                                            <p className="text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap">
                                                {formatDate(reservation.check_in)} - {formatDate(reservation.check_out)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="hidden md:block h-8 w-px bg-gray-200 dark:bg-white/10 mx-2 shrink-0" />
                                    <div className="flex items-center gap-3 min-w-0 md:text-right">
                                        <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg shrink-0 md:hidden">
                                            <Home className="size-4" />
                                        </div>
                                        <div className="min-w-0 md:order-1">
                                            <p className="text-[10px] text-gray-400 uppercase font-bold">{t('property')}</p>
                                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate md:max-w-[150px]">
                                                {reservation.property_name || reservation.properties?.title?.[locale] || reservation.properties?.title?.en || reservation.properties?.title?.pt || reservation.property?.title || 'Unknown'}
                                            </p>
                                        </div>
                                        <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg shrink-0 hidden md:block md:order-2">
                                            <Home className="size-4" />
                                        </div>
                                    </div>
                                </div>

                                {/* Owner Details (If Owner Block) */}
                                {reservation.status === 'owner_block' && (
                                    <div className="p-4 rounded-2xl border border-gray-100 dark:border-white/10 space-y-3 bg-indigo-50/30 dark:bg-indigo-500/5">
                                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Owner / Notes</p>
                                        <div className="space-y-4">
                                            {/* What was written for the owner during booking */}
                                            {reservation.guest_name && (
                                                <div className="flex items-start gap-2">
                                                    <FileText className="size-3.5 text-gray-400 mt-0.5" />
                                                    <div>
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase block mb-0.5">Note</span>
                                                        <span className="text-xs font-medium dark:text-gray-300 break-words">{reservation.guest_name}</span>
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {/* Real Owner Info dynamically fetched */}
                                            {ownerInfo && (
                                                <div className="border-t border-gray-100 dark:border-white/10 pt-3 space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <User className="size-3.5 text-gray-400" />
                                                        <span className="text-xs font-medium dark:text-gray-300 truncate">{ownerInfo.full_name || 'No name'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Mail className="size-3.5 text-gray-400" />
                                                        <span className="text-xs font-medium dark:text-gray-300 truncate" title={ownerInfo.email}>{ownerInfo.email || 'No email'}</span>
                                                    </div>
                                                    {ownerInfo.phone && (
                                                        <div className="flex items-center gap-2">
                                                            <Phone className="size-3.5 text-gray-400" />
                                                            <span className="text-xs font-medium dark:text-gray-300">{ownerInfo.phone}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Guest Contact & Services */}
                                {reservation.status !== 'owner_block' && (
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
                                )}
                            </div>

                            {/* Price Breakdown (Compact) */}
                            {reservation.status !== 'owner_block' && (
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
                            )}

                            {/* Guest Breakdown (Compact) */}
                            {reservation.status !== 'owner_block' && (
                                <section className="space-y-4">
                                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10">
                                        <div className="flex flex-col gap-4 w-full">
                                            <div className="flex items-center justify-between">
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

                                            {/* Additional Guest Names (SEF Compliance) */}
                                            {reservation.extra_guests && reservation.extra_guests.length > 0 && (
                                                <div className="pt-4 border-t border-gray-200 dark:border-white/10 space-y-2">
                                                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-2">
                                                        {t('additionalGuests')}
                                                    </p>
                                                    <div className="space-y-1.5">
                                                        {reservation.extra_guests.map((name: string, idx: number) => (
                                                            <div key={idx} className="flex items-center gap-2">
                                                                <div className="size-1.5 rounded-full bg-gold-500/40" />
                                                                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                                                    {name}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* Billing Info */}
                            {reservation.status !== 'owner_block' && (reservation.billing_address || reservation.billing_vat) && (
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

                    {reservation.status === 'cancelled' && reservation.guest_email && !reservation.is_manual_block && !reservation.is_airbnb && (
                        <button
                            onClick={handleResendCancellation}
                            disabled={isResending || isUpdating}
                            className="w-full flex items-center justify-center gap-2 py-3.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 rounded-2xl font-bold text-sm hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-all active:scale-95 disabled:opacity-70"
                        >
                            {isResending ? (
                                <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            ) : (
                                <Mail className="size-4" />
                            )}
                            {isResending ? t('resendCancellationSending') : t('resendCancellation')}
                        </button>
                    )}

                    {reservation.status !== 'owner_block' && (
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
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
