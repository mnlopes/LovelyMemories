"use client";

import { useEffect, useState } from "react";
import { Copy, Link2, Link2Off, Loader2, Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { getPropertyCopy, searchLinkableProperties } from "@/app/actions/sales";
import { supabase } from "@/lib/supabase";
import { localized } from "@/lib/sales/format";
import type { Localized } from "@/lib/sales/types";
import { Checkbox, Section, input, secondaryBtn, type SaleTabProps } from "./ui";

type Found = { id: string; slug: string; title: Localized; city: string | null };
type Linked = { id: string; title: Localized; slug: string };

const featureKey = (f: Localized) => (f.en ?? f.pt ?? "").trim().toLowerCase();

/** True when copying would overwrite something the listing already has. */
function hasCopyableData(form: SaleTabProps["form"]): boolean {
    return (
        form.images.length > 0 ||
        form.bedrooms !== null ||
        form.bathrooms !== null ||
        form.gross_area !== null ||
        !!form.description.en?.trim() ||
        !!form.description.pt?.trim() ||
        !!form.city.trim() ||
        form.lat !== null ||
        form.lng !== null ||
        !!form.address_private?.trim()
    );
}

export function LinkPropertyPicker({ form, set }: SaleTabProps) {
    const t = useTranslations("AdminSales");
    const locale = useLocale();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<{ query: string; items: Found[] } | null>(null);
    const [linked, setLinked] = useState<Linked | null>(null);
    const [copying, setCopying] = useState(false);
    const [suggestions, setSuggestions] = useState<Localized[]>([]);
    const propertyId = form.property_id;

    // Name of the linked home (public data, readable with the staff session).
    useEffect(() => {
        if (!propertyId) return;
        let cancelled = false;
        supabase
            .from("properties")
            .select("id, slug, title")
            .eq("id", propertyId)
            .maybeSingle()
            .then(({ data }) => {
                if (!cancelled && data) setLinked(data as Linked);
            });
        return () => {
            cancelled = true;
        };
    }, [propertyId]);

    // Search by name while the picker is open (debounced; only homes without units).
    useEffect(() => {
        if (propertyId) return;
        let cancelled = false;
        const timer = setTimeout(async () => {
            try {
                const items = await searchLinkableProperties(query);
                if (!cancelled) setResults({ query, items });
            } catch (e) {
                console.error("property search failed:", (e as Error).message);
                if (!cancelled) setResults({ query, items: [] });
            }
        }, 300);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [query, propertyId]);

    const searching = !propertyId && results?.query !== query;
    const linkedName = propertyId && linked?.id === propertyId ? localized(linked.title, locale) : "";

    function link(p: Found) {
        setLinked({ id: p.id, slug: p.slug, title: p.title });
        setSuggestions([]);
        set("property_id", p.id);
    }

    function unlink() {
        setSuggestions([]);
        set("property_id", null);
        set("show_performance", false);
    }

    async function copy() {
        if (!propertyId || copying) return;
        if (hasCopyableData(form) && !window.confirm(t("link.copyConfirm"))) return;
        setCopying(true);
        try {
            const { draft, amenitySuggestions } = await getPropertyCopy(propertyId);
            if (draft.images) set("images", draft.images);
            if (draft.bedrooms !== undefined) set("bedrooms", draft.bedrooms);
            if (draft.bathrooms !== undefined) set("bathrooms", draft.bathrooms);
            if (draft.gross_area !== undefined) set("gross_area", draft.gross_area);
            if (draft.description) set("description", draft.description);
            if (draft.city) set("city", draft.city);
            if (draft.lat !== undefined) set("lat", draft.lat);
            if (draft.lng !== undefined) set("lng", draft.lng);
            if (draft.address_private !== undefined) set("address_private", draft.address_private);
            setSuggestions(amenitySuggestions);
            toast.success(t("link.copied"));
        } catch (e) {
            console.error("copy from property failed:", (e as Error).message);
            toast.error(t("link.copyFailed"));
        } finally {
            setCopying(false);
        }
    }

    function toggleSuggestion(item: Localized, on: boolean) {
        const k = featureKey(item);
        if (on) {
            if (form.features.length >= 60 || form.features.some((f) => featureKey(f) === k)) return;
            set("features", [...form.features, item]);
        } else {
            set(
                "features",
                form.features.filter((f) => featureKey(f) !== k),
            );
        }
    }

    return (
        <Section title={t("link.section")}>
            <p className="text-sm text-[#737373] dark:text-admin-dark-text-secondary">{t("link.intro")}</p>

            {propertyId ? (
                <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#f5f5f5] dark:border-admin-dark-border bg-[#fafafa] dark:bg-admin-dark-bg px-4 py-3">
                        <span className="flex min-w-0 items-center gap-2 text-sm font-bold text-[#171717] dark:text-admin-dark-text-primary">
                            <Link2 className="size-4 shrink-0" aria-hidden="true" />
                            <span className="truncate">{linkedName || t("link.linkedFallback")}</span>
                        </span>
                        <div className="flex flex-wrap gap-2">
                            <button type="button" disabled={copying} onClick={copy} className={secondaryBtn}>
                                {copying ? (
                                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                                ) : (
                                    <Copy className="size-4" aria-hidden="true" />
                                )}
                                {t("link.copy")}
                            </button>
                            <button type="button" onClick={unlink} className={secondaryBtn}>
                                <Link2Off className="size-4" aria-hidden="true" />
                                {t("link.unlink")}
                            </button>
                        </div>
                    </div>
                    <p className="text-xs text-[#a3a3a3]">{t("link.copyHint")}</p>

                    {suggestions.length > 0 && (
                        <fieldset className="flex flex-col gap-2 border-t border-[#f5f5f5] dark:border-admin-dark-border pt-4">
                            <legend className="text-[11px] font-bold uppercase tracking-wider text-[#a3a3a3]">
                                {t("link.amenities")}
                            </legend>
                            <p className="text-xs text-[#a3a3a3]">{t("link.amenitiesHint")}</p>
                            <div className="grid gap-2 sm:grid-cols-2">
                                {suggestions.map((item) => (
                                    <Checkbox
                                        key={featureKey(item)}
                                        checked={form.features.some((f) => featureKey(f) === featureKey(item))}
                                        onChange={(v) => toggleSuggestion(item, v)}
                                    >
                                        {localized(item, locale)}
                                    </Checkbox>
                                ))}
                            </div>
                        </fieldset>
                    )}
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    <label className="relative block">
                        <span className="sr-only">{t("link.searchLabel")}</span>
                        <Search
                            className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#a3a3a3]"
                            aria-hidden="true"
                        />
                        <input
                            type="search"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={t("link.searchPlaceholder")}
                            maxLength={80}
                            className={`${input} pl-10`}
                        />
                    </label>
                    {searching ? (
                        <p className="inline-flex items-center gap-2 text-xs text-[#a3a3a3]">
                            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                            {t("link.searching")}
                        </p>
                    ) : results && results.items.length === 0 ? (
                        <p className="text-xs text-[#a3a3a3]">{t("link.noResults")}</p>
                    ) : (
                        <ul className="flex flex-col divide-y divide-[#f5f5f5] dark:divide-admin-dark-border rounded-xl border border-[#f5f5f5] dark:border-admin-dark-border">
                            {results?.items.map((p) => (
                                <li key={p.id}>
                                    <button
                                        type="button"
                                        onClick={() => link(p)}
                                        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-[#fafafa] dark:hover:bg-admin-dark-bg"
                                    >
                                        <span className="truncate font-bold text-[#171717] dark:text-admin-dark-text-primary">
                                            {localized(p.title, locale) || p.slug}
                                        </span>
                                        <span className="shrink-0 text-xs text-[#a3a3a3]">{p.city ?? ""}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </Section>
    );
}
