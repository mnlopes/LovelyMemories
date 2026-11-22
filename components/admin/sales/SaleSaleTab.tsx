"use client";

import { useLocale, useTranslations } from "next-intl";
import { SALE_STATUSES } from "@/lib/sales/types";
import { formatEuro, pricePerM2 } from "@/lib/sales/format";
import { Checkbox, Section, input, label, numOrNull, numberInputProps, type SaleTabProps } from "./ui";

export function SaleSaleTab({ form, set }: SaleTabProps) {
    const t = useTranslations("AdminSales");
    const locale = useLocale();
    const perM2 = pricePerM2(form);

    return (
        <>
            <Section title={t("sale.price")}>
                <div className="grid gap-4 sm:grid-cols-2">
                    <label className={label}>
                        {t("sale.askingPrice")}
                        <span className="flex items-center gap-2 rounded-xl border border-[#f5f5f5] dark:border-admin-dark-border bg-[#fafafa] dark:bg-admin-dark-bg px-4 focus-within:border-[#171717] dark:focus-within:border-white">
                            <span className="text-sm font-bold text-[#a3a3a3]">€</span>
                            <input
                                id="sale-field-price"
                                type="number"
                                {...numberInputProps("decimal")}
                                min={0}
                                step="any"
                                value={form.price ?? ""}
                                disabled={form.price_on_request}
                                onChange={(e) => set("price", numOrNull(e.target.value))}
                                className="w-full min-w-0 border-0 bg-transparent py-3 text-base md:text-sm font-bold normal-case tracking-normal text-[#171717] dark:text-admin-dark-text-primary outline-none disabled:opacity-50"
                            />
                        </span>
                        {!form.price_on_request && form.price !== null && form.price > 0 && (
                            <span className="text-sm font-bold normal-case tracking-normal text-[#171717] dark:text-admin-dark-text-primary">
                                {formatEuro(form.price, locale)}
                            </span>
                        )}
                    </label>
                    <div className={label}>
                        {t("sale.pricePerM2")}
                        <span className="flex min-h-[46px] items-center rounded-xl bg-[#f5f5f5] dark:bg-admin-dark-bg px-4 text-sm font-semibold normal-case tracking-normal text-[#171717] dark:text-admin-dark-text-primary">
                            {perM2 === null ? "—" : `${formatEuro(perM2, locale)} · ${t("sale.calculated")}`}
                        </span>
                        <span className="text-[11px] font-normal normal-case tracking-normal text-[#a3a3a3]">{t("sale.pricePerM2Hint")}</span>
                    </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:gap-7">
                    <Checkbox checked={form.price_on_request} onChange={(v) => set("price_on_request", v)}>
                        {t("sale.priceOnRequest")}
                    </Checkbox>
                    <Checkbox checked={form.negotiable} onChange={(v) => set("negotiable", v)}>
                        {t("sale.negotiable")}
                    </Checkbox>
                </div>
            </Section>

            <Section title={t("sale.statusSection")}>
                <label className={`${label} max-w-[320px]`}>
                    {t("sale.status")}
                    <select
                        value={form.status}
                        onChange={(e) => set("status", e.target.value as (typeof SALE_STATUSES)[number])}
                        className={input}
                    >
                        {SALE_STATUSES.map((s) => (
                            <option key={s} value={s}>
                                {t(`status.${s}`)}
                            </option>
                        ))}
                    </select>
                </label>
                <p className="text-xs text-[#a3a3a3]">{t("sale.statusHint")}</p>
            </Section>
        </>
    );
}
