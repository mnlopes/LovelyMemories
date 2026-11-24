"use client";

import { useRef, useState, type ReactNode } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, ExternalLink, FilePlus2, FileText, FileUp, Loader2, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { getSaleDocUrl } from "@/app/actions/sales";
import { supabase } from "@/lib/supabase";
import { energyCertPath, floorPlanPath, ownedStoragePath, saleDocumentPath } from "@/lib/sales/storage";
import { ENERGY_CERT_DOC_ID, ENERGY_CLASSES, MAX_SALE_DOCUMENTS, type SaleDocument } from "@/lib/sales/types";
import { Section, focusRing, input, label, secondaryBtn, type SaleFileTabProps } from "./ui";
import { useConfirm } from "./useConfirm";

const PUBLIC_BUCKET = "sale-listings";
const PRIVATE_BUCKET = "sale-listings-private";
const MAX_PDF_BYTES = 15 * 1024 * 1024;

/** "plan", "cert", "add", or the id of a document being replaced / removed / opened. */
type Busy = null | string;

const dangerBtn =
    "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-500/10";
const iconBtn = `flex size-9 items-center justify-center rounded-lg text-[#a3a3a3] hover:bg-[#f5f5f5] hover:text-[#171717] disabled:opacity-40 dark:hover:bg-admin-dark-bg dark:hover:text-white ${focusRing}`;

function formatSize(bytes: number | null): string {
    if (bytes === null) return "";
    return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Switch "Visible on the site" / "Private". */
function VisibleSwitch({
    on,
    disabled,
    onChange,
    labelOn,
    labelOff,
}: {
    on: boolean;
    disabled?: boolean;
    onChange: (v: boolean) => void;
    labelOn: string;
    labelOff: string;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={on}
            disabled={disabled}
            onClick={() => onChange(!on)}
            className={`inline-flex min-h-9 items-center gap-2 rounded-lg px-2 text-xs font-bold disabled:opacity-50 ${focusRing} ${
                on ? "text-emerald-700 dark:text-emerald-400" : "text-[#737373] dark:text-admin-dark-text-secondary"
            }`}
        >
            <span
                aria-hidden="true"
                className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${on ? "bg-emerald-500" : "bg-[#d4d4d4] dark:bg-white/20"}`}
            >
                <span
                    className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-[left] duration-200 ${on ? "left-[18px]" : "left-0.5"}`}
                />
            </span>
            {on ? labelOn : labelOff}
        </button>
    );
}

