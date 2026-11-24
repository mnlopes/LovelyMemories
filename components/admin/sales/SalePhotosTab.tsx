"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, Star, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { resizeImage } from "@/lib/sales/image-resize";
import { newPhotoPath, ownedStoragePath } from "@/lib/sales/storage";
import { localized } from "@/lib/sales/format";
import type { SaleImage } from "@/lib/sales/types";
import { DEFAULT_LANG, LangTabs, Section, focusRing, input, primaryBtn, type Lang, type SaleFileTabProps } from "./ui";

const BUCKET = "sale-listings";
const ACCEPT = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGES = 80; // same cap as the save validation

/** Re-indexes `order` and guarantees exactly one main photo. */
function normalize(images: SaleImage[]): SaleImage[] {
    const mainIndex = Math.max(
        0,
        images.findIndex((i) => i.is_main),
    );
    return images.map((img, i) => ({ ...img, order: i, is_main: i === mainIndex }));
}

export function SalePhotosTab({ form, set, listingId, isSaved, canEdit, persist }: SaleFileTabProps) {
    const t = useTranslations("AdminSales");
    const locale = useLocale();
    const [lang, setLang] = useState<Lang>(DEFAULT_LANG);
    const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
    const [deleting, setDeleting] = useState<number | null>(null);
    const fileInput = useRef<HTMLInputElement>(null);
    // The alt text a field had when it got focus: it is saved on blur only if it changed.
    const altAtFocus = useRef<string>("");
    const images = form.images;
    const busy = progress !== null || deleting !== null;

    if (!isSaved) {
        return (
            <Section title={t("tabs.photos")}>
                {/* Target of the "at least one photo" item in the publish checklist. */}
                <p id="sale-field-photo" tabIndex={-1} className="text-sm text-[#a3a3a3] focus:outline-none">
                    {images.length > 0 ? t("photos.copiedUnsaved", { count: images.length }) : t("photos.saveFirst")}
                </p>
                {images.length > 0 && (
                    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                        {images.slice(0, 12).map((img, i) => (
                            <li key={img.url} className="relative aspect-[4/3] overflow-hidden rounded-lg bg-[#f5f5f5] dark:bg-admin-dark-bg">
                                <Image src={img.url} alt="" fill sizes="120px" className="object-cover" />
                                {i === 0 && (
                                    <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                                        {t("photos.main")}
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </Section>
        );
    }

    async function onFiles(fileList: FileList | null) {
        if (!fileList || fileList.length === 0 || busy || !canEdit) return;
        const all = Array.from(fileList);
        const valid = all.filter((f) => ACCEPT.includes(f.type));
        if (valid.length < all.length) toast.error(t("photos.notAnImage"));
        const room = MAX_IMAGES - images.length;
        if (valid.length > room) toast.error(t("photos.tooMany", { max: MAX_IMAGES }));
        const files = valid.slice(0, Math.max(0, room));
        if (files.length === 0) return;

        setProgress({ done: 0, total: files.length });
        const added: SaleImage[] = [];
        const paths: string[] = [];
        let failed = 0;
        for (const file of files) {
            try {
                const blob = await resizeImage(file);
                const path = newPhotoPath(listingId);
                const { error } = await supabase.storage
                    .from(BUCKET)
                    .upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
                if (error) throw error;
                paths.push(path);
                added.push({
                    url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl,
                    alt: {},
                    order: 0,
                    is_main: false,
                });
            } catch (e) {
                failed++;
                console.error("sale photo upload failed:", (e as Error).message);
            }
            setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
        }
        if (failed > 0) toast.error(t("photos.uploadFailed", { count: failed }));

        if (added.length > 0) {
            // Built from the images at save time: alt/order edits made during the upload survive.
            const ok = await persist((prev) => ({ images: normalize([...prev.images, ...added]) }));
            if (!ok) {
                // The form went back to its previous state: do not leave the files orphaned.
                const { error } = await supabase.storage.from(BUCKET).remove(paths);
                if (error) console.error("sale photo cleanup failed:", error.message);
            }
        }
        setProgress(null);
        if (fileInput.current) fileInput.current.value = "";
    }

    // Order and cover are saved right away, like uploads and deletions. The change is located by the
    // photo's url and applied to the saved listing (then to the form), so unsaved edits elsewhere
    // are never published by it.
    function move(url: string, delta: -1 | 1) {
        if (busy || !canEdit) return;
        void persist((prev) => {
            const index = prev.images.findIndex((img) => img.url === url);
            const target = index + delta;
            if (index < 0 || target < 0 || target >= prev.images.length) return {};
            const next = [...prev.images];
            [next[index], next[target]] = [next[target], next[index]];
            return { images: normalize(next) };
        });
    }

    function makeMain(url: string) {
        if (busy || !canEdit) return;
        void persist((prev) => {
            const next = prev.images.map((img) => ({ ...img, is_main: img.url === url }));
            const index = next.findIndex((img) => img.url === url);
            if (index < 0) return {};
            const [picked] = next.splice(index, 1);
            return { images: normalize([picked, ...next]) };
        });
    }

    function setAlt(index: number, value: string) {
        set(
            "images",
            images.map((img, i) => (i === index ? { ...img, alt: { ...img.alt, [lang]: value } } : img)),
        );
    }

    function saveAlt(url: string, value: string) {
        if (!canEdit || value === altAtFocus.current) return;
        const field = lang;
        // Quiet: a click on Save right after typing must not be swallowed by a disabled button;
        // the save queue runs the two one after the other.
        void persist(
            (prev) => ({
                images: prev.images.map((img) =>
                    img.url === url ? { ...img, alt: { ...img.alt, [field]: value } } : img,
                ),
            }),
            { quiet: true },
        );
    }

    async function remove(index: number) {
        if (busy || !canEdit) return;
        if (form.published && images.length <= 1) {
            toast.error(t("photos.lastPublished"));
            return;
        }
        if (!window.confirm(t("photos.deleteConfirm"))) return;
        const url = images[index].url;
        setDeleting(index);
        try {
            const ok = await persist((prev) => ({
                images: normalize(prev.images.filter((img) => img.url !== url)),
            }));
            if (!ok) return;
            // Only files in this listing's own folder are deleted; copied photos are just unlinked.
            const path = ownedStoragePath(url, listingId);
            if (path) {
                const { error } = await supabase.storage.from(BUCKET).remove([path]);
                if (error) console.error("sale photo delete failed:", error.message);
            }
        } finally {
            setDeleting(null);
        }
    }

    return (
        <Section title={t("tabs.photos")} hint={`${images.length}/${MAX_IMAGES}`}>
            <p className="text-sm text-[#737373] dark:text-admin-dark-text-secondary">{t("photos.intro")}</p>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <input
                        ref={fileInput}
                        type="file"
                        multiple
                        accept={ACCEPT.join(",")}
                        className="sr-only"
                        id="sale-photo-input"
                        disabled={busy || !canEdit}
                        onChange={(e) => onFiles(e.target.files)}
                    />
                    <button
                        type="button"
                        disabled={busy || !canEdit || images.length >= MAX_IMAGES}
                        id="sale-field-photo"
                        onClick={() => fileInput.current?.click()}
                        className={primaryBtn}
                    >
                        {progress ? (
                            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        ) : (
                            <ImagePlus className="size-4" aria-hidden="true" />
                        )}
                        {progress
                            ? t("photos.uploading", { done: progress.done, total: progress.total })
                            : t("photos.upload")}
                    </button>
                </div>
                {images.length > 0 && <LangTabs lang={lang} onChange={setLang} />}
            </div>

            {images.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[#eaeaea] dark:border-admin-dark-border p-8 text-center text-sm text-[#a3a3a3]">
                    {t("photos.empty")}
                </p>
            ) : (
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {images.map((img, i) => (
                        <li
                            key={img.url}
                            className="flex flex-col gap-3 rounded-2xl border border-[#f5f5f5] dark:border-admin-dark-border p-3"
                        >
                            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[#f5f5f5] dark:bg-admin-dark-bg">
                                <Image
                                    src={img.url}
                                    alt={localized(img.alt, locale) || t("photos.photoN", { n: i + 1 })}
                                    fill
                                    sizes="(min-width: 1024px) 220px, (min-width: 640px) 45vw, 90vw"
                                    className="object-cover"
                                />
                                {img.is_main && (
                                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-[#171717] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                                        <Star className="size-3" aria-hidden="true" />
                                        {t("photos.main")}
                                    </span>
                                )}
                            </div>
                            <input
                                type="text"
                                aria-label={t("photos.altLabel", { n: i + 1, lang: lang.toUpperCase() })}
                                placeholder={t("photos.altPlaceholder", { lang: lang.toUpperCase() })}
                                value={img.alt[lang] ?? ""}
                                onFocus={(e) => {
                                    altAtFocus.current = e.target.value;
                                }}
                                onChange={(e) => setAlt(i, e.target.value)}
                                onBlur={(e) => saveAlt(img.url, e.target.value)}
                                disabled={!canEdit}
                                maxLength={5000}
                                className={input}
                            />
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <IconBtn
                                        label={t("photos.moveBack")}
                                        disabled={busy || !canEdit || i === 0}
                                        onClick={() => move(img.url, -1)}
                                    >
                                        <ArrowLeft className="size-4" aria-hidden="true" />
                                    </IconBtn>
                                    <IconBtn
                                        label={t("photos.moveForward")}
                                        disabled={busy || !canEdit || i === images.length - 1}
                                        onClick={() => move(img.url, 1)}
                                    >
                                        <ArrowRight className="size-4" aria-hidden="true" />
                                    </IconBtn>
                                    <IconBtn
                                        label={t("photos.makeMain")}
                                        disabled={busy || !canEdit || img.is_main}
                                        onClick={() => makeMain(img.url)}
                                    >
                                        <Star className="size-4" aria-hidden="true" />
                                    </IconBtn>
                                </div>
                                <IconBtn
                                    label={t("photos.delete")}
                                    disabled={busy || !canEdit}
                                    danger
                                    onClick={() => remove(i)}
                                >
                                    {deleting === i ? (
                                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                                    ) : (
                                        <Trash2 className="size-4" aria-hidden="true" />
                                    )}
                                </IconBtn>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </Section>
    );
}

function IconBtn({
    label,
    onClick,
    disabled,
    danger,
    children,
}: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    danger?: boolean;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            disabled={disabled}
            onClick={onClick}
            className={`flex size-11 items-center justify-center rounded-lg text-[#737373] transition-all disabled:cursor-not-allowed disabled:opacity-40 md:size-9 ${focusRing} ${
                danger
                    ? "hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                    : "hover:bg-[#f5f5f5] hover:text-[#171717] dark:hover:bg-white/10 dark:hover:text-white"
            }`}
        >
            {children}
        </button>
    );
}
