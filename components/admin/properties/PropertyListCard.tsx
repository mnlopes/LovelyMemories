"use client";

import { RefreshCw, CalendarDays, MoreHorizontal } from "lucide-react";

// Mobile-only card representation of a property row. Presentation only —
// all data/handlers live in the Properties page and are passed in as props.
export function PropertyListCard({
    property,
    locale,
    t,
    formatRelativeTime,
    syncing,
    onForceSync,
    onOpenCalendar,
    onOpenMenu,
}: {
    property: any;
    locale: string;
    t: any;
    formatRelativeTime: (dateStr: string | null) => string;
    syncing: boolean;
    onForceSync: (e: React.MouseEvent) => void;
    onOpenCalendar: () => void;
    onOpenMenu: () => void;
}) {
    const title = property.title?.[locale] || property.title?.en || "Untitled";
    const mainImage = property.images?.find((img: any) => img.is_main)?.url || property.images?.[0]?.url;
    const subtitle = property.is_multi_unit ? t("badge.building") : `${property.type || "Standard"} • ${property.bedrooms || 0} BR`;

    const status = property.status || (property.is_active ? "active" : "hidden");
    const statusConfig = {
        active: { bg: "bg-emerald-50 dark:bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-500/30", dot: "bg-emerald-500", label: t("status.active") },
        coming_soon: { bg: "bg-amber-50 dark:bg-amber-500/10", text: "text-amber-700 dark:text-amber-400", border: "border-amber-200 dark:border-amber-500/30", dot: "bg-amber-500", label: t("status.comingSoon") },
        hidden: { bg: "bg-gray-50 dark:bg-gray-500/10", text: "text-gray-400 dark:text-admin-dark-text-secondary", border: "border-gray-100 dark:border-white/10", dot: "bg-gray-400", label: t("status.hidden") },
    }[status as "active" | "coming_soon" | "hidden"] || { bg: "bg-gray-50", text: "text-gray-400", border: "border-gray-100", dot: "bg-gray-400", label: t("status.unknown") };

    return (
        <div className="bg-white dark:bg-white/5 rounded-2xl border border-[#f5f5f5] dark:border-white/10 shadow-sm overflow-hidden">
            {/* Tappable summary → opens the property */}
            <div
                className="flex gap-3 p-4 cursor-pointer"
                onClick={() => (window.location.href = `/${locale}/admin/properties/${property.id}`)}
            >
                <div
                    className="size-16 rounded-xl bg-[#f5f5f5] dark:bg-admin-dark-bg bg-cover bg-center shrink-0 border border-[#eeeeee] dark:border-white/10"
                    style={{ backgroundImage: `url(${mainImage || "/placeholder-property.jpg"})` }}
                />
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <p className="font-bold text-[#171717] dark:text-admin-dark-text-primary truncate">{title}</p>
                        {property.is_multi_unit && (
                            <span className="shrink-0 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 text-[9px] font-bold uppercase tracking-wider border border-blue-200 dark:border-blue-500/30">
                                {t("badge.building")}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-[#a3a3a3] dark:text-admin-dark-text-secondary mt-0.5 font-medium">{subtitle}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-xs font-semibold text-[#171717] dark:text-admin-dark-text-primary">{property.city || property.address || "N/A"}</span>
                        <span className="text-[#d4d4d4] dark:text-white/20">·</span>
                        <span className="text-xs font-bold text-[#171717] dark:text-admin-dark-text-primary">
                            €{property.price_per_night || 0}
                            <span className="text-[10px] text-[#a3a3a3] font-normal ml-0.5 italic">{t("table.perNight")}</span>
                        </span>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.05em] ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border}`}>
                        <span className={`size-1.5 rounded-full ${statusConfig.dot}`} />
                        {statusConfig.label}
                    </span>
                </div>
            </div>

            {/* Footer: sync status + actions */}
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-[#f5f5f5] dark:border-white/10">
                {!property.is_multi_unit ? (
                    <span className="text-[11px] font-bold">
                        {property.sync_status === "failed" ? (
                            <span className="text-rose-500 uppercase tracking-wide">Sync failed</span>
                        ) : (
                            <span className="text-[#a3a3a3] dark:text-admin-dark-text-secondary">Synced {formatRelativeTime(property.last_sync_at)}</span>
                        )}
                    </span>
                ) : (
                    <span />
                )}

                <div className="flex items-center gap-1">
                    {!property.is_multi_unit && (
                        <>
                            <button
                                type="button"
                                onClick={onForceSync}
                                disabled={syncing}
                                className={`p-2 rounded-xl disabled:opacity-50 transition-all ${property.sync_status === "failed" ? "text-rose-600 bg-rose-50 dark:bg-rose-900/20" : "text-[#a3a3a3] hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"}`}
                                aria-label="Force sync"
                            >
                                <RefreshCw className={`size-5 ${syncing ? "animate-spin text-emerald-500" : ""}`} />
                            </button>
                            <button
                                type="button"
                                onClick={onOpenCalendar}
                                className="p-2 rounded-xl text-[#a3a3a3] hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all"
                                aria-label="View calendar"
                            >
                                <CalendarDays className="size-5" />
                            </button>
                        </>
                    )}
                    <button
                        type="button"
                        onClick={onOpenMenu}
                        className="p-2 rounded-xl text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-all"
                        aria-label="More actions"
                    >
                        <MoreHorizontal className="size-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
