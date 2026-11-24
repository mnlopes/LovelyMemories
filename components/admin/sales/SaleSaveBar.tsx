"use client";

import { useLocale, useTranslations } from "next-intl";
import type { PublishProblem } from "@/lib/sales/validation";
import { primaryBtn, secondaryBtn } from "./ui";

/** Where the form stands against what is saved (autosave). */
export type SaveStatus =
    | { kind: "clean" }
    | { kind: "pending" }
    | { kind: "saving" }
    | { kind: "saved"; at: number }
    | { kind: "error" }
    | { kind: "needsTitle" }
    | { kind: "blocked" };

const TONE: Record<SaveStatus["kind"], { text: string; dot: string }> = {
    clean: { text: "", dot: "" },
    pending: { text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500" },
    saving: { text: "text-[#737373] dark:text-admin-dark-text-secondary", dot: "bg-[#a3a3a3] animate-pulse" },
    saved: { text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500" },
    error: { text: "text-red-600 dark:text-red-400", dot: "bg-red-500" },
    needsTitle: { text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500" },
    blocked: { text: "text-red-600 dark:text-red-400", dot: "bg-red-500" },
};

/**
 * Dot + text for the autosave state. Always rendered (live region), empty when there is nothing to say.
 * `compact` (the save bar on phones) shows a short label below `sm` so it does not truncate next to the buttons.
 */
export function SaveIndicator({ status, compact = false }: { status: SaveStatus; compact?: boolean }) {
    const t = useTranslations("AdminSales");
    const locale = useLocale();
    let long = "";
    let short = "";
    if (status.kind === "saved") {
        const time = new Intl.DateTimeFormat(locale === "pt" ? "pt-PT" : "en-GB", { hour: "2-digit", minute: "2-digit" }).format(
            status.at,
        );
        long = t("editor.autoSaved", { time });
        short = long;
    } else if (status.kind !== "clean") {
        long = t(`editor.auto.${status.kind}`);
        short = t(`editor.autoShort.${status.kind}`);
    }
    const tone = TONE[status.kind];
    return (
        <span role="status" className={`flex min-w-0 items-center gap-2 text-xs font-bold ${tone.text}`}>
            {long && (
                <>
                    <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${tone.dot}`} />
                    {compact ? (
                        <>
                            <span className="truncate sm:hidden">{short}</span>
                            <span className="hidden truncate sm:inline">{long}</span>
                        </>
                    ) : (
                        <span>{long}</span>
                    )}
                </>
            )}
        </span>
    );
}

/** Why Publish is disabled: "Missing: title, photo". Nothing when the listing can be published. */
export function PublishReason({
    problems,
    published,
    className = "",
}: {
    problems: PublishProblem[];
    published: boolean;
    className?: string;
}) {
    const t = useTranslations("AdminSales");
    if (published || problems.length === 0) return null;
    return (
        <p className={`text-xs text-[#a3a3a3] ${className}`}>
            {t("editor.publishMissing", { items: problems.map((p) => t(`problemsShort.${p}`)).join(", ") })}
        </p>
    );
}

/**
 * Sticky action bar below the `xl` breakpoint, where the side column sits far down the page. It lives
 * in the editor's own column, so it matches the content width next to the admin sidebar. On phones it
 * sticks right above the admin bottom nav (about 3.75rem tall, it handles the safe area itself);
 * from `md` up there is no bottom nav, so the bar takes the safe-area padding.
 */
export function SaleSaveBar({
    status,
    locked,
    busy,
    published,
    problems,
    onSave,
    onPublish,
}: {
    status: SaveStatus;
    locked: boolean;
    busy: null | "save" | "publish" | "delete";
    published: boolean;
    problems: PublishProblem[];
    onSave: () => void;
    onPublish: () => void;
}) {
    const t = useTranslations("AdminSales");
    return (
        <div
            className="sticky bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-20 rounded-2xl border border-[#eaeaea] bg-white/95 px-4 py-2.5 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur dark:border-admin-dark-border dark:bg-admin-dark-surface/95 md:bottom-[env(safe-area-inset-bottom)] xl:hidden"
        >
            <div className="flex items-center gap-3">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <SaveIndicator status={status} compact />
                    <PublishReason problems={problems} published={published} className="line-clamp-2 leading-snug" />
                </div>
                <button type="button" disabled={locked} onClick={onSave} className={`${secondaryBtn} min-h-11 px-5`}>
                    {busy === "save" ? t("editor.saving") : t("editor.save")}
                </button>
                <button
                    type="button"
                    disabled={locked || (!published && problems.length > 0)}
                    onClick={onPublish}
                    className={`${primaryBtn} min-h-11 px-5`}
                >
                    {busy === "publish" ? t("editor.saving") : published ? t("editor.unpublish") : t("editor.publish")}
                </button>
            </div>
        </div>
    );
}
