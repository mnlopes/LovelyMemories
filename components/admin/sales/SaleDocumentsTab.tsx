"use client";

import { useRef, useState } from "react";
import { ExternalLink, FileUp, Loader2, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { getEnergyCertUrl } from "@/app/actions/sales";
import { supabase } from "@/lib/supabase";
import { energyCertPath, floorPlanPath, ownedStoragePath } from "@/lib/sales/storage";
import { ENERGY_CLASSES } from "@/lib/sales/types";
import { Section, input, label, secondaryBtn, type SaleFileTabProps } from "./ui";

const PUBLIC_BUCKET = "sale-listings";
const PRIVATE_BUCKET = "sale-listings-private";
const MAX_PDF_BYTES = 15 * 1024 * 1024;

type Busy = null | "plan" | "cert" | "open";

export function SaleDocumentsTab({ form, set, listingId, isSaved, canEdit, persist }: SaleFileTabProps) {
    const t = useTranslations("AdminSales");
    const [busy, setBusy] = useState<Busy>(null);
    const planInput = useRef<HTMLInputElement>(null);
    const certInput = useRef<HTMLInputElement>(null);

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
        if (!window.confirm(t("documents.deleteConfirm"))) return;
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

    async function uploadCert(file: File | undefined) {
        const pdf = pickPdf(file);
        if (!pdf || busy || !canEdit) return;
        setBusy("cert");
        try {
            const path = energyCertPath(listingId);
            const { error } = await supabase.storage
                .from(PRIVATE_BUCKET)
                .upload(path, pdf, { contentType: "application/pdf", upsert: true });
            if (error) throw error;
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
        if (!window.confirm(t("documents.deleteConfirm"))) return;
        const path = form.energy_cert_path;
        setBusy("cert");
        try {
            if (!(await persist({ energy_cert_path: null }))) return;
            const { error } = await supabase.storage.from(PRIVATE_BUCKET).remove([path]);
            if (error) console.error("certificate delete failed:", error.message);
        } finally {
            setBusy(null);
        }
    }

    async function openCert() {
        if (busy) return;
        setBusy("open");
        try {
            const url = await getEnergyCertUrl(listingId);
            if (!url) {
                toast.error(t("documents.openFailed"));
                return;
            }
            window.open(url, "_blank", "noopener,noreferrer");
        } catch {
            toast.error(t("documents.openFailed"));
        } finally {
            setBusy(null);
        }
    }

    return (
        <>
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
                            <p className="text-xs text-[#a3a3a3]">{t("documents.certHint")}</p>
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
                                    {busy === "cert" ? (
                                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                                    ) : (
                                        <FileUp className="size-4" aria-hidden="true" />
                                    )}
                                    {form.energy_cert_path ? t("documents.replace") : t("documents.uploadPdf")}
                                </button>
                                {form.energy_cert_path && (
                                    <>
                                        <button
                                            type="button"
                                            disabled={busy !== null}
                                            onClick={openCert}
                                            className={secondaryBtn}
                                        >
                                            {busy === "open" ? (
                                                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                                            ) : (
                                                <ExternalLink className="size-4" aria-hidden="true" />
                                            )}
                                            {t("documents.open")}
                                        </button>
                                        <button
                                            type="button"
                                            disabled={busy !== null || !canEdit}
                                            onClick={removeCert}
                                            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-500/10"
                                        >
                                            <Trash2 className="size-4" aria-hidden="true" />
                                            {t("documents.remove")}
                                        </button>
                                    </>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </Section>

            <Section title={t("documents.planSection")}>
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
                                {busy === "plan" ? (
                                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                                ) : (
                                    <FileUp className="size-4" aria-hidden="true" />
                                )}
                                {form.floor_plan_url ? t("documents.replace") : t("documents.uploadPdf")}
                            </button>
                            {form.floor_plan_url && (
                                <>
                                    <a
                                        href={form.floor_plan_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={secondaryBtn}
                                    >
                                        <ExternalLink className="size-4" aria-hidden="true" />
                                        {t("documents.open")}
                                    </a>
                                    <button
                                        type="button"
                                        disabled={busy !== null || !canEdit}
                                        onClick={removePlan}
                                        className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-500/10"
                                    >
                                        <Trash2 className="size-4" aria-hidden="true" />
                                        {t("documents.remove")}
                                    </button>
                                </>
                            )}
                        </div>
                    </>
                )}
            </Section>
        </>
    );
}
