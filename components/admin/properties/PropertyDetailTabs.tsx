"use client";

import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { CalendarDays, ListChecks, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { PropertyCalendarTab } from "@/components/admin/properties/PropertyCalendarTab";
import { PropertyReservationsTab } from "@/components/admin/properties/PropertyReservationsTab";

type TabId = "overview" | "calendar" | "reservations";

export function PropertyDetailTabs({
    propertyId,
    locale,
    isNew,
    overview,
}: {
    propertyId: string;
    locale: string;
    isNew: boolean;
    overview: React.ReactNode;
}) {
    const t = useTranslations("AdminReservations.propertyTabs");
    const sp = useSearchParams();
    const active = (sp.get("tab") as TabId) || "overview";

    if (isNew) return <>{overview}</>;

    const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
        { id: "overview", label: t("overview"), icon: <SlidersHorizontal className="size-4" /> },
        { id: "calendar", label: t("calendar"), icon: <CalendarDays className="size-4" /> },
        { id: "reservations", label: t("reservations"), icon: <ListChecks className="size-4" /> },
    ];

    return (
        <div className="space-y-6">
            <nav className="flex gap-1 border-b border-admin-border dark:border-admin-dark-border">
                {tabs.map((tab) => (
                    <Link
                        key={tab.id}
                        href={`/admin/properties/${propertyId}?tab=${tab.id}`}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2.5 text-sm font-semibold -mb-px border-b-2 transition-colors",
                            active === tab.id
                                ? "border-[#171717] dark:border-white text-[#171717] dark:text-white"
                                : "border-transparent text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white",
                        )}
                    >
                        {tab.icon}
                        {tab.label}
                    </Link>
                ))}
            </nav>

            {active === "overview" && overview}
            {active === "calendar" && <PropertyCalendarTab propertyId={propertyId} locale={locale} />}
            {active === "reservations" && <PropertyReservationsTab propertyId={propertyId} locale={locale} />}
        </div>
    );
}
