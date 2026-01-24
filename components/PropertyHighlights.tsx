"use client";

import { motion } from "framer-motion";
import { GlassCard } from "./ui/GlassCard";
import { Wifi, ChefHat, Tv, ShieldCheck, Wind, Coffee, Car, MapPin, LucideIcon } from "lucide-react";

// Icon Mapping
const ICON_MAP: Record<string, LucideIcon> = {
    "wifi": Wifi,
    "kitchen": ChefHat,
    "cinema": Tv,
    "ac": Wind,
    "security": ShieldCheck,
    "coffee": Coffee,
    "parking": Car,
    "location": MapPin
};

interface HighlightItem {
    label: string;
    value: string;
    sub: string;
}

interface AmenityItem {
    icon: string; // Changed from LucideIcon to string
    label: string;
}

interface PropertyHighlightsProps {
    highlights: HighlightItem[];
    amenities: AmenityItem[];
}

export const PropertyHighlights = ({ highlights, amenities }: PropertyHighlightsProps) => {
    return (
        <div className="flex flex-col gap-12 py-12">

            {/* Highlights Row */}
            <div className="grid grid-cols-3 gap-4">
                {highlights.map((item, i) => (
                    <GlassCard key={i} className="flex flex-col items-center text-center py-6 px-2 bg-white/5 border-white/10">
                        <span className="text-3xl md:text-4xl font-playfair text-gold-400 mb-1">{item.value}</span>
                        <span className="text-sm font-medium text-white mb-0.5">{item.label}</span>
                        <span className="text-[10px] md:text-xs text-white/50">{item.sub}</span>
                    </GlassCard>
                ))}
            </div>

            {/* Amenities Grid */}
            <div>
                <h3 className="font-playfair text-xl text-white mb-6">World-Class Amenities</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {amenities.map((item, i) => {
                        const Icon = ICON_MAP[item.icon] || Wifi; // Fallback
                        return (
                            <motion.div
                                key={i}
                                whileHover={{ scale: 1.02 }}
                                className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-gold-400/30 transition-colors"
                            >
                                <Icon className="w-5 h-5 text-gold-400" />
                                <span className="text-sm text-white/80">{item.label}</span>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

        </div>
    );
};
