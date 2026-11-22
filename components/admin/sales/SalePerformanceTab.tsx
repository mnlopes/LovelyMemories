"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { previewSalePerformance } from "@/app/actions/sales";
import { formatEuro } from "@/lib/sales/format";
import type { PerformanceSnapshot } from "@/lib/sales/performance";
import { parseDateLocal } from "@/lib/utils";
import { Checkbox, Section, input, label, type SaleTabProps } from "./ui";

type Loaded = { key: string; snapshot: PerformanceSnapshot | null };

const percent = (n: number, locale: string, digits = 0) =>
    new Intl.NumberFormat(locale === "pt" ? "pt-PT" : "en-GB", {
        style: "percent",
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    }).format(n);

/** A calendar day (YYYY-MM-DD) shifted by `dayOffset`, in the admin language. */
function formatDay(iso: string, locale: string, options: Intl.DateTimeFormatOptions, dayOffset = 0): string {
    const d = parseDateLocal(iso);
    if (!d) return iso;
    d.setDate(d.getDate() + dayOffset);
    return new Intl.DateTimeFormat(locale === "pt" ? "pt-PT" : "en-GB", options).format(d);
}

export function SalePerformanceTab({ form, set }: SaleTabProps) {
    const t = useTranslations("AdminSales");
    const locale = useLocale();
    const propertyId = form.property_id;
    const key = propertyId ? `${propertyId}|${form.price ?? ""}|${form.price_on_request}` : "";
    const [loaded, setLoaded] = useState<Loaded | null>(null);

    useEffect(() => {
        if (!propertyId) return;
        let cancelled = false;
        // Debounced: the price is typed digit by digit and every call reads reservations.
        const timer = setTimeout(async () => {
            let snapshot: PerformanceSnapshot | null = null;
            try {
                snapshot = await previewSalePerformance(propertyId, form.price, form.price_on_request);
            } catch (e) {
                console.error("performance preview failed:", (e as Error).message);
            }
            if (!cancelled) setLoaded({ key, snapshot });
        }, 400);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
        // `key` already covers propertyId, price and price_on_request.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    const loading = !!propertyId && loaded?.key !== key;
    const snapshot = propertyId && loaded?.key === key ? loaded.snapshot : null;
    const canShow = !!snapshot && snapshot.eligible;

    return (
        <>
            <Section title={t("performance.section")}>
                {!propertyId ? (
                    <p className="text-sm text-[#737373] dark:text-admin-dark-text-secondary">
                        {t("performance.noProperty")}
                    </p>
                ) : loading ? (
                    <p className="inline-flex items-center gap-2 text-sm text-[#a3a3a3]">
                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        {t("performance.loading")}
                    </p>
                ) : !snapshot ? (
                    <p className="text-sm text-[#737373] dark:text-admin-dark-text-secondary">
                        {t("performance.noData")}
                    </p>
                ) : (
                    <>
                        <dl className="grid gap-4 sm:grid-cols-3">
                            <Stat
                                title={
                                    snapshot.fullYear
                                        ? t("performance.revenue")
                                        : t("performance.revenueSince", {
                                              month: formatDay(snapshot.windowStart, locale, { month: "long", year: "numeric" }),
                                          })
                                }
                                value={formatEuro(Math.round(snapshot.revenue), locale)}
                            />
                            <Stat title={t("performance.occupancy")} value={percent(snapshot.occupancy, locale)} />
                            <Stat
                                title={t("performance.yield")}
                                value={
                                    snapshot.grossYield !== null
                                        ? percent(snapshot.grossYield, locale, 1)
                                        : !snapshot.fullYear
                                          ? t("performance.needsYear")
                                          : "—"
                                }
                                small={snapshot.grossYield === null}
                            />
                        </dl>
                        <p className="text-xs text-[#a3a3a3]">
                            {/* The window end is exclusive: the last day with data is the day before it. */}
                            {t("performance.dataRange", {
                                start: formatDay(snapshot.windowStart, locale, { dateStyle: "long" }),
                                end: formatDay(snapshot.windowEnd, locale, { dateStyle: "long" }, -1),
                            })}
                        </p>
                        {snapshot.staleDays > 60 && (
                            <p
                                role="alert"
                                className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
                            >
                                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                                {t("performance.stale")}
                            </p>
                        )}
                        {!snapshot.eligible && (
                            <p className="text-sm text-[#737373] dark:text-admin-dark-text-secondary">
                                {t("performance.notEligible")}
                            </p>
                        )}
                    </>
                )}
            </Section>

            <Section title={t("performance.publicSection")}>
                <Checkbox
                    checked={form.show_performance}
                    disabled={!canShow && !form.show_performance}
                    onChange={(v) => set("show_performance", v)}
                >
                    {t("performance.show")}
                </Checkbox>
                {!canShow && propertyId && !loading && (
                    <p className="text-xs text-[#a3a3a3]">{t("performance.showDisabled")}</p>
                )}
                {!propertyId && <p className="text-xs text-[#a3a3a3]">{t("performance.showNeedsProperty")}</p>}
                <label className={`${label} md:max-w-sm`}>
                    {t("performance.alLicense")}
                    <input
                        type="text"
                        spellCheck={false}
                        autoComplete="off"
                        value={form.al_license ?? ""}
                        onChange={(e) => set("al_license", e.target.value || null)}
                        maxLength={60}
                        className={input}
                    />
                </label>
            </Section>
        </>
    );
}

function Stat({ title, value, small }: { title: string; value: string; small?: boolean }) {
    return (
        <div className="flex flex-col gap-1 rounded-2xl border border-[#f5f5f5] dark:border-admin-dark-border p-4">
            <dt className="text-[11px] font-bold uppercase tracking-wider text-[#a3a3a3]">{title}</dt>
            <dd
                className={`font-bold text-[#171717] dark:text-admin-dark-text-primary ${small ? "text-sm" : "text-2xl"}`}
            >
                {value}
            </dd>
        </div>
    );
}
