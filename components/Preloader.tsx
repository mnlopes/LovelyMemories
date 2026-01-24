"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

export const Preloader = () => {
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        window.scrollTo(0, 0);
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 2500); // 2.5s loading time
        return () => clearTimeout(timer);
    }, []);

    return (
        <AnimatePresence>
            {isLoading && (
                <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
                    className="fixed inset-0 z-[100] bg-navy-950 flex flex-col items-center justify-center p-8 text-center"
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1, delay: 0.2 }}
                        className="relative"
                    >
                        <h1 className="font-playfair text-6xl md:text-8xl font-bold text-white mb-4">
                            Lovely Memories
                        </h1>
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 1.5, delay: 0.5, ease: "easeInOut" }}
                            className="h-[1px] bg-[#AD9C7E] mx-auto"
                        />
                        <p className="mt-4 text-[#AD9C7E] uppercase tracking-[0.4em] text-sm">Luxury Living</p>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
