import { X, User, Home, Calendar, Phone, Mail, Clock, CreditCard, Receipt, ExternalLink, FileText, Printer, ChevronRight, Check, Ban } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useParams } from "next/navigation";
import { updateReservationStatus } from "@/app/actions/admin-reservation-actions";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface ReservationDetailSheetProps {
    reservation: any | null;
    onClose: () => void;
}

export function ReservationDetailSheet({ reservation, onClose }: ReservationDetailSheetProps) {
    const params = useParams();
    const locale = (params?.locale as string) || 'en';
    const [isNavigating, setIsNavigating] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [confirmingStatus, setConfirmingStatus] = useState<'confirmed' | 'cancelled' | null>(null);

    if (!reservation) return null;

    const handleStatusUpdate = async (newStatus: 'confirmed' | 'cancelled') => {
        if (!confirmingStatus) {
            setConfirmingStatus(newStatus);
            return;
        }

        setIsUpdating(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Não autenticado");

            await updateReservationStatus(reservation.id, newStatus, user.id);
            toast.success(`Reserva ${newStatus === 'confirmed' ? 'confirmada' : 'cancelada'} com sucesso!`);
            onClose();
        } catch (error: any) {
            toast.error(`Erro ao atualizar reserva: ${error.message}`);
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
                className="fixed inset-0 bg-black/10 z-[100]"
            />
            <motion.div
                key="panel"
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed right-0 top-0 h-full w-full max-w-xl bg-white dark:bg-admin-dark-surface shadow-2xl z-[101] flex flex-col overflow-hidden"
            >
                {/* Header */}
                <div className="p-6 border-b border-[#f5f5f5] dark:border-admin-dark-border flex items-center justify-between bg-white dark:bg-admin-dark-surface sticky top-0 z-10">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border",
                                reservation.status === 'confirmed' ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/30" :
                                    reservation.status === 'pending' ? "bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-100 dark:border-yellow-500/30" :
                                        "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-500/30"
                            )}>
                                {reservation.reference_id || 'Booking Details'}
                            </span>
                            <span className={cn(
                                "inactive-dot size-2 rounded-full",
                                reservation.status === 'confirmed' ? "bg-emerald-500" :
                                    reservation.status === 'pending' ? "bg-yellow-500" : "bg-rose-500"
                            )} />
                        </div>
                        <h2 className="text-xl font-bold text-[#171717] dark:text-admin-dark-text-primary">
                            {reservation.guest_name || 'Guest Details'}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-[#fafafa] dark:hover:bg-white/10 rounded-xl text-[#a3a3a3] transition-colors"
                    >
                        <X className="size-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Main Info Blocks */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-[#fafafa]/50 dark:bg-admin-dark-bg/50 border border-[#f5f5f5] dark:border-admin-dark-border">
                            <div className="flex items-center gap-2 text-[#a3a3a3] mb-2 font-bold text-[10px] uppercase tracking-wider">
                                <Calendar className="size-3" /> Stay Dates
                            </div>
                            <p className="text-sm font-bold text-[#171717] dark:text-admin-dark-text-primary">
                                {formatDate(reservation.check_in)} - {formatDate(reservation.check_out)}
                            </p>
                        </div>
                        <div className="p-4 rounded-2xl bg-[#fafafa]/50 dark:bg-admin-dark-bg/50 border border-[#f5f5f5] dark:border-admin-dark-border">
                            <div className="flex items-center gap-2 text-[#a3a3a3] mb-2 font-bold text-[10px] uppercase tracking-wider">
                                <Home className="size-3" /> Property
                            </div>
                            <p className="text-sm font-bold text-[#171717] dark:text-admin-dark-text-primary truncate">
                                {reservation.properties?.title?.[locale] || reservation.properties?.title?.en || reservation.properties?.title?.pt || reservation.properties?.name || 'Unknown Property'}
                            </p>
                        </div>
                    </div>

                    {/* Services & Extras */}
                    <section className="space-y-4">
                        <h3 className="text-xs font-bold text-[#a3a3a3] uppercase tracking-[0.2em]">Serviços & Extras</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div className={cn(
                                "p-3 rounded-xl border flex items-center justify-between",
                                (reservation.breakfast_total > 0)
                                    ? "bg-gold-50/20 border-gold-200 dark:bg-gold-500/10 dark:border-gold-500/20"
                                    : "bg-gray-50/50 border-gray-100 dark:bg-white/5 dark:border-white/10"
                            )}>
                                <div className="flex items-center gap-2">
                                    <div className={cn("size-2 rounded-full", (reservation.breakfast_total > 0) ? "bg-gold-500" : "bg-gray-300 dark:bg-white/20")} />
                                    <span className="text-xs font-bold dark:text-white">Pequeno-almoço</span>
                                </div>
                                <span className="text-[10px] font-black uppercase text-[#a3a3a3] dark:text-[#a3a3a3]">
                                    {(reservation.breakfast_total > 0) ? "Pedido" : "Não"}
                                </span>
                            </div>
                            <div className={cn(
                                "p-3 rounded-xl border flex items-center justify-between",
                                (reservation.transfer_total > 0)
                                    ? "bg-sky-50/20 border-sky-200 dark:bg-sky-500/10 dark:border-sky-500/20"
                                    : "bg-gray-50/50 border-gray-100 dark:bg-white/5 dark:border-white/10"
                            )}>
                                <div className="flex items-center gap-2">
                                    <div className={cn("size-2 rounded-full", (reservation.transfer_total > 0) ? "bg-sky-500" : "bg-gray-300 dark:bg-white/20")} />
                                    <span className="text-xs font-bold dark:text-white">Transfer</span>
                                </div>
                                <span className="text-[10px] font-black uppercase text-[#a3a3a3] dark:text-[#a3a3a3]">
                                    {(reservation.transfer_total > 0) ? "Pedido" : "Não"}
                                </span>
                            </div>
                        </div>
                    </section>

                    {/* Guest Section */}
                    <section className="space-y-4">
                        <h3 className="text-xs font-bold text-[#a3a3a3] uppercase tracking-[0.2em]">Guest Information</h3>
                        <div className="space-y-3">
                            <div className="flex flex-wrap gap-4">
                                <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                                    <div className="size-8 rounded-lg bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400">
                                        <Mail className="size-4" />
                                    </div>
                                    <span className="text-sm text-[#171717] dark:text-admin-dark-text-primary truncate">{reservation.guest_email || 'No email'}</span>
                                </div>
                                <div className="flex items-center gap-3 flex-1 min-w-[150px]">
                                    <div className="size-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                        <Phone className="size-4" />
                                    </div>
                                    <span className="text-sm text-[#171717] dark:text-admin-dark-text-primary whitespace-nowrap">{reservation.guest_phone || 'No phone'}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="size-8 rounded-lg bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-400">
                                    <Clock className="size-4" />
                                </div>
                                <span className="text-sm text-[#171717] dark:text-admin-dark-text-primary">
                                    {reservation.arrival_time ? `Est. Arrival: ${reservation.arrival_time}` : 'Arrival time not specified'}
                                </span>
                            </div>
                        </div>
                    </section>

                    {/* Price Breakdown */}
                    <section className="space-y-4">
                        <h3 className="text-xs font-bold text-[#a3a3a3] uppercase tracking-[0.2em]">Price Breakdown</h3>
                        <div className="p-5 rounded-2xl border border-[#f5f5f5] dark:border-admin-dark-border space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-[#a3a3a3]">Estadia</span>
                                <span className="font-bold text-[#171717] dark:text-admin-dark-text-primary font-medium">{formatCurrency(reservation.base_price || 0)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-[#a3a3a3]">Taxa de Limpeza</span>
                                <span className="font-bold text-[#171717] dark:text-admin-dark-text-primary font-medium">{formatCurrency(reservation.cleaning_fee || 0)}</span>
                            </div>
                            {(reservation.breakfast_total > 0) && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-[#a3a3a3]">Pequeno-almoço</span>
                                    <span className="font-bold text-[#171717] dark:text-admin-dark-text-primary">{formatCurrency(reservation.breakfast_total)}</span>
                                </div>
                            )}
                            {(reservation.transfer_total > 0) && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-[#a3a3a3]">Transfer</span>
                                    <span className="font-bold text-[#171717] dark:text-admin-dark-text-primary">{formatCurrency(reservation.transfer_total)}</span>
                                </div>
                            )}
                            <div className="h-px bg-[#f5f5f5] dark:bg-admin-dark-border my-2" />
                            <div className="flex justify-between items-end">
                                <span className="text-xs font-bold text-[#171717] dark:text-white uppercase tracking-wider">Total</span>
                                <span className="text-2xl font-black text-[#171717] dark:text-white">{formatCurrency(reservation.total_price || 0)}</span>
                            </div>
                        </div>
                    </section>

                    {/* Guest Breakdown (Explicit) */}
                    <section className="space-y-4">
                        <h3 className="text-xs font-bold text-[#a3a3a3] uppercase tracking-[0.2em]">Guest Breakdown</h3>
                        <div className="flex gap-4">
                            {[
                                reservation.adults > 0 && { label: 'Adultos', count: reservation.adults },
                                reservation.children > 0 && { label: 'Crianças', count: reservation.children },
                                reservation.infants > 0 && { label: 'Bebés', count: reservation.infants }
                            ].filter(Boolean).map((item: any) => (
                                <div key={item.label} className="px-3 py-2 rounded-xl border border-[#f5f5f5] dark:border-admin-dark-border text-center flex-1">
                                    <p className="text-lg font-black text-[#171717] dark:text-white">{item.count}</p>
                                    <p className="text-[10px] text-[#a3a3a3] uppercase font-bold">{item.label}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Billing Info */}
                    {(reservation.billing_address || reservation.billing_vat) && (
                        <section className="space-y-4">
                            <h3 className="text-xs font-bold text-[#a3a3a3] uppercase tracking-[0.2em]">Billing Details</h3>
                            <div className="p-4 rounded-2xl bg-[#fafafa]/50 dark:bg-admin-dark-bg/50 border border-[#f5f5f5] dark:border-admin-dark-border flex gap-4">
                                <div className="size-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                                    <Receipt className="size-5" />
                                </div>
                                <div className="text-sm space-y-1">
                                    <p className="font-bold text-[#171717] dark:text-white">{reservation.guest_name}</p>
                                    {reservation.billing_address && <p className="text-[#a3a3a3]">{reservation.billing_address}</p>}
                                    {(reservation.billing_zip || reservation.billing_city) && (
                                        <p className="text-[#a3a3a3]">{reservation.billing_zip} {reservation.billing_city}</p>
                                    )}
                                    {reservation.billing_country && <p className="text-[#a3a3a3]">{reservation.billing_country}</p>}
                                    {reservation.billing_vat && (
                                        <p className="font-bold text-gray-900 dark:text-white mt-1">VAT: <span className="font-mono">{reservation.billing_vat}</span></p>
                                    )}
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Observações */}
                    {reservation.special_requests && (
                        <section className="space-y-4">
                            <h3 className="text-xs font-bold text-[#a3a3a3] uppercase tracking-[0.2em]">Observations</h3>
                            <div className="p-4 rounded-2xl bg-gold-50/20 dark:bg-gold-500/5 border-l-4 border-gold-500 italic text-sm text-[#171717] dark:text-admin-dark-text-primary">
                                "{reservation.special_requests}"
                            </div>
                        </section>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="p-6 border-t border-[#f5f5f5] dark:border-admin-dark-border bg-white dark:bg-admin-dark-surface space-y-3">
                    {reservation.status === 'pending' && !confirmingStatus && (
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <button
                                onClick={() => handleStatusUpdate('confirmed')}
                                disabled={isUpdating}
                                className="flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-all disabled:opacity-50"
                            >
                                <Check className="size-4" />
                                Aprovar Reserva
                            </button>
                            <button
                                onClick={() => handleStatusUpdate('cancelled')}
                                disabled={isUpdating}
                                className="flex items-center justify-center gap-2 py-3 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 text-rose-600 rounded-xl font-bold text-xs transition-all disabled:opacity-50"
                            >
                                <Ban className="size-4" />
                                Rejeitar
                            </button>
                        </div>
                    )}

                    {confirmingStatus && (
                        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-admin-dark-bg border border-gray-100 dark:border-admin-dark-border mb-3 animate-in fade-in zoom-in duration-200">
                            <p className="text-xs font-bold text-center mb-3 dark:text-white">
                                Tem a certeza que deseja {confirmingStatus === 'confirmed' ? 'APROVAR' : 'REJEITAR'} esta reserva?
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
                                    Sim, {confirmingStatus === 'confirmed' ? 'Confirmar' : 'Rejeitar'}
                                </button>
                                <button
                                    onClick={() => setConfirmingStatus(null)}
                                    disabled={isUpdating}
                                    className="py-2.5 bg-white dark:bg-admin-dark-surface border border-gray-200 dark:border-admin-dark-border rounded-xl font-bold text-xs text-gray-500 hover:text-gray-700 dark:hover:text-white transition-all"
                                >
                                    Cancelar
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
                        {isNavigating ? 'A Carregar...' : 'Ver Página Completa'}
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full py-3.5 rounded-2xl border border-[#f5f5f5] dark:border-admin-dark-border text-xs font-bold text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white transition-colors uppercase tracking-[0.2em]"
                    >
                        Fechar
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