export function SaleDocumentsTab({ form, set, listingId, isSaved, canEdit, persist }: SaleFileTabProps) {
    const t = useTranslations("AdminSales");
    const [busy, setBusy] = useState<Busy>(null);
    const { confirm, dialog } = useConfirm();
    const confirmRemove = () => confirm({ title: t("documents.deleteTitle"), message: t("documents.deleteConfirm") });
    const planInput = useRef<HTMLInputElement>(null);
    const certInput = useRef<HTMLInputElement>(null);
    const addInput = useRef<HTMLInputElement>(null);
    const replaceInput = useRef<HTMLInputElement>(null);
    const replaceTarget = useRef<string | null>(null);

    /** Validates a PDF; returns null (and a toast) when it is not acceptable. */
    function pickPdf(file: File | undefined): File | null {
        if (!file) return null;
        if (file.type !== "application/pdf") {
            toast.error(t("documents.notPdf"));
            return null;
        }
        if (file.size > MAX_PDF_BYTES) {
            toast.error(t("documents.tooBig", { mb: 15 }));
            return null;
        }
        return file;
    }

    async function uploadPrivate(path: string, pdf: File) {
        const { error } = await supabase.storage.from(PRIVATE_BUCKET).upload(path, pdf, { contentType: "application/pdf", upsert: true });
        if (error) throw error;
    }

    async function openPrivate(docId: string) {
        if (busy) return;
        setBusy(`open:${docId}`);
        // Opened right away (inside the click) so the browser does not block it; filled in when the link arrives.
        const win = window.open("", "_blank");
        try {
            const url = await getSaleDocUrl(listingId, docId);
            if (!url) throw new Error("no url");
            if (win) {
                win.opener = null;
                win.location.href = url;
            } else window.open(url, "_blank", "noopener,noreferrer");
        } catch {
            win?.close();
            toast.error(t("documents.openFailed"));
        } finally {
            setBusy(null);
        }
    }

    // ---- Floor plan (public bucket, always shown) ----

    async function uploadPlan(file: File | undefined) {
        const pdf = pickPdf(file);
        if (!pdf || busy || !canEdit) return;
        setBusy("plan");
        try {
            const path = floorPlanPath(listingId);
            const { error } = await supabase.storage
                .from(PUBLIC_BUCKET)
                .upload(path, pdf, { contentType: "application/pdf", upsert: true, cacheControl: "300" });
            if (error) throw error;
            // Same path on every upload: the query string stops browsers showing the old file.
            const url = `${supabase.storage.from(PUBLIC_BUCKET).getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
            await persist({ floor_plan_url: url });
        } catch (e) {
            console.error("floor plan upload failed:", (e as Error).message);
            toast.error(t("documents.uploadFailed"));
        } finally {
            setBusy(null);
            if (planInput.current) planInput.current.value = "";
        }
    }

    async function removePlan() {
        if (busy || !canEdit || !form.floor_plan_url) return;
        if (!(await confirmRemove())) return;
        const path = ownedStoragePath(form.floor_plan_url, listingId);
        setBusy("plan");
        try {
            if (!(await persist({ floor_plan_url: null }))) return;
            if (path) {
                const { error } = await supabase.storage.from(PUBLIC_BUCKET).remove([path]);
                if (error) console.error("floor plan delete failed:", error.message);
            }
        } finally {
            setBusy(null);
        }
    }

    // ---- Energy certificate (private bucket, public only when switched on) ----

    async function uploadCert(file: File | undefined) {
        const pdf = pickPdf(file);
        if (!pdf || busy || !canEdit) return;
        setBusy("cert");
        try {
            const path = energyCertPath(listingId);
            await uploadPrivate(path, pdf);
            // Only the path is stored, never a URL: the bucket is private.
            await persist({ energy_cert_path: path });
        } catch (e) {
            console.error("certificate upload failed:", (e as Error).message);
            toast.error(t("documents.uploadFailed"));
        } finally {
            setBusy(null);
            if (certInput.current) certInput.current.value = "";
        }
    }

    async function removeCert() {
        if (busy || !canEdit || !form.energy_cert_path) return;
        if (!(await confirmRemove())) return;
        const path = form.energy_cert_path;
        setBusy("cert");
        try {
            if (!(await persist({ energy_cert_path: null, energy_cert_public: false }))) return;
            const { error } = await supabase.storage.from(PRIVATE_BUCKET).remove([path]);
            if (error) console.error("certificate delete failed:", error.message);
        } finally {
            setBusy(null);
        }
    }

    // ---- Other documents (private bucket, each public only when switched on) ----

    async function addDocument(file: File | undefined) {
        const pdf = pickPdf(file);
        if (addInput.current) addInput.current.value = "";
        if (!pdf || busy || !canEdit) return;
        if (form.documents.length >= MAX_SALE_DOCUMENTS) {
            toast.error(t("documents.maxDocs", { max: MAX_SALE_DOCUMENTS }));
            return;
        }
        setBusy("add");
        try {
            const id = crypto.randomUUID();
            const path = saleDocumentPath(listingId, id);
            await uploadPrivate(path, pdf);
            // The file name (without .pdf) as a starting name in both languages; edited in the row.
            const base = pdf.name.replace(/\.pdf$/i, "").replace(/[-_]+/g, " ").trim().slice(0, 120);
            const doc: SaleDocument = { id, name: { pt: base, en: base }, path, public: false, size: pdf.size };
            const ok = await persist((f) => ({ documents: [...f.documents, doc] }));
            if (!ok) await supabase.storage.from(PRIVATE_BUCKET).remove([path]);
        } catch (e) {
            console.error("document upload failed:", (e as Error).message);
            toast.error(t("documents.uploadFailed"));
        } finally {
            setBusy(null);
        }
    }

    async function replaceDocument(file: File | undefined) {
        const pdf = pickPdf(file);
        const id = replaceTarget.current;
        if (replaceInput.current) replaceInput.current.value = "";
        replaceTarget.current = null;
        const doc = form.documents.find((d) => d.id === id);
        if (!pdf || !doc || busy || !canEdit) return;
        setBusy(doc.id);
        try {
            await uploadPrivate(doc.path, pdf);
            await persist((f) => ({ documents: f.documents.map((d) => (d.id === doc.id ? { ...d, size: pdf.size } : d)) }));
        } catch (e) {
            console.error("document replace failed:", (e as Error).message);
            toast.error(t("documents.uploadFailed"));
        } finally {
            setBusy(null);
        }
    }

    async function removeDocument(doc: SaleDocument) {
        if (busy || !canEdit) return;
        if (!(await confirmRemove())) return;
        setBusy(doc.id);
        try {
            if (!(await persist((f) => ({ documents: f.documents.filter((d) => d.id !== doc.id) })))) return;
            const { error } = await supabase.storage.from(PRIVATE_BUCKET).remove([doc.path]);
            if (error) console.error("document delete failed:", error.message);
        } finally {
            setBusy(null);
        }
    }

    // Name, visibility and order are ordinary form edits: autosave stores them.
    const updateDoc = (id: string, patch: Partial<SaleDocument>) =>
        set(
            "documents",
            form.documents.map((d) => (d.id === id ? { ...d, ...patch } : d)),
        );
    const moveDoc = (index: number, delta: -1 | 1) => {
        const next = [...form.documents];
        const [item] = next.splice(index, 1);
        next.splice(index + delta, 0, item);
        set("documents", next);
    };

    const spinnerOr = (key: string, icon: ReactNode) =>
        busy === key ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : icon;

    return (
        <>
            {dialog}
            <Section title={t("documents.energySection")}>
                <div className="flex flex-col gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#a3a3a3]">
                        {t("documents.energyClass")}
                    </span>
                    <div
                        id="sale-field-energy_class"
                        tabIndex={-1}
                        role="group"
                        aria-label={t("documents.energyClass")}
                        className="flex flex-wrap gap-2 outline-none"
                    >
                        {ENERGY_CLASSES.map((c) => (
                            <button
                                key={c}
                                type="button"
                                aria-pressed={form.energy_class === c}
                                onClick={() => set("energy_class", form.energy_class === c ? null : c)}
                                className={`min-h-10 min-w-12 rounded-xl border px-3 text-sm font-bold transition-all ${
                                    form.energy_class === c
                                        ? "border-[#171717] bg-[#171717] text-white dark:border-white dark:bg-white dark:text-black"
                                        : "border-[#eaeaea] bg-white text-[#171717] hover:bg-[#fafafa] dark:border-admin-dark-border dark:bg-admin-dark-surface dark:text-admin-dark-text-primary dark:hover:bg-admin-dark-bg"
                                }`}
                            >
                                {c === "exempt" ? t("documents.exempt") : c}
                            </button>
                        ))}
                    </div>
                </div>

                <label className={`${label} md:max-w-sm`}>
                    {t("documents.certNumber")}
                    <input
                        type="text"
                        spellCheck={false}
                        autoComplete="off"
                        value={form.energy_cert_number ?? ""}
                        onChange={(e) => set("energy_cert_number", e.target.value || null)}
                        maxLength={60}
                        className={input}
                    />
                    <span className="text-[11px] font-normal normal-case tracking-normal text-[#a3a3a3]">
                        {t("documents.certNumberHint")}
                    </span>
                </label>

                <div className="flex flex-col gap-2 border-t border-[#f5f5f5] dark:border-admin-dark-border pt-4">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#a3a3a3]">
                        {t("documents.certFile")}
                    </span>
                    {!isSaved ? (
                        <p className="text-sm text-[#a3a3a3]">{t("documents.saveFirst")}</p>
                    ) : (
                        <>
                            <p className="text-xs text-[#a3a3a3]">{t("documents.certPublicHint")}</p>
                            <div className="flex flex-wrap items-center gap-2">
                                <input
                                    ref={certInput}
                                    type="file"
                                    accept="application/pdf"
                                    className="sr-only"
                                    tabIndex={-1}
                                    onChange={(e) => uploadCert(e.target.files?.[0])}
                                />
                                <button
                                    type="button"
                                    disabled={busy !== null || !canEdit}
                                    onClick={() => certInput.current?.click()}
                                    className={secondaryBtn}
                                >
                                    {spinnerOr("cert", <FileUp className="size-4" aria-hidden="true" />)}
                                    {form.energy_cert_path ? t("documents.replace") : t("documents.uploadPdf")}
                                </button>
                                {form.energy_cert_path && (
                                    <>
                                        <button
                                            type="button"
                                            disabled={busy !== null}
                                            onClick={() => openPrivate(ENERGY_CERT_DOC_ID)}
                                            className={secondaryBtn}
                                        >
                                            {spinnerOr(`open:${ENERGY_CERT_DOC_ID}`, <ExternalLink className="size-4" aria-hidden="true" />)}
                                            {t("documents.open")}
                                        </button>
                                        <button type="button" disabled={busy !== null || !canEdit} onClick={removeCert} className={dangerBtn}>
                                            <Trash2 className="size-4" aria-hidden="true" />
                                            {t("documents.remove")}
                                        </button>
                                    </>
                                )}
                                <div className="sm:ml-auto">
                                    <VisibleSwitch
                                        on={form.energy_cert_public && !!form.energy_cert_path}
                                        disabled={!canEdit || !form.energy_cert_path}
                                        onChange={(v) => set("energy_cert_public", v)}
                                        labelOn={t("documents.visible")}
                                        labelOff={form.energy_cert_path ? t("documents.private") : t("documents.uploadToShow")}
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </Section>

            <Section title={t("documents.planSection")} hint={t("documents.planAlwaysPublic")}>
                {!isSaved ? (
                    <p className="text-sm text-[#a3a3a3]">{t("documents.saveFirst")}</p>
                ) : (
                    <>
                        <p className="text-xs text-[#a3a3a3]">{t("documents.planHint")}</p>
                        <div className="flex flex-wrap items-center gap-2">
                            <input
                                ref={planInput}
                                type="file"
                                accept="application/pdf"
                                className="sr-only"
                                tabIndex={-1}
                                onChange={(e) => uploadPlan(e.target.files?.[0])}
                            />
                            <button
                                type="button"
                                disabled={busy !== null || !canEdit}
                                onClick={() => planInput.current?.click()}
                                className={secondaryBtn}
                            >
                                {spinnerOr("plan", <FileUp className="size-4" aria-hidden="true" />)}
                                {form.floor_plan_url ? t("documents.replace") : t("documents.uploadPdf")}
                            </button>
                            {form.floor_plan_url && (
                                <>
                                    <a href={form.floor_plan_url} target="_blank" rel="noopener noreferrer" className={secondaryBtn}>
                                        <ExternalLink className="size-4" aria-hidden="true" />
                                        {t("documents.open")}
                                    </a>
                                    <button type="button" disabled={busy !== null || !canEdit} onClick={removePlan} className={dangerBtn}>
                                        <Trash2 className="size-4" aria-hidden="true" />
                                        {t("documents.remove")}
                                    </button>
                                </>
                            )}
                        </div>
                    </>
                )}
            </Section>

            <Section title={t("documents.otherSection")} hint={`${form.documents.length}/${MAX_SALE_DOCUMENTS}`}>
                <p className="text-xs text-[#a3a3a3]">{t("documents.otherHint")}</p>
                {!isSaved ? (
                    <p className="text-sm text-[#a3a3a3]">{t("documents.saveFirst")}</p>
                ) : (
                    <>
                        <input
                            ref={replaceInput}
                            type="file"
                            accept="application/pdf"
                            className="sr-only"
                            tabIndex={-1}
                            onChange={(e) => replaceDocument(e.target.files?.[0])}
                        />
                        {form.documents.length > 0 && (
                            <ul className="flex flex-col gap-3">
                                {form.documents.map((doc, i) => (
                                    <li
                                        key={doc.id}
                                        className="flex flex-col gap-3 rounded-2xl border border-[#f5f5f5] bg-[#fafafa] p-4 dark:border-admin-dark-border dark:bg-admin-dark-bg"
                                    >
                                        <div className="flex items-center gap-2">
                                            <FileText className="size-5 shrink-0 text-[#a3a3a3]" aria-hidden="true" />
                                            <span className="min-w-0 flex-1 truncate text-xs text-[#a3a3a3]">
                                                PDF{doc.size !== null ? ` · ${formatSize(doc.size)}` : ""}
                                            </span>
                                            <VisibleSwitch
                                                on={doc.public}
                                                disabled={!canEdit}
                                                onChange={(v) => updateDoc(doc.id, { public: v })}
                                                labelOn={t("documents.visible")}
                                                labelOff={t("documents.private")}
                                            />
                                        </div>
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            <label className={label}>
                                                {t("documents.namePt")}
                                                <input
                                                    type="text"
                                                    value={doc.name.pt ?? ""}
                                                    onChange={(e) => updateDoc(doc.id, { name: { ...doc.name, pt: e.target.value } })}
                                                    placeholder={t("documents.namePlaceholderPt")}
                                                    maxLength={120}
                                                    className={input}
                                                />
                                            </label>
                                            <label className={label}>
                                                {t("documents.nameEn")}
                                                <input
                                                    type="text"
                                                    value={doc.name.en ?? ""}
                                                    onChange={(e) => updateDoc(doc.id, { name: { ...doc.name, en: e.target.value } })}
                                                    placeholder={t("documents.namePlaceholderEn")}
                                                    maxLength={120}
                                                    className={input}
                                                />
                                            </label>
                                        </div>
                                        {doc.public && (
                                            <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                                                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                                                {t("documents.personalWarning")}
                                            </p>
                                        )}
                                        <div className="flex flex-wrap items-center gap-1">
                                            <button
                                                type="button"
                                                disabled={busy !== null}
                                                onClick={() => openPrivate(doc.id)}
                                                className={secondaryBtn}
                                            >
                                                {spinnerOr(`open:${doc.id}`, <ExternalLink className="size-4" aria-hidden="true" />)}
                                                {t("documents.open")}
                                            </button>
                                            <button
                                                type="button"
                                                disabled={busy !== null || !canEdit}
                                                onClick={() => {
                                                    replaceTarget.current = doc.id;
                                                    replaceInput.current?.click();
                                                }}
                                                className={secondaryBtn}
                                            >
                                                {spinnerOr(doc.id, <FileUp className="size-4" aria-hidden="true" />)}
                                                {t("documents.replace")}
                                            </button>
                                            <span className="ml-auto flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    aria-label={t("documents.moveUp")}
                                                    disabled={!canEdit || i === 0}
                                                    onClick={() => moveDoc(i, -1)}
                                                    className={iconBtn}
                                                >
                                                    <ArrowUp className="size-4" aria-hidden="true" />
                                                </button>
                                                <button
                                                    type="button"
                                                    aria-label={t("documents.moveDown")}
                                                    disabled={!canEdit || i === form.documents.length - 1}
                                                    onClick={() => moveDoc(i, 1)}
                                                    className={iconBtn}
                                                >
                                                    <ArrowDown className="size-4" aria-hidden="true" />
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={busy !== null || !canEdit}
                                                    onClick={() => removeDocument(doc)}
                                                    className={dangerBtn}
                                                >
                                                    <Trash2 className="size-4" aria-hidden="true" />
                                                    {t("documents.remove")}
                                                </button>
                                            </span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <div className="flex flex-wrap items-center gap-3">
                            <input
                                ref={addInput}
                                type="file"
                                accept="application/pdf"
                                className="sr-only"
                                tabIndex={-1}
                                onChange={(e) => addDocument(e.target.files?.[0])}
                            />
                            <button
                                type="button"
                                disabled={busy !== null || !canEdit || form.documents.length >= MAX_SALE_DOCUMENTS}
                                onClick={() => addInput.current?.click()}
                                className={secondaryBtn}
                            >
                                {spinnerOr("add", <FilePlus2 className="size-4" aria-hidden="true" />)}
                                {t("documents.addDocument")}
                            </button>
                            <span className="text-[11px] text-[#a3a3a3]">{t("documents.addHint", { mb: 15, max: MAX_SALE_DOCUMENTS })}</span>
                        </div>
                    </>
                )}
            </Section>
        </>
    );
}
