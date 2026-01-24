"use client";

import { motion } from "framer-motion";
import { Section } from "./ui/Section";
import { Wifi, ChefHat, Tv, ShieldCheck, Wind, Coffee } from "lucide-react";
import { GlassCard } from "./ui/GlassCard";

const HIGHLIGHTS = [
    { label: "Bedrooms", value: "4", sub: "Master + 3 Guest Suites" },
    { label: "Bathrooms", value: "5", sub: "Spa-inspired features" },
    { label: "Guests", value: "8", sub: "Comfortable capacity" },
];

const AMENITIES = [
    { icon: Wifi, label: "High-Speed Fiber" },
    { icon: ChefHat, label: "Gourmet Kitchen" },
    { icon: Tv, label: "Cinema Room" },
    { icon: Wind, label: "Climate Control" },
    { icon: ShieldCheck, label: "24/7 Security" },
    { icon: Coffee, label: "Morning Service" },
];

export const HomeHighlights = () => {
    return (
        <Section className="bg-navy-950">
            <div className="flex flex-col gap-20">

                {/* Highlights Row */}
                <div>
                    <h3 className="text-center font-playfair text-3xl text-white mb-12">Home Highlights</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {HIGHLIGHTS.map((item, i) => (
                            <GlassCard key={i} className="flex flex-col items-center text-center py-10 bg-white/5 border-white/10 hover:border-gold-400/30">
                                <span className="text-5xl font-playfair text-gold-400 mb-2">{item.value}</span>
                                <span className="text-lg font-medium text-white mb-1">{item.label}</span>
                                <span className="text-sm text-white/50">{item.sub}</span>
                            </GlassCard>
                        ))}
                    </div>
                </div>

                {/* Amenities Grid */}
                <div>
                    <h3 className="text-center font-playfair text-sm uppercase tracking-widest text-gold-400 mb-12">Curated Amenities</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {AMENITIES.map((item, i) => (
                            <motion.div
                                key={i}
                                whileHover={{ scale: 1.05 }}
                                className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white/5 border border-white/5 hover:bg-gold-400/10 hover:border-gold-400/30 transition-all cursor-default"
                            >
                                <item.icon className="w-6 h-6 text-gold-400 mb-3" />
                                <span className="text-sm text-white/80 text-center">{item.label}</span>
                            </motion.div>
                        ))}
                    </div>
                </div>

            </div>
        </Section>
    );
};
