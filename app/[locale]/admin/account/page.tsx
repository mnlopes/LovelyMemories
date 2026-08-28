"use client";

import { useEffect, useState } from "react";
import { Loader2, Lock, Eye, EyeOff, Check, ShieldCheck, User as UserIcon, Mail, Phone, Save } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase";
import { changeOwnPassword, updateOwnProfile } from "@/app/actions/user";
import { Profile } from "@/lib/types";

const Requirement = ({ label, met }: { label: string; met: boolean }) => (
    <span className={`text-xs font-medium transition-colors ${met ? "text-emerald-600" : "text-[#a3a3a3]"}`}>
        {met ? "✓ " : "• "}{label}
    </span>
);

export default function AdminAccountPage() {
    const t = useTranslations("AdminAccount");

    const [profile, setProfile] = useState<Profile | null>(null);
    const [loadingProfile, setLoadingProfile] = useState(true);

    const [details, setDetails] = useState({ fullName: "", email: "", phone: "" });
    const [savingDetails, setSavingDetails] = useState(false);

    const [currentPassword, setCurrentPassword] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
                const p = (data as Profile) || null;
                setProfile(p);
                setDetails({
                    fullName: p?.full_name || "",
                    email: p?.email || user.email || "",
                    phone: p?.phone || "",
                });
            } finally {
                setLoadingProfile(false);
            }
        })();
    }, []);

    const emailChanged = !!profile && details.email.trim().toLowerCase() !== (profile.email || "").toLowerCase();
    const detailsDirty =
        !!profile &&
        (details.fullName !== (profile.full_name || "") ||
            details.phone !== (profile.phone || "") ||
            emailChanged);

    const handleSaveDetails = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!detailsDirty || savingDetails) return;
        setSavingDetails(true);
        try {
            const res = await updateOwnProfile(details);
            if (res.success) {
                toast.success(t("details.success"));
                setProfile((prev) =>
                    prev
                        ? { ...prev, full_name: details.fullName, phone: details.phone, email: details.email.trim().toLowerCase() }
                        : prev
                );
            } else {
                toast.error(res.error || t("details.genericError"));
            }
        } catch (err: any) {
            toast.error(err?.message || t("details.genericError"));
        } finally {
            setSavingDetails(false);
        }
    };

    const hasMinLength = password.length >= 8;
    const hasNumber = /\d/.test(password);
    const hasLetter = /[a-zA-Z]/.test(password);
    const matches = password.length > 0 && password === confirmPassword;
    const isValid = hasMinLength && hasNumber && hasLetter && matches && currentPassword.length > 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid || saving) return;
        setSaving(true);
        try {
            const res = await changeOwnPassword(currentPassword, password);
            if (res.success) {
                toast.success(t("password.success"));
                setCurrentPassword("");
                setPassword("");
                setConfirmPassword("");
                setShowPassword(false);
            } else {
                toast.error(res.error || t("password.genericError"));
            }
        } catch (err: any) {
            toast.error(err?.message || t("password.genericError"));
        } finally {
            setSaving(false);
        }
    };

    const inputClass =
        "w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f5f5f5] dark:border-admin-dark-border px-4 py-3 rounded-xl text-sm focus:ring-1 focus:ring-[#171717] dark:focus:ring-white outline-none transition-all dark:text-admin-dark-text-primary";

    return (
        <div className="space-y-8 pb-20 max-w-3xl">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-[#171717] dark:text-admin-dark-text-primary">{t("title")}</h2>
                <p className="text-[#a3a3a3] mt-2 font-medium">{t("description")}</p>
            </div>

            {/* Details */}
            <form onSubmit={handleSaveDetails} className="bg-white dark:bg-admin-dark-surface rounded-2xl border border-[#f5f5f5] dark:border-admin-dark-border shadow-sm p-8 space-y-6">
                {loadingProfile ? (
                    <div className="flex items-center gap-3 text-[#a3a3a3] text-sm"><Loader2 className="size-4 animate-spin" />{t("loading")}</div>
                ) : (
                    <>
                        <div className="flex items-center gap-4">
                            <div className="size-14 rounded-full bg-[#f5f5f5] dark:bg-admin-dark-bg flex items-center justify-center overflow-hidden border border-transparent dark:border-admin-dark-border shrink-0">
                                {profile?.avatar_url ? (
                                    <img src={profile.avatar_url} alt="" className="size-full object-cover" />
                                ) : (
                                    <UserIcon className="size-6 text-[#a3a3a3]" />
                                )}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-[#171717] dark:text-admin-dark-text-primary">{t("details.title")}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg bg-[#f5f5f5] dark:bg-admin-dark-bg text-[#171717] dark:text-admin-dark-text-primary">
                                        {profile?.role}
                                    </span>
                                    <span className="text-xs text-[#a3a3a3]">{t("details.roleHint")}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-[#a3a3a3] uppercase tracking-widest">{t("details.nameLabel")}</label>
                                <div className="relative">
                                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#a3a3a3]" />
                                    <input
                                        type="text"
                                        value={details.fullName}
                                        onChange={(e) => setDetails({ ...details, fullName: e.target.value })}
                                        placeholder={t("details.namePlaceholder")}
                                        className={`${inputClass} pl-10`}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-[#a3a3a3] uppercase tracking-widest">{t("details.emailLabel")}</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#a3a3a3]" />
                                    <input
                                        type="email"
                                        value={details.email}
                                        onChange={(e) => setDetails({ ...details, email: e.target.value })}
                                        placeholder={t("details.emailPlaceholder")}
                                        className={`${inputClass} pl-10`}
                                    />
                                </div>
                                {emailChanged && (
                                    <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-xl">
                                        <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium leading-relaxed">
                                            ⚠️ {t("details.emailWarning")}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-[#a3a3a3] uppercase tracking-widest">{t("details.phoneLabel")}</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#a3a3a3]" />
                                    <input
                                        type="tel"
                                        value={details.phone}
                                        onChange={(e) => setDetails({ ...details, phone: e.target.value })}
                                        placeholder={t("details.phonePlaceholder")}
                                        className={`${inputClass} pl-10`}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-2 border-t border-[#f5f5f5] dark:border-admin-dark-border">
                            <button
                                type="submit"
                                disabled={!detailsDirty || savingDetails}
                                className="px-6 py-3 bg-[#171717] dark:bg-white text-white dark:text-black rounded-xl text-sm font-bold hover:bg-black dark:hover:bg-gray-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {savingDetails ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                                {t("details.submit")}
                            </button>
                        </div>
                    </>
                )}
            </form>

            {/* Change password */}
            <form id="password" onSubmit={handleSubmit} className="scroll-mt-28 bg-white dark:bg-admin-dark-surface rounded-2xl border border-[#f5f5f5] dark:border-admin-dark-border shadow-sm p-8 space-y-6">
                <div className="flex items-center gap-3">
                    <Lock className="size-5 text-[#171717] dark:text-admin-dark-text-primary" />
                    <div>
                        <h3 className="text-lg font-bold text-[#171717] dark:text-admin-dark-text-primary">{t("password.title")}</h3>
                        <p className="text-sm text-[#a3a3a3]">{t("password.description")}</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[#a3a3a3] uppercase tracking-widest">{t("password.currentLabel")}</label>
                        <input
                            type="password"
                            autoComplete="current-password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder={t("password.currentPlaceholder")}
                            className={inputClass}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[#a3a3a3] uppercase tracking-widest">{t("password.newLabel")}</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                autoComplete="new-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={t("password.newPlaceholder")}
                                className={`${inputClass} pr-11`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? t("password.hide") : t("password.show")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white transition-colors"
                            >
                                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[#a3a3a3] uppercase tracking-widest">{t("password.confirmLabel")}</label>
                        <input
                            type={showPassword ? "text" : "password"}
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder={t("password.confirmPlaceholder")}
                            className={inputClass}
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <Requirement label={t("password.ruleMin")} met={hasMinLength} />
                        <Requirement label={t("password.ruleLetter")} met={hasLetter} />
                        <Requirement label={t("password.ruleNumber")} met={hasNumber} />
                        {confirmPassword.length > 0 && (
                            <span className={`text-xs font-medium ${matches ? "text-emerald-600" : "text-red-500"}`}>
                                {matches ? `✓ ${t("password.ruleMatch")}` : t("password.ruleMismatch")}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-between gap-4 pt-2 border-t border-[#f5f5f5] dark:border-admin-dark-border">
                    <p className="flex items-center gap-2 text-xs text-[#a3a3a3]"><ShieldCheck className="size-4" />{t("password.auditNote")}</p>
                    <button
                        type="submit"
                        disabled={!isValid || saving}
                        className="px-6 py-3 bg-[#171717] dark:bg-white text-white dark:text-black rounded-xl text-sm font-bold hover:bg-black dark:hover:bg-gray-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
                    >
                        {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                        {t("password.submit")}
                    </button>
                </div>
            </form>
        </div>
    );
}
