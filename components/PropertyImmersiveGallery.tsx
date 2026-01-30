"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Grid, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface PropertyImmersiveGalleryProps {
    images: string[];
    title: string;
}

export const PropertyImmersiveGallery = ({ images, title }: PropertyImmersiveGalleryProps) => {
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    // Plum Guide often uses a grid of 5: 1 big + 4 small
    const displayImages = images.slice(0, 5);
    const remainingCount = images.length - 5;

    const openLightbox = (index: number) => {
        setCurrentImageIndex(index);
        setIsLightboxOpen(true);
    };

    const nextImage = () => setCurrentImageIndex((prev) => (prev + 1) % images.length);
    const prevImage = () => setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);

    return (
        <section className="relative w-full bg-white pb-4">
            {/* Desktop Grid Layout */}
            <div className="hidden md:grid grid-cols-4 grid-rows-2 gap-2 h-[600px] lg:h-[750px] overflow-hidden">
                {/* Main Large Image */}
                <div
                    className="col-span-2 row-span-2 relative cursor-pointer group overflow-hidden"
                    onClick={() => openLightbox(0)}
                >
                    <Image
                        src={images[0]}
                        alt={`${title} - 1`}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                        priority
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-500" />
                </div>

                {/* Smaller Images */}
                {displayImages.slice(1, 5).map((img, idx) => (
                    <div
                        key={idx}
                        className="relative cursor-pointer group overflow-hidden"
                        onClick={() => openLightbox(idx + 1)}
                    >
                        <Image
                            src={img}
                            alt={`${title} - ${idx + 2}`}
                            fill
                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-500" />

                        {/* "See all" Overlay on the last image */}
                        {idx === 3 && remainingCount > 0 && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white">
                                <span className="flex items-center gap-2 font-bold uppercase tracking-widest text-sm">
                                    <Grid size={20} />
                                    +{remainingCount} Photos
                                </span>
                            </div>
                        )}
                    </div>
                ))}

                {/* View Photos Button Overlay */}
                <button
                    onClick={() => openLightbox(0)}
                    className="absolute bottom-10 right-10 bg-white/90 backdrop-blur-md px-6 py-3 rounded-full text-navy-950 font-bold text-sm flex items-center gap-2 shadow-xl hover:bg-white transition-all transform hover:-translate-y-1"
                >
                    <Grid size={18} />
                    View all {images.length} photos
                </button>
            </div>

            {/* Mobile Carousel/Scroll */}
            <div className="md:hidden relative h-[450px] overflow-x-auto flex snap-x snap-mandatory hide-scrollbar">
                {images.map((img, idx) => (
                    <div
                        key={idx}
                        className="flex-shrink-0 w-full h-full relative snap-center"
                        onClick={() => openLightbox(idx)}
                    >
                        <Image
                            src={img}
                            alt={`${title} - ${idx + 1}`}
                            fill
                            className="object-cover"
                        />
                    </div>
                ))}
                <div className="absolute bottom-6 right-6 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full text-white text-xs font-bold">
                    {currentImageIndex + 1} / {images.length}
                </div>
            </div>

            {/* Lightbox / Fullscreen Gallery */}
            <AnimatePresence>
                {isLightboxOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center pt-20 pb-10"
                    >
                        <button
                            className="absolute top-10 right-10 text-white/70 hover:text-white transition-colors"
                            onClick={() => setIsLightboxOpen(false)}
                        >
                            <X size={40} />
                        </button>

                        <div className="relative w-full h-full max-w-6xl px-10 flex items-center justify-center">
                            <motion.div
                                key={currentImageIndex}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="relative w-full h-full"
                            >
                                <Image
                                    src={images[currentImageIndex]}
                                    alt={`${title} Full - ${currentImageIndex + 1}`}
                                    fill
                                    className="object-contain"
                                />
                            </motion.div>

                            <button
                                className="absolute left-4 text-white p-4 hover:bg-white/10 rounded-full transition-all"
                                onClick={prevImage}
                            >
                                <ChevronLeft size={48} />
                            </button>
                            <button
                                className="absolute right-4 text-white p-4 hover:bg-white/10 rounded-full transition-all"
                                onClick={nextImage}
                            >
                                <ChevronRight size={48} />
                            </button>
                        </div>

                        <div className="mt-8 text-white/50 text-sm font-medium tracking-widest uppercase selection:hidden">
                            {currentImageIndex + 1} of {images.length} — {title}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
};
