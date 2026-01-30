"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "@/i18n/routing";
import { ReactNode } from "react";

interface PageTransitionProps {
    children: ReactNode;
}

export const PageTransition = ({ children }: PageTransitionProps) => {
    const pathname = usePathname();

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={pathname}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{
                    duration: 0.6,
                    ease: [0.22, 1, 0.36, 1], // Custom cubic-bezier for a premium feel
                }}
                className="w-full"
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );
};
