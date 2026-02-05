"use client";

import { motion } from "framer-motion";
import { Hammer, Clock, Mail } from "lucide-react";

export default function MaintenancePage() {
    return (
        <div className="min-h-screen bg-[#FCFCFC] flex flex-col items-center justify-center p-6 text-center overflow-hidden relative">
            {/* Background Decorations */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#fefce8] rounded-full blur-[120px] opacity-60 z-0 animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#f0fdf4] rounded-full blur-[120px] opacity-60 z-0 animate-pulse" style={{ animationDelay: '1s' }} />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="z-10 max-w-2xl"
            >
                {/* Logo */}
                <div className="mb-12">
                    <img
                        src="/legacy/home/images/logo.svg"
                        alt="Lovely Memories"
                        className="h-20 mx-auto brightness-0"
                        style={{ filter: 'brightness(0) saturate(100%) invert(8%) sepia(35%) saturate(1210%) hue-rotate(188deg) brightness(96%) contrast(97%)' }}
                    />
                </div>

                {/* Main Icon */}
                <div className="mb-8 relative inline-block">
                    <div className="absolute inset-0 bg-[#171717] rounded-3xl blur-2xl opacity-5 scale-150" />
                    <div className="size-24 rounded-[2rem] bg-white border border-[#f5f5f5] shadow-xl flex items-center justify-center text-[#171717] relative">
                        <Hammer className="size-10 stroke-[1.5px] animate-bounce" />
                    </div>
                </div>

                <h1 className="text-4xl md:text-5xl font-bold text-[#171717] mb-6 tracking-tight">
                    Improving your experience
                </h1>

                <p className="text-lg text-[#737373] mb-12 leading-relaxed max-w-lg mx-auto">
                    We're currently performing some critical updates to ensure your next stay with us is even more lovely. We'll be back online shortly.
                </p>

                {/* Status Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
                    <div className="p-6 rounded-2xl bg-white border border-[#f5f5f5] shadow-sm flex items-center gap-4 text-left">
                        <div className="size-10 rounded-xl bg-[#fafafa] flex items-center justify-center text-[#a3a3a3]">
                            <Clock className="size-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-[#a3a3a3] uppercase tracking-wider">Estimated Time</p>
                            <p className="text-sm font-bold text-[#171717]">Back within 2 hours</p>
                        </div>
                    </div>
                    <div className="p-6 rounded-2xl bg-white border border-[#f5f5f5] shadow-sm flex items-center gap-4 text-left">
                        <div className="size-10 rounded-xl bg-[#fafafa] flex items-center justify-center text-[#a3a3a3]">
                            <Mail className="size-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-[#a3a3a3] uppercase tracking-wider">Need Help?</p>
                            <p className="text-sm font-bold text-[#171717]">info@lovelymemories.pt</p>
                        </div>
                    </div>
                </div>

                <div className="pt-8 border-t border-[#f5f5f5] inline-block">
                    <p className="text-xs font-bold text-[#a3a3a3] uppercase tracking-[0.3em]">
                        Lovely Memories &copy; 2026
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
