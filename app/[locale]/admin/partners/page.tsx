"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { toast } from "sonner";
import { Loader2, KeyRound, Plus, Home, Copy, Check, AlertTriangle, CircleCheck, CircleOff, Search } from "lucide-react";
import {
    listPartnerKeys, createPartnerKey, revokePartnerKey, listPartnerProperties,
    setPartnerPropertyEnabled, getPartnerApiSummary,
    type PartnerKeyListItem, type PartnerPropertyListItem, type PartnerApiSummary,
} from "@/app/actions/partner-api";

const card = "bg-white dark:bg-admin-dark-surface rounded-2xl border border-[#f5f5f5] dark:border-admin-dark-border shadow-sm p-6";
const inputClass = "w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f5f5f5] dark:border-admin-dark-border px-4 py-3 rounded-xl text-sm focus:ring-1 focus:ring-[#171717] dark:focus:ring-white outline-none transition-all dark:text-admin-dark-text-primary";
const primaryBtn = "px-5 py-2.5 bg-[#171717] dark:bg-white text-white dark:text-black rounded-xl text-sm font-bold hover:bg-black dark:hover:bg-gray-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2";
const secondaryBtn = "px-5 py-2.5 border border-[#e5e5e5] dark:border-admin-dark-border rounded-xl text-sm font-bold text-[#171717] dark:text-admin-dark-text-primary hover:bg-[#fafafa] dark:hover:bg-admin-dark-bg transition-all";

