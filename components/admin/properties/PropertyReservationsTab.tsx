"use client";

import { useTranslations } from "next-intl";
import { ReservationListCard } from "@/components/admin/reservations/ReservationListCard";
import { usePropertyCalendarData } from "@/components/admin/properties/usePropertyCalendarData";

export function PropertyReservationsTab({ propertyId, locale }: { propertyId: string; locale: string }) {
    const t = useTranslations("AdminReservations");
    const { loading, reservations } = usePropertyCalendarData(propertyId, locale);

    const formatDate = (d: string) => new Date(d).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
    const isNew = (createdAt: string) => (Date.now() - new Date(createdAt).getTime()) / 36e5 <= 24;

    const visible = reservations.filter((r) => r.status !== "cancelled");

    if (loading) return <div className="py-16 text-center text-sm text-[#a3a3a3] animate-pulse">{t("propertyTabs.loading")}</div>;
    if (!visible.length) return <div className="py-16 text-center text-sm text-[#a3a3a3]">{t("propertyTabs.noReservations")}</div>;

    return (
        <div className="space-y-3">
            {visible.map((r) => (
                <ReservationListCard
                    key={r.id}
                    reservation={r}
                    t={t}
                    formatDate={formatDate}
                    isNew={isNew}
                    onOpenDetail={() => {}}
                    onOpenMenu={() => {}}
                />
            ))}
        </div>
    );
}
