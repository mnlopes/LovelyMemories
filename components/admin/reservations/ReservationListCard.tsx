"use client";

import { User, Home, Globe, MoreHorizontal, ArrowRight } from "lucide-react";
import { startOfDay } from "date-fns";

// Mobile-only card representation of a reservation row. Presentation only —
// data/handlers live in the Reservations page and are passed in as props.
export function ReservationListCard({
    reservation,
    t,
    formatDate,
    isNew,
    onOpenDetail,
    onOpenMenu,
}: {
    reservation: any;
    t: any;
    formatDate: (dateString: string) => string;
    isNew: (createdAt: string) => boolean;
    onOpenDetail: () => void;
    onOpenMenu: () => void;
}) {
    // Effective status purely for UI (mirrors the desktop table).
    // Beds24 bookings carry 'confirmed' | 'new'; treat 'new' as confirmed so the
    // date-derived badge applies instead of hitting a missing status.new message.
    let effectiveStatus = reservation.is_beds24 && reservation.status === "new" ? "confirmed" : reservation.status;
    if (!reservation.is_manual_block && effectiveStatus === "confirmed") {
        const today = startOfDay(new Date()).getTime();
        const checkIn = startOfDay(new Date(reservation.check_in)).getTime();
        const checkOut = startOfDay(new Date(reservation.check_out)).getTime();
        if (today >= checkIn && today < checkOut) effectiveStatus = "checked-in";
        else if (today >= checkOut) effectiveStatus = "completed";
    }

    const statusClass =
        effectiveStatus === "confirmed"
            ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/30"
            : effectiveStatus === "checked-in"
                ? "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-500/30"
                : effectiveStatus === "completed" || effectiveStatus === "checked-out"
                    ? "bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/20"
                    : effectiveStatus === "pending"
                        ? "bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-100 dark:border-yellow-500/30"
                        : effectiveStatus === "owner_block"
                            ? "bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-100 dark:border-purple-500/30"
                            : "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-500/30";

    return (
        <div className="bg-white dark:bg-admin-dark-surface rounded-2xl border border-[#f5f5f5] dark:border-admin-dark-border shadow-sm overflow-hidden">
            <div
                className={`flex gap-3 p-4 ${!reservation.is_manual_block ? "cursor-pointer" : ""}`}
                onClick={() => { if (!reservation.is_manual_block) onOpenDetail(); }}
            >
                <div className="size-10 rounded-full bg-[#f5f5f5] dark:bg-admin-dark-bg flex items-center justify-center text-[#171717] dark:text-admin-dark-text-primary shrink-0 border border-[#eeeeee] dark:border-admin-dark-border">
                    <User className="size-5 stroke-[1.5px]" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-[#171717] dark:text-admin-dark-text-primary truncate">{reservation.guest_name || "Guest"}</p>
                        {reservation.is_manual_block && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20 uppercase tracking-wide">{t("table.ownerBooking")}</span>
                        )}
                        {reservation.is_airbnb && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 uppercase tracking-wide">
                                <Globe className="size-2.5" />Airbnb
                            </span>
                        )}
                        {isNew(reservation.created_at) && !reservation.is_manual_block && !reservation.is_airbnb && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400 border border-sky-200 dark:border-sky-500/20 uppercase tracking-wide">{t("table.new")}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5 text-xs text-[#a3a3a3]">
                        <Home className="size-3 shrink-0" />
                        <span className="truncate">{reservation.property_name || "Unknown Property"}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs font-semibold text-[#171717] dark:text-admin-dark-text-primary">
                        <span>{formatDate(reservation.check_in)}</span>
                        <ArrowRight className="size-3 text-[#a3a3a3]" />
                        <span>{formatDate(reservation.check_out)}</span>
                    </div>
                    {effectiveStatus !== "airbnb" && (
                        <span className={`inline-flex items-center mt-2 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusClass}`}>
                            {effectiveStatus ? t(`status.${effectiveStatus}`) : t("status.pending")}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex items-center justify-between px-4 py-2.5 border-t border-[#f5f5f5] dark:border-admin-dark-border">
                <span className="text-[11px] text-[#a3a3a3] font-bold">
                    {t("table.reservedAt")} {formatDate(reservation.created_at)}
                </span>
                {!reservation.is_beds24 && (
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onOpenMenu(); }}
                        className="p-2 rounded-xl text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-all"
                        aria-label="More actions"
                    >
                        <MoreHorizontal className="size-5" />
                    </button>
                )}
            </div>
        </div>
    );
}
