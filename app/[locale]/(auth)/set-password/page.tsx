"use client";

import { useState, Suspense } from "react";
import { motion } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import { Lock, Loader2, CheckCircle2, ChevronRight, Eye, EyeOff, Mail, Check } from "lucide-react";
import { updateUserPassword } from "@/app/actions/user";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";

// Reusable Requirement Item Component
const RequirementItem = ({ label, met }: { label: string; met: boolean }) => (
    <div className={`flex items-center gap-2 text-xs font-medium transition-all duration-300 ${met ? 'text-emerald-500' : 'text-[#192537]/40'}`}>
        <div className={`size-4 rounded-full flex items-center justify-center border ${met ? 'bg-emerald-500 border-emerald-500' : 'border-[#192537]/10'}`}>
            {met ? <Check className="size-2.5 text-white stroke-[3]" /> : <div className="size-1 bg-[#192537]/20 rounded-full" />}
        </div>
        {label}
    </div>
);

function SetPasswordForm() {
    const t = useTranslations('Auth');
    const locale = useLocale();
    const isPt = locale === 'pt';
    const searchParams = useSearchParams();
    const urlEmail = searchParams.get('email');

    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Password complexity (mirrors the server-side rule in updateUserPassword).
    const hasMinLength = password.length >= 8;
    const hasNumber = /\d/.test(password);
    const hasLetter = /[a-zA-Z]/.test(password);
    const isComplexityMet = hasMinLength && hasNumber && hasLetter;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError(t('passwordMismatch'));
            return;
        }
        if (!isComplexityMet) {
            setError(t('passwordDesc') || "Password must have at least 8 characters, one letter and one number");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // The actual auth happens server-side against the cookie session that the invite /
            // recovery link already established — no client-side session detection needed.
            await updateUserPassword(password);
            setIsSuccess(true);
            toast.success(t('successPassword'));

            // Best-effort role-based redirect; never trap the owner on this screen.
            let dest = `/${locale}/login`;
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', user.id)
                        .single();
                    dest = profile?.role === 'owner' ? `/${locale}/owner` : `/${locale}/admin`;
                }
            } catch {
                // Couldn't resolve the role — login is a safe landing (they have a password now).
            }
            setTimeout(() => { window.location.href = dest; }, 1500);
        } catch (err: any) {
            console.error("Password update error:", err);
            // The only "session" failure that can happen here is the cookie session truly missing
            // (e.g. the link was opened, abandoned, and revisited much later). Guide, don't block.
            const sessionMissing = err?.message === 'Auth session missing!';
            setError(
                sessionMissing
                    ? (isPt
                        ? "A ligação expirou. Volte a abrir o link do email — de preferência no Safari ou Chrome, não dentro da aplicação de email."
                        : "Your link expired. Please open the email link again — ideally in Safari or Chrome, not inside your email app.")
                    : (err?.message || (isPt ? "Ocorreu um erro ao guardar a palavra-passe." : "An error occurred while updating your password"))
            );
            toast.error(isPt ? "Não foi possível guardar a palavra-passe" : "Failed to update password");
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md bg-white rounded-[32px] p-12 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-[#E1E6EC] text-center relative z-10"
            >
                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8">
                    <CheckCircle2 className="w-10 h-10 text-green-500" />
                </div>
                <h1 className="text-3xl font-playfair font-bold text-[#192537] mb-4">
                    {t('successPassword')}
                </h1>
                <p className="text-[#192537]/60 mb-8 font-medium">
                    {isPt ? "A sua conta está pronta. A redirecioná-lo..." : "Your account is now ready. Redirecting you..."}
                </p>
                <div className="flex justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-[#B09E80]" />
                </div>
            </motion.div>
        );
    }

    return (
        <div className="w-full max-w-md relative z-10">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-playfair font-bold text-[#192537] mb-2 font-display">
                    {t('setPassword')}
                </h1>
                <p className="text-[#192537]/60 font-medium text-sm">
                    {t('setPasswordDesc')}
                </p>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[32px] p-8 md:p-10 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-[#E1E6EC]"
            >
                <div className="space-y-6">
                    {urlEmail && (
                        <div className="p-4 bg-blue-50/50 border border-blue-100/50 rounded-2xl flex items-center gap-3">
                            <div className="size-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-blue-500">
                                <Mail className="size-5" />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-widest font-bold text-blue-500/60 leading-none mb-1">
                                    {isPt ? "A definir a palavra-passe para" : "Setting password for"}
                                </p>
                                <p className="text-sm font-bold text-[#192537] leading-tight">
                                    {urlEmail}
                                </p>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-[#192537] uppercase tracking-wider ml-1">
                                {t('password')}
                            </label>
                            <div className="relative group">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#192537]/30 group-focus-within:text-[#B09E80] transition-colors">
                                    <Lock className="w-5 h-5" />
                                </span>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full h-14 pl-12 pr-12 bg-[#FCFCFC] border border-[#E1E6EC] rounded-2xl focus:outline-none focus:border-[#B09E80] focus:ring-4 focus:ring-[#B09E80]/5 transition-all outline-none text-[#192537] font-medium"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#192537]/30 hover:text-[#B09E80] transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>

                            {/* Password Complexity Checklist */}
                            <div className="px-1 pt-1 space-y-2">
                                <RequirementItem
                                    label={t('minChars') || "At least 8 characters"}
                                    met={hasMinLength}
                                />
                                <div className="flex items-center gap-4">
                                    <RequirementItem
                                        label={t('oneLetter') || "One letter"}
                                        met={hasLetter}
                                    />
                                    <RequirementItem
                                        label={t('oneNumber') || "One number"}
                                        met={hasNumber}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-[#192537] uppercase tracking-wider ml-1">
                                {t('confirmPassword')}
                            </label>
                            <div className="relative group">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#192537]/30 group-focus-within:text-[#B09E80] transition-colors">
                                    <Lock className="w-5 h-5" />
                                </span>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full h-14 pl-12 pr-12 bg-[#FCFCFC] border border-[#E1E6EC] rounded-2xl focus:outline-none focus:border-[#B09E80] focus:ring-4 focus:ring-[#B09E80]/5 transition-all outline-none text-[#192537] font-medium"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || password.length === 0 || !isComplexityMet}
                            className="w-full h-14 bg-[#192537] text-white rounded-2xl font-bold uppercase tracking-[0.1em] hover:bg-[#253652] active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3 group shadow-lg shadow-[#192537]/20"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    {t('savePassword')}
                                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </motion.div>
        </div>
    );
}

export default function SetPasswordPage() {
    return (
        <main className="min-h-screen pt-24 pb-20 flex flex-col items-center justify-center px-4 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#B09E80]/5 rounded-full blur-[120px] -mr-64 -mt-64 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#192537]/5 rounded-full blur-[120px] -ml-64 -mb-64 pointer-events-none" />

            {/* Logo */}
            <div className="text-center mb-10 relative z-10">
                <Link href="/" className="inline-block group">
                    <img
                        src="/legacy/home/images/logo.svg"
                        alt="Lovely Memories"
                        className="h-16 mx-auto mb-6 brightness-0 transition-all duration-300 group-hover:scale-105 group-active:scale-95"
                        style={{ filter: 'brightness(0) saturate(100%) invert(8%) sepia(35%) saturate(1210%) hue-rotate(188deg) brightness(96%) contrast(97%)' }}
                    />
                </Link>
            </div>

            <Suspense fallback={
                <div className="w-full max-w-md bg-white rounded-[32px] p-12 shadow-xl border border-[#E1E6EC] text-center relative z-10">
                    <Loader2 className="w-10 h-10 animate-spin text-[#B09E80] mx-auto mb-4" />
                    <p className="text-[#192537]/60 font-medium">Loading...</p>
                </div>
            }>
                <SetPasswordForm />
            </Suspense>

        </main>
    );
}
