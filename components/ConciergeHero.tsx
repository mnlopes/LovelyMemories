"use client";

import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

export const ConciergeHero = () => {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start start", "end start"],
    });

    const y = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);
    const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
    const scale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);

    return (
        <section ref={ref} className="relative h-[80vh] min-h-[600px] overflow-hidden bg-[#0A1128]">
            {/* Background with Parallax */}
            <motion.div
                style={{ y, scale }}
                className="absolute inset-0 w-full h-full"
            >
                <img
                    className="w-full h-full object-cover"
                    src="/legacy/concierge/images/concierge-feature.png"
                    alt="Concierge Feature"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#0A1128]/40 via-transparent to-[#0A1128]" />
                <div className="absolute inset-0 bg-black/20" />
            </motion.div>

            {/* Content Overlay */}
            <div className="relative h-full container mx-auto px-4 flex flex-col justify-center items-center text-center z-[1]">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className="max-w-4xl"
                >
                    <span className="block text-white/80 uppercase tracking-[0.3em] text-xs md:text-sm mb-6 font-montserrat">
                        Excellence in every detail
                    </span>
                    <h1 className="text-6xl md:text-8xl lg:text-[100px] font-playfair font-bold text-white tracking-tight mb-8 leading-tight">
                        Concierge
                    </h1>
                    <div className="w-24 h-px bg-white/30 mx-auto mb-8" />
                </motion.div>
            </div>

            {/* Scroll Indicator */}
            <motion.div
                style={{ opacity }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5, duration: 1 }}
                className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 z-20"
            >
                <span className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-montserrat">Scroll to explore</span>
                <div className="w-px h-12 bg-gradient-to-b from-white/40 to-transparent" />
            </motion.div>
        </section>
    );
};
