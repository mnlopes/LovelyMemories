"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { User, Mail, Phone, Globe, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { updateProfileMetadata, updateUserEmail } from "../../app/actions/auth";
import { cn } from "@/lib/utils";
import { useRouter, usePathname } from "@/i18n/routing";

interface ProfileFormProps {
    initialData: {
        fullName: string;
        email: string;
        phone: string;
        language: string;
    };
    isReadOnly?: boolean;
}

export const ProfileForm = ({ initialData, isReadOnly }: ProfileFormProps) => {
    const t = useTranslations('OwnerProfile');
    const router = useRouter();
    const pathname = usePathname();

    const [fullName, setFullName] = useState(initialData.fullName);
    const [email, setEmail] = useState(initialData.email);
    const [phone, setPhone] = useState(initialData.phone);
    const [language, setLanguage] = useState(initialData.language);
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setMessage(null);

        try {
            // Update Profile Data (Name, Phone, Language)
            const profileChanged = 
                fullName !== initialData.fullName || 
                phone !== initialData.phone || 
                language !== initialData.language;

            if (profileChanged) {
                const res = await updateProfileMetadata({ 
                    fullName: fullName !== initialData.fullName ? fullName : undefined,
                    phone: phone !== initialData.phone ? phone : undefined,
                    language: language !== initialData.language ? language : undefined
                });
                if (res.error) throw new Error(res.error);
            }

            // Update Email if changed (Supabase requires verification)
            if (email !== initialData.email) {
                const res = await updateUserEmail(email);
                if (res.error) throw new Error(res.error);
                setMessage({ type: 'info', text: t('emailUpdateStarted') });
            } else {
                setMessage({ type: 'success', text: t('profileUpdated') });
            }

            // If language changed, redirect after a short delay
            if (language !== initialData.language) {
                setTimeout(() => {
                    router.replace(pathname, { locale: language as any });
                }, 1500);
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || t('errorUpdate') });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm"
        >
            <div className="flex items-center gap-3 mb-8">
                <div className="size-10 rounded-2xl bg-blue-50 flex items-center justify-center">
                    <User className="size-5 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-[#0A1128]">{t('personalInfo')}</h2>
            </div>

            {isReadOnly && (
                <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-amber-800 text-sm">
                    <AlertCircle className="size-5 shrink-0" />
                    <div>
                        <p className="font-bold">Viewing as Owner:</p>
                        <p>Editing is disabled during impersonation for security reasons.</p>
                        <p className="text-[10px] mt-1 opacity-50">Target User ID: {initialData.email ? 'Resolved' : 'Not Resolved'}</p>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Full Name */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-[#192537] ml-1">
                            {t('fullName')}
                        </label>
                        <div className="relative group">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full bg-gray-50 border-none rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-blue-500/20 transition-all outline-none disabled:opacity-75"
                                required
                                disabled={isReadOnly}
                            />
                        </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-[#192537] ml-1">
                            {t('email')}
                        </label>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-gray-50 border-none rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-blue-500/20 transition-all outline-none disabled:opacity-75"
                                required
                                disabled={isReadOnly}
                            />
                        </div>
                    </div>

                    {/* Phone Number */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-[#192537] ml-1">
                            {t('phone')}
                        </label>
                        <div className="relative group">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full bg-gray-50 border-none rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-blue-500/20 transition-all outline-none disabled:opacity-75"
                                placeholder="+351 9XX XXX XXX"
                                disabled={isReadOnly}
                            />
                        </div>
                    </div>

                    {/* Preferred Language */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-[#192537] ml-1">
                            {t('language')}
                        </label>
                        <div className="flex bg-gray-50 p-1 rounded-2xl w-fit min-w-[200px]">
                            <button
                                type="button"
                                onClick={async () => {
                                    if (language === 'pt' || isReadOnly) return;
                                    setLanguage('pt');
                                    // Immediate background save and redirect
                                    await updateProfileMetadata({ language: 'pt' });
                                    router.replace(pathname, { locale: 'pt' as any });
                                }}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all",
                                    language === 'pt' 
                                        ? "bg-white text-[#192537] shadow-sm" 
                                        : "text-gray-400 hover:text-gray-600"
                                )}
                                disabled={isReadOnly}
                            >
                                <span className="text-base text-gray-400">🇵🇹</span>
                                {t('portuguese')}
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    if (language === 'en' || isReadOnly) return;
                                    setLanguage('en');
                                    // Immediate background save and redirect
                                    await updateProfileMetadata({ language: 'en' });
                                    router.replace(pathname, { locale: 'en' as any });
                                }}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all",
                                    language === 'en' 
                                        ? "bg-white text-[#192537] shadow-sm" 
                                        : "text-gray-400 hover:text-gray-600"
                                )}
                                disabled={isReadOnly}
                            >
                                <span className="text-base text-gray-400">🇬🇧</span>
                                {t('english')}
                            </button>
                        </div>
                    </div>
                </div>

                {message && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className={cn(
                            "flex items-center gap-3 p-4 rounded-2xl text-sm font-medium",
                            message.type === 'success' ? "bg-emerald-50 text-emerald-700" :
                            message.type === 'info' ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-700"
                        )}
                    >
                        {message.type === 'success' || message.type === 'info' ? (
                            <CheckCircle2 className="size-4 shrink-0" />
                        ) : (
                            <AlertCircle className="size-4 shrink-0" />
                        )}
                        {message.text}
                    </motion.div>
                )}

                <div className="pt-4 flex justify-end">
                    <button
                        type="submit"
                        disabled={isSubmitting || isReadOnly}
                        className="bg-[#192537] text-white px-8 py-3.5 rounded-2xl font-bold text-sm hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 disabled:hover:scale-100 flex items-center gap-2 shadow-lg shadow-blue-900/10"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="size-4 animate-spin" />
                                {t('updateProfile')}...
                            </>
                        ) : (
                            t('updateProfile')
                        )}
                    </button>
                </div>
            </form>
        </motion.div>
    );
};
