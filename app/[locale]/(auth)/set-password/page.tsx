"use client";

import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { Lock, Loader2, CheckCircle2, ChevronRight, Eye, EyeOff, Mail, AlertTriangle, LogOut, Check, X } from "lucide-react";
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
    const router = useRouter();
    const searchParams = useSearchParams();
    const urlEmail = searchParams.get('email');

    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [isSessionLoading, setIsSessionLoading] = useState(true);

    // Password Complexity States
    const hasMinLength = password.length >= 8;
    const hasNumber = /\d/.test(password);
    const hasLetter = /[a-zA-Z]/.test(password);
    const isComplexityMet = hasMinLength && hasNumber && hasLetter;

    useEffect(() => {
        let isSubscribed = true;

        // 1. Monitor auth changes in real-time
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (!isSubscribed) return;
            console.log("Auth Event Detected:", event, session?.user?.email);
            if (session?.user) {
                setCurrentUser(session.user);
                setIsSessionLoading(false);
            }
        });

        // 2. Manual Hash Detection Fallback
        const checkHash = async () => {
            const hash = window.location.hash.substring(1);
            if (!hash || !hash.includes('access_token=')) return;

            console.log("Auth hash found, attempting manual session set...");
            const params = new URLSearchParams(hash);
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');

            if (accessToken && refreshToken) {
                const { data, error } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken
                });

                if (data?.user && isSubscribed) {
                    console.log("Session set manually via hash:", data.user.email);
                    setCurrentUser(data.user);
                    setIsSessionLoading(false);
                } else if (error) {
                    console.error("Manual session set error:", error);
                }
            }
        };
        checkHash();

        // 3. Proactive polling (getSession is better for hash fragments)
        const pollAuth = async (retries = 15) => {
            if (!isSubscribed) return;

            try {
                // getSession is usually the first to pick up the fragment
                const { data: { session: currentSession } } = await supabase.auth.getSession();

                if (currentSession?.user) {
                    console.log("Session found via polling:", currentSession.user.email);
                    setCurrentUser(currentSession.user);
                    setIsSessionLoading(false);
                    return;
                }

                // Fallback to getUser which is slower but verified
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    console.log("User found via polling:", user.email);
                    setCurrentUser(user);
                    setIsSessionLoading(false);
                    return;
                }
            } catch (err) {
                console.warn("Polling attempt failed:", err);
            }

            if (retries > 0 && isSubscribed) {
                console.log(`Still waiting for session... (${retries} left)`);
                setTimeout(() => pollAuth(retries - 1), 1000); // 1s interval
            } else if (isSubscribed) {
                console.log("Auth polling finished - no session found");
                setIsSessionLoading(false);
            }
        };

        pollAuth();

        return () => {
            isSubscribed = false;
            subscription.unsubscribe();
        };
    }, []);

    const handleLogoutAndContinue = async () => {
        await supabase.auth.signOut();
        window.location.reload();
    };

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
            await updateUserPassword(password);
            setIsSuccess(true);
            toast.success(t('successPassword'));

            // Determine redirect based on role
            const { data: { user } } = await supabase.auth.getUser();
            let redirectPath = '/admin';

            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                if (profile?.role === 'owner') {
                    redirectPath = '/owner';
                }
            }

            const locale = window.location.pathname.split('/')[1] || 'en';
            setTimeout(() => {
                window.location.href = `/${locale}${redirectPath}`;
            }, 2000);
        } catch (err: any) {
            console.error("Password update error:", err);
            setError(err.message || "An error occurred while updating your password");
            toast.error("Failed to update password");
        } finally {
            setIsLoading(false);
        }
    };

    const isConflict = currentUser && urlEmail && currentUser.email?.toLowerCase() !== urlEmail.toLowerCase();

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
                    Your account is now ready. Redirecting you to the dashboard...
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
                className="bg-white rounded-[32px] p-8 md:p-10 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-[#E1E6EC] overflow-hidden"
            >
                <AnimatePresence mode="wait">
                    {isConflict ? (
                        <motion.div
                            key="conflict"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <div className="p-6 bg-red-50 border border-red-100 rounded-2xl flex flex-col items-center text-center">
                                <div className="w-12 h-12 bg-red-500 text-white rounded-full flex items-center justify-center mb-4 shadow-lg shadow-red-200 animate-pulse">
                                    <AlertTriangle className="size-6" />
                                </div>
                                <h3 className="text-lg font-bold text-red-700 mb-2">Wrong Account Detected!</h3>
                                <p className="text-sm text-red-600/80 font-medium">
                                    You are currently logged in as <span className="font-bold underline">{currentUser?.email}</span>.
                                    But this invitation is for <span className="font-bold underline">{urlEmail}</span>.
                                </p>
                            </div>
                            <button
                                onClick={handleLogoutAndContinue}
                                className="w-full h-14 bg-red-600 text-white rounded-2xl font-bold uppercase tracking-widest hover:bg-red-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3 group shadow-lg shadow-red-200"
                            >
                                <LogOut className="w-5 h-5" />
                                Logout & Change Account
                            </button>
                        </motion.div>
                    ) : !currentUser && !isSessionLoading ? (
                        <motion.div
                            key="no-session"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-6"
                        >
                            <div className="p-6 bg-amber-50 border border-amber-100 rounded-2xl flex flex-col items-center text-center">
                                <div className="size-12 bg-amber-500 text-white rounded-full flex items-center justify-center mb-4 shadow-lg shadow-amber-200">
                                    <AlertTriangle className="size-6" />
                                </div>
                                <h3 className="text-lg font-bold text-amber-700 mb-2">Session Not Found</h3>
                                <p className="text-sm text-amber-600/80 font-medium">
                                    We couldn't verify your session yet. This can happen if the link was clicked from some email apps.
                                </p>
                            </div>
                            <button
                                onClick={() => window.location.reload()}
                                className="w-full h-14 bg-amber-600 text-white rounded-2xl font-bold uppercase tracking-widest hover:bg-amber-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3 group shadow-lg shadow-amber-200"
                            >
                                <Loader2 className="w-5 h-5 group-hover:rotate-180 transition-transform" />
                                Refresh & Try Again
                            </button>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="form"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-6"
                        >
                            {(urlEmail || currentUser?.email) && (
                                <div className="p-4 bg-blue-50/50 border border-blue-100/50 rounded-2xl flex items-center gap-3">
                                    <div className="size-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-blue-500">
                                        <Mail className="size-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase tracking-widest font-bold text-blue-500/60 leading-none mb-1">
                                            {currentUser ? "Logged in as" : "Setting password for"}
                                        </p>
                                        <p className="text-sm font-bold text-[#192537] leading-tight">
                                            {urlEmail || currentUser?.email}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {error && (
                                    <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
                                        {error === "Auth session missing!" ? (
                                            <div className="space-y-2">
                                                <p className="font-bold">Session expired or missing.</p>
                                                <p className="text-xs">Please refresh the page using the button above.</p>
                                            </div>
                                        ) : error}
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
                                    disabled={isLoading || isSessionLoading || !currentUser || password.length === 0 || !isComplexityMet}
                                    className="w-full h-14 bg-[#192537] text-white rounded-2xl font-bold uppercase tracking-[0.1em] hover:bg-[#253652] active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3 group shadow-lg shadow-[#192537]/20"
                                >
                                    {isLoading || isSessionLoading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            {t('savePassword')}
                                            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>
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
                    <p className="text-[#192537]/60 font-medium">Loading security context...</p>
                </div>
            }>
                <SetPasswordForm />
            </Suspense>

        </main>
    );
}
