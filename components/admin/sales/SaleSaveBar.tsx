"use client";

import { useTranslations } from "next-intl";
import type { PublishProblem } from "@/lib/sales/validation";
import { primaryBtn, secondaryBtn } from "./ui";

/**
 * Dot + text shown while the form differs from what is saved. Always rendered (live region), empty when clean.
 * `compact` (the save bar on phones) shows a short label below `sm` so it does not truncate next to the buttons.
 */
export function DirtyIndicator({ dirty, compact = false }: { dirty: boolean; compact?: boolean }) {
    const t = useTranslations("AdminSales");
    return (
        <span role="status" className="flex min-w-0 items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400">
            {dirty && (
                <>
                    <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-amber-500" />
                    {compact ? (
                        <>
                            <span className="truncate sm:hidden">{t("editor.unsavedShort")}</span>
                            <span className="hidden truncate sm:inline">{t("editor.unsaved")}</span>
                        </>
                    ) : (
                        <span className="truncate">{t("editor.unsaved")}</span>
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
    dirty,
    locked,
    busy,
    published,
    problems,
    onSave,
    onPublish,
}: {
    dirty: boolean;
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
                    <DirtyIndicator dirty={dirty} compact />
                    <PublishReason problems={problems} published={published} className="truncate" />
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
