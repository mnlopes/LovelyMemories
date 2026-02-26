"use client";

import React from "react";
import { motion } from "framer-motion";
import { Sparkles, MapPin, ShieldCheck } from "lucide-react";

interface Highlight {
    image?: string;
    text: {
        en: string;
        pt: string;
        he: string;
    };
}

interface PropertyHighlightsProps {
    highlights?: Highlight[];
    locale?: string;
}

const DEFAULT_HIGHLIGHTS = [
    {
        title: { en: "Architectural Gem", pt: "Joia Arquitetónica", he: "פנינה אדריכלית" },
        description: { en: "A unique space designed with a perfect blend of modern comfort and classic Porto charm.", pt: "Um espaço único desenhado com uma mistura perfeita de conforto moderno e charme clássico do Porto.", he: "חלל ייחודי שעוצב עם שילוב מושלם של נוחות מודרנית וקסם פורטו קלאסי." },
        icon: Sparkles
    },
    {
        title: { en: "Prime Location", pt: "Localização Privilegiada", he: "מיקום מרכזי" },
        description: { en: "Steps away from the most iconic landmarks, restaurants, and hidden local treasures.", pt: "A poucos passos dos marcos mais icónicos, restaurantes e tesouros locais escondidos.", he: "במרחק צעדים ספורים מנקודות הציון האייקוניות ביותר, מסעדות ואוצרות מקומיים נסתרים." },
        icon: MapPin
    },
    {
        title: { en: "Exceptional Comfort", pt: "Conforto Excecional", he: "נוחות יוצאת דופן" },
        description: { en: "Premium linens, curated furniture, and a quiet atmosphere for a restful stay.", pt: "Lençóis premium, mobiliário curado e uma atmosfera tranquila para uma estadia repousante.", he: "מצעים יוקרתיים, ריהוט אוצר ואווירה שקטה לשהייה רגועה." },
        icon: ShieldCheck
    }
];

export const PropertyHighlights = ({ highlights, locale = 'en' }: PropertyHighlightsProps) => {
    const activeLang = locale as 'en' | 'pt' | 'he';
    const displayHighlights = highlights && highlights.length > 0
        ? highlights.map(h => ({
            title: h.text[activeLang] || h.text.en,
            description: "", // The new schema uses a single text field for highlights often, or simple lists
            image: h.image,
            icon: Sparkles
        }))
        : DEFAULT_HIGHLIGHTS.map(h => ({
            title: h.title[activeLang] || h.title.en,
            description: h.description[activeLang] || h.description.en,
            image: null,
            icon: h.icon
        }));

    return (
        <section className="py-24 bg-white">
            <h3 className="text-[11px] font-extrabold text-[#AD9C7E] uppercase tracking-[0.4em] mb-12">Property Highlights</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {displayHighlights.map((hl, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: i * 0.1 }}
                        className="bg-[#FBFBFA] p-10 rounded-[32px] border border-[#F1F0EC] hover:border-[#AD9C7E]/30 transition-all duration-500 group"
                    >
                        <div className="w-14 h-14 rounded-full bg-white border border-[#F1F0EC] flex items-center justify-center mb-8 shadow-sm group-hover:scale-110 transition-transform duration-500 overflow-hidden">
                            {hl.image ? (
                                <img src={hl.image} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <hl.icon className="w-6 h-6 text-[#AD9C7E]" />
                            )}
                        </div>
                        <h4 className="text-xl font-bold text-navy-950 mb-4 font-playfair">{hl.title}</h4>
                        {hl.description && (
                            <p className="text-navy-950/60 leading-relaxed font-medium">
                                {hl.description}
                            </p>
                        )}
                    </motion.div>
                ))}
            </div>
        </section>
    );
};
