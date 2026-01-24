"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { ArrowRight } from "lucide-react"; // Using standard Lucide arrow

export const PropertyGallery = ({ images }: { images: string[] }) => {
    const targetRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: targetRef,
    });

    // Transform vertical scroll progress into horizontal movement
    // Increased height to 300vh to slow down the scroll speed as requested
    const x = useTransform(scrollYProgress, [0, 1], ["1%", "-80%"]);

    return (
        <section ref={targetRef} className="relative h-[300vh] bg-navy-950">
            <div className="sticky top-0 flex h-screen items-center overflow-hidden">
                <motion.div style={{ x }} className="flex gap-10 px-20 items-center">

                    {/* Title Card */}
                    <div className="flex-shrink-0 w-[400px] h-[600px] flex flex-col justify-center">
                        <span className="text-gold-400 uppercase tracking-widest text-sm mb-4">Visual Journey</span>
                        <h2 className="text-6xl font-playfair text-white leading-tight">
                            Explore the <br />
                            <span className="italic text-white/50">Details.</span>
                        </h2>
                        <p className="text-white/60 mt-8 max-w-xs">
                            Scroll down to explore the residence.
                        </p>
                        <div className="mt-12 flex items-center gap-4 text-white/40 text-sm">
                            <span className="animate-pulse">↓ Scroll to Explore</span>
                        </div>
                    </div>

                    {/* Images */}
                    {images.map((img, i) => (
                        <div key={i} className="group relative h-[600px] w-[800px] flex-shrink-0 overflow-hidden rounded-xl bg-white/5 shadow-2xl">
                            <Image
                                src={img}
                                alt={`Gallery Image ${i + 1}`}
                                fill
                                className="object-cover transition-transform duration-700 group-hover:scale-105"
                                sizes="(max-width: 768px) 100vw, 800px"
                            />
                            <div className="absolute inset-0 bg-black/10 transition-opacity group-hover:opacity-0" />
                        </div>
                    ))}

                    {/* "See More" Card */}
                    <div className="group relative h-[600px] w-[400px] flex-shrink-0 flex items-center justify-center overflow-hidden rounded-xl bg-white/5 border border-white/10 hover:border-gold-400/50 hover:bg-white/5 transition-all cursor-pointer">
                        <div className="text-center group-hover:scale-110 transition-transform duration-500 p-8">
                            <span className="block text-5xl font-playfair text-white mb-4">See More<br />Images</span>
                            <span className="text-gold-400 text-sm tracking-widest uppercase flex items-center justify-center gap-2">
                                ({images.length}) <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </span>
                        </div>
                    </div>

                </motion.div>
            </div>
        </section>
    );
};
