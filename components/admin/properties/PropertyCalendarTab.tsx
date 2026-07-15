"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { CalendarRange, CalendarDays, LayoutGrid } from "lucide-react";
import { MultiCalendarView } from "@/components/admin/reservations/MultiCalendarView";
import AnnualCalendarTab from "@/components/admin/properties/AnnualCalendarTab";
import { usePropertyCalendarData } from "@/components/admin/properties/usePropertyCalendarData";

type CalendarTabView = "timeline" | "monthly" | "annual";

export function PropertyCalendarTab({ propertyId, locale }: { propertyId: string; locale: string }) {
    const t = useTranslations("AdminReservations.propertyTabs");
    const router = useRouter();
    const [view, setView] = useState<CalendarTabView>("timeline");
    const { loading, properties, reservations, blockedDates, propertyImages, allProperties, refresh } =
        usePropertyCalendarData(propertyId, locale);

    // MultiCalendarView expects `properties` as a Map keyed by property id ({ [id]: property }),
    // but usePropertyCalendarData returns a one-element array. Convert here.
    const propertiesMap = properties[0] ? { [properties[0].id]: properties[0] } : {};

    const segments: [CalendarTabView, string, typeof CalendarRange][] = [
        ["timeline", t("viewTimeline"), CalendarRange],
        ["monthly", t("viewMonth"), CalendarDays],
        ["annual", t("viewYear"), LayoutGrid],
    ];

    return (
        <div className="space-y-4">
            {/* Property dropdown — stays ABOVE the view switcher, applies to all three views */}
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
                    reservations={reservations}
                    properties={propertiesMap}
                    propertyImages={propertyImages}
                    blockedDates={blockedDates}
                    locale={locale}
                    canShowPrices={true}
                    initialRange={31}
                    onRefresh={refresh}
                />
            ) : (
                // AnnualCalendarTab was built for a modal that bounded its height; it relies on
                // h-full + an internal overflow-y-auto scrollport, sticky headers, and a "Today"
                // scroll-to FAB. This admin page has no ancestor with a definite height, so we
                // give it one here: viewport height minus the admin header (h-16/h-20), the page
                // padding (p-4 sm:p-6 lg:p-10), the property tab nav, the property dropdown row,
                // and the view switcher above it (~20rem covers that stack across breakpoints).
                <div className="h-[calc(100vh-20rem)] min-h-[32rem]">
                    <AnnualCalendarTab
                        propertyId={propertyId}
                        activeLang={locale}
                        view={view}
                        onViewChange={(v) => setView(v)}
                    />
                </div>
            )}
        </div>
    );
}
