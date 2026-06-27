"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { Mail, Lock, Loader2, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useParams } from "next/navigation";
import { loginWithEmail, requestPasswordReset } from "@/app/actions/auth";

export default function LoginPage() {
    const t = useTranslations('Auth');
    const router = useRouter();
    const params = useParams();
    const locale = params.locale as string;

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isResetMode, setIsResetMode] = useState(false);
    const [resetEmailSent, setResetEmailSent] = useState(false);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(true);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const result = await loginWithEmail(email, password, rememberMe);
            if (result.error) throw new Error(result.error);

            // Success! Give the browser a moment to resolve redirects
            await new Promise(resolve => setTimeout(resolve, 300));

            let redirectUrl = `/${locale}`; // Default to home

            if (result.role) {
                if (['super_admin', 'admin', 'editor'].includes(result.role)) {
                    redirectUrl = `/${locale}/admin`;
                } else if (result.role === 'owner') {
                    redirectUrl = `/${locale}/owner`;
                }
            }

            // Redirect
            window.location.href = redirectUrl;
        } catch (err: any) {
            setError(err.message || t('errorInvalid'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            // The server action always reports success (anti-enumeration): it never reveals
            // whether the email is registered. We always show the "check your inbox" state.
            await requestPasswordReset(email, locale);
            setResetEmailSent(true);
        } catch (err: any) {
            setError(err.message || t('errorInvalid'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4 relative overflow-hidden font-sans">
            {/* Background Texture & Gradients */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-[#C5A059]/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-[#0A1128]/5 rounded-full blur-[100px]" />
                <div className="absolute top-[40%] left-[20%] w-[300px] h-[300px] bg-[#B09E80]/5 rounded-full blur-[80px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="w-full max-w-[450px] relative z-10"
            >
                {/* Brand Logo - Centered & Elegant */}
                <div className="text-center mb-10">
                    <Link href="/" className="inline-block group mb-6 hover:opacity-80 transition-opacity">
                        <img
                            src="/legacy/home/images/logo.svg"
                            alt="Lovely Memories"
                            className="h-16 mx-auto brightness-0"
                            style={{ filter: 'brightness(0) saturate(100%) invert(8%) sepia(35%) saturate(1210%) hue-rotate(188deg) brightness(96%) contrast(97%)' }}
                        />
                    </Link>
                    <h1 className={`${isResetMode ? 'text-2xl sm:text-3xl' : 'text-4xl'} font-playfair font-bold text-[#0A1128] mb-3 tracking-tight`}>
                        {isResetMode ? (resetEmailSent ? t('checkEmail') : t('resetPassword')) : t('welcomeBack')}
                    </h1>
                    <p className="text-[#0A1128]/50 text-base font-light tracking-wide">
                        {isResetMode
                            ? (resetEmailSent
                                ? t('recoverySubtitle')
                                : t('resetDesc'))
                            : t('loginDesc')}
                    </p>
                </div>

                {/* Card Container */}
                <div className="bg-white rounded-[24px] p-8 md:p-10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.06)] border border-[#F0F0F0] relative overflow-hidden min-h-[400px] flex flex-col justify-center">
                    {/* Top Accent Line */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#C5A059] to-[#B09E80]" />

                    <AnimatePresence mode="wait">
                        {resetEmailSent ? (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="text-center py-4"
                            >
                                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                                </div>
                                <h3 className="text-xl font-bold text-[#0A1128] mb-2">{t('linkSent')}</h3>
                                <p className="text-[#0A1128]/60 text-sm mb-8">
                                    {t('checkInbox')}
                                </p>
                                <button
                                    onClick={() => {
                                        setResetEmailSent(false);
                                        setIsResetMode(false);
                                    }}
                                    className="text-sm font-bold text-[#C5A059] uppercase tracking-widest hover:underline"
                                >
                                    {t('backToLogin')}
                                </button>
                            </motion.div>
                        ) : isResetMode ? (
                            <motion.form
                                key="reset-form"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                onSubmit={handleResetPassword}
                                className="space-y-6 pt-2"
                            >
                                {error && (
                                    <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium flex items-center gap-2">
                                        <Mail className="w-4 h-4 shrink-0" />
                                        {error}
                                    </div>
                                )}

                                <div className="space-y-1.5 relative group">
                                    <label className="text-xs font-bold text-[#0A1128]/70 uppercase tracking-widest ml-1 mb-1 block">
                                        {t('email')}
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0A1128]/30 group-focus-within:text-[#C5A059] transition-colors duration-300">
                                            <Mail className="w-5 h-5" strokeWidth={1.5} />
                                        </span>
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="name@example.com"
                                            className="w-full h-14 pl-12 pr-4 bg-[#FAFAFA] border border-[#EBEBEB] rounded-xl focus:outline-none focus:border-[#C5A059] focus:bg-white focus:ring-4 focus:ring-[#C5A059]/5 transition-all outline-none text-[#0A1128] placeholder:text-gray-400 font-medium"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full h-14 bg-[#0A1128] text-white rounded-xl font-bold uppercase text-sm tracking-wide hover:bg-[#152040] hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 group relative overflow-hidden"
                                >
                                    <span className="relative z-10 flex items-center gap-2">
                                        {isLoading ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                {t('sendResetLink')}
                                                <ArrowRight className="w-4 h-4 shrink-0 group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setIsResetMode(false)}
                                    className="w-full text-center text-sm font-bold text-[#0A1128]/40 hover:text-[#0A1128] transition-colors flex items-center justify-center gap-2 group"
                                >
                                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                                    {t('backToLogin')}
                                </button>
                            </motion.form>
                        ) : (
                            <motion.form
                                key="login-form"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                onSubmit={handleSubmit}
                                className="space-y-6 pt-2"
                            >
                                {error && (
                                    <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 shrink-0">
                                            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
                                        </svg>
                                        {error}
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div className="space-y-1.5 relative group">
                                        <label className="text-xs font-bold text-[#0A1128]/70 uppercase tracking-widest ml-1 mb-1 block">
                                            {t('email')}
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0A1128]/30 group-focus-within:text-[#C5A059] transition-colors duration-300">
                                                <Mail className="w-5 h-5" strokeWidth={1.5} />
                                            </span>
                                            <input
                                                type="email"
                                                required
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="name@example.com"
                                                className="w-full h-14 pl-12 pr-4 bg-[#FAFAFA] border border-[#EBEBEB] rounded-xl focus:outline-none focus:border-[#C5A059] focus:bg-white focus:ring-4 focus:ring-[#C5A059]/5 transition-all outline-none text-[#0A1128] placeholder:text-gray-400 font-medium"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5 relative group">
                                        <label className="text-xs font-bold text-[#0A1128]/70 uppercase tracking-widest ml-1 mb-1 block">
                                            {t('password')}
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0A1128]/30 group-focus-within:text-[#C5A059] transition-colors duration-300">
                                                <Lock className="w-5 h-5" strokeWidth={1.5} />
                                            </span>
                                            <input
                                                type="password"
                                                required
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="••••••••"
                                                className="w-full h-14 pl-12 pr-4 bg-[#FAFAFA] border border-[#EBEBEB] rounded-xl focus:outline-none focus:border-[#C5A059] focus:bg-white focus:ring-4 focus:ring-[#C5A059]/5 transition-all outline-none text-[#0A1128] placeholder:text-gray-400 font-medium font-sans"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between gap-3 pt-1">
                                    <label className="flex items-center gap-2 cursor-pointer group shrink-0">
                                        <input
                                            type="checkbox"
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                            className="w-4 h-4 shrink-0 rounded border-gray-300 text-[#C5A059] focus:ring-[#C5A059] cursor-pointer"
                                        />
                                        <span className="text-xs text-[#0A1128]/60 group-hover:text-[#0A1128] transition-colors whitespace-nowrap">{t('rememberMe')}</span>
                                    </label>

                                    <button
                                        type="button"
                                        onClick={() => setIsResetMode(true)}
                                        className="text-xs font-semibold text-[#B09E80] hover:text-[#9E8C6D] transition-colors whitespace-nowrap text-right"
                                    >
                                        {t('forgotPassword')}
                                    </button>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full h-14 bg-[#0A1128] text-white rounded-xl font-bold uppercase tracking-[0.15em] hover:bg-[#152040] hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3 group relative overflow-hidden"
                                >
                                    <span className="relative z-10 flex items-center gap-2">
                                        {isLoading ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                {t('signInButton')}
                                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </span>
                                </button>
                            </motion.form>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer Links */}
                <div className="mt-10 text-center">
                    <p className="text-[#0A1128]/40 text-sm font-light">
                        {t('legalAgree')} <br />
                        <Link href="/terms-conditions" className="text-[#0A1128]/70 hover:text-[#C5A059] underline decoration-1 underline-offset-4 transition-colors">{t('termsOfService')}</Link>
                        {" "} {t('legalAnd')} {" "}
                        <Link href="/privacy-policy" className="text-[#0A1128]/70 hover:text-[#C5A059] underline decoration-1 underline-offset-4 transition-colors">{t('privacyPolicy')}</Link>
                    </p>
                </div>

            </motion.div>
        </main>
    );
}
