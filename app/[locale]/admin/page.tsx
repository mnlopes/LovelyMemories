"use client";

import { MoreHorizontal, Sparkles, AlertTriangle, LogIn, LogOut } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Link } from "@/i18n/routing";
import { getOverviewData } from "@/app/actions/overview";
import { dismissDraft } from "@/app/actions/ai-inbox";

type OverviewDataLike = Awaited<ReturnType<typeof getOverviewData>>;

export default function AdminOverview() {
    const router = useRouter();
    const params = useParams();
    const locale = (params?.locale as string) || "en";
    const dateLocale = locale === "pt" ? pt : undefined;
    const t = useTranslations("AdminOverview");
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
    const [data, setData] = useState<OverviewDataLike | null>(null);
    // Desktop: filtro da tabela Property status + estado do dismiss no rail Co-Host.
    const [propFilter, setPropFilter] = useState<"all" | "free" | "arriving" | "attention">("all");
    const [dismissing, setDismissing] = useState<string | null>(null);

    const handleDismiss = async (rowId: string) => {
        setDismissing(rowId);
        try {
            await dismissDraft(rowId);
            setData(await getOverviewData(locale));
        } finally {
            setDismissing(null);
        }
    };

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

            if (profile?.role !== 'super_admin' && profile?.role !== 'admin') {
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

    // ── Desktop: dados derivados para as listas, filtros e rail ──────────────
    const arrivals = data?.stays.filter((s) => s.status === 'arrives_today') ?? [];
    const departures = data?.stays.filter((s) => s.status === 'departs_tomorrow') ?? [];
    const filterCounts = {
        all: data?.properties.length ?? 0,
        free: data?.properties.filter((p) => p.today === 'free').length ?? 0,
        arriving: data?.properties.filter((p) => p.today === 'arrives_today').length ?? 0,
        attention: data?.properties.filter((p) => p.pendingCount > 0).length ?? 0,
    };
    const filteredProperties = (data?.properties ?? []).filter((p) =>
        propFilter === 'all' ? true
            : propFilter === 'free' ? p.today === 'free'
                : propFilter === 'arriving' ? p.today === 'arrives_today'
                    : p.pendingCount > 0
    );
    // FREE em dourado no desktop (destaca as noites vendáveis — âmbar já é o "arrives today").
    const tonightChip = (today: 'occupied' | 'arrives_today' | 'free') =>
        today === 'free'
            ? { label: t("stFree"), cls: "bg-[#c5a059]/10 text-[#a9863f] dark:text-[#c5a059] border border-[#c5a059]/25" }
            : stTodayLabel(today);

    return (
        <div className="space-y-8 md:space-y-6 pb-4">
            {/* Header Section */}
            <section className="md:flex md:items-end md:justify-between md:gap-6">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-admin-text-primary">
                        {t(greetingKey, { name })}
                    </h2>
                    <p className="text-admin-text-secondary mt-2 font-medium">
                        {format(new Date(), 'EEEE, d MMM', { locale: dateLocale })}
                    </p>
                </div>
                {/* Desktop: tiles de estatística — só informação, não clicáveis (mobile: pills por baixo). */}
                {data && (
                    <div className="hidden md:flex gap-2.5 shrink-0">
                        {[
                            { n: data.counts.staying, label: t("pillStaying"), numCls: "text-admin-text-primary" },
                            { n: data.counts.arrivalsToday, label: t("pillArriving"), numCls: "text-emerald-600 dark:text-emerald-400" },
                            { n: data.counts.departuresTomorrow, label: t("pillDeparting"), numCls: "text-amber-600 dark:text-amber-400" },
                        ].map((s, i) => (
                            <div key={i} className="bg-admin-surface border border-admin-border rounded-xl px-4 py-2.5 text-center min-w-[88px]">
                                <p className={`text-xl font-bold leading-none ${s.numCls}`}>{s.n}</p>
                                <p className="mt-1 text-[10px] font-semibold text-admin-text-secondary">{s.label}</p>
                            </div>
                        ))}
                        {data.cohost !== null && (
                            <div className="bg-[#14161a] dark:bg-black border border-[#14161a] dark:border-white/10 rounded-xl px-4 py-2.5 text-center min-w-[88px]">
                                <p className="text-xl font-bold leading-none text-[#c5a059]">{data.counts.pending}</p>
                                <p className="mt-1 text-[10px] font-semibold text-white/60">{t("tileToReview")}</p>
                            </div>
                        )}
                    </div>
                )}
                {data && (
                    <div className="mt-4 grid grid-cols-3 gap-2 md:hidden">
                        {[
                            { n: data.counts.staying, label: t("pillStaying"), cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400" },
                            { n: data.counts.arrivalsToday, label: t("pillArriving"), cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" },
                            { n: data.counts.departuresTomorrow, label: t("pillDeparting"), cls: "bg-admin-bg text-admin-text-secondary" },
                        ].map((s, i) => (
                            <div key={i} className={`rounded-xl py-2.5 text-center ${s.cls}`}>
                                <p className="text-lg font-bold leading-none">{s.n}</p>
                                <p className="mt-1 text-[10px] uppercase tracking-wide font-semibold opacity-80">{s.label}</p>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Co-Host banner — só mobile (no desktop o co-host vive no rail lateral) */}
            {data === null ? (
                <section className="md:hidden rounded-[20px] bg-admin-surface border border-admin-border p-6 h-28 animate-pulse" />
            ) : data.cohost !== null ? (
                <>
                {/* Mobile: banner compacto (título+badge · subtítulo/alerta · CTA largo) */}
                <section className="md:hidden rounded-[20px] bg-[#14161a] dark:bg-black text-white p-5 shadow-sm">
                    <div className="flex items-center gap-2">
                        <Sparkles className="size-4 text-[#c5a059] shrink-0" />
                        <h3 className="font-bold text-sm">{t("cohostTitle")}</h3>
                        <span className="ml-auto bg-white text-[#14161a] text-[11px] font-bold px-2.5 py-0.5 rounded-full shrink-0">
                            {t("toReview", { count: data.counts.pending })}
                        </span>
                    </div>
                    <p className={`text-sm mt-1.5 ${data.cohost.alert ? "text-red-300" : "text-white/70"}`}>
                        {data.cohost.alert ? data.cohost.alert.label : t("cohostSub", { count: data.counts.pending })}
                    </p>
                    <Link href="/admin/cohost" className="mt-4 flex items-center justify-center bg-[#c5a059] text-[#14161a] rounded-2xl py-3 text-[13px] font-extrabold">
                        {t("reviewReplies", { count: data.counts.pending })}
                    </Link>
                </section>

                </>
            ) : null}

            {/* Arrivals & Departures — só mobile (desktop usa as listas compactas abaixo) */}
            <section className="md:hidden space-y-6">
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
                    <>
                    {/* Mobile: carrossel horizontal de cartões compactos (cap 8 — o servidor
                        devolve até 20 para as listas desktop) */}
                    <div className="md:hidden -mx-4 px-4 flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-hide">
                        {data.stays.slice(0, 8).map((stay, idx) => {
                            const chip = chipForStatus(stay.status, stay.checkIn);
                            return (
                                <div key={idx} className="snap-start shrink-0 w-[168px] bg-admin-surface rounded-xl border border-admin-border overflow-hidden shadow-sm">
                                    <div className="h-20 bg-cover bg-center relative bg-[#f5f5f5] dark:bg-white/5">
                                        {stay.propertyImage && (
                                            <img src={stay.propertyImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
                                        )}
                                        <span className={`absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide ${chip.cls}`}>
                                            {chip.label}
                                        </span>
                                    </div>
                                    <div className="p-2.5">
                                        <p className="font-bold text-admin-text-primary truncate text-[13px]">{stay.propertyTitle}</p>
                                        <div className="flex items-center gap-1 mt-0.5">
                                            {stay.guestName
                                                ? <span className="text-[11px] text-admin-text-secondary truncate">{stay.guestName}</span>
                                                : <span className="text-[11px] text-admin-text-secondary italic truncate">{t("guestUnknown")}</span>}
                                            {stay.source === 'airbnb' && (
                                                <span className="shrink-0 text-[8px] font-bold px-1 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 uppercase">Airbnb</span>
                                            )}
                                        </div>
                                        <p className="text-[11px] font-semibold text-admin-text-primary mt-1.5">
                                            {format(new Date(stay.checkIn), 'MMM d')} – {format(new Date(stay.checkOut), 'MMM d')}
                                            {stay.guests != null && <span className="text-admin-text-secondary font-normal"> · {stay.guests}p</span>}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    </>
                )}
            </section>

            {/* Property status — só mobile (desktop usa a tabela densa com filtros abaixo) */}
            <section className="md:hidden space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold tracking-tight dark:text-admin-dark-text-primary">{t("propertiesTitle")}</h3>
                    <Link href="/admin/properties" className="text-xs font-semibold text-admin-text-secondary hover:text-admin-text-primary transition-colors">
                        {t("seeAll")}
                    </Link>
                </div>
                {data === null ? (
                    <div className="h-64 rounded-2xl bg-admin-surface border border-admin-border animate-pulse" />
                ) : (
                    <>
                    {/* Mobile: cartões tocáveis (a tabela abaixo é só desktop) */}
                    <div className="md:hidden flex flex-col gap-2">
                        {data.properties.map((property) => {
                            const today = stTodayLabel(property.today);
                            return (
                                <Link
                                    key={property.id}
                                    href={`/admin/properties/${property.id}`}
                                    className="flex items-center gap-3 bg-admin-surface rounded-2xl border border-admin-border p-3 shadow-sm active:scale-[0.99] transition-transform"
                                >
                                    <div className="size-11 rounded-xl bg-admin-bg bg-cover bg-center shrink-0 border border-admin-border" style={{ backgroundImage: property.image ? `url(${property.image})` : undefined }} />
                                    <div className="min-w-0 flex-1">
                                        <p className="font-bold text-admin-text-primary truncate text-sm">{property.title}</p>
                                        <p className="text-xs text-admin-text-secondary mt-0.5 truncate">
                                            {property.city ?? '—'}
                                            {property.nextArrival && ` · ${t("nextArrivalShort", { date: format(new Date(property.nextArrival), 'MMM d') })}`}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${today.cls}`}>
                                            {today.label}
                                        </span>
                                        {data.cohost !== null && property.pendingCount > 0 && (
                                            <span className="text-[10px] font-bold text-[#c5a059]">{t("toReview", { count: property.pendingCount })}</span>
                                        )}
                                    </div>
                                </Link>
                            );
                        })}
                    </div>

                    </>
                )}
            </section>

            {/* ── Desktop: duas colunas — listas + tabela | rail Co-Host ─────────
                Rail só ≥lg (no MacBook 13" o conteúdo tem ~1000px úteis; abaixo de
                lg o rail cai para baixo do conteúdo a toda a largura). */}
            <div className="hidden md:grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-5 items-start">
                <div className="min-w-0 space-y-5">
                    {data === null ? (
                        <>
                            <div className="grid grid-cols-2 gap-5">
                                <div className="h-64 rounded-2xl bg-admin-surface border border-admin-border animate-pulse" />
                                <div className="h-64 rounded-2xl bg-admin-surface border border-admin-border animate-pulse" />
                            </div>
                            <div className="h-96 rounded-2xl bg-admin-surface border border-admin-border animate-pulse" />
                        </>
                    ) : (
                        <>
                            {/* Chegadas hoje | Saídas amanhã — listas compactas lado a lado */}
                            <div className="grid grid-cols-2 gap-5">
                                <div className="bg-admin-surface rounded-2xl border border-admin-border overflow-hidden shadow-sm">
                                    <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-admin-border">
                                        <h3 className="text-[13px] font-bold text-admin-text-primary flex items-center gap-1.5 min-w-0">
                                            <LogIn className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                            <span className="truncate">{t("arrivingToday")} · {arrivals.length}</span>
                                        </h3>
                                        <Link href="/admin/reservations" className="text-[11px] font-semibold text-[#c5a059] hover:opacity-80 shrink-0">
                                            {t("seeCalendar")}
                                        </Link>
                                    </div>
                                    {arrivals.length === 0 ? (
                                        <p className="px-4 py-6 text-xs text-admin-text-secondary">{t("noArrivals")}</p>
                                    ) : (
                                        <div className="py-1.5">
                                            {arrivals.slice(0, 6).map((stay, idx) => (
                                                <div key={idx} className="flex items-center gap-2.5 px-4 py-2">
                                                    <div className="size-9 rounded-lg bg-admin-bg bg-cover bg-center shrink-0 border border-admin-border" style={{ backgroundImage: stay.propertyImage ? `url(${stay.propertyImage})` : undefined }} />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-[13px] font-bold text-admin-text-primary truncate">{stay.propertyTitle}</p>
                                                        <p className="text-[11px] text-admin-text-secondary truncate">
                                                            {stay.guestName || t("guestUnknown")} · {format(new Date(stay.checkIn), 'MMM d')} – {format(new Date(stay.checkOut), 'MMM d')}
                                                            {stay.guests != null && <> · {stay.guests}p</>}
                                                        </p>
                                                    </div>
                                                    {stay.source === 'airbnb' && (
                                                        <span className="shrink-0 text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 uppercase">Airbnb</span>
                                                    )}
                                                </div>
                                            ))}
                                            {arrivals.length > 6 && (
                                                <Link href="/admin/reservations" className="block px-4 pb-2.5 pt-1 text-[11px] font-semibold text-[#c5a059]">
                                                    {t("showAll", { count: arrivals.length })}
                                                </Link>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="bg-admin-surface rounded-2xl border border-admin-border overflow-hidden shadow-sm">
                                    <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-admin-border">
                                        <h3 className="text-[13px] font-bold text-admin-text-primary flex items-center gap-1.5 min-w-0">
                                            <LogOut className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
                                            <span className="truncate">{t("departingTomorrow")} · {departures.length}</span>
                                        </h3>
                                    </div>
                                    {departures.length === 0 ? (
                                        <p className="px-4 py-6 text-xs text-admin-text-secondary">{t("noDepartures")}</p>
                                    ) : (
                                        <div className="py-1.5">
                                            {departures.slice(0, 6).map((stay, idx) => (
                                                <div key={idx} className="flex items-center gap-2.5 px-4 py-2">
                                                    <div className="size-9 rounded-lg bg-admin-bg bg-cover bg-center shrink-0 border border-admin-border" style={{ backgroundImage: stay.propertyImage ? `url(${stay.propertyImage})` : undefined }} />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-[13px] font-bold text-admin-text-primary truncate">{stay.propertyTitle}</p>
                                                        <p className="text-[11px] text-admin-text-secondary truncate">
                                                            {stay.guestName || t("guestUnknown")} · {t("outOn", { date: format(new Date(stay.checkOut), 'MMM d') })}
                                                        </p>
                                                    </div>
                                                    {stay.sameDayTurn && (
                                                        <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                                                            {t("sameDayTurn")}
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                            {departures.length > 6 && (
                                                <Link href="/admin/reservations" className="block px-4 pb-2.5 pt-1 text-[11px] font-semibold text-[#c5a059]">
                                                    {t("showAll", { count: departures.length })}
                                                </Link>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Property status — tabela densa com filtros */}
                            <div className="bg-admin-surface rounded-2xl border border-admin-border overflow-hidden shadow-sm">
                                <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-admin-border flex-wrap">
                                    <h3 className="text-[13px] font-bold text-admin-text-primary">{t("propertiesTitle")}</h3>
                                    <div className="flex gap-1.5 flex-wrap">
                                        {([
                                            { key: 'all', label: t("filterAll"), count: filterCounts.all },
                                            { key: 'free', label: t("filterFree"), count: filterCounts.free },
                                            { key: 'arriving', label: t("filterArriving"), count: filterCounts.arriving },
                                            ...(data.cohost !== null ? [{ key: 'attention', label: t("filterAttention"), count: filterCounts.attention }] : []),
                                        ] as { key: 'all' | 'free' | 'arriving' | 'attention'; label: string; count: number }[]).map((f) => (
                                            <button
                                                key={f.key}
                                                onClick={() => setPropFilter(f.key)}
                                                className={`text-[11px] font-semibold rounded-full px-2.5 py-1 transition-colors ${propFilter === f.key
                                                    ? 'bg-admin-text-primary text-admin-surface'
                                                    : 'border border-admin-border text-admin-text-secondary hover:text-admin-text-primary'}`}
                                            >
                                                {f.label} {f.count}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <table className="w-full text-left table-fixed">
                                    <thead>
                                        <tr className="border-b border-admin-border">
                                            <th className="w-[30%] px-4 py-3 text-[10px] font-bold text-admin-text-secondary uppercase tracking-widest">{t("colProperty")}</th>
                                            <th className="w-[13%] px-2 py-3 text-[10px] font-bold text-admin-text-secondary uppercase tracking-widest">{t("colTonight")}</th>
                                            <th className="w-[24%] px-2 py-3 text-[10px] font-bold text-admin-text-secondary uppercase tracking-widest">{t("colGuestInHouse")}</th>
                                            <th className="w-[13%] px-2 py-3 text-[10px] font-bold text-admin-text-secondary uppercase tracking-widest">{t("colNextArrival")}</th>
                                            {data.cohost !== null && (
                                                <th className="w-[14%] px-2 py-3 text-[10px] font-bold text-admin-text-secondary uppercase tracking-widest">{t("colCohost")}</th>
                                            )}
                                            <th className="w-[6%] px-4 py-3"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-admin-border">
                                        {filteredProperties.length === 0 ? (
                                            <tr>
                                                <td colSpan={data.cohost !== null ? 6 : 5} className="px-4 py-6 text-xs text-admin-text-secondary">—</td>
                                            </tr>
                                        ) : filteredProperties.map((property) => {
                                            const tonight = tonightChip(property.today);
                                            return (
                                                <tr key={property.id} className={`group transition-colors ${property.today === 'free' ? 'bg-[#c5a059]/[0.05] hover:bg-[#c5a059]/10' : 'hover:bg-admin-bg'}`}>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <div className="size-8 rounded-lg bg-admin-bg bg-cover bg-center shrink-0 border border-admin-border" style={{ backgroundImage: property.image ? `url(${property.image})` : undefined }} />
                                                            <div className="min-w-0">
                                                                <p className="text-[13px] font-bold text-admin-text-primary truncate">{property.title}</p>
                                                                <p className="text-[11px] text-admin-text-secondary truncate">{property.city ?? '—'}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-2 py-3">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${tonight.cls}`}>
                                                            {tonight.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-2 py-3">
                                                        {property.guestInHouse ? (
                                                            <p className="text-xs text-admin-text-primary truncate">
                                                                {property.guestInHouse.name || t("guestUnknown")}
                                                                <span className="text-admin-text-secondary"> · {t("outOn", { date: format(new Date(property.guestInHouse.checkOut), 'MMM d') })}</span>
                                                            </p>
                                                        ) : (
                                                            <p className="text-xs text-admin-text-secondary">—</p>
                                                        )}
                                                    </td>
                                                    <td className="px-2 py-3">
                                                        <p className="text-xs font-medium text-admin-text-primary">
                                                            {property.nextArrival ? format(new Date(property.nextArrival), 'MMM d') : '—'}
                                                        </p>
                                                    </td>
                                                    {data.cohost !== null && (
                                                        <td className="px-2 py-3">
                                                            {property.pendingCount > 0 ? (
                                                                <Link href="/admin/cohost" className="text-xs font-bold text-[#c5a059] hover:opacity-80">
                                                                    {t("toReview", { count: property.pendingCount })} →
                                                                </Link>
                                                            ) : (
                                                                <p className="text-xs text-admin-text-secondary">—</p>
                                                            )}
                                                        </td>
                                                    )}
                                                    <td className="px-4 py-3 text-right">
                                                        <Link href={`/admin/properties/${property.id}`} className="text-admin-text-secondary hover:text-admin-text-primary transition-colors inline-flex">
                                                            <MoreHorizontal className="size-4" />
                                                        </Link>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>

                {/* Rail Co-Host — rascunhos reais com a mensagem do hóspede */}
                {data === null ? (
                    <div className="h-80 rounded-[20px] bg-admin-surface border border-admin-border animate-pulse" />
                ) : data.cohost !== null ? (
                    <aside className="rounded-[20px] bg-[#14161a] dark:bg-black text-white p-5 lg:sticky lg:top-24">
                        <div className="flex items-center gap-2">
                            <Sparkles className="size-4 text-[#c5a059] shrink-0" />
                            <h3 className="font-bold text-sm">{t("cohostTitle")}</h3>
                            <span className="ml-auto bg-[#c5a059] text-[#14161a] text-[11px] font-bold px-2.5 py-0.5 rounded-full shrink-0">
                                {t("toReview", { count: data.counts.pending })}
                            </span>
                        </div>
                        <p className="text-white/60 text-xs mt-1.5">{t("cohostSub", { count: data.counts.pending })}</p>
                        {data.cohost.alert && (
                            <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2.5">
                                <AlertTriangle className="size-3.5 text-red-300 shrink-0 mt-0.5" />
                                <p className="text-[11px] font-semibold text-red-300">{data.cohost.alert.label}</p>
                            </div>
                        )}
                        <div className="mt-3 space-y-2">
                            {data.cohost.pending.length === 0 ? (
                                <p className="text-xs text-white/50 py-2">{t("cohostEmpty")}</p>
                            ) : data.cohost.pending.map((p) => (
                                <div key={p.rowId} className="rounded-xl bg-white/[0.06] p-3">
                                    <div className="flex items-baseline justify-between gap-2">
                                        <p className="text-[12px] font-bold truncate">
                                            {p.guestName || t("guestUnknown")}
                                            {p.propertyCode ? <span className="text-white/50 font-semibold"> · {p.propertyCode}</span> : null}
                                        </p>
                                        <span className="text-[10px] text-white/40 shrink-0">{format(new Date(p.createdAt), 'HH:mm')}</span>
                                    </div>
                                    {/* A mensagem do hóspede é o herói (mesma decisão do DecisionDetailSheet) */}
                                    <p className="text-[12px] text-white/75 leading-relaxed mt-1 line-clamp-2">“{p.message}”</p>
                                    <div className="flex gap-2 mt-2.5">
                                        <Link
                                            href={`/admin/cohost?decision=${p.rowId}`}
                                            className="bg-[#c5a059] text-[#14161a] rounded-lg px-3 py-1.5 text-[11px] font-extrabold hover:opacity-90 transition-opacity"
                                        >
                                            {t("reviewDraft")}
                                        </Link>
                                        <button
                                            onClick={() => handleDismiss(p.rowId)}
                                            disabled={dismissing === p.rowId}
                                            className="border border-white/15 text-white/60 hover:text-white rounded-lg px-3 py-1.5 text-[11px] font-bold disabled:opacity-50 transition-colors"
                                        >
                                            {t("dismiss")}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Link
                            href="/admin/cohost"
                            className="mt-3 flex items-center justify-center border border-white/15 text-[#c5a059] rounded-xl py-2.5 text-[12px] font-bold hover:bg-white/5 transition-colors"
                        >
                            {data.counts.pending > 0 ? t("openCohostAll", { count: data.counts.pending }) : t("openCohost")}
                        </Link>
                    </aside>
                ) : null}
            </div>
        </div>
    );
}
