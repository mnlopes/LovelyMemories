"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export const Preloader = () => {
    const pathname = usePathname();
    const [isLoading, setIsLoading] = useState(!pathname?.includes('/booking/checkout'));

    useEffect(() => {
        // Skip preloader for checkout page to allow skeleton UI to show
        if (pathname.includes('/booking/checkout')) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        window.scrollTo(0, 0);

        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 1000); // 1s loading time for transitions

        return () => clearTimeout(timer);
    }, [pathname]);

    return (
        <AnimatePresence>
            {isLoading && (
                <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
                    className="fixed inset-0 z-[20000] bg-[#192537] flex flex-col items-center justify-center p-8 text-center"
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="relative w-full max-w-4xl mx-auto"
                    >
                        <h1 className="font-playfair text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight">
                            Lovely Memories
                        </h1>
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: "200px" }}
                            transition={{ duration: 1, delay: 0.6, ease: "easeInOut" }}
                            className="h-[1px] bg-[#AD9C7E] mx-auto"
                        />
                        <p className="mt-6 text-[#AD9C7E] uppercase tracking-[0.5em] text-xs md:text-sm font-medium">
                            Luxury Living
                        </p>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