export default function AdminPartnersPage() {
    const t = useTranslations("AdminPartners");
    const format = useFormatter();

    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState<PartnerApiSummary | null>(null);
    const [keys, setKeys] = useState<PartnerKeyListItem[]>([]);
    const [properties, setProperties] = useState<PartnerPropertyListItem[]>([]);
    const [search, setSearch] = useState("");
    const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

    const [createOpen, setCreateOpen] = useState(false);
    const [form, setForm] = useState({ partnerName: "", refSlug: "" });
    const [creating, setCreating] = useState(false);
    const [created, setCreated] = useState<{ partner: string; key: string } | null>(null);
    const [copied, setCopied] = useState(false);

    const load = useCallback(async () => {
        const [s, k, p] = await Promise.all([getPartnerApiSummary(), listPartnerKeys(), listPartnerProperties()]);
        if (s.success) setSummary(s.data);
        if (k.success) setKeys(k.data);
        if (p.success) setProperties(p.data);
        if (!s.success || !k.success || !p.success) toast.error(t("genericError"));
        setLoading(false);
    }, [t]);

    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount, same pattern as other admin pages
    useEffect(() => { load(); }, [load]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return properties;
        return properties.filter(p => p.name.toLowerCase().includes(q) || p.city.toLowerCase().includes(q));
    }, [properties, search]);

    const handleToggle = async (p: PartnerPropertyListItem) => {
        const next = !p.enabled;
        setPendingIds(prev => new Set(prev).add(p.id));
        setProperties(prev => prev.map(x => (x.id === p.id ? { ...x, enabled: next } : x)));
        const res = await setPartnerPropertyEnabled(p.id, next);
        setPendingIds(prev => { const s = new Set(prev); s.delete(p.id); return s; });
        if (!res.success) {
            setProperties(prev => prev.map(x => (x.id === p.id ? { ...x, enabled: p.enabled } : x)));
            toast.error(res.error || t("genericError"));
            return;
        }
        toast.success(next ? t("properties.enabledToast", { name: p.name }) : t("properties.disabledToast", { name: p.name }));
        setSummary(prev => prev ? { ...prev, exposedProperties: prev.exposedProperties + (next ? 1 : -1) } : prev);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (creating) return;
        setCreating(true);
        const res = await createPartnerKey(form);
        setCreating(false);
        if (!res.success) {
            toast.error(res.error || t("genericError"));
            return;
        }
        setCreated({ partner: form.partnerName.trim(), key: res.data.key });
        setForm({ partnerName: "", refSlug: "" });
        load();
    };

    const handleCopy = async () => {
        if (!created) return;
        await navigator.clipboard.writeText(created.key);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const closeCreate = () => {
        setCreateOpen(false);
        setCreated(null);
        setCopied(false);
    };

    const handleRevoke = async (k: PartnerKeyListItem) => {
        if (!window.confirm(t("keys.revokeConfirm", { partner: k.partnerName }))) return;
        const res = await revokePartnerKey(k.id);
        if (!res.success) {
            toast.error(res.error || t("genericError"));
            return;
        }
        toast.success(t("keys.revokedToast"));
        load();
    };

    if (loading) {
        return (
            <div className="flex items-center gap-3 text-[#a3a3a3] text-sm">
                <Loader2 className="size-4 animate-spin" />{t("loading")}
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-20 max-w-5xl">
            {/* Header */}
            <div className="flex justify-between items-end gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-[#171717] dark:text-admin-dark-text-primary">{t("title")}</h2>
                    <p className="text-[#a3a3a3] mt-2 font-medium">{t("description")}</p>
                </div>
                {summary?.apiEnabled ? (
                    <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                        <CircleCheck className="size-3.5" />{t("apiOn")}
                    </span>
                ) : (
                    <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-[#f5f5f5] text-[#737373] dark:bg-admin-dark-bg dark:text-admin-dark-text-secondary">
                        <CircleOff className="size-3.5" />{t("apiOff")}
                    </span>
                )}
            </div>

            {/* Summary */}
            {summary && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        { label: t("summary.requests24h"), value: String(summary.requests24h), extra: null },
                        { label: t("summary.activeKeys"), value: String(summary.activeKeys), extra: null },
                        { label: t("summary.exposed"), value: String(summary.exposedProperties), extra: t("summary.of", { total: summary.totalProperties }) },
                    ].map(m => (
                        <div key={m.label} className="bg-[#fafafa] dark:bg-admin-dark-bg rounded-2xl p-5">
                            <p className="text-xs font-bold text-[#a3a3a3] uppercase tracking-widest">{m.label}</p>
                            <p className="text-2xl font-bold text-[#171717] dark:text-admin-dark-text-primary mt-1">
                                {m.value} {m.extra && <span className="text-sm font-medium text-[#a3a3a3]">{m.extra}</span>}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {/* API keys */}
            <section className={card}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-[#171717] dark:text-admin-dark-text-primary flex items-center gap-2">
                        <KeyRound className="size-5" />{t("keys.title")}
                    </h3>
                    <button onClick={() => setCreateOpen(true)} className={primaryBtn}>
                        <Plus className="size-4" />{t("keys.new")}
                    </button>
                </div>
                {keys.length === 0 ? (
                    <p className="text-sm text-[#a3a3a3]">{t("keys.empty")}</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs font-bold text-[#a3a3a3] uppercase tracking-widest">
                                    <th className="py-2 pr-4">{t("keys.partner")}</th>
                                    <th className="py-2 pr-4">{t("keys.key")}</th>
                                    <th className="py-2 pr-4">{t("keys.lastUsed")}</th>
                                    <th className="py-2 pr-4">{t("keys.requests24h")}</th>
                                    <th className="py-2" />
                                </tr>
                            </thead>
                            <tbody>
                                {keys.map(k => (
                                    <tr key={k.id} className={`border-t border-[#f5f5f5] dark:border-admin-dark-border ${k.revokedAt ? "opacity-50" : ""}`}>
                                        <td className="py-3 pr-4">
                                            <p className="font-bold text-[#171717] dark:text-admin-dark-text-primary">{k.partnerName}</p>
                                            <p className="text-xs text-[#a3a3a3]">ref={k.refSlug}</p>
                                        </td>
                                        <td className="py-3 pr-4 font-mono text-xs dark:text-admin-dark-text-primary">{k.keyPrefix}••••</td>
                                        <td className="py-3 pr-4 text-[#737373] dark:text-admin-dark-text-secondary">
                                            {k.lastUsedAt ? format.relativeTime(new Date(k.lastUsedAt)) : t("keys.never")}
                                        </td>
                                        <td className="py-3 pr-4 dark:text-admin-dark-text-primary">{k.requests24h}</td>
                                        <td className="py-3 text-right">
                                            {k.revokedAt ? (
                                                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400">{t("keys.revoked")}</span>
                                            ) : (
                                                <button onClick={() => handleRevoke(k)} className="text-xs font-bold text-red-600 hover:text-red-700 dark:text-red-400">
                                                    {t("keys.revoke")}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* Properties */}
            <section className={card}>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-[#171717] dark:text-admin-dark-text-primary flex items-center gap-2">
                        <Home className="size-5" />{t("properties.title")}
                    </h3>
                    <div className="relative sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#a3a3a3]" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("properties.search")} className={`${inputClass} pl-10 py-2.5`} />
                    </div>
                </div>
                <p className="text-xs text-[#a3a3a3] mb-3">{t("properties.hint")}</p>
                {filtered.length === 0 ? (
                    <p className="text-sm text-[#a3a3a3] py-4">{t("properties.empty")}</p>
                ) : (
                    <ul>
                        {filtered.map(p => (
                            <li key={p.id} className="flex items-center gap-3 py-3 border-t border-[#f5f5f5] dark:border-admin-dark-border">
                                <div className="flex-1 min-w-0 text-sm">
                                    <span className="font-bold text-[#171717] dark:text-admin-dark-text-primary">{p.name}</span>
                                    <span className="text-[#a3a3a3]"> · {p.city} · {t("properties.guests", { count: p.maxGuests })}</span>
                                    {p.icalFailed && (
                                        <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                                            <AlertTriangle className="size-3" />{t("properties.icalError")}
                                        </span>
                                    )}
                                </div>
                                <button
                                    role="switch"
                                    aria-checked={p.enabled}
                                    aria-label={p.name}
                                    disabled={pendingIds.has(p.id)}
                                    onClick={() => handleToggle(p)}
                                    className={`relative w-10 h-6 rounded-full transition-colors shrink-0 disabled:opacity-50 ${p.enabled ? "bg-emerald-500" : "bg-[#e5e5e5] dark:bg-admin-dark-border"}`}
                                >
                                    <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${p.enabled ? "left-[18px]" : "left-0.5"}`} />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {/* Create key dialog */}
            {createOpen && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={created ? undefined : closeCreate}>
                    <div className="bg-white dark:bg-admin-dark-surface rounded-2xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
                        {created ? (
                            <>
                                <div>
                                    <h3 className="text-lg font-bold text-[#171717] dark:text-admin-dark-text-primary">{t("create.createdTitle", { partner: created.partner })}</h3>
                                    <p className="text-sm text-[#a3a3a3] mt-1">{t("create.createdHint")}</p>
                                </div>
                                <div className="flex items-center gap-2 bg-[#fafafa] dark:bg-admin-dark-bg rounded-xl p-3">
                                    <code className="flex-1 text-xs break-all dark:text-admin-dark-text-primary">{created.key}</code>
                                    <button onClick={handleCopy} aria-label={t("create.copy")} className="p-2 rounded-lg hover:bg-[#f0f0f0] dark:hover:bg-admin-dark-surface">
                                        {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4 dark:text-admin-dark-text-primary" />}
                                    </button>
                                </div>
                                <div className="p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-xl text-[11px] text-amber-700 dark:text-amber-400 font-medium flex gap-2">
                                    <AlertTriangle className="size-4 shrink-0" />{t("create.secureWarning")}
                                </div>
                                <div className="flex justify-end">
                                    <button onClick={closeCreate} className={primaryBtn}>{t("create.done")}</button>
                                </div>
                            </>
                        ) : (
                            <form onSubmit={handleCreate} className="space-y-4">
                                <h3 className="text-lg font-bold text-[#171717] dark:text-admin-dark-text-primary">{t("create.title")}</h3>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-[#a3a3a3] uppercase tracking-widest">{t("create.partnerName")}</label>
                                    <input required minLength={2} maxLength={60} value={form.partnerName} onChange={e => setForm({ ...form, partnerName: e.target.value })} placeholder={t("create.partnerNamePlaceholder")} className={inputClass} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-[#a3a3a3] uppercase tracking-widest">{t("create.refSlug")}</label>
                                    <input required pattern="[a-z0-9-]{2,32}" value={form.refSlug} onChange={e => setForm({ ...form, refSlug: e.target.value.toLowerCase() })} placeholder={t("create.refSlugPlaceholder")} className={inputClass} />
                                    <p className="text-[11px] text-[#a3a3a3]">{t("create.refSlugHint")}</p>
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <button type="button" onClick={closeCreate} className={secondaryBtn}>{t("create.cancel")}</button>
                                    <button type="submit" disabled={creating} className={primaryBtn}>
                                        {creating && <Loader2 className="size-4 animate-spin" />}{t("create.submit")}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
