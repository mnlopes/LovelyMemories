"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, useScroll, useTransform } from "framer-motion";

export const PropertyOwnerSection = () => {
    const [container, setContainer] = useState<HTMLElement | null>(null);
    const scrollRef = useRef(null);

    const { scrollYProgress } = useScroll({
        target: scrollRef,
        offset: ["start end", "end start"]
    });

    // Parallax effects
    const y1 = useTransform(scrollYProgress, [0, 1], [0, 80]);    // Esquerda (Quarto) - Desce
    const y2 = useTransform(scrollYProgress, [0, 1], [0, -120]); // Direita (Secundária) - Sobe
    const y3 = useTransform(scrollYProgress, [0, 1], [0, 150]);  // Topo (Detalhe) - Desce

    useEffect(() => {
        const originalSection = document.querySelector('.section-block.section-owner') as HTMLElement;
        if (originalSection) {
            originalSection.innerHTML = '';
            originalSection.style.padding = '0';
            originalSection.style.background = 'transparent';
            setContainer(originalSection);
        }
    }, []);

    if (!container) return null;

    return createPortal(
        <div ref={scrollRef} className="relative w-full overflow-hidden bg-[#0A1128] py-24 md:py-32 h-[800px] md:h-[900px]">
            {/* Background Decorativo e Ajustes */}

            <div className="container mx-auto px-4 relative z-10">
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-center">
                    <div className="hidden xl:block xl:col-span-2"></div>
                    <div className="col-span-1 xl:col-span-8 text-center xl:text-left text-white">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="space-y-6"
                        >
                            <span className="text-lg font-light tracking-wide text-gray-300">Are you a Property Owner?</span>
                            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight font-playfair">
                                Unleash your <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#c5a059] to-[#ebd5a0]">
                                    property's potential
                                </span>
                            </h2>
                            <h6 className="text-lg md:text-xl font-light text-gray-300 max-w-2xl mx-auto xl:mx-0 leading-relaxed">
                                We know what it takes to be the best.<br />
                                Find out what distinguishes us from the rest.
                            </h6>
                            <motion.div className="pt-4" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <a href="/owner" className="inline-block px-10 py-4 bg-white text-[#0A1128] rounded-full font-bold uppercase tracking-widest hover:bg-[#c5a059] hover:text-white transition-all duration-300 shadow-lg">
                                    Discover
                                </a>
                            </motion.div>
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Imagens Flutuantes com Parallax Nativo */}

            {/* 1. Imagem Esquerda (Quarto) - 400x400 */}
            <motion.div
                className="absolute top-[10%] left-[-5%] md:left-[2%] w-[320px] h-[320px] md:!w-[400px] md:!h-[400px] rounded-2xl overflow-hidden shadow-2xl z-10"
                style={{ y: y1, rotate: 6 }}
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 1 }}
            >
                <img src="/legacy/home/images/owner-section-image-1.png" alt="Bedroom 400x400" className="w-full h-full object-cover" />
            </motion.div>

            {/* 2. Imagem Direita (Secundária) - 400x400 */}
            <motion.div
                className="absolute bottom-[5%] right-[-5%] md:right-[8%] w-[300px] h-[300px] md:!w-[400px] md:!h-[400px] rounded-2xl overflow-hidden shadow-2xl z-20"
                style={{ y: y2, rotate: -3 }}
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 0.2 }}
            >
                <img src="/legacy/home/images/owner-section-image-2.png" alt="Detail 400x400" className="w-full h-full object-cover" />
            </motion.div>

            {/* 3. Imagem Topo Direita (WC/Detalhe) - 300x450 */}
            <motion.div
                className="absolute top-[-5%] right-[-10%] md:right-[-2%] w-[250px] h-[350px] md:!w-[300px] md:!h-[450px] rounded-2xl overflow-hidden shadow-2xl opacity-80 z-0 hidden lg:block"
                style={{ y: y3 }}
                initial={{ opacity: 0, y: -100 }}
                whileInView={{ opacity: 0.8, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 1.2 }}
            >
                <img src="/legacy/home/images/owner-section-image-3.png" alt="Bathroom 300x450" className="w-full h-full object-cover" />
            </motion.div>

        </div>,
        container
    );
};
