"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { CmsPageSection } from "@/lib/types";

export const ConciergeCta = ({ initialSections }: { initialSections?: CmsPageSection[] }) => {
    const t = useTranslations("Concierge");
    const cta = initialSections?.find((s) => s.section_type === "cta");
    const overline = cta?.subtitle || t("ctaOverTitle");
    const title = cta?.title || t("ctaTitle");
    const description = cta?.content || t("ctaDescription");

    return (
        <section className="relative bg-navy-950 py-24 lg:py-32 overflow-hidden">
            {/* Soft gold glow accents */}
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-gold-400/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-gold-400/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="container mx-auto px-4 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="max-w-3xl mx-auto text-center flex flex-col items-center gap-6"
                >
                    <span className="text-gold-400 uppercase tracking-[0.3em] text-xs font-bold">
                        {overline}
                    </span>
                    <h2 className="text-4xl md:text-5xl font-playfair font-bold text-white leading-tight">
                        {title}
                    </h2>
                    <p className="text-white/70 text-lg font-light leading-relaxed max-w-xl">
                        {description}
                    </p>
                    <Link
                        href="/contact"
                        className="mt-4 inline-flex items-center gap-2 px-10 py-4 bg-[#B09E80] hover:bg-[#9E8C6D] text-white text-sm font-bold uppercase tracking-[0.2em] rounded-full transition-colors duration-300 shadow-lg"
                    >
                        {t("ctaButton")}
                    </Link>
                </motion.div>
            </div>
        </section>
    );
};
