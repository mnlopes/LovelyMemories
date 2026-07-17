"use client";

import { MoreHorizontal, Sparkles } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Link } from "@/i18n/routing";
import { getOverviewData } from "@/app/actions/overview";

type OverviewDataLike = Awaited<ReturnType<typeof getOverviewData>>;

export default function AdminOverview() {
    const router = useRouter();
    const params = useParams();
    const locale = (params?.locale as string) || "en";
    const dateLocale = locale === "pt" ? pt : undefined;
    const t = useTranslations("AdminOverview");
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
    const [data, setData] = useState<OverviewDataLike | null>(null);

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/login");
                return;
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            if (profile?.role !== 'super_admin') {
                const loc = window.location.pathname.split('/')[1] || 'en';
                router.push(`/${loc}/admin/properties`);
            } else {
                setIsAuthorized(true);
            }
        };
        checkAuth();
    }, [router]);

    useEffect(() => {
        if (!isAuthorized) return;
        getOverviewData(locale).then(setData);
    }, [isAuthorized, locale]);

    if (isAuthorized === null) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-admin-text-primary"></div>
            </div>
        );
    }

    const hour = new Date().getHours();
    const greetingKey = hour < 12 ? "greetingMorning" : hour < 18 ? "greetingAfternoon" : "greetingEvening";
    const name = data?.firstName || "";

    const chipForStatus = (status: 'arrives_today' | 'departs_tomorrow' | 'staying' | 'arrives_soon', checkIn: string) => {
        switch (status) {
            case 'arrives_today':
                return { label: t("chipArrivesToday"), cls: "bg-emerald-500/90 text-white" };
            case 'departs_tomorrow':
                return { label: t("chipDepartsTomorrow"), cls: "bg-admin-text-secondary/80 text-white" };
            case 'staying':
                return { label: t("chipStaying"), cls: "bg-amber-500/90 text-white" };
            case 'arrives_soon':
            default:
                return { label: t("chipArrives", { day: format(new Date(checkIn), 'EEE', { locale: dateLocale }) }), cls: "bg-emerald-500/90 text-white" };
        }
    };

    const stTodayLabel = (today: 'occupied' | 'arrives_today' | 'free') => {
        if (today === 'occupied') return { label: t("stOccupied"), cls: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20" };
        if (today === 'arrives_today') return { label: t("stArrivesToday"), cls: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20" };
        return { label: t("stFree"), cls: "bg-admin-bg text-admin-text-secondary border border-admin-border" };
    };

    return (
        <div className="space-y-16 pb-20">
            {/* Header Section */}
            <section>
                <h2 className="text-3xl font-bold tracking-tight text-admin-text-primary">
                    {t(greetingKey, { name })}
                </h2>
                <p className="text-admin-text-secondary mt-2 font-medium">
                    {format(new Date(), 'EEEE, d MMM', { locale: dateLocale })}
                    {data && (
                        <>
                            {" · "}
                            {t("contextLine", {
                                staying: data.counts.staying,
                                arrivals: data.counts.arrivalsToday,
                                departures: data.counts.departuresTomorrow,
                            })}
                        </>
                    )}
                </p>
            </section>

            {/* Co-Host banner */}
            {data === null ? (
                <section className="rounded-[20px] bg-admin-surface border border-admin-border p-6 h-28 animate-pulse" />
            ) : data.cohost !== null ? (
                <section className="rounded-[20px] bg-[#14161a] dark:bg-black text-white p-6 flex flex-wrap items-center gap-5 shadow-sm">
                    <div className="bg-[#c5a059]/15 text-[#c5a059] rounded-2xl size-11 flex items-center justify-center shrink-0">
                        <Sparkles className="size-5" />
                    </div>
                    <div className="flex-1 min-w-[220px]">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold">{t("cohostTitle")}</h3>
                            <span className="bg-white text-[#14161a] text-[11px] font-bold px-2 py-0.5 rounded-full">
                                {t("toReview", { count: data.counts.pending })}
                            </span>
                        </div>
                        <p className="text-white/70 text-sm mt-1">{t("cohostSub", { count: data.counts.pending })}</p>
                        {(data.cohost.pending.length > 0 || data.cohost.alert) && (
                            <div className="flex flex-wrap gap-2 mt-3">
                                {data.cohost.pending.map((p) => (
                                    <span key={p.rowId} className="bg-white/10 border border-white/15 rounded-full px-3 py-1 text-[11px] font-bold">
                                        {p.title}
                                    </span>
                                ))}
                                {data.cohost.alert && (
                                    <span className="border border-red-400/40 text-red-300 rounded-full px-3 py-1 text-[11px] font-bold">
                                        {data.cohost.alert.label}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                    <Link href="/admin/cohost" className="bg-[#c5a059] text-[#14161a] rounded-2xl px-5 py-3 text-[12.5px] font-extrabold shrink-0">
                        {t("openCohost")}
                    </Link>
                </section>
            ) : null}

            {/* Arrivals & Departures */}
            <section className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold tracking-tight dark:text-admin-dark-text-primary">{t("staysTitle")}</h3>
                    <Link href="/admin/reservations" className="text-xs font-semibold text-admin-text-secondary hover:text-admin-text-primary transition-colors">
                        {t("seeCalendar")}
                    </Link>
                </div>
                {data === null ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                        {[0, 1, 2, 3].map((i) => (
                            <div key={i} className="h-44 rounded-xl bg-admin-surface border border-admin-border animate-pulse" />
                        ))}
                    </div>
                ) : data.stays.length === 0 ? (
                    <div className="bg-admin-surface rounded-2xl border border-admin-border p-8 text-center text-sm text-admin-text-secondary">
                        {t("noStays")}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                        {data.stays.map((stay, idx) => {
                            const chip = chipForStatus(stay.status, stay.checkIn);
                            return (
                                <div key={idx} className="bg-admin-surface rounded-xl border border-admin-border overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                    <div className="h-24 bg-cover bg-center relative bg-[#f5f5f5] dark:bg-white/5">
                                        {stay.propertyImage && (
                                            <img src={stay.propertyImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
                                        )}
                                        <span className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${chip.cls}`}>
                                            {chip.label}
                                        </span>
                                    </div>
                                    <div className="p-4">
                                        {/* Propriedade = título (é o que o operador reconhece); hóspede só quando o temos. */}
                                        <p className="font-bold text-admin-text-primary truncate">{stay.propertyTitle}</p>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            {stay.guestName
                                                ? <span className="text-xs text-admin-text-secondary truncate">{stay.guestName}</span>
                                                : <span className="text-xs text-admin-text-secondary italic">{t("guestUnknown")}</span>}
                                            {stay.source === 'airbnb' && (
                                                <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 uppercase tracking-wide">Airbnb</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4 py-3 mt-2 border-t border-admin-border">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-admin-text-secondary uppercase font-bold tracking-wider">{t("datesLabel")}</span>
                                                <span className="text-xs font-semibold text-admin-text-primary">
                                                    {format(new Date(stay.checkIn), 'MMM d')} – {format(new Date(stay.checkOut), 'MMM d')}
                                                </span>
                                            </div>
                                            {stay.guests != null && (
                                                <>
                                                    <div className="w-px h-8 bg-admin-border"></div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] text-admin-text-secondary uppercase font-bold tracking-wider">{t("guestsLabel")}</span>
                                                        <span className="text-xs font-semibold text-admin-text-primary">{stay.guests}</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* Property status */}
            <section className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold tracking-tight dark:text-admin-dark-text-primary">{t("propertiesTitle")}</h3>
                    <Link href="/admin/properties" className="text-xs font-semibold text-admin-text-secondary hover:text-admin-text-primary transition-colors">
                        {t("seeAll")}
                    </Link>
                </div>
                {data === null ? (
                    <div className="h-64 rounded-2xl bg-admin-surface border border-admin-border animate-pulse" />
                ) : (
                    <div className="bg-admin-surface rounded-2xl border border-admin-border overflow-hidden shadow-sm transition-colors duration-300 overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-admin-border">
                                    <th className="px-8 py-5 text-[10px] font-bold text-admin-text-secondary uppercase tracking-widest">{t("colProperty")}</th>
                                    <th className="px-8 py-5 text-[10px] font-bold text-admin-text-secondary uppercase tracking-widest">{t("colToday")}</th>
                                    <th className="px-8 py-5 text-[10px] font-bold text-admin-text-secondary uppercase tracking-widest">{t("colNextArrival")}</th>
                                    {data.cohost !== null && (
                                        <th className="px-8 py-5 text-[10px] font-bold text-admin-text-secondary uppercase tracking-widest">{t("colCohost")}</th>
                                    )}
                                    <th className="px-8 py-5 text-[10px] font-bold text-admin-text-secondary uppercase tracking-widest text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-admin-border">
                                {data.properties.map((property) => {
                                    const today = stTodayLabel(property.today);
                                    return (
                                        <tr key={property.id} className="group hover:bg-admin-bg transition-colors">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="size-[34px] rounded bg-admin-bg bg-cover bg-center shrink-0 shadow-sm border border-admin-border" style={{ backgroundImage: property.image ? `url(${property.image})` : undefined }}></div>
                                                    <div>
                                                        <p className="font-bold text-admin-text-primary">{property.title}</p>
                                                        <p className="text-xs text-admin-text-secondary mt-0.5">{property.city ?? '—'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${today.cls}`}>
                                                    {today.label}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <p className="text-sm font-medium text-admin-text-primary">
                                                    {property.nextArrival ? format(new Date(property.nextArrival), 'MMM d') : '—'}
                                                </p>
                                            </td>
                                            {data.cohost !== null && (
                                                <td className="px-8 py-6">
                                                    <p className={`text-sm font-bold ${property.pendingCount > 0 ? 'text-[#c5a059]' : 'text-admin-text-secondary'}`}>
                                                        {property.pendingCount > 0 ? t("toReview", { count: property.pendingCount }) : '—'}
                                                    </p>
                                                </td>
                                            )}
                                            <td className="px-8 py-6 text-right font-medium">
                                                <Link href={`/admin/properties/${property.id}`} className="text-admin-text-secondary hover:text-admin-text-primary transition-colors inline-flex">
                                                    <MoreHorizontal className="size-5" />
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}
