"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Copy, Link2, Link2Off, Loader2, Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { getPropertyCopy, searchLinkableProperties } from "@/app/actions/sales";
import { supabase } from "@/lib/supabase";
import { localized } from "@/lib/sales/format";
import type { Localized } from "@/lib/sales/types";
import { AmenityPicker } from "./AmenityPicker";
import { Section, input, secondaryBtn, type SaleTabProps } from "./ui";

type Found = { id: string; slug: string; title: Localized; city: string | null };
type Linked = { id: string; title: Localized; slug: string };

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
    const [open, setOpen] = useState(false);
    const boxRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listId = useId();
    const propertyId = form.property_id;

    // A click outside the picker closes the list without picking anything.
    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent | TouchEvent) => {
            if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", onDown);
        document.addEventListener("touchstart", onDown);
        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("touchstart", onDown);
        };
    }, [open]);

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
        setOpen(false);
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

                    {suggestions.length > 0 && <AmenityPicker suggestions={suggestions} form={form} set={set} />}
                </div>
            ) : (
                <div
                    ref={boxRef}
                    className="relative"
                    // Focus leaving the picker (Tab) closes the list.
                    onBlur={(e) => {
                        if (e.relatedTarget && !boxRef.current?.contains(e.relatedTarget as Node)) setOpen(false);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Escape" && open) {
                            e.preventDefault();
                            setOpen(false);
                            inputRef.current?.focus();
                        }
                    }}
                >
                    <label className="relative block">
                        <span className="sr-only">{t("link.searchLabel")}</span>
                        <Search
                            className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#a3a3a3]"
                            aria-hidden="true"
                        />
                        <input
                            ref={inputRef}
                            type="search"
                            role="combobox"
                            aria-expanded={open}
                            aria-controls={listId}
                            aria-autocomplete="list"
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                setOpen(true);
                            }}
                            onFocus={() => setOpen(true)}
                            onClick={() => setOpen(true)}
                            onKeyDown={(e) => {
                                if (e.key === "ArrowDown") {
                                    e.preventDefault();
                                    setOpen(true);
                                    requestAnimationFrame(() => boxRef.current?.querySelector<HTMLButtonElement>("[data-option]")?.focus());
                                }
                            }}
                            placeholder={t("link.searchPlaceholder")}
                            maxLength={80}
                            autoComplete="off"
                            className={`${input} pl-10`}
                        />
                    </label>
                    {open && (
                    <div className="absolute inset-x-0 top-full z-20 mt-2 rounded-xl border border-[#f5f5f5] bg-white p-1 shadow-xl dark:border-admin-dark-border dark:bg-admin-dark-surface">
                    {searching ? (
                        <p className="inline-flex items-center gap-2 px-3 py-2.5 text-xs text-[#a3a3a3]">
                            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                            {t("link.searching")}
                        </p>
                    ) : results && results.items.length === 0 ? (
                        <p className="px-3 py-2.5 text-xs text-[#a3a3a3]">{t("link.noResults")}</p>
                    ) : (
                        <ul
                            id={listId}
                            role="listbox"
                            aria-label={t("link.searchLabel")}
                            onKeyDown={(e) => {
                                if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
                                e.preventDefault();
                                const items = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>("[data-option]"));
                                const at = items.indexOf(document.activeElement as HTMLButtonElement);
                                if (e.key === "ArrowUp" && at <= 0) inputRef.current?.focus();
                                else items[Math.min(items.length - 1, at + (e.key === "ArrowDown" ? 1 : -1))]?.focus();
                            }}
                            className="flex max-h-72 flex-col divide-y divide-[#f5f5f5] overflow-y-auto overscroll-contain dark:divide-admin-dark-border dark:[color-scheme:dark]"
                        >
                            {results?.items.map((p) => (
                                <li key={p.id}>
                                    <button
                                        type="button"
                                        role="option"
                                        aria-selected={false}
                                        data-option
                                        onClick={() => link(p)}
                                        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-[#fafafa] focus-visible:bg-[#fafafa] focus-visible:outline-none dark:hover:bg-admin-dark-bg dark:focus-visible:bg-admin-dark-bg"
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
                </div>
            )}
        </Section>
    );
}
