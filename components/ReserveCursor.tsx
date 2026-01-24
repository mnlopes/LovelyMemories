"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

export const ReserveCursor = () => {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [isHovering, setIsHovering] = useState(false);

    useEffect(() => {
        const updateMousePosition = (e: MouseEvent) => {
            setMousePosition({ x: e.clientX, y: e.clientY });
        };

        const handleMouseOver = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            // Check if target is interactive (Hero, GlassCard, etc)
            // We can use a data-attribute 'data-cursor-target'
            const isTarget = target.closest("[data-cursor-target]");
            setIsHovering(!!isTarget);
        };

        window.addEventListener("mousemove", updateMousePosition);
        window.addEventListener("mouseover", handleMouseOver);

        return () => {
            window.removeEventListener("mousemove", updateMousePosition);
            window.removeEventListener("mouseover", handleMouseOver);
        };
    }, []);

    return (
        <AnimatePresence>
            {isHovering && (
                <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    style={{
                        position: "fixed",
                        left: mousePosition.x - 75, // Center the 150px wide button
                        top: mousePosition.y - 30, // Center the 60px tall button
                        pointerEvents: "none",
                        zIndex: 9999,
                    }}
                    className="flex items-center gap-3 px-6 py-4 bg-gold-50/90 backdrop-blur-xl rounded-full shadow-2xl border border-white/20"
                >
                    <span className="text-navy-950 font-medium tracking-wide text-sm whitespace-nowrap">
                        View Now
                    </span>
                    <div className="w-8 h-8 rounded-full bg-navy-950 flex items-center justify-center text-white">
                        <ArrowUpRight className="w-4 h-4" />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
