"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

export const PropertyOwnerSection = () => {
    const t = useTranslations('OwnerSection');
    const scrollRef = useRef(null);

    const { scrollYProgress } = useScroll({
        target: scrollRef,
        offset: ["start end", "end start"]
    });

    // Smooth Scroll for "Premium Feel"
    const smoothY = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    // Parallax effects
    const y1 = useTransform(smoothY, [0, 1], [0, -25]);  // Esquerda (Quarto) - Sobe Levemente
    const y2 = useTransform(smoothY, [0, 1], [0, -35]);  // Direita (Secundária) - Sobe Levemente
    const y3 = useTransform(smoothY, [0, 1], [0, 40]);   // Topo (Detalhe) - Desce Levemente

    return (
        <section ref={scrollRef} className="section-block section-owner relative w-full bg-[#0A1128] py-16 lg:py-12 h-auto lg:h-[500px] z-10">
            <div className="absolute inset-0 w-full h-full">
                {/* Background Decorativo e Ajustes */}

                <div className="container mx-auto px-4 relative z-10 h-full flex items-center">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center w-full">
                        {/* Left Spacer - Restored to prevent overlap with left image */}
                        <div className="hidden lg:block lg:col-span-4 xl:col-span-3"></div>

                        {/* Text Content - Using negative margin to shift left slightly without breaking grid alignment */}
                        <div className="col-span-1 lg:col-span-8 xl:col-span-9 text-left text-white z-30 relative lg:-ml-12 xl:-ml-16">
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-100px" }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                                className="space-y-6"
                            >
                                <span className="text-lg font-light tracking-wide text-gray-300">{t('question')}</span>
                                {/* USER REQUEST: Montserrat Font & Specific Style (36px, 700) */}
                                <h2 className="text-[32px] md:text-[36px] !font-bold leading-[1.2] font-[family-name:var(--font-montserrat)] text-white">
                                    {t.rich('title', {
                                        br: () => <br />
                                    })}
                                </h2>
                                <h6 className="text-base md:text-xl font-light text-gray-300 max-w-lg leading-relaxed">
                                    {t.rich('subtitle', {
                                        br: () => <br />
                                    })}
                                </h6>
                                <div className="pt-4">
                                    <Link
                                        href="/owner"
                                        className="inline-block px-10 py-4 bg-white text-[#0A1128] rounded-full font-bold uppercase tracking-widest hover:bg-[#b09e80] hover:text-white transition-colors duration-300 shadow-lg text-sm md:text-base"
                                    >
                                        {t('button')}
                                    </Link>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>

                {/* Imagens Flutuantes com Parallax Nativo */}

                {/* 1. Imagem Esquerda (Quarto) */}
                <motion.div
                    className="absolute z-10 overflow-hidden rounded-2xl hidden lg:block w-[300px] h-[300px] xl:w-[360px] xl:h-[360px] 2xl:w-[450px] 2xl:h-[450px]"
                    style={{
                        y: y1,
                        left: '-2%',
                        top: '-10%',
                    }}
                >
                    <div className="w-full h-full relative">
                        <Image src="/legacy/home/images/owner-section-image-1.png" alt="Luxury Interior" fill sizes="450px" className="object-cover" />
                    </div>
                </motion.div>

                {/* 2. Imagem Baixo Direita (Secundária - em baixo) */}
                <motion.div
                    className="absolute z-10 overflow-hidden rounded-2xl hidden lg:block w-[250px] h-[250px] xl:w-[320px] xl:h-[320px] 2xl:w-[400px] 2xl:h-[400px]"
                    style={{
                        y: y2, // Moves UP
                        left: '68%', // Increased offset to accommodate long text
                        top: '30%',
                    }}
                >
                    <div className="w-full h-full relative">
                        <Image src="/legacy/home/images/owner-section-image-2.png" alt="Living Room" fill sizes="400px" className="object-cover" />
                    </div>
                </motion.div>

                {/* 3. Imagem Cima Direita (WC/Detalhe) */}
                <motion.div
                    className="absolute z-20 overflow-hidden rounded-2xl hidden lg:block w-[200px] h-[300px] xl:w-[250px] xl:h-[375px] 2xl:w-[300px] 2xl:h-[450px]"
                    style={{
                        y: y3, // Moves DOWN
                        left: '82%', // Increased offset to accommodate long text
                        top: '-10%',
                    }}
                >
                    <div className="w-full h-full relative">
                        <Image src="/legacy/home/images/owner-section-image-3.png" alt="Detail" fill sizes="300px" className="object-cover" />
                    </div>
                </motion.div>
            </div>
        </section>
    );
};
