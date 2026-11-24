"use client";

import { CheckCircle2, Circle, Eye, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { PublishProblem } from "@/lib/sales/validation";
import { PublishReason, SaveIndicator, type SaveStatus } from "./SaleSaveBar";
import { card, focusRing, primaryBtn, secondaryBtn } from "./ui";

/** Status card (checklist, save / publish / delete) and card preview: the editor's right-hand column. */
export function SaleEditorSide({
    published,
    reference,
    savedSlug,
    isSaved,
    canEdit,
    locked,
    busy,
    status,
    problems,
    checklist,
    onSave,
    onPublish,
    onRemove,
    onFocusProblem,
    title,
    priceLabel,
    meta,
    mainImageUrl,
}: {
    published: boolean;
    reference: string | null;
    savedSlug: string | null;
    isSaved: boolean;
    canEdit: boolean;
    locked: boolean;
    busy: null | "save" | "publish" | "delete";
    status: SaveStatus;
    problems: PublishProblem[];
    checklist: PublishProblem[];
    onSave: () => void;
    onPublish: () => void;
    onRemove: () => void;
    onFocusProblem: (p: PublishProblem) => void;
    title: string;
    priceLabel: string;
    meta: string;
    mainImageUrl: string | null;
}) {
    const t = useTranslations("AdminSales");
    const locale = useLocale();

    return (
        <aside className="flex w-full min-w-0 flex-col gap-5 xl:w-[320px] xl:shrink-0">
            <section className={card}>
                <div className="flex items-center justify-between gap-3">
                    <h2 className="text-base font-bold text-[#171717] dark:text-admin-dark-text-primary">
                        {t("editor.statusTitle")}
                    </h2>
                    <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                            published
                                ? "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400"
                                : "bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-admin-dark-text-secondary"
                        }`}
                    >
                        {published ? t("published") : t("draft")}
                    </span>
                </div>
                <p className="text-xs text-[#a3a3a3]">
                    {t("editor.reference")}{" "}
                    <strong className="text-[#171717] dark:text-admin-dark-text-primary">
                        {reference ?? t("editor.referenceAfterSave")}
                    </strong>
                </p>
                <SaveIndicator status={status} />

                <div className="flex flex-col gap-2 border-t border-[#f5f5f5] dark:border-admin-dark-border pt-4">
                    <h3 className="text-xs font-bold text-[#171717] dark:text-admin-dark-text-primary">
                        {problems.length ? t("editor.missingTitle") : t("editor.readyTitle")}
                    </h3>
                    <ul className="flex flex-col gap-1">
                        {checklist.map((p) => {
                            const ok = !problems.includes(p);
                            return (
                                <li key={p}>
                                    {ok ? (
                                        <span className="flex min-h-8 items-center gap-2 text-[13px] text-[#a3a3a3]">
                                            <CheckCircle2 className="size-4 shrink-0 text-emerald-500" aria-hidden="true" />
                                            {t(`problems.${p}`)}
                                        </span>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => onFocusProblem(p)}
                                            className={`flex min-h-11 w-full items-center gap-2 rounded-lg text-left text-[13px] font-semibold text-amber-700 hover:underline dark:text-amber-400 md:min-h-8 ${focusRing}`}
                                        >
                                            <Circle className="size-4 shrink-0" aria-hidden="true" />
                                            {t(`problems.${p}`)}
                                        </button>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                    {savedSlug && (
                        <a
                            href={`/${locale}/for-sale/${savedSlug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`${secondaryBtn} col-span-2`}
                        >
                            <Eye className="size-4" aria-hidden="true" />
                            {t("editor.viewPage")}
                        </a>
                    )}
                    <button type="button" disabled={locked} onClick={onSave} className={secondaryBtn}>
                        {busy === "save" ? t("editor.saving") : t("editor.save")}
                    </button>
                    <button
                        type="button"
                        disabled={locked || (!published && problems.length > 0)}
                        onClick={onPublish}
                        className={primaryBtn}
                    >
                        {busy === "publish" ? t("editor.saving") : published ? t("editor.unpublish") : t("editor.publish")}
                    </button>
                </div>
                <PublishReason problems={problems} published={published} />
                {!canEdit && <p className="text-xs text-[#a3a3a3]">{t("editor.readOnly")}</p>}
                {isSaved && (
                    <button
                        type="button"
                        disabled={locked}
                        onClick={onRemove}
                        className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-red-600 transition-all hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-500/10"
                    >
                        <Trash2 className="size-4" aria-hidden="true" />
                        {t("editor.delete")}
                    </button>
                )}
            </section>

            <section className={card}>
                <h2 className="text-base font-bold text-[#171717] dark:text-admin-dark-text-primary">
                    {t("editor.cardPreview")}
                </h2>
                <div className="overflow-hidden rounded-2xl border border-[#f5f5f5] dark:border-admin-dark-border">
                    <div
                        className="relative aspect-[4/3] bg-[#f5f5f5] bg-cover bg-center dark:bg-admin-dark-bg"
                        style={mainImageUrl ? { backgroundImage: `url(${JSON.stringify(mainImageUrl)})` } : undefined}
                    >
                        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
                        <span className="absolute inset-x-3 bottom-3 truncate text-center text-base font-bold text-white">
                            {title}
                        </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 px-3.5 py-3">
                        <span className="text-lg font-bold text-[#171717] dark:text-admin-dark-text-primary">{priceLabel}</span>
                        <span className="truncate text-[11px] text-[#a3a3a3]">{meta}</span>
                    </div>
                </div>
            </section>
        </aside>
    );
}
