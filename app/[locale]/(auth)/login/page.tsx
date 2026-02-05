
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { supabase } from "@/lib/supabase";
import { Mail, Lock, Loader2, ChevronRight } from "lucide-react";

import { useParams } from "next/navigation";

export default function LoginPage() {
    const t = useTranslations('Auth');
    const router = useRouter();
    const params = useParams();
    const locale = params.locale;

    const [isSignUp, setIsSignUp] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            if (isSignUp) {
                const { error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (signUpError) throw signUpError;
                // For sign up, we might need email verification depending on Supabase settings
                alert("Verifique o seu email para confirmar o registo.");
            } else {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (signInError) throw signInError;
                // Success! Give the browser a moment to set cookies
                await new Promise(resolve => setTimeout(resolve, 500));

                // Refresh to sync cookies with server
                router.refresh();

                // Redirect to dashboard
                // Using window.location.href as a more forceful redirect for auth state sync
                window.location.href = `/${locale}/admin`;
            }
        } catch (err: any) {
            setError(err.message || t('errorInvalid'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#FCFCFC] pt-32 pb-20 flex items-center justify-center px-4 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#B09E80]/5 rounded-full blur-[120px] -mr-64 -mt-64 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#192537]/5 rounded-full blur-[120px] -ml-64 -mb-64 pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md relative z-10"
            >
                {/* Logo / Header */}
                <div className="text-center mb-10">
                    <Link href="/" className="inline-block group">
                        <img
                            src="/legacy/home/images/logo.svg"
                            alt="Lovely Memories"
                            className="h-16 mx-auto mb-6 brightness-0 transition-all duration-300 group-hover:scale-105 group-active:scale-95"
                            style={{ filter: 'brightness(0) saturate(100%) invert(8%) sepia(35%) saturate(1210%) hue-rotate(188deg) brightness(96%) contrast(97%)' }}
                        />
                    </Link>
                    <h1 className="text-3xl font-playfair font-bold text-[#192537] mb-2">
                        {isSignUp ? t('joinUs') : t('welcomeBack')}
                    </h1>
                    <p className="text-[#192537]/60">
                        {isSignUp ? t('signUpDesc') || "Create your account to manage your stays" : t('loginDesc') || "Enter your credentials to access your account"}
                    </p>
                </div>

                <div className="bg-white rounded-[32px] p-8 md:p-10 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-[#E1E6EC]">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium"
                            >
                                {error}
                            </motion.div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-[#192537] uppercase tracking-wider ml-1">
                                {t('email')}
                            </label>
                            <div className="relative group">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#192537]/30 group-focus-within:text-[#B09E80] transition-colors">
                                    <Mail className="w-5 h-5" />
                                </span>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@example.com"
                                    className="w-full h-14 pl-12 pr-4 bg-[#FCFCFC] border border-[#E1E6EC] rounded-2xl focus:outline-none focus:border-[#B09E80] focus:ring-4 focus:ring-[#B09E80]/5 transition-all outline-none text-[#192537]"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-[#192537] uppercase tracking-wider ml-1">
                                {t('password')}
                            </label>
                            <div className="relative group">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#192537]/30 group-focus-within:text-[#B09E80] transition-colors">
                                    <Lock className="w-5 h-5" />
                                </span>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full h-14 pl-12 pr-4 bg-[#FCFCFC] border border-[#E1E6EC] rounded-2xl focus:outline-none focus:border-[#B09E80] focus:ring-4 focus:ring-[#B09E80]/5 transition-all outline-none text-[#192537]"
                                />
                            </div>
                        </div>

                        {!isSignUp && (
                            <div className="flex justify-end">
                                <button type="button" className="text-sm font-medium text-[#B09E80] hover:text-[#9E8C6D] transition-colors">
                                    Forgot password?
                                </button>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-14 bg-[#192537] text-white rounded-2xl font-bold uppercase tracking-[0.1em] hover:bg-[#253652] active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3 group shadow-lg shadow-[#192537]/20"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    {isSignUp ? t('signUpButton') : t('signInButton')}
                                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center pt-8 border-t border-[#E1E6EC]">
                        <p className="text-[#192537]/50 text-sm">
                            {isSignUp ? t('hasAccount') : t('noAccount')}{" "}
                            <button
                                onClick={() => setIsSignUp(!isSignUp)}
                                className="text-[#B09E80] font-bold hover:underline"
                            >
                                {isSignUp ? t('login') : t('signUp')}
                            </button>
                        </p>
                    </div>
                </div>

            </motion.div>
        </main>
    );
}
