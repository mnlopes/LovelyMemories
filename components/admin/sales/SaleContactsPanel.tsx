"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { saveSalesContactSettings, type SalesContactSettings } from "@/app/actions/sales";
import { focusRing, input, label, primaryBtn } from "./ui";

const EMAIL_RE = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;

/**
 * Side panel with the sales contacts shown on every listing (AMI licence, WhatsApp, email that
 * receives buyer requests). Each field saves when you leave it, like the listing editor.
 */
export function SaleContactsPanel({
    open,
    onClose,
    contacts,
    onSaved,
    canEdit,
}: {
    open: boolean;
    onClose: () => void;
    contacts: SalesContactSettings;
    onSaved: (c: SalesContactSettings) => void;
    canEdit: boolean;
}) {
    const t = useTranslations("AdminSales");
    const locale = useLocale();
    const titleId = useId();
    const [draft, setDraft] = useState(contacts);
    const [saving, setSaving] = useState(false);
    const [savedAt, setSavedAt] = useState<number | null>(null);
    const [emailError, setEmailError] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const savedRef = useRef(contacts);

    // Focus moves into the panel when it opens (only then: a save re-renders the parent).
    useEffect(() => {
        if (open) (panelRef.current?.querySelector<HTMLElement>("input:not([disabled])") ?? panelRef.current?.querySelector<HTMLElement>("button"))?.focus();
    }, [open]);

    // Escape closes.
    const closeRef = useRef(onClose);
    useEffect(() => {
        closeRef.current = onClose;
    }, [onClose]);
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") closeRef.current();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open]);

    /** `manual` (the Save button): saves even with no change and confirms it; otherwise only when something changed. */
    async function save(manual = false) {
        if (!canEdit || saving) return;
        const next = {
            ami_license: draft.ami_license.trim(),
            whatsapp: draft.whatsapp.trim(),
            leads_email: draft.leads_email.trim(),
        };
        if (next.leads_email && !EMAIL_RE.test(next.leads_email)) {
            setEmailError(true);
            return;
        }
        setEmailError(false);
        if (!manual && JSON.stringify(next) === JSON.stringify(savedRef.current)) return;
        setSaving(true);
        try {
            const res = await saveSalesContactSettings(next);
            if (!res.ok) {
                if (res.error === "invalid_email") setEmailError(true);
                else toast.error(t("settings.saveFailed"));
                return;
            }
            savedRef.current = next;
            setSavedAt(Date.now());
            onSaved(next);
        } catch {
            toast.error(t("settings.saveFailed"));
        } finally {
            setSaving(false);
        }
    }

    if (!open) return null;

    const field = (key: keyof SalesContactSettings) => ({
        value: draft[key],
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
            setDraft((d) => ({ ...d, [key]: e.target.value }));
            if (key === "leads_email") setEmailError(false);
        },
        disabled: !canEdit,
        className: input,
    });

    return (
        <div className="fixed inset-0 z-[90]">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                // Leaving any field saves (only when something changed).
                onBlur={() => void save()}
                className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col gap-5 overflow-y-auto border-l border-[#f5f5f5] bg-white p-6 shadow-2xl animate-in slide-in-from-right duration-300 dark:border-admin-dark-border dark:bg-admin-dark-surface"
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                        <h2 id={titleId} className="text-lg font-bold text-[#171717] dark:text-admin-dark-text-primary">
                            {t("contacts.title")}
                        </h2>
                        <p className="text-sm text-[#737373] dark:text-admin-dark-text-secondary">{t("contacts.description")}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label={t("contacts.close")}
                        className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-[#a3a3a3] hover:bg-[#f5f5f5] hover:text-[#171717] dark:hover:bg-admin-dark-bg dark:hover:text-white ${focusRing}`}
                    >
                        <X className="size-5" aria-hidden="true" />
                    </button>
                </div>

                <label className={label}>
                    {t("settings.amiLicense")}
                    <input type="text" maxLength={40} {...field("ami_license")} />
                </label>
                <label className={label}>
                    {t("settings.whatsapp")}
                    <input type="tel" inputMode="tel" maxLength={30} placeholder="+351912345678" {...field("whatsapp")} />
                    <span className="text-[11px] font-normal normal-case tracking-normal text-[#a3a3a3]">{t("settings.whatsappHint")}</span>
                </label>
                <label className={label}>
                    {t("settings.leadsEmail")}
                    <input
                        type="email"
                        inputMode="email"
                        autoComplete="off"
                        spellCheck={false}
                        maxLength={120}
                        placeholder="info@lovelymemories.pt"
                        aria-invalid={emailError}
                        {...field("leads_email")}
                    />
                    {emailError && (
                        <span role="alert" className="text-xs font-semibold normal-case tracking-normal text-red-600 dark:text-red-400">
                            {t("settings.leadsEmailInvalid")}
                        </span>
                    )}
                    <span className="text-[11px] font-normal normal-case tracking-normal text-[#a3a3a3]">{t("settings.leadsEmailHint")}</span>
                </label>

                <div className="mt-auto flex items-center justify-between gap-3 border-t border-[#f5f5f5] pt-4 dark:border-admin-dark-border">
                <p role="status" className="flex min-h-5 items-center gap-2 text-xs font-bold">
                    {saving ? (
                        <span className="flex items-center gap-2 text-[#737373] dark:text-admin-dark-text-secondary">
                            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                            {t("editor.auto.saving")}
                        </span>
                    ) : savedAt !== null ? (
                        <span className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                            <Check className="size-3.5" aria-hidden="true" />
                            {t("editor.autoSaved", {
                                time: new Intl.DateTimeFormat(locale === "pt" ? "pt-PT" : "en-GB", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                }).format(savedAt),
                            })}
                        </span>
                    ) : !canEdit ? (
                        <span className="text-[#a3a3a3]">{t("contacts.viewOnly")}</span>
                    ) : null}
                </p>
                {canEdit && (
                    // Also saves on its own when a field is left; the button is there for peace of mind.
                    <button
                        type="button"
                        disabled={saving}
                        onClick={() => void save(true)}
                        className={`${primaryBtn} min-h-11 shrink-0 px-6`}
                    >
                        {t("settings.save")}
                    </button>
                )}
                </div>
            </div>
        </div>
    );
}
