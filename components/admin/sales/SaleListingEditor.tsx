"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/routing";
import { deleteSaleListing, saveSaleListing } from "@/app/actions/sales";
import { formatEuro, localized, slugify } from "@/lib/sales/format";
import type { Localized, SaleListingPrivate } from "@/lib/sales/types";
import { stableStringify } from "@/lib/sales/stable-json";
import { publishProblems, type PublishProblem } from "@/lib/sales/validation";
import { SaleInfoTab } from "./SaleInfoTab";
import { SaleSaleTab } from "./SaleSaleTab";
import { SaleLocationTab } from "./SaleLocationTab";
import { SalePhotosTab } from "./SalePhotosTab";
import { SaleDocumentsTab } from "./SaleDocumentsTab";
import { SalePerformanceTab } from "./SalePerformanceTab";
import { SaleEditorSide } from "./SaleEditorSide";
import { SaleSaveBar } from "./SaleSaveBar";
import { focusRing, type PersistFn, type SaleFormState, type SaleTabProps } from "./ui";

export type EditorListing = Omit<SaleListingPrivate, "created_by">;

export const SALE_TABS = ["photos", "info", "sale", "location", "documents", "performance"] as const;
export type SaleTab = (typeof SALE_TABS)[number];

const EMPTY_FORM: SaleFormState = {
    slug: "",
    property_id: null,
    published: false,
    status: "available",
    price: null,
    price_on_request: false,
    negotiable: false,
    title: {},
    subtitle: {},
    description: {},
    features: [],
    type: "apartment",
    typology: null,
    bedrooms: null,
    bathrooms: null,
    condition: null,
    gross_area: null,
    useful_area: null,
    plot_area: null,
    year_renovated: null,
    furnished: null,
    city: "",
    area_label: "",
    street: null,
    lat: null,
    lng: null,
    nearby: [],
    energy_class: null,
    floor_plan_url: null,
    images: [],
    show_performance: false,
    al_license: null,
    address_private: null,
    energy_cert_number: null,
    energy_cert_path: null,
};

function toForm(l: EditorListing | null): SaleFormState {
    if (!l) return EMPTY_FORM;
    return {
        slug: l.slug,
        property_id: l.property_id,
        published: l.published,
        status: l.status,
        price: l.price,
        price_on_request: l.price_on_request,
        negotiable: l.negotiable,
        title: l.title ?? {},
        subtitle: l.subtitle ?? {},
        description: l.description ?? {},
        features: l.features ?? [],
        type: l.type,
        typology: l.typology,
        bedrooms: l.bedrooms,
        bathrooms: l.bathrooms,
        condition: l.condition,
        gross_area: l.gross_area,
        useful_area: l.useful_area,
        plot_area: l.plot_area,
        year_renovated: l.year_renovated,
        furnished: l.furnished,
        city: l.city ?? "",
        area_label: l.area_label ?? "",
        street: l.street,
        lat: l.lat,
        lng: l.lng,
        nearby: l.nearby ?? [],
        energy_class: l.energy_class,
        floor_plan_url: l.floor_plan_url,
        images: l.images ?? [],
        show_performance: l.show_performance,
        al_license: l.al_license,
        address_private: l.address_private,
        energy_cert_number: l.energy_cert_number,
        energy_cert_path: l.energy_cert_path,
    };
}

const isBlank = (v: Localized | undefined) => !v?.en?.trim() && !v?.pt?.trim();

/** Drops empty rows the user added but never filled in, and empty strings that mean "nothing". */
function cleanForSave(f: SaleFormState, published: boolean): SaleFormState {
    return {
        ...f,
        published,
        features: f.features.filter((x) => !isBlank(x)),
        nearby: f.nearby.filter((n) => !isBlank(n.name)),
        city: f.city.trim(),
        area_label: f.area_label.trim(),
        street: f.street?.trim() || null,
        address_private: f.address_private?.trim() || null,
    };
}

/** What the server stores for a payload: the slug it picked, and no income summary without a linked home. */
function asStored(sent: SaleFormState, slug: string): SaleFormState {
    return { ...sent, slug, show_performance: sent.property_id ? sent.show_performance : false };
}

