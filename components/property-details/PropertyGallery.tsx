"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Grid, X, ArrowLeft } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";

interface PropertyGalleryProps {
    images: string[];
    title: string;
    metadata: {
        guests: number;
        bedrooms: number;
        beds: number;
        bathrooms: number;
        area: number;
    };
}

type GalleryState = "closed" | "grid" | "slider";

export function PropertyGallery({ images, title, metadata }: PropertyGalleryProps) {
    const t = useTranslations('PropertyDetail');
    const [viewState, setViewState] = useState<GalleryState>("closed");
    const [activeIndex, setActiveIndex] = useState(0);

    // Lock scroll when gallery is open
    useEffect(() => {
        if (viewState !== "closed") {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => { document.body.style.overflow = "unset"; };
    }, [viewState]);

    const mainImage = images[0] || "/placeholder.svg";
    const secondaryImage = images[1] || mainImage;

    const nextImage = () => setActiveIndex((prev) => (prev + 1) % images.length);
    const prevImage = () => setActiveIndex((prev) => (prev - 1 + images.length) % images.length);

    const openGrid = () => setViewState("grid");
    const closeGallery = () => setViewState("closed");
    const openSlider = (index: number) => {
        setActiveIndex(index);
        setViewState("slider");
    };

    return (
        <>
            {/* Page Gallery Grid */}
            <div className="relative grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-3 h-[450px] md:h-[520px] overflow-hidden rounded-2xl">
                <div
                    className="md:col-span-2 md:row-span-2 relative overflow-hidden cursor-pointer group"
                    onClick={() => openSlider(0)}
                >
                    <Image
                        src={mainImage}
                        alt={`${title} - 1`}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 50vw"
                        priority
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </div>

                <div
                    className="hidden md:block col-span-2 row-span-2 relative overflow-hidden cursor-pointer group"
                    onClick={() => openSlider(1)}
                >
                    <Image
                        src={secondaryImage}
                        alt={`${title} - 2`}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                        sizes="50vw"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </div>

                <Button
                    variant="outline"
                    onClick={openGrid}
                    className="absolute bottom-5 right-5 bg-white/95 backdrop-blur-md border-0 shadow-lg hover:bg-white text-navy-950 gap-2 rounded-full px-5 z-10"
                >
                    <Grid className="h-4 w-4" />
                    {t('viewAllPhotos', { count: images.length })}
                </Button>
            </div>

            <AnimatePresence>
                {/* Step 1: Grid View */}
                {viewState === "grid" && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="fixed inset-0 z-[99999] bg-white overflow-y-auto flex flex-col"
                    >
                        {/* Sticky Header */}
                        <div className="sticky top-0 bg-white/80 backdrop-blur-md z-20 px-6 py-6 border-b border-[#E1E6EC]">
                            <div className="max-w-7xl mx-auto flex items-start justify-between">
                                <div className="space-y-1">
                                    <h2 className="text-3xl font-bold text-navy-950 font-montserrat">{title}</h2>
                                    <p className="text-navy-900/40 text-sm font-medium">
                                        {t('sleepsUpTo', { count: metadata.guests })} • {t('bedroomsCount', { count: metadata.bedrooms })}, {t('bathroomsCount', { count: metadata.bathrooms })} • {metadata.area} m²
                                    </p>
                                </div>
                                <button
                                    onClick={closeGallery}
                                    className="p-3 rounded-full hover:bg-gray-100 transition-colors"
                                >
                                    <X className="h-6 w-6 text-navy-950" />
                                </button>
                            </div>
                        </div>

                        {/* Photo Grid with Pattern (3 Small, 1 Large) */}
                        <div className="max-w-6xl mx-auto w-full px-6 py-12 grid grid-cols-3 gap-4 md:gap-6">
                            {images.map((img, idx) => {
                                // Pattern: 3 small (col-span-1), 1 large (col-span-3)
                                const isLarge = idx % 4 === 3;

                                return (
                                    <motion.div
                                        key={idx}
                                        layoutId={`img-${idx}`}
                                        className={`relative cursor-pointer overflow-hidden group rounded-lg ${isLarge ? "col-span-3 aspect-video" : "col-span-1 aspect-[4/5] md:aspect-square"
                                            }`}
                                        onClick={() => openSlider(idx)}
                                    >
                                        <Image
                                            src={img}
                                            alt={`${title} - ${idx + 1}`}
                                            fill
                                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                                            sizes={isLarge ? "100vw" : "33vw"}
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                    </motion.div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}

                {/* Step 2: Full-screen Slider */}
                {viewState === "slider" && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100000] bg-white flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 md:p-6">
                            <button
                                onClick={() => setViewState("grid")}
                                className="flex items-center gap-2 text-navy-950 font-bold px-4 py-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <ArrowLeft className="h-5 w-5" />
                                <span className="hidden md:inline">{t('backToGrid')}</span>
                            </button>
                            <span className="text-sm font-bold text-navy-950">{activeIndex + 1} / {images.length}</span>
                            <button
                                onClick={closeGallery}
                                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                            >
                                <X className="h-5 w-5 text-navy-950" />
                            </button>
                        </div>

                        {/* Main Image View */}
                        <div className="flex-1 relative flex items-center justify-center bg-gray-50/50 p-4">
                            <button
                                onClick={prevImage}
                                className="absolute left-6 z-10 p-4 bg-white/90 backdrop-blur-sm rounded-full shadow-xl hover:bg-white transition-all hidden md:block"
                            >
                                <ChevronLeft className="h-6 w-6 text-navy-950" />
                            </button>

                            <div className="relative w-full h-full max-w-6xl">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={activeIndex}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.3, ease: "easeOut" }}
                                        className="relative w-full h-full"
                                    >
                                        <Image
                                            src={images[activeIndex]}
                                            alt={`${title} - ${activeIndex + 1}`}
                                            fill
                                            className="object-contain"
                                            sizes="100vw"
                                            priority
                                        />
                                    </motion.div>
                                </AnimatePresence>
                            </div>

                            <button
                                onClick={nextImage}
                                className="absolute right-6 z-10 p-4 bg-white/90 backdrop-blur-sm rounded-full shadow-xl hover:bg-white transition-all hidden md:block"
                            >
                                <ChevronRight className="h-6 w-6 text-navy-950" />
                            </button>
                        </div>

                        {/* Subtle Navigation Dots (Optional) */}
                        <div className="py-8 flex justify-center gap-1.5 overflow-x-auto px-6 hide-scrollbar">
                            {images.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setActiveIndex(idx)}
                                    className={`h-1 rounded-full transition-all flex-shrink-0 ${idx === activeIndex ? "bg-[#b09e80] w-8" : "bg-gray-200 hover:bg-gray-300 w-4"
                                        }`}
                                />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
