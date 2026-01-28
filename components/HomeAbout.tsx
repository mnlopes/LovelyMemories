"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

export const HomeAbout = () => {
    const t = useTranslations('Home');
    const sectionRef = useRef(null);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Track scroll progress of the section relative to the viewport
    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ["start end", "center center"]
    });

    // Desktop: Original Premium Feel (0.85 -> 1)
    const scaleDesktop = useTransform(scrollYProgress, [0, 1], [0.85, 1]);

    // Mobile: Massive Growth Request (0.85 -> 1.5)
    const scaleMobile = useTransform(scrollYProgress, [0, 1], [0.85, 1.5]);

    // Opacity fade in for smoothness
    const opacity = useTransform(scrollYProgress, [0, 0.3], [0, 1]);

    return (
        <section ref={sectionRef} className="section-block relative py-24 bg-white">
            <div className="container mx-auto px-4">
                {/* Banner Card Container - Rounded & Overflow Hidden with Scale Animation */}
                <motion.div
                    style={{ scale: isMobile ? scaleMobile : scaleDesktop, opacity }}
                    className="relative w-full rounded-[30px] overflow-hidden min-h-[500px] md:min-h-[600px] flex items-center shadow-lg"
                >
                    {/* Background Image - Absolute */}
                    <div className="absolute inset-0 w-full h-full">
                        <Image
                            src="/legacy/home/images/about-us-section-image.png"
                            alt="Porto Landscape"
                            fill
                            sizes="(max-width: 768px) 100vw, 80vw"
                            className="object-cover object-center"
                        />
                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-transparent md:bg-none"></div>
                    </div>

                    {/* Content Overlay */}
                    <div className="relative z-10 w-full md:w-8/12 lg:w-6/12 p-8 md:p-16 lg:p-20 text-center md:text-left">
                        <div className="space-y-6">
                            {/* Title */}
                            <h2 className="text-3xl md:text-4xl lg:text-[42px] font-bold leading-tight font-[family-name:var(--font-montserrat)] text-white drop-shadow-sm">
                                {t('aboutTitle')}
                            </h2>

                            {/* Description */}
                            <p className="text-white text-base md:text-lg leading-relaxed font-normal drop-shadow-sm max-w-xl mx-auto md:mx-0">
                                {t('aboutDescription')}
                            </p>

                            {/* Button */}
                            <div className="pt-2">
                                <Link
                                    href="/about-us"
                                    className="inline-block px-8 py-3 bg-white text-[#0A1128] rounded-full font-bold text-xs md:text-sm tracking-[0.15em] uppercase hover:bg-[#f0f0f0] hover:scale-105 transition-all duration-300 shadow-md"
                                >
                                    {t('aboutButton')}
                                </Link>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};