/** Where each "missing to publish" item lives: the tab and the id of the field to focus. */
const PROBLEM_FIELD: Record<PublishProblem, { tab: SaleTab; id: string }> = {
    title: { tab: "info", id: "sale-field-title" },
    photo: { tab: "photos", id: "sale-field-photo" },
    type: { tab: "info", id: "sale-field-type" },
    price: { tab: "sale", id: "sale-field-price" },
    energy_class: { tab: "documents", id: "sale-field-energy_class" },
    city: { tab: "location", id: "sale-field-city" },
};

/** The form as the server would store it, as comparable text (to tell if there are unsaved changes). */
function comparable(f: SaleFormState): string {
    const slug = slugify(f.slug);
    return stableStringify(asStored(cleanForSave({ ...f, slug }, f.published), slug));
}

export default function SaleListingEditor({
    initial,
    id,
    canEdit,
}: {
    initial: EditorListing | null;
    id: string;
    /** False for a view-only role: Save, Publish, Delete and file changes are disabled. */
    canEdit: boolean;
}) {
    const t = useTranslations("AdminSales");
    const locale = useLocale();
    const router = useRouter();
    const isSaved = initial !== null;

    const [form, setForm] = useState<SaleFormState>(() => toForm(initial));
    // The listing as last saved (initial data, then each successful save). `persist` builds on it,
    // never on the live form, so unsaved edits are not published by an upload or a delete.
    const savedRef = useRef<SaleFormState>(toForm(initial));
    // The same value as state, so rendering can compare against it (refs are not read while rendering).
    const [savedState, setSavedState] = useState<SaleFormState>(() => toForm(initial));
    const markSaved = (next: SaleFormState) => {
        savedRef.current = next;
        setSavedState(next);
    };
    const [tab, setTab] = useState<SaleTab>("info");
    const [slugTouched, setSlugTouched] = useState(isSaved);
    const [savedSlug, setSavedSlug] = useState<string | null>(initial?.slug ?? null);
    // The server may add a suffix to a taken slug: follow what it actually stored.
    const [prevInitial, setPrevInitial] = useState(initial);
    if (initial !== prevInitial) {
        setPrevInitial(initial);
        if (initial) setSavedSlug(initial.slug);
    }
    const [slugError, setSlugError] = useState<"slug_taken" | "invalid_slug" | "slugRequired" | null>(null);
    const [focusReq, setFocusReq] = useState<{ id: string; n: number } | null>(null);
    const [busy, setBusy] = useState<null | "save" | "publish" | "delete">(null);
    // File saves in flight (from the Photos and Documents tabs): Save, Publish and Delete wait.
    const [persisting, setPersisting] = useState(0);
    const locked = !canEdit || busy !== null || persisting > 0;

    // Every write to the listing runs one after another, so each builds on what the previous stored.
    const queueRef = useRef<Promise<unknown>>(Promise.resolve());
    function enqueue<T>(op: () => Promise<T>): Promise<T> {
        const run = queueRef.current.then(op);
        queueRef.current = run.catch(() => undefined);
        return run;
    }

    const set: SaleTabProps["set"] = (key, value) => setForm((f) => ({ ...f, [key]: value }));

    const dirty = useMemo(
        () => canEdit && comparable(form) !== comparable(savedState),
        [canEdit, form, savedState],
    );

    // Closing or reloading the tab with unsaved edits asks first.
    useEffect(() => {
        if (!dirty) return;
        const warn = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [dirty]);

    // Focus a field after its tab has rendered.
    useEffect(() => {
        if (!focusReq) return;
        const el = document.getElementById(focusReq.id);
        if (!el) return;
        el.scrollIntoView({ block: "center" });
        el.focus({ preventScroll: true });
    }, [focusReq]);

    function goToField(target: SaleTab, id: string) {
        setTab(target);
        setFocusReq({ id, n: Date.now() });
    }

    const onTitleChange = (title: Localized) => {
        if (!slugTouched) setSlugError(null);
        setForm((f) => ({
            ...f,
            title,
            slug: slugTouched ? f.slug : slugify(title.pt?.trim() || title.en?.trim() || ""),
        }));
    };
    const onSlugEdit = (slug: string) => {
        setSlugError(null);
        setSlugTouched(true);
        set("slug", slug);
    };

    const problems = useMemo(() => publishProblems(form), [form]);
    const title = localized(form.title, locale) || t("editor.new");
    const mainImage = form.images.find((i) => i.is_main) ?? form.images[0];

    const checklist: PublishProblem[] = ["title", "photo", "type", "price", "energy_class", "city"];

    function saveErrorText(res: { error: string; problems?: PublishProblem[] }): string {
        if (res.error === "publish_blocked" && res.problems?.length) {
            return `${t("errors.publish_blocked")} ${res.problems.map((p) => t(`problems.${p}`)).join(", ")}`;
        }
        const known = ["invalid_input", "slug_taken", "invalid_slug", "db_error", "invalid_id"];
        return known.includes(res.error) ? t(`errors.${res.error}`) : t("errors.generic");
    }

    function reportSaveError(res: { error: string; problems?: PublishProblem[] }) {
        toast.error(saveErrorText(res));
    }

    /**
     * Used by the tabs that touch Storage, so the database never points at a deleted file or misses
     * an upload. Saves the last saved listing plus `patch` (keeping `published`): unsaved edits in
     * the form wait for "Save". Only after the save succeeds is the patch applied to the form (a
     * function patch against the form as it is then); on failure nothing changes and false is returned.
     */
    const persist: PersistFn = (patchOrFn, options) => {
        if (!canEdit) return Promise.resolve(false);
        const resolve = (base: SaleFormState) => (typeof patchOrFn === "function" ? patchOrFn(base) : patchOrFn);
        const quiet = options?.quiet === true;
        if (!quiet) setPersisting((n) => n + 1);
        // Queued: the last saved listing is read when this save runs, after any save before it.
        return enqueue(async () => {
            const saved = savedRef.current;
            const next = { ...saved, ...resolve(saved) };
            const finalSlug = slugify(next.slug);
            if (!finalSlug) {
                toast.error(`${t("errors.fileSaveFailed")} ${t("errors.invalid_slug")}`);
                return false;
            }
            try {
                const sent = cleanForSave({ ...next, slug: finalSlug }, saved.published);
                const res = await saveSaleListing(id, sent);
                if (!res.ok) {
                    toast.error(`${t("errors.fileSaveFailed")} ${saveErrorText(res)}`);
                    return false;
                }
                markSaved(asStored(sent, res.slug));
                setSavedSlug(res.slug);
                setForm((f) => ({ ...f, ...resolve(f) }));
                router.refresh();
                return true;
            } catch {
                toast.error(`${t("errors.fileSaveFailed")} ${t("errors.generic")}`);
                return false;
            }
        }).finally(() => {
            if (!quiet) setPersisting((n) => n - 1);
        });
    };

    async function submit(published: boolean, action: "save" | "publish") {
        if (locked) return;
        if (!form.slug.trim()) {
            toast.error(t("errors.slugRequired"));
            setSlugError("slugRequired");
            goToField("info", "sale-field-slug");
            return;
        }
        const finalSlug = slugify(form.slug);
        if (!finalSlug) {
            toast.error(t("errors.invalid_slug"));
            setSlugError("invalid_slug");
            goToField("info", "sale-field-slug");
            return;
        }
        setBusy(action);
        try {
            const sent = cleanForSave({ ...form, slug: finalSlug }, published);
            const res = await enqueue(() => saveSaleListing(id, sent));
            if (!res.ok) {
                reportSaveError(res);
                if (res.error === "slug_taken" || res.error === "invalid_slug") {
                    setSlugError(res.error);
                    goToField("info", "sale-field-slug");
                }
                return;
            }
            setSlugError(null);
            markSaved(asStored(sent, res.slug));
            setForm((f) => ({
                ...f,
                published,
                slug: res.slug,
                // The server switches the income summary off when no home is linked.
                ...(sent.property_id ? {} : { show_performance: false }),
            }));
            setSavedSlug(res.slug);
            toast.success(
                action === "publish" ? (published ? t("toast.published") : t("toast.unpublished")) : t("toast.saved"),
            );
            if (!isSaved) router.replace(`/admin/sales/${id}`);
            else router.refresh();
        } catch {
            toast.error(t("errors.generic"));
        } finally {
            setBusy(null);
        }
    }

    async function remove() {
        if (locked || !isSaved) return;
        if (!window.confirm(t("editor.deleteConfirm"))) return;
        setBusy("delete");
        try {
            const res = await enqueue(() => deleteSaleListing(id));
            if (!res.ok) {
                toast.error(t("errors.generic"));
                return;
            }
            toast.success(t("toast.deleted"));
            router.replace("/admin/sales");
        } catch {
            toast.error(t("errors.generic"));
        } finally {
            setBusy(null);
        }
    }

    const priceLabel = form.price_on_request
        ? t("editor.priceOnRequest")
        : form.price && form.price > 0
          ? formatEuro(form.price, locale)
          : "—";
    const meta = [form.typology, form.gross_area ? `${form.gross_area} m²` : null, form.city || null]
        .filter(Boolean)
        .join(" · ");

    return (
        <div className="space-y-8 pb-6 xl:pb-20">
            <div className="flex flex-col gap-1.5">
                <nav aria-label={t("editor.breadcrumb")} className="flex gap-2 text-xs font-medium text-[#a3a3a3]">
                    <Link
                        href="/admin/sales"
                        onClick={(e) => {
                            if (dirty && !window.confirm(t("editor.leaveConfirm"))) e.preventDefault();
                        }}
                        className={`rounded hover:underline ${focusRing}`}
                    >
                        {t("title")}
                    </Link>
                    <span aria-hidden="true">/</span>
                    <span className="font-bold text-[#171717] dark:text-admin-dark-text-primary">
                        {isSaved ? t("editor.edit") : t("editor.new")}
                    </span>
                </nav>
                <h1 className="text-2xl font-bold tracking-tight text-[#171717] dark:text-admin-dark-text-primary md:text-3xl">
                    {title}
                </h1>
            </div>

            <div
                role="tablist"
                aria-label={t("editor.sections")}
                className="flex gap-6 overflow-x-auto px-1 pt-1 border-b border-[#f5f5f5] dark:border-admin-dark-border [scrollbar-width:none]"
            >
                {SALE_TABS.map((id2) => (
                    <button
                        key={id2}
                        type="button"
                        role="tab"
                        aria-selected={tab === id2}
                        onClick={() => setTab(id2)}
                        className={`relative inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-t-md pb-1 text-sm font-bold transition-all ${focusRing} ${
                            tab === id2
                                ? "text-[#171717] dark:text-admin-dark-text-primary"
                                : "text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white"
                        }`}
                    >
                        {t(`tabs.${id2}`)}
                        {tab === id2 && (
                            <span className="absolute bottom-0 left-0 z-10 h-[3px] w-full rounded-t-full bg-[#171717] dark:bg-white" />
                        )}
                    </button>
                ))}
            </div>

            <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
                <div className="flex min-w-0 flex-1 flex-col gap-5">
                    {tab === "photos" && (
                        <SalePhotosTab
                            form={form}
                            set={set}
                            listingId={id}
                            isSaved={isSaved}
                            canEdit={canEdit}
                            persist={persist}
                        />
                    )}
                    {tab === "info" && (
                        <SaleInfoTab
                            slugError={slugError}
                            form={form}
                            set={set}
                            slugTouched={slugTouched}
                            onSlugEdit={onSlugEdit}
                            onTitleChange={onTitleChange}
                        />
                    )}
                    {tab === "sale" && <SaleSaleTab form={form} set={set} />}
                    {tab === "location" && <SaleLocationTab form={form} set={set} />}
                    {tab === "documents" && (
                        <SaleDocumentsTab
                            form={form}
                            set={set}
                            listingId={id}
                            isSaved={isSaved}
                            canEdit={canEdit}
                            persist={persist}
                        />
                    )}
                    {tab === "performance" && <SalePerformanceTab form={form} set={set} />}
                </div>

                <SaleEditorSide
                    published={form.published}
                    reference={initial?.reference ?? null}
                    savedSlug={savedSlug}
                    isSaved={isSaved}
                    canEdit={canEdit}
                    locked={locked}
                    busy={busy}
                    dirty={dirty}
                    problems={problems}
                    checklist={checklist}
                    onSave={() => submit(form.published, "save")}
                    onPublish={() => submit(!form.published, "publish")}
                    onRemove={remove}
                    onFocusProblem={(p) => goToField(PROBLEM_FIELD[p].tab, PROBLEM_FIELD[p].id)}
                    title={title}
                    priceLabel={priceLabel}
                    meta={meta}
                    mainImageUrl={mainImage?.url ?? null}
                />
            </div>
            <SaleSaveBar
                dirty={dirty}
                locked={locked}
                busy={busy}
                published={form.published}
                problems={problems}
                onSave={() => submit(form.published, "save")}
                onPublish={() => submit(!form.published, "publish")}
            />
        </div>
    );
}
