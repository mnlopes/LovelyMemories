"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, startOfDay } from "date-fns";
import { pt } from "date-fns/locale";
import { X, Globe, Mail, Phone, Users, Home, ArrowRight, ShieldCheck } from "lucide-react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getBeds24BookingDetail, type Beds24BookingDetail } from "@/app/actions/beds24";

interface Beds24BookingDetailSheetProps {
    beds24BookingId: number | null;
    onClose: () => void;
}

const euro = (v: number) =>
    new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v);

export function Beds24BookingDetailSheet({ beds24BookingId, onClose }: Beds24BookingDetailSheetProps) {
    const t = useTranslations("AdminReservations.beds24Detail");
    const params = useParams();
    const locale = (params?.locale as string) || "en";
    const dateLocale = locale === "pt" ? pt : undefined;
    const [booking, setBooking] = useState<Beds24BookingDetail | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (beds24BookingId === null) { setBooking(null); return; }
        let cancelled = false;
        setBooking(null);
        setLoading(true);
        getBeds24BookingDetail(beds24BookingId)
            .then((r) => {
                if (cancelled) return;
                if (r.ok) { setBooking(r.booking); }
                else { toast.error(t("loadError")); onClose(); }
            })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [beds24BookingId]); // eslint-disable-line react-hooks/exhaustive-deps

    if (beds24BookingId === null) return null;

    const initials = booking
        ? booking.guest_name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase()
        : "";
    const isAirbnb = (booking?.channel ?? "").toLowerCase().includes("airbnb");
    // Status do ciclo da estadia (mais útil que o status cru do Beds24): cancelada > concluída
    // > em estadia > a chegar. Cancelada só surge se a reserva foi cancelada após a barra existir.
    const effStatus: "cancelled" | "completed" | "staying" | "upcoming" = (() => {
        if (!booking) return "upcoming";
        if (["cancelled", "canceled", "cancel", "black"].includes((booking.status ?? "").toLowerCase())) return "cancelled";
        const today = startOfDay(new Date()).getTime();
        const arr = startOfDay(new Date(booking.arrival)).getTime();
        const dep = startOfDay(new Date(booking.departure)).getTime();
        if (dep <= today) return "completed";
        if (arr <= today) return "staying";
        return "upcoming";
    })();
    const statusKey = effStatus === "upcoming" ? "statusUpcoming"
        : effStatus === "staying" ? "statusStaying"
        : effStatus === "completed" ? "statusCompleted" : "statusCancelled";
    const statusClasses = effStatus === "upcoming"
        ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30"
        : effStatus === "staying"
            ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30"
            : "bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/10";
    const fmtDay = (d: string) => format(new Date(d), "EEE, d MMM", { locale: dateLocale });
    const fmtStamp = (d: string) => format(new Date(d), "d MMM yyyy, HH:mm", { locale: dateLocale });

    return (
        <AnimatePresence>
            <motion.div
                key="b24-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-black/20 z-[100]"
            />
            <motion.div
                key="b24-panel"
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-admin-dark-surface shadow-2xl z-[101] flex flex-col overflow-hidden"
            >
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-white/10 flex items-start justify-between gap-3">
                    {loading || !booking ? (
                        <div className="flex items-center gap-4 animate-pulse">
                            <div className="size-12 rounded-full bg-gray-100 dark:bg-white/10" />
                            <div className="space-y-2">
                                <div className="h-4 w-40 rounded bg-gray-100 dark:bg-white/10" />
                                <div className="h-3 w-28 rounded bg-gray-100 dark:bg-white/10" />
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-4 min-w-0">
                            <div className="size-12 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 flex items-center justify-center font-bold text-sm shrink-0">
                                {initials}
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-lg font-black text-gray-900 dark:text-white truncate">{booking.guest_name}</h2>
                                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/30 flex items-center gap-1">
                                        <Globe className="size-2.5" />
                                        {isAirbnb ? "Airbnb" : (booking.channel || "Direct")}
                                    </span>
                                    <span className={cn("px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border", statusClasses)}>
                                        {t(statusKey)}
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest bg-gray-100 dark:bg-white/5 text-gray-400">
                                        Beds24
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                    <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors shrink-0">
                        <X className="size-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {loading || !booking ? (
                        <div className="space-y-4 animate-pulse">
                            <div className="h-28 rounded-2xl bg-gray-50 dark:bg-white/5" />
                            <div className="h-36 rounded-2xl bg-gray-50 dark:bg-white/5" />
                            <div className="h-20 rounded-2xl bg-gray-50 dark:bg-white/5" />
                        </div>
                    ) : (
                        <>
                            {/* Estadia */}
                            <div className="rounded-2xl bg-[#fafafa] dark:bg-white/5 p-5">
                                <div className="flex items-center justify-between gap-2">
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{t("checkIn")}</p>
                                        <p className="text-[15px] font-bold text-gray-900 dark:text-white mt-1 capitalize">{fmtDay(booking.arrival)}</p>
                                    </div>
                                    <div className="text-center text-gray-400">
                                        <ArrowRight className="size-4 mx-auto" />
                                        <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mt-0.5">{t("nights", { count: booking.nights })}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{t("checkOut")}</p>
                                        <p className="text-[15px] font-bold text-gray-900 dark:text-white mt-1 capitalize">{fmtDay(booking.departure)}</p>
                                    </div>
                                </div>
                                <div className="border-t border-gray-200/60 dark:border-white/10 mt-4 pt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                    <span className="flex items-center gap-1.5 min-w-0"><Home className="size-3.5 shrink-0" /><span className="truncate">{booking.property_title || "—"}</span></span>
                                    {(booking.num_adult ?? 0) > 0 && (
                                        <span className="flex items-center gap-1.5 shrink-0">
                                            <Users className="size-3.5" />
                                            {t("adults", { count: booking.num_adult ?? 0 })}
                                            {(booking.num_child ?? 0) > 0 ? ` · ${t("children", { count: booking.num_child ?? 0 })}` : ""}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Financeiro */}
                            <div className="rounded-2xl border border-gray-100 dark:border-white/10 p-5">
                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3">{t("financial")}</p>
                                <div className="space-y-1.5 text-[13px] tabular-nums">
                                    {booking.invoice_items.length > 0 ? (
                                        booking.invoice_items.map((it, i) => (
                                            <div key={i} className="flex justify-between gap-3">
                                                <span className="text-gray-500 dark:text-gray-400 truncate">{it.description}</span>
                                                <span className={cn("shrink-0", it.amount < 0 ? "text-red-500" : "text-gray-900 dark:text-white")}>{euro(it.amount)}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <>
                                            {booking.price !== null && (
                                                <div className="flex justify-between gap-3">
                                                    <span className="text-gray-500 dark:text-gray-400">{t("total")}</span>
                                                    <span className="text-gray-900 dark:text-white">{euro(booking.price)}</span>
                                                </div>
                                            )}
                                            {booking.commission !== null && booking.commission !== 0 && (
                                                <div className="flex justify-between gap-3">
                                                    <span className="text-gray-500 dark:text-gray-400">{t("commission")}</span>
                                                    <span className="text-red-500">−{euro(booking.commission)}</span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                    {booking.net_payout !== null && (
                                        <div className="flex justify-between gap-3 border-t border-gray-100 dark:border-white/10 mt-2 pt-2.5">
                                            <span className="font-bold text-gray-900 dark:text-white">{t("netPayout")}</span>
                                            <span className="font-black text-base text-gray-900 dark:text-white">{euro(booking.net_payout)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Contacto */}
                            <div className="rounded-2xl border border-gray-100 dark:border-white/10 p-5">
                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3">{t("contact")}</p>
                                {booking.guest_email || booking.guest_phone ? (
                                    <div className="space-y-2.5 text-[13px]">
                                        {booking.guest_email && (
                                            <a href={`mailto:${booking.guest_email}`} className="flex items-center gap-2.5 text-blue-600 dark:text-blue-400 hover:underline min-w-0">
                                                <Mail className="size-3.5 text-gray-400 shrink-0" /><span className="truncate">{booking.guest_email}</span>
                                            </a>
                                        )}
                                        {booking.guest_phone && (
                                            <a href={`tel:${booking.guest_phone}`} className="flex items-center gap-2.5 text-blue-600 dark:text-blue-400 hover:underline">
                                                <Phone className="size-3.5 text-gray-400 shrink-0" />{booking.guest_phone}
                                            </a>
                                        )}
                                    </div>
                                ) : (
                                    <p className="flex items-center gap-2 text-xs text-gray-400"><ShieldCheck className="size-3.5" />{t("contactMasked")}</p>
                                )}
                            </div>

                            {/* Meta */}
                            <div className="rounded-2xl border border-gray-100 dark:border-white/10 p-5">
                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3">{t("meta")}</p>
                                <div className="space-y-1.5 text-[11px] text-gray-400">
                                <div className="flex justify-between gap-3"><span>{t("booking")}</span><span className="font-mono">#{booking.beds24_booking_id}</span></div>
                                {booking.api_reference && (
                                    <div className="flex justify-between gap-3"><span>{t("reference")}</span><span className="font-mono truncate max-w-[200px]">{booking.api_reference}</span></div>
                                )}
                                {booking.booking_time && (
                                    <div className="flex justify-between gap-3"><span>{t("bookedAt")}</span><span>{fmtStamp(booking.booking_time)}</span></div>
                                )}
                                {booking.modified_time && (
                                    <div className="flex justify-between gap-3"><span>{t("modifiedAt")}</span><span>{fmtStamp(booking.modified_time)}</span></div>
                                )}
                                {booking.first_seen_via && (
                                    <div className="flex justify-between gap-3"><span>{t("origin")}</span><span className="capitalize">{booking.first_seen_via}</span></div>
                                )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
