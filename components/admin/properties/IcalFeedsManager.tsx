"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AlertTriangle, CheckCircle2, Clock, Loader2, Lock, Plus, Trash2 } from "lucide-react";
import { addPropertyFeed, getPropertyFeeds, removePropertyFeed } from "@/app/actions/ical-feeds";

type Feed = {
    id: string;
    label: string;
    masked: string;
    lastOutcome: string | null;
    lastError: string | null;
    lastOkAt: string | null;
    lastReadAt: string | null;
};

/**
 * iCal import links of one property. Saved links are secrets (see lib/ical-feeds.ts): the
 * server only ever sends back a masked form, so this component cannot show or edit a saved
 * link — only add a new one or remove an existing one. Each change is saved immediately,
 * independently of the property form's Save button.
 */
export default function IcalFeedsManager({ propertyId }: { propertyId: string }) {
    const t = useTranslations("PropertyEditor");
    const locale = useLocale();
    const [feeds, setFeeds] = useState<Feed[] | null>(null);
    const [newUrl, setNewUrl] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        let cancelled = false;
        getPropertyFeeds(propertyId)
            .then((res) => {
                if (cancelled) return;
                if (res.success) setFeeds(res.feeds);
                else setError(res.error);
            })
            .catch(() => {
                if (!cancelled) setError("Could not load the calendar links.");
            });
        return () => {
            cancelled = true;
        };
    }, [propertyId]);

    const add = async () => {
        setBusy(true);
        setError(null);
        try {
            const res = await addPropertyFeed(propertyId, newUrl);
            if (res.success) {
                setFeeds(res.feeds);
                setNewUrl("");
            } else {
                setError(res.error);
            }
        } catch {
            setError("Could not save the calendar link.");
        } finally {
            setBusy(false);
        }
    };

    const remove = async (feedId: string) => {
        if (!window.confirm(t("sync.feedRemoveConfirm"))) return;
        setBusy(true);
        setError(null);
        try {
            const res = await removePropertyFeed(propertyId, feedId);
            if (res.success) setFeeds(res.feeds);
            else setError(res.error);
        } catch {
            setError("Could not remove the calendar link.");
        } finally {
            setBusy(false);
        }
    };

    const when = (iso: string) => new Date(iso).toLocaleString(locale, { dateStyle: "short", timeStyle: "short" });

    return (
        <div className="space-y-4">
            <p className="flex items-start gap-2 text-xs text-[#737373] dark:text-admin-dark-text-secondary">
                <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                {t("sync.feedsPrivacy")}
            </p>

            {feeds === null && !error && (
                <p className="flex items-center gap-2 text-sm text-[#a3a3a3]">
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    {t("sync.feedLoading")}
                </p>
            )}

            {feeds !== null && feeds.length === 0 && (
                <p className="text-sm text-[#a3a3a3]">{t("sync.feedEmpty")}</p>
            )}

            {feeds !== null && feeds.length > 0 && (
                <ul className="space-y-3">
                    {feeds.map((feed) => {
                        const failed = feed.lastOutcome !== null && feed.lastOutcome !== "ok";
                        return (
                            <li
                                key={feed.id}
                                className="flex items-start gap-3 rounded-xl border border-[#eaeaea] bg-[#fafafa] p-3 dark:border-admin-dark-border dark:bg-admin-dark-bg"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-[#171717] dark:text-admin-dark-text-primary">{feed.label}</p>
                                    <p className="mt-1 break-all font-mono text-xs text-[#525252] dark:text-admin-dark-text-secondary">{feed.masked}</p>
                                    <p className={`mt-2 flex items-center gap-1.5 text-xs font-medium ${failed ? "text-red-600" : "text-[#737373]"}`}>
                                        {failed ? (
                                            <AlertTriangle className="size-3.5" aria-hidden="true" />
                                        ) : feed.lastOkAt ? (
                                            <CheckCircle2 className="size-3.5 text-emerald-600" aria-hidden="true" />
                                        ) : (
                                            <Clock className="size-3.5" aria-hidden="true" />
                                        )}
                                        {failed
                                            ? t("sync.feedFailed")
                                            : feed.lastOkAt
                                                ? t("sync.feedLastOk", { date: when(feed.lastOkAt) })
                                                : t("sync.feedNeverRead")}
                                    </p>
                                    {failed && feed.lastError && (
                                        <p className="mt-1 text-xs text-red-600">{feed.lastError}</p>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => remove(feed.id)}
                                    disabled={busy}
                                    aria-label={`${t("sync.feedRemove")} ${feed.label}`}
                                    className="shrink-0 rounded-xl border border-[#eaeaea] bg-white p-3 text-[#a3a3a3] transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:border-admin-dark-border dark:bg-admin-dark-surface dark:hover:bg-red-500/10"
                                >
                                    <Trash2 className="size-4" aria-hidden="true" />
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <input
                    type="url"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    onKeyDown={(e) => {
                        // Inside the property <form>: Enter must not submit the whole property.
                        if (e.key === "Enter") {
                            e.preventDefault();
                            if (newUrl.trim() && !busy) add();
                        }
                    }}
                    placeholder="https://www.airbnb.pt/calendar/ical/… ou https://ical.booking.com/v1/export/…"
                    aria-label={t("sync.addIcal")}
                    className="w-full flex-1 rounded-xl border border-[#eaeaea] bg-[#fafafa] p-3 font-mono text-sm text-[#171717] outline-none transition-all focus:ring-2 focus:ring-blue-500/50 dark:border-admin-dark-border dark:bg-admin-dark-bg dark:text-white"
                />
                <button
                    type="button"
                    onClick={add}
                    disabled={busy || !newUrl.trim()}
                    className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[#eaeaea] bg-white px-5 py-3 text-sm font-bold text-[#171717] transition-colors hover:bg-[#fafafa] disabled:opacity-50 dark:border-admin-dark-border dark:bg-admin-dark-surface dark:text-admin-dark-text-primary dark:hover:bg-admin-dark-bg"
                >
                    {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
                    {t("sync.addIcal")}
                </button>
            </div>

            {error && (
                <p role="alert" className="text-xs font-medium text-red-500">{error}</p>
            )}
        </div>
    );
}
