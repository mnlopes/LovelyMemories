"use client";

import React from "react";
import { motion } from "framer-motion";
import { MapPin, Navigation, Coffee, ShoppingBag, Utensils, Music, Waves, ShieldCheck } from "lucide-react";

interface NearbyItem {
    name: string;
    distance?: string;
}

interface NearbyCategory {
    category: string;
    items: NearbyItem[];
}

interface PropertyNeighborhoodProps {
    location?: any;
    nearbyPlaces?: NearbyCategory[];
    locale?: string;
}

const getCategoryIcon = (category: string) => {
    const lower = category.toLowerCase();
    if (lower.includes('coffee') || lower.includes('cafe')) return Coffee;
    if (lower.includes('shop') || lower.includes('market')) return ShoppingBag;
    if (lower.includes('eat') || lower.includes('restaurant') || lower.includes('dining')) return Utensils;
    if (lower.includes('transport') || lower.includes('metro') || lower.includes('bus')) return Navigation;
    if (lower.includes('music') || lower.includes('culture')) return Music;
    if (lower.includes('wellness') || lower.includes('spa')) return Waves;
    if (lower.includes('safe') || lower.includes('security')) return ShieldCheck;
    return MapPin;
};

export const PropertyNeighborhood = ({ location, nearbyPlaces, locale = 'en' }: PropertyNeighborhoodProps) => {
    const cityName = typeof location === 'object' ? (location.city || 'Porto') : (location || 'Porto');
    const activeLang = locale as 'en' | 'pt' | 'he';

    return (
        <section className="py-24 border-t border-gray-100">
            <div className="flex flex-col lg:flex-row gap-20">
                {/* Left: Text Info */}
                <div className="w-full lg:w-[45%] space-y-10">
                    <div className="space-y-4">
                        <h3 className="text-[11px] font-extrabold text-[#AD9C7E] uppercase tracking-[0.4em]">The Neighborhood</h3>
                        <h2 className="text-4xl font-playfair font-bold text-navy-950">Living in {cityName}</h2>
                    </div>

                    <p className="text-navy-950/70 text-lg leading-relaxed font-medium">
                        {activeLang === 'pt'
                            ? "Um dos bairros mais autênticos do Porto, onde a história encontra a criatividade moderna. Passeie por ruas calcetadas para descobrir boutiques artesanais, cafés históricos e vistas deslumbrantes sobre o rio Douro."
                            : activeLang === 'he'
                                ? "אחת השכונות האותנטיות ביותר של פורטו, שבה היסטוריה פוגשת יצירתיות מודרנית. שוטטו ברחובות מרוצפים כדי לגלות בוטיקים אומנותיים, בתי קפה היסטוריים ונקודות תצפית עוצרות נשימה על נהר הדוארו."
                                : "One of Porto's most authentic neighborhoods, where history meets modern creativity. Wander through cobblestone streets to discover artisanal boutiques, historic cafes, and breathtaking viewpoints over the Douro river."
                        }
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
                        {(nearbyPlaces || []).slice(0, 4).map((cat, i) => {
                            const Icon = getCategoryIcon(cat.category);
                            return (
                                <div key={i} className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-full bg-[#FBFAF8] flex items-center justify-center text-[#AD9C7E] shrink-0 border border-gray-50">
                                        <Icon size={18} />
                                    </div>
                                    <div>
                                        <h5 className="font-bold text-navy-950 text-sm mb-1">{cat.category}</h5>
                                        <div className="space-y-1">
                                            {cat.items.slice(0, 2).map((item, j) => (
                                                <p key={j} className="text-[10px] text-navy-950/50 leading-relaxed uppercase tracking-widest font-bold">
                                                    {item.name} {item.distance ? `• ${item.distance}` : ''}
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right: Map Placeholder / Visual */}
                <div className="w-full lg:w-[55%]">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="relative h-[400px] lg:h-[500px] rounded-[40px] overflow-hidden shadow-2xl bg-gray-100 border border-gray-100"
                    >
                        {/* Placeholder for an actual map integration */}
                        <div className="absolute inset-0 bg-[#E5E3DF] flex flex-col items-center justify-center p-12 text-center">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg mb-6">
                                <MapPin className="text-[#AD9C7E]" size={32} />
                            </div>
                            <h4 className="text-xl font-bold text-navy-950 mb-2">{cityName}, Porto</h4>
                            <p className="text-navy-950/40 text-sm max-w-xs font-medium">
                                {activeLang === 'pt' ? "Localização exata fornecida após a reserva." : activeLang === 'he' ? "מיקום מדויק יינתן לאחר ההזמנה." : "Exact location provided after booking for privacy."}
                            </p>
                        </div>

                        {/* Decorative UI elements to make it look like a map */}
                        <div className="absolute bottom-6 right-6 flex flex-col gap-2">
                            <button className="w-12 h-12 bg-white rounded-xl shadow-lg flex items-center justify-center text-navy-950 font-bold text-xl">+</button>
                            <button className="w-12 h-12 bg-white rounded-xl shadow-lg flex items-center justify-center text-navy-950 font-bold text-xl">−</button>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};
