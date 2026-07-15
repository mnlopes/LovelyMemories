"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CalendarRange, CalendarDays, LayoutGrid } from "lucide-react";
import { MultiCalendarView } from "@/components/admin/reservations/MultiCalendarView";
import AnnualCalendarTab from "@/components/admin/properties/AnnualCalendarTab";
import { usePropertyCalendarData } from "@/components/admin/properties/usePropertyCalendarData";
import { applyBeds24Lens } from "@/lib/beds24-calendar-lens";
import { getBeds24CalendarPreview, type Beds24CalendarPreviewResult } from "@/app/actions/beds24";

type CalendarTabView = "timeline" | "monthly" | "annual";

export function PropertyCalendarTab({ propertyId, locale, isSuperAdmin }: { propertyId: string; locale: string; isSuperAdmin: boolean }) {
    const t = useTranslations("AdminReservations.propertyTabs");
    const tc = useTranslations("AdminReservations");
    const router = useRouter();
    const [view, setView] = useState<CalendarTabView>("timeline");
    const { loading, properties, reservations, blockedDates, propertyImages, allProperties, pricePerNight, refresh } =
        usePropertyCalendarData(propertyId, locale);

    // Beds24 source lens (super_admin; local, non-persisting) — mirrors the reservations hub.
    const [beds24Preview, setBeds24Preview] = useState(false);
    const [beds24Data, setBeds24Data] = useState<Extract<Beds24CalendarPreviewResult, { ok: true }> | null>(null);
    const [beds24Loading, setBeds24Loading] = useState(false);
    const toggleBeds24Preview = async () => {
        if (beds24Preview) { setBeds24Preview(false); setBeds24Data(null); return; }
        setBeds24Loading(true);
        try {
            const r = await getBeds24CalendarPreview();
            if (r.ok) { setBeds24Data(r); setBeds24Preview(true); }
            else { toast.error(r.error); }
        } finally { setBeds24Loading(false); }
    };

    // MultiCalendarView expects `properties` as a Map keyed by property id.
    const propertiesMap = properties[0] ? { [properties[0].id]: properties[0] } : {};

    // Scope the preview to THIS property (the hook data is single-property; the Month view
    // does not filter by property, so injecting other properties' bookings would leak in).
    const scopedPreview = beds24Preview && beds24Data
        ? { bookings: beds24Data.bookings.filter((b) => b.property_id === propertyId), internalPropertyIds: beds24Data.internalPropertyIds }
        : null;
    const { reservations: calReservations, blockedDates: calBlockedDates } = applyBeds24Lens(reservations, blockedDates, scopedPreview);

    const segments: [CalendarTabView, string, typeof CalendarRange][] = [
        ["timeline", t("viewTimeline"), CalendarRange],
        ["monthly", t("viewMonth"), CalendarDays],
        ["annual", t("viewYear"), LayoutGrid],
    ];

    return (
        <div className="space-y-4">
            {/* Property dropdown + (super_admin) Beds24 source toggle */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#a3a3a3]">{t("switchProperty")}</label>
                    <select
                        value={propertyId}
                        onChange={(e) => router.push(`/admin/properties/${e.target.value}?tab=calendar`)}
                        className="rounded-lg border border-admin-border dark:border-admin-dark-border bg-white dark:bg-admin-dark-surface px-3 py-1.5 text-sm font-semibold"
                    >
                        {allProperties.map((p) => (
                            <option key={p.id} value={p.id}>{p.title}</option>
                        ))}
                    </select>
                </div>
                {isSuperAdmin && (
                    <div className="flex items-center gap-2 bg-white dark:bg-admin-dark-surface border border-[#f5f5f5] dark:border-admin-dark-border rounded-lg p-1">
                        <span className="pl-2 text-[9px] font-bold uppercase tracking-widest text-[#a3a3a3]">{tc("dataSource")}</span>
                        <button
                            onClick={() => { if (beds24Preview) void toggleBeds24Preview(); }}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${!beds24Preview ? "bg-[#171717] dark:bg-white text-white dark:text-black shadow-sm" : "text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white"}`}
                        >
                            iCal
                        </button>
                        <button
                            onClick={() => { if (!beds24Preview) void toggleBeds24Preview(); }}
                            disabled={beds24Loading}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all disabled:opacity-60 ${beds24Preview ? "bg-rose-500 text-white shadow-sm" : "text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white"}`}
                        >
                            <span className={`size-1.5 rounded-full ${beds24Preview ? "bg-white" : "bg-rose-400"} ${beds24Loading ? "animate-pulse" : ""}`} />
                            Beds24
                        </button>
                    </div>
                )}
            </div>

            {/* Single 3-way view switcher: Timeline · Month · Year */}
            <div className="flex items-center gap-0.5 bg-[#f3f3f3] dark:bg-white/10 p-1 rounded-xl w-fit">
                {segments.map(([v, label, Icon]) => (
                    <button
                        key={v}
                        onClick={() => setView(v)}
                        aria-label={label}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-200
                            ${view === v
                                ? "bg-white dark:bg-admin-dark-surface text-[#171717] dark:text-white shadow-sm"
                                : "text-[#999] hover:text-[#171717] dark:hover:text-white"
                            }`}
                    >
                        <Icon className="size-3.5" />
                        <span className="hidden sm:inline">{label}</span>
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="py-16 text-center text-sm text-[#a3a3a3] animate-pulse">{t("loading")}</div>
            ) : view === "timeline" ? (
                <MultiCalendarView
                    reservations={calReservations}
                    properties={propertiesMap}
                    propertyImages={propertyImages}
                    blockedDates={calBlockedDates}
                    locale={locale}
                    canShowPrices={true}
                    initialRange={31}
                    onRefresh={refresh}
                />
            ) : (
                // AnnualCalendarTab was built for a modal that bounded its height; give it one here.
                <div className="h-[calc(100vh-20rem)] min-h-[32rem]">
                    <AnnualCalendarTab
                        propertyId={propertyId}
                        activeLang={locale}
                        view={view}
                        onViewChange={(v) => setView(v)}
                        reservations={calReservations}
                        blockedDates={calBlockedDates}
                        pricePerNight={pricePerNight}
                    />
                </div>
            )}
        </div>
    );
}
