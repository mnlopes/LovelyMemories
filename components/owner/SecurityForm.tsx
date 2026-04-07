"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { ShieldCheck, Lock, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff, X, HelpCircle, Check, Circle } from "lucide-react";
import { updateUserPassword } from "../../app/actions/auth";
import { cn } from "@/lib/utils";
import { AnimatePresence } from "framer-motion";

export const SecurityForm = () => {
    const t = useTranslations('OwnerProfile');
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Validation Requirements
    const hasMinLength = password.length >= 8;
    const hasNumber = /\d/.test(password);
    const hasLetter = /[a-zA-Z]/.test(password);
    const isComplexityMet = hasMinLength && hasNumber && hasLetter;
    
    // Button enable logic (as requested: enable if something is written)
    const isButtonEnabled = password.length > 0 || confirmPassword.length > 0;

    const handlePreSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        
        if (!isComplexityMet) return; // Prevent if not valid but button is enabled
        
        if (password !== confirmPassword) {
            setMessage({ type: 'error', text: t('passwordMismatch') });
            return;
        }

        setShowConfirmModal(true);
    };

    const handleConfirmSubmit = async () => {
        setShowConfirmModal(false);
        setIsSubmitting(true);
        setMessage(null);

        try {
            const res = await updateUserPassword(password);
            if (res.error) throw new Error(res.error);
            setMessage({ type: 'success', text: t('passwordUpdated') });
            setPassword("");
            setConfirmPassword("");
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || t('errorPassword') });
        } finally {
            setIsSubmitting(false);
        }
    };

    const RequirementItem = ({ met, label }: { met: boolean; label: string }) => (
        <div className={cn(
            "flex items-center gap-2 text-[11px] transition-colors",
            met ? "text-emerald-600" : "text-gray-400"
        )}>
            {met ? <Check className="size-3" strokeWidth={3} /> : <Circle className="size-2.5" />}
            <span className={cn(met && "font-bold")}>{label}</span>
        </div>
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm relative"
        >
            <div className="flex items-center gap-3 mb-8">
                <div className="size-10 rounded-2xl bg-rose-50 flex items-center justify-center">
                    <ShieldCheck className="size-5 text-rose-600" />
                </div>
                <h2 className="text-xl font-bold text-[#0A1128]">{t('security')}</h2>
            </div>

            <form onSubmit={handlePreSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* New Password Column */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-[#192537] ml-1">
                                {t('newPassword')}
                            </label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-400 group-focus-within:text-rose-500 transition-colors" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-gray-50 border-none rounded-2xl py-3.5 pl-12 pr-12 text-sm focus:ring-2 focus:ring-rose-500/20 transition-all outline-none"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-rose-500 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Password Requirements UI */}
                        {password.length > 0 && (
                            <motion.div 
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-gray-50/50 p-4 rounded-2xl space-y-2 border border-gray-100"
                            >
                                <p className="text-[10px] uppercase tracking-wider font-extrabold text-gray-400 mb-2">
                                    {t('passwordRequirements')}
                                </p>
                                <RequirementItem met={hasMinLength} label={t('reqMinChars')} />
                                <RequirementItem met={hasLetter} label={t('reqLetter')} />
                                <RequirementItem met={hasNumber} label={t('reqNumber')} />
                            </motion.div>
                        )}
                    </div>

                    {/* Confirm Password Column */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-[#192537] ml-1">
                            {t('confirmPassword')}
                        </label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-400 group-focus-within:text-rose-500 transition-colors" />
                            <input
                                type={showPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full bg-gray-50 border-none rounded-2xl py-3.5 pl-12 pr-12 text-sm focus:ring-2 focus:ring-rose-500/20 transition-all outline-none"
                                required
                            />
                        </div>
                    </div>
                </div>

                {message && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className={cn(
                            "flex items-center gap-3 p-4 rounded-2xl text-sm font-medium",
                            message.type === 'success' ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                        )}
                    >
                        {message.type === 'success' ? (
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
                        disabled={isSubmitting || !isButtonEnabled}
                        className={cn(
                            "bg-rose-600 text-white px-8 py-3.5 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-rose-900/20 flex items-center gap-2",
                            isComplexityMet 
                                ? "hover:scale-[1.02] active:scale-95" 
                                : "opacity-60 cursor-not-allowed",
                            (!isButtonEnabled || isSubmitting) && "opacity-50 grayscale cursor-not-allowed"
                        )}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="size-4 animate-spin" />
                                {t('changePassword')}...
                            </>
                        ) : (
                            t('changePassword')
                        )}
                    </button>
                </div>
            </form>

            {/* Confirmation Modal Overlay */}
            <AnimatePresence>
                {showConfirmModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowConfirmModal(false)}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl border border-gray-100"
                        >
                            <button 
                                onClick={() => setShowConfirmModal(false)}
                                className="absolute right-6 top-6 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X className="size-5" />
                            </button>

                            <div className="size-16 rounded-[24px] bg-rose-50 flex items-center justify-center mb-6">
                                <HelpCircle className="size-8 text-rose-600" />
                            </div>

                            <h3 className="text-2xl font-bold text-[#0A1128] mb-3 leading-tight">
                                {t('confirmPasswordChange')}
                            </h3>
                            <p className="text-gray-500 text-sm leading-relaxed mb-8">
                                {t('areYouSurePassword')}
                            </p>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handleConfirmSubmit}
                                    className="w-full bg-rose-600 text-white py-4 rounded-2xl font-bold text-sm hover:bg-rose-700 active:scale-[0.98] transition-all shadow-lg shadow-rose-900/20"
                                >
                                    {t('yesChange')}
                                </button>
                                <button
                                    onClick={() => setShowConfirmModal(false)}
                                    className="w-full bg-gray-50 text-gray-600 py-4 rounded-2xl font-bold text-sm hover:bg-gray-100 transition-all focus:outline-none"
                                >
                                    {t('cancel')}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
