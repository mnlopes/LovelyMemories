"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { supabase } from "@/lib/supabase";
import { Mail, Lock, Loader2, ChevronRight, ArrowRight } from "lucide-react";
import { useParams } from "next/navigation";

export default function LoginPage() {
    const t = useTranslations('Auth');
    const router = useRouter();
    const params = useParams();
    const locale = params.locale;

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (signInError) throw signInError;

            // Success! Give the browser a moment to set cookies
            await new Promise(resolve => setTimeout(resolve, 500));

            // Fetch user role to determine redirect
            const { data: { user } } = await supabase.auth.getUser();
            let redirectUrl = `/${locale}`; // Default to home

            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                if (profile) {
                    if (['super_admin', 'admin', 'editor'].includes(profile.role)) {
                        redirectUrl = `/${locale}/admin`;
                    } else if (profile.role === 'owner') {
                        redirectUrl = `/${locale}/owner`;
                    }
                }
            }

            // Refresh to sync cookies with server
            router.refresh();

            // Redirect
            window.location.href = redirectUrl;
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
                    <h1 className="text-4xl font-playfair font-bold text-[#0A1128] mb-3 tracking-tight">
                        {t('welcomeBack')}
                    </h1>
                    <p className="text-[#0A1128]/50 text-base font-light tracking-wide">
                        {t('loginDesc') || "Enter your credentials to access your dashboard"}
                    </p>
                </div>

                {/* Login Card */}
                <div className="bg-white rounded-[24px] p-8 md:p-10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.06)] border border-[#F0F0F0] relative overflow-hidden">
                    {/* Top Accent Line */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#C5A059] to-[#B09E80]" />

                    <form onSubmit={handleSubmit} className="space-y-6 pt-2">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 shrink-0">
                                    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
                                </svg>
                                {error}
                            </motion.div>
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

                        <div className="flex items-center justify-between pt-1">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-[#C5A059] focus:ring-[#C5A059] cursor-pointer" />
                                <span className="text-sm text-[#0A1128]/60 group-hover:text-[#0A1128] transition-colors">{t('rememberMe') || "Keep me logged in"}</span>
                            </label>

                            <button type="button" className="text-sm font-semibold text-[#B09E80] hover:text-[#9E8C6D] transition-colors">
                                Forgot password?
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
                    </form>
                </div>

                {/* Footer Links */}
                <div className="mt-10 text-center">
                    <p className="text-[#0A1128]/40 text-sm font-light">
                        By signing in, you agree to our <br />
                        <Link href="/terms-conditions" className="text-[#0A1128]/70 hover:text-[#C5A059] underline decoration-1 underline-offset-4 transition-colors">Terms of Service</Link>
                        {" "} and {" "}
                        <Link href="/privacy-policy" className="text-[#0A1128]/70 hover:text-[#C5A059] underline decoration-1 underline-offset-4 transition-colors">Privacy Policy</Link>
                    </p>
                </div>

            </motion.div>
        </main>
    );
}
