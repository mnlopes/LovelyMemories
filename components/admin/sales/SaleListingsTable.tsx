"use client";

import { useState } from "react";
import { BookUser, Mail, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { formatEuro, localized } from "@/lib/sales/format";
import { focusRing } from "./ui";
import { SaleContactsPanel } from "./SaleContactsPanel";
import type { SalesContactSettings } from "@/app/actions/sales";
import { SALE_STATUSES, type Localized, type SaleStatus } from "@/lib/sales/types";

/** Slim row the list page builds on the server (no private columns reach the browser). */
export type SaleListRow = {
    id: string;
    reference: string;
    title: Localized;
    subtitle: Localized;
    city: string;
    price: number | null;
    price_on_request: boolean;
    status: SaleStatus;
    published: boolean;
    updated_at: string;
    thumb: string | null;
};

const STATUS_STYLE: Record<SaleStatus, string> = {
    available:
        "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30",
    reserved: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30",
    under_offer:
        "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30",
    sold: "bg-[#171717] text-white border-[#171717] dark:bg-white dark:text-black dark:border-white",
};

function Chip({ className, children }: { className: string; children: React.ReactNode }) {
    return (
        <span
            className={`inline-flex items-center self-start whitespace-nowrap rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.05em] ${className}`}
        >
            {children}
        </span>
    );
}

export default function SaleListingsTable({
    rows,
    canEdit,
    contacts: initialContacts,
}: {
    rows: SaleListRow[];
    canEdit: boolean;
    /** Null when they could not be loaded: the button and the line are hidden. */
    contacts: SalesContactSettings | null;
}) {
    const t = useTranslations("AdminSales");
    const locale = useLocale();
    const [filter, setFilter] = useState<"all" | SaleStatus>("all");
    const [contacts, setContacts] = useState(initialContacts);
    const [contactsOpen, setContactsOpen] = useState(false);

    const visible = rows.filter((r) => filter === "all" || r.status === filter);
    const price = (r: SaleListRow) =>
        r.price_on_request ? t("priceOnRequest") : r.price && r.price > 0 ? formatEuro(r.price, locale) : "—";
    const date = (iso: string) =>
        new Intl.DateTimeFormat(locale === "pt" ? "pt-PT" : "en-GB", {
            dateStyle: "medium",
            timeZone: "Europe/Lisbon",
        }).format(new Date(iso));
    const visibility = (r: SaleListRow) =>
        r.published ? (
            <Chip className="border-emerald-200 bg-white text-emerald-700 dark:border-emerald-500/30 dark:bg-transparent dark:text-emerald-400">
                {t("published")}
            </Chip>
        ) : (
            <Chip className="border-gray-100 bg-gray-50 text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-admin-dark-text-secondary">
                {t("draft")}
            </Chip>
        );
    const thumb = (r: SaleListRow, size: string) => (
        <span
            className={`${size} shrink-0 rounded-xl border border-[#eeeeee] bg-[#f5f5f5] bg-cover bg-center dark:border-white/10 dark:bg-admin-dark-bg`}
            style={r.thumb ? { backgroundImage: `url(${JSON.stringify(r.thumb)})` } : undefined}
        />
    );

    return (
        <div className="space-y-8 pb-20">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-[#171717] dark:text-admin-dark-text-primary md:text-3xl">
                        {t("title")}
                    </h2>
                    <p className="mt-2 text-sm font-medium text-[#a3a3a3] md:text-base">{t("subtitle")}</p>
                </div>
                <div className="flex flex-wrap items-end gap-3">
                    <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-widest text-[#a3a3a3]">
                        {t("filterStatus")}
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value as "all" | SaleStatus)}
                            className={`min-h-11 rounded-xl border border-[#f5f5f5] bg-white px-4 py-2.5 text-base font-bold normal-case tracking-normal text-[#171717] outline-none dark:border-white/10 dark:bg-white/5 dark:text-admin-dark-text-primary md:min-h-0 md:text-sm ${focusRing}`}
                        >
                            <option value="all">{t("allStatuses")}</option>
                            {SALE_STATUSES.map((s) => (
                                <option key={s} value={s}>
                                    {t(`status.${s}`)}
                                </option>
                            ))}
                        </select>
                    </label>
                    {contacts && (
                        <button
                            type="button"
                            onClick={() => setContactsOpen(true)}
                            className={`flex min-h-11 items-center gap-2 rounded-xl border border-[#eaeaea] bg-white px-5 py-2.5 text-sm font-semibold text-[#171717] transition-all hover:bg-[#fafafa] dark:border-white/10 dark:bg-white/5 dark:text-admin-dark-text-primary dark:hover:bg-white/10 md:min-h-0 ${focusRing}`}
                        >
                            <BookUser className="size-4" aria-hidden="true" />
                            {t("contacts.button")}
                        </button>
                    )}
                    {canEdit && (
                        <Link
                            href="/admin/sales/new"
                            className={`flex min-h-11 items-center gap-2 rounded-xl bg-[#171717] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-black dark:bg-white dark:text-black dark:hover:bg-gray-200 md:min-h-0 ${focusRing}`}
                        >
                            <Plus className="size-4" aria-hidden="true" />
                            {t("new")}
                        </Link>
                    )}
                </div>
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto rounded-2xl border border-[#f5f5f5] bg-white shadow-sm dark:border-white/10 dark:bg-white/5 md:block">
                <table className="w-full min-w-[900px] text-left">
                    <thead>
                        <tr className="border-b border-[#f5f5f5] dark:border-admin-dark-border">
                            {(["listing", "reference", "city", "price", "status", "visibility", "updated"] as const).map((c) => (
                                <th key={c} scope="col" className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-[#a3a3a3]">
                                    {t(`columns.${c}`)}
                                </th>
                            ))}
                            <th scope="col" className="px-6 py-5">
                                <span className="sr-only">{t("columns.actions")}</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f5f5f5] dark:divide-admin-dark-border">
                        {visible.map((r) => (
                            <tr key={r.id} className="transition-all hover:bg-[#fafafa]/50 dark:hover:bg-white/[0.02]">
                                <td className="px-6 py-4">
                                    <Link href={`/admin/sales/${r.id}`} className="flex items-center gap-4">
                                        {thumb(r, "size-14")}
                                        <span className="flex min-w-0 flex-col gap-0.5">
                                            <span className="font-bold text-[#171717] dark:text-admin-dark-text-primary">
                                                {localized(r.title, locale) || t("editor.untitled")}
                                            </span>
                                            <span className="text-xs font-medium text-[#a3a3a3]">{localized(r.subtitle, locale)}</span>
                                        </span>
                                    </Link>
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-[#171717] dark:text-admin-dark-text-primary">{r.reference}</td>
                                <td className="px-6 py-4 text-sm font-semibold text-[#171717] dark:text-admin-dark-text-primary">{r.city || "—"}</td>
                                <td className="whitespace-nowrap px-6 py-4 text-sm font-bold text-[#171717] dark:text-admin-dark-text-primary">{price(r)}</td>
                                <td className="px-6 py-4">
                                    <Chip className={STATUS_STYLE[r.status]}>{t(`status.${r.status}`)}</Chip>
                                </td>
                                <td className="px-6 py-4">{visibility(r)}</td>
                                <td className="whitespace-nowrap px-6 py-4 text-xs text-[#a3a3a3]">{date(r.updated_at)}</td>
                                <td className="px-6 py-4 text-right">
                                    <Link
                                        href={`/admin/sales/${r.id}`}
                                        className="inline-flex rounded-xl border border-[#eaeaea] bg-white px-3.5 py-2 text-xs font-bold text-[#171717] hover:bg-[#fafafa] dark:border-admin-dark-border dark:bg-admin-dark-surface dark:text-admin-dark-text-primary dark:hover:bg-admin-dark-bg"
                                    >
                                        {t("edit")}
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile cards */}
            <ul className="space-y-3 md:hidden">
                {visible.map((r) => (
                    <li key={r.id}>
                        <Link
                            href={`/admin/sales/${r.id}`}
                            className={`flex flex-col gap-3 rounded-2xl border border-[#f5f5f5] bg-white p-4 shadow-sm transition-colors hover:bg-[#fafafa] dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/[0.08] ${focusRing}`}
                        >
                            <span className="flex items-center gap-3">
                                {thumb(r, "size-14")}
                                <span className="flex min-w-0 flex-col gap-0.5">
                                    <span className="truncate text-[15px] font-bold text-[#171717] dark:text-admin-dark-text-primary">
                                        {localized(r.title, locale) || t("editor.untitled")}
                                    </span>
                                    <span className="text-xs text-[#a3a3a3]">
                                        {r.reference} · {r.city || "—"}
                                    </span>
                                    <span className="text-sm font-semibold text-[#171717] dark:text-admin-dark-text-primary">{price(r)}</span>
                                </span>
                            </span>
                            <span className="flex flex-wrap items-center gap-2">
                                <Chip className={STATUS_STYLE[r.status]}>{t(`status.${r.status}`)}</Chip>
                                {visibility(r)}
                                <span className="text-xs text-[#a3a3a3]">{date(r.updated_at)}</span>
                            </span>
                        </Link>
                    </li>
                ))}
            </ul>

            {visible.length === 0 && (
                <p className="rounded-2xl border border-dashed border-[#eaeaea] p-8 text-center text-sm text-[#a3a3a3] dark:border-white/10">
                    {rows.length === 0 ? t("empty") : t("emptyFiltered")}
                </p>
            )}
            {contacts && (
                <p className="flex flex-wrap items-center gap-1.5 text-xs text-[#a3a3a3]">
                    <Mail className="size-3.5" aria-hidden="true" />
                    {t("contacts.requestsGoTo")}
                    <strong className="font-bold text-[#737373] dark:text-admin-dark-text-secondary">
                        {contacts.leads_email.trim() || "info@lovelymemories.pt"}
                    </strong>
                    <span aria-hidden="true">·</span>
                    <button
                        type="button"
                        onClick={() => setContactsOpen(true)}
                        className={`rounded font-bold text-[#171717] underline underline-offset-2 dark:text-admin-dark-text-primary ${focusRing}`}
                    >
                        {canEdit ? t("contacts.change") : t("contacts.see")}
                    </button>
                </p>
            )}
            {contacts && (
                <SaleContactsPanel
                    open={contactsOpen}
                    onClose={() => setContactsOpen(false)}
                    contacts={contacts}
                    onSaved={setContacts}
                    canEdit={canEdit}
                />
            )}
        </div>
    );
}
