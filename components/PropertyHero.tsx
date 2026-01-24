"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { useRef } from "react";

interface PropertyHeroProps {
    title: string;
    image: string;
    location: string;
}

export const PropertyHero = ({ title, image, location }: PropertyHeroProps) => {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start start", "end start"],
    });

    const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
    const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

    return (
        <div ref={ref} className="relative h-[80vh] min-h-[600px] overflow-hidden">
            <motion.div style={{ y }} className="absolute inset-0 w-full h-full bg-navy-900">
                {image && (
                    <Image
                        src={image}
                        alt={title}
                        fill
                        priority
                        unoptimized
                        className="object-cover"
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/20 to-transparent" />
            </motion.div>

            <motion.div
                style={{ opacity }}
                className="absolute bottom-0 left-0 w-full p-6 md:p-12 z-10"
            >
                <div className="container mx-auto">
                    <span className="inline-block px-4 py-1 mb-4 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white/80 text-sm uppercase tracking-wider">
                        {location}
                    </span>
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-playfair font-bold text-white tracking-tight mb-4">
                        {title}
                    </h1>
                </div>
            </motion.div>
        </div>
    );
};
