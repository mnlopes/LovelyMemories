"use client";

import { useState } from "react";
import { X, Mail, Shield, Loader2, UserPlus, Copy, Check } from "lucide-react";
import { inviteUser } from "@/app/actions/user";
import { toast } from "sonner";
import { AppRole } from "@/lib/types";
import { useTranslations } from "next-intl";

interface InviteUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    currentUserRole: AppRole;
    initialRole?: AppRole;
    allowedRoles?: AppRole[];
}

export const InviteUserModal = ({ isOpen, onClose, onSuccess, currentUserRole, initialRole = "editor", allowedRoles }: InviteUserModalProps) => {
    const t = useTranslations("AdminUsers.inviteModal");
    const nt = useTranslations("AdminUsers.notifications");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<AppRole>(initialRole);
    const [loading, setLoading] = useState(false);
    const [generatedLink, setGeneratedLink] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const getAvailableRoles = (): AppRole[] => {
        let roles: AppRole[] = [];
        if (currentUserRole === 'super_admin') roles = ['super_admin', 'admin', 'editor', 'user', 'owner'];
        else if (currentUserRole === 'admin') roles = ['admin', 'editor', 'user', 'owner'];

        if (allowedRoles) {
            return roles.filter(r => allowedRoles.includes(r));
        }
        return roles;
    };

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const result = await inviteUser(email, role);

            if (result.actionLink) {
                setGeneratedLink(result.actionLink);
                toast.info(t('emailLimitReached'));
            } else {
                toast.success(nt('inviteSuccess', { email }));
                setEmail("");
                onSuccess();
                onClose();
            }
        } catch (error: any) {
            toast.error(nt('inviteError', { error: error.message }));
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (generatedLink) {
            navigator.clipboard.writeText(generatedLink);
            setCopied(true);
            toast.success(nt('copySuccess'));
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-[#0a1128]/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-md bg-white dark:bg-admin-dark-surface rounded-3xl shadow-2xl border border-white/20 overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="p-8">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-xl font-bold text-[#171717] dark:text-admin-dark-text-primary">{t('title')}</h3>
                            <p className="text-sm text-[#a3a3a3] mt-1">{t('description')}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors text-[#a3a3a3]"
                        >
                            <X className="size-5" />
                        </button>
                    </div>

                    {generatedLink ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl">
                                <p className="text-sm text-amber-800 dark:text-amber-400 font-medium">
                                    {t('emailLimitReached')}
                                </p>
                            </div>

                            <div className="relative group">
                                <textarea
                                    readOnly
                                    value={generatedLink}
                                    className="w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f5f5f5] dark:border-admin-dark-border p-4 pr-12 rounded-xl text-xs font-mono break-all min-h-[100px] focus:ring-0 outline-none transition-all text-[#171717] dark:text-admin-dark-text-primary"
                                />
                                <button
                                    type="button"
                                    onClick={copyToClipboard}
                                    className="absolute right-3 top-3 p-2 bg-white dark:bg-admin-dark-surface border border-gray-100 dark:border-admin-dark-border rounded-lg shadow-sm hover:shadow-md transition-all text-[#171717] dark:text-admin-dark-text-primary"
                                >
                                    {copied ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setGeneratedLink(null);
                                    setEmail("");
                                    onSuccess();
                                    onClose();
                                }}
                                className="w-full px-5 py-4 rounded-xl bg-[#171717] dark:bg-white text-white dark:text-black text-sm font-bold hover:shadow-xl transition-all"
                            >
                                {t('done')}
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Email Input */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-[#171717] dark:text-admin-dark-text-primary uppercase tracking-widest pl-1">
                                    {t('emailLabel')}
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#a3a3a3]" />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="colleague@example.com"
                                        className="w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f5f5f5] dark:border-admin-dark-border pl-10 pr-4 py-3 rounded-xl text-sm focus:ring-2 focus:ring-[#0a1128] dark:focus:ring-white/20 outline-none transition-all text-[#171717] dark:text-admin-dark-text-primary"
                                    />
                                </div>
                            </div>

                            {/* Role Selection */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-[#171717] dark:text-admin-dark-text-primary uppercase tracking-widest pl-1">
                                    {t('roleLabel')}
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {getAvailableRoles().map((r) => (
                                        <button
                                            key={r}
                                            type="button"
                                            onClick={() => setRole(r)}
                                            className={`flex flex-col items-start p-4 rounded-2xl border transition-all text-left ${role === r
                                                ? "bg-[#171717] dark:bg-white border-transparent text-white dark:text-black shadow-lg"
                                                : "bg-[#fafafa] dark:bg-admin-dark-bg border-[#f5f5f5] dark:border-admin-dark-border text-[#171717] dark:text-admin-dark-text-primary hover:border-gray-300"
                                                }`}
                                        >
                                            <Shield className={`size-4 mb-2 ${role === r ? "opacity-60" : "text-[#a3a3a3]"}`} />
                                            <span className="text-sm font-bold capitalize">{t(`roles.${r}` as any)}</span>
                                            <span className={`text-[10px] mt-1 ${role === r ? "opacity-60" : "text-[#a3a3a3]"}`}>
                                                {t(`roles.${r}_desc` as any)}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="pt-4 flex flex-col gap-3">
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="flex-1 px-5 py-3 rounded-xl border border-gray-200 dark:border-admin-dark-border text-sm font-bold text-[#a3a3a3] hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
                                    >
                                        {t('cancel')}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading || !email}
                                        className="flex-[2] px-5 py-3 rounded-xl bg-[#171717] dark:bg-white text-white dark:text-black text-sm font-bold hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:translate-y-0 flex items-center justify-center gap-2"
                                    >
                                        {loading ? (
                                            <Loader2 className="size-4 animate-spin" />
                                        ) : (
                                            <>
                                                <UserPlus className="size-4" />
                                                {t('sendInvite')}
                                            </>
                                        )}
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    disabled={loading || !email}
                                    onClick={async () => {
                                        setLoading(true);
                                        try {
                                            const result = await inviteUser(email, role, { skipEmail: true });
                                            if (result.actionLink) {
                                                setGeneratedLink(result.actionLink);
                                                toast.success(nt('linkGenerated'));
                                            }
                                        } catch (error: any) {
                                            toast.error(nt('inviteError', { error: error.message }));
                                        } finally {
                                            setLoading(false);
                                        }
                                    }}
                                    className="w-full px-5 py-3 rounded-xl border border-dashed border-amber-300 dark:border-amber-500/30 bg-amber-50/30 dark:bg-amber-500/5 text-amber-700 dark:text-amber-400 text-xs font-bold hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 className="size-3 animate-spin" /> : t('generateLink')}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};
