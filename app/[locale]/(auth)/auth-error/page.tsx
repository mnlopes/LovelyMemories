"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { AlertCircle, ChevronLeft } from "lucide-react";

export default function AuthErrorPage() {
    const t = useTranslations('Auth');

    return (
        <main className="min-h-screen bg-[#FCFCFC] flex items-center justify-center px-4 overflow-hidden relative">
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-500/5 rounded-full blur-[120px] -mr-64 -mt-64 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#192537]/5 rounded-full blur-[120px] -ml-64 -mb-64 pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-white rounded-[32px] p-12 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-[#E1E6EC] text-center relative z-10"
            >
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8">
                    <AlertCircle className="w-10 h-10 text-red-500" />
                </div>
                <h1 className="text-3xl font-playfair font-bold text-[#192537] mb-4">
                    Authentication Error
                </h1>
                <p className="text-[#192537]/60 mb-8 font-medium">
                    The link you used may be invalid or expired. Please request a new invitation link from your administrator.
                </p>

                <Link
                    href="/login"
                    className="flex items-center justify-center gap-2 text-[#192537] hover:text-[#B09E80] font-bold uppercase tracking-widest text-xs transition-colors group"
                >
                    <ChevronLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Login
                </Link>
            </motion.div>
        </main>
    );
}
