"use client";

import React from "react";
import { motion } from "framer-motion";
import { Sparkles, MapPin, ShieldCheck, Zap } from "lucide-react";

interface Highlight {
    title: string;
    description: string;
    icon: React.ElementType;
}

const DEFAULT_HIGHLIGHTS: Highlight[] = [
    {
        title: "Architectural Gem",
        description: "A unique space designed with a perfect blend of modern comfort and classic Porto charm.",
        icon: Sparkles
    },
    {
        title: "Prime Location",
        description: "Steps away from the most iconic landmarks, restaurants, and hidden local treasures.",
        icon: MapPin
    },
    {
        title: "Exceptional Comfort",
        description: "Premium linens, curated furniture, and a quiet atmosphere for a restful stay.",
        icon: ShieldCheck
    }
];

export const PropertyHighlights = () => {
    return (
        <section className="py-24 bg-white">
            <h3 className="text-[11px] font-extrabold text-[#AD9C7E] uppercase tracking-[0.4em] mb-12">Property Highlights</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {DEFAULT_HIGHLIGHTS.map((hl, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: i * 0.1 }}
                        className="bg-[#FBFBFA] p-10 rounded-[32px] border border-[#F1F0EC] hover:border-[#AD9C7E]/30 transition-all duration-500 group"
                    >
                        <div className="w-14 h-14 rounded-full bg-white border border-[#F1F0EC] flex items-center justify-center mb-8 shadow-sm group-hover:scale-110 transition-transform duration-500">
                            <hl.icon className="w-6 h-6 text-[#AD9C7E]" />
                        </div>
                        <h4 className="text-xl font-bold text-navy-950 mb-4 font-playfair">{hl.title}</h4>
                        <p className="text-navy-950/60 leading-relaxed font-medium">
                            {hl.description}
                        </p>
                    </motion.div>
                ))}
            </div>
        </section>
    );
};
