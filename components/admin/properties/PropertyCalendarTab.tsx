"use client";

import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { MultiCalendarView } from "@/components/admin/reservations/MultiCalendarView";
import { usePropertyCalendarData } from "@/components/admin/properties/usePropertyCalendarData";

export function PropertyCalendarTab({ propertyId, locale }: { propertyId: string; locale: string }) {
    const t = useTranslations("AdminReservations.propertyTabs");
    const router = useRouter();
    const { loading, properties, reservations, blockedDates, propertyImages, allProperties, refresh } =
        usePropertyCalendarData(propertyId, locale);

    // MultiCalendarView expects `properties` as a Map keyed by property id ({ [id]: property }),
    // but usePropertyCalendarData returns a one-element array. Convert here.
    const propertiesMap = properties[0] ? { [properties[0].id]: properties[0] } : {};

    return (
        <div className="space-y-4">
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

            {loading ? (
                <div className="py-16 text-center text-sm text-[#a3a3a3] animate-pulse">{t("loading")}</div>
            ) : (
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
            )}
        </div>
    );
}
