"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import Image from "next/image";
import { MapPin, Maximize, Bed, Bath } from "lucide-react";

const PROPERTIES = [
    {
        id: 1,
        title: "Villa Serenity",
        location: "Cascais, Portugal",
        price: "€4,500,000",
        image: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?q=80&w=2071&auto=format&fit=crop",
        specs: { beds: 5, baths: 6, area: "650m²" }
    },
    {
        id: 2,
        title: "Ocean Breeze Penthouse",
        location: "Algarve, Portugal",
        price: "€2,800,000",
        image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop",
        specs: { beds: 3, baths: 3, area: "280m²" }
    },
    {
        id: 3,
        title: "Douro Valley Estate",
        location: "Douro, Portugal",
        price: "€6,200,000",
        image: "https://images.unsplash.com/photo-1600596542815-e32c8cc22ebe?q=80&w=2070&auto=format&fit=crop",
        specs: { beds: 8, baths: 8, area: "1200m²" }
    }
];

export const PropertyCarousel = () => {
    const targetRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: targetRef,
    });

    const x = useTransform(scrollYProgress, [0, 1], ["1%", "-65%"]);

    return (
        <div ref={targetRef} className="relative h-[300vh] bg-navy-950">
            <div className="sticky top-0 flex h-screen items-center overflow-hidden">
                <div className="absolute top-10 left-10 z-20">
                    <h2 className="text-4xl md:text-6xl font-playfair font-bold text-white mb-4">
                        Exclusive <span className="text-gradient-gold">Collection</span>
                    </h2>
                    <p className="text-white/60 max-w-sm">Curated selection of the finest properties in Portugal.</p>
                </div>

                <motion.div style={{ x }} className="flex gap-12 px-20">
                    {PROPERTIES.map((property) => (
                        <GlassCard
                            key={property.id}
                            className="w-[85vw] md:w-[60vw] h-[70vh] flex-shrink-0 p-0 relative overflow-hidden group border-white/5 bg-navy-900/40"
                        >
                            <Image
                                src={property.image}
                                alt={property.title}
                                fill
                                className="object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/20 to-transparent opacity-90" />

                            <div className="absolute bottom-0 left-0 p-8 md:p-12 w-full">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <div className="flex items-center gap-2 text-gold-300 mb-2 text-sm tracking-wider uppercase">
                                            <MapPin className="w-4 h-4" />
                                            {property.location}
                                        </div>
                                        <h3 className="text-3xl md:text-5xl font-playfair font-bold text-white mb-4">{property.title}</h3>
                                        <div className="flex gap-6 text-white/80 mb-8">
                                            <span className="flex items-center gap-2"><Bed className="w-4 h-4" /> {property.specs.beds} Beds</span>
                                            <span className="flex items-center gap-2"><Bath className="w-4 h-4" /> {property.specs.baths} Baths</span>
                                            <span className="flex items-center gap-2"><Maximize className="w-4 h-4" /> {property.specs.area}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl md:text-4xl font-playfair text-gold-200 mb-6">{property.price}</p>
                                        <Button className="bg-white text-navy-950 hover:bg-gold-50 border-none">View Details</Button>
                                    </div>
                                </div>
                            </div>
                        </GlassCard>
                    ))}
                </motion.div>
            </div>
        </div>
    );
};
