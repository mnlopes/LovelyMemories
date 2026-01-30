"use client";

import { useState } from "react";
import Image from "next/image";
import {
    Check,
    ChevronRight,
    X,
    Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";

interface AmenityCategory {
    category: string;
    items: string[];
}

interface AmenitiesSectionProps {
    propertyId: string;
    amenities: AmenityCategory[];
}

export function AmenitiesSection({ propertyId, amenities }: AmenitiesSectionProps) {
    const t = useTranslations('PropertyDetail');
    const tp = useTranslations('Properties');
    const [isModalOpen, setIsModalOpen] = useState(false);

    if (!amenities || amenities.length === 0) return null;

    // Localized data access
    const localizedAmenities = (tp.raw(`${propertyId}.amenities`) as AmenityCategory[] | undefined) || amenities;

    // Flatten amenities for preview (just show first 8 of any category)
    const allAmenities = localizedAmenities.flatMap(c => c.items);
    const displayedAmenities = allAmenities.slice(0, 8);
    // Count total unique items
    const totalCount = allAmenities.length;



    const getCategoryIcon = (category: string) => {
        const normalized = category.toLowerCase();

        // Custom Premium Icons
        if (normalized.includes('heating') || normalized.includes('cooling') || normalized.includes('aquecimento') || normalized.includes('arrefecimento')) {
            return <Image src="/icons/heating_navy.png" alt="Heating" width={48} height={48} className="w-12 h-12 object-contain" unoptimized />;
        }
        if (normalized.includes('entertainment') || normalized.includes('entretenimento')) {
            return <Image src="/icons/entertainment_navy.png" alt="Entertainment" width={48} height={48} className="w-12 h-12 object-contain" unoptimized />;
        }
        if (normalized.includes('outdoor') || normalized.includes('garden') || normalized.includes('location') || normalized.includes('localização') || normalized.includes('exterior')) {
            return <Image src="/icons/outdoor_navy.png" alt="Outdoor" width={48} height={48} className="w-12 h-12 object-contain" unoptimized />;
        }
        if (normalized.includes('parking') || normalized.includes('access') || normalized.includes('estacionamento') || normalized.includes('acesso')) {
            return <Image src="/icons/parking_navy.png" alt="Parking" width={48} height={48} className="w-12 h-12 object-contain" unoptimized />;
        }
        if (normalized.includes('bedroom') || normalized.includes('laundry') || normalized.includes('quarto') || normalized.includes('lavandaria')) {
            return <Image src="/icons/bedroom_navy.png" alt="Bedroom" width={48} height={48} className="w-12 h-12 object-contain" unoptimized />;
        }
        if (normalized.includes('internet') || normalized.includes('office') || normalized.includes('escritório')) {
            return <Image src="/icons/internet_navy.png" alt="Internet" width={48} height={48} className="w-12 h-12 object-contain" unoptimized />;
        }
        if (normalized.includes('kitchen') || normalized.includes('dining') || normalized.includes('cozinha') || normalized.includes('refeições')) {
            return <Image src="/icons/kitchen_navy.png" alt="Kitchen" width={48} height={48} className="w-12 h-12 object-contain" unoptimized />;
        }
        if (normalized.includes('bathroom') || normalized.includes('casa de banho')) {
            return <Image src="/icons/bathroom_navy.png" alt="Bathroom" width={48} height={48} className="w-12 h-12 object-contain" unoptimized />;
        }

        return <Sparkles className="w-12 h-12 text-navy-950" />;
    };

    return (
        <section className="py-5 border-t border-[#E1E6EC]">
            <div className="mb-2 pt-0">
                <h2 className="text-2xl font-bold text-navy-950">{t('aboutStay')}</h2>
            </div>

            <h3 className="text-lg font-medium mb-3 text-navy-950">{t('amenities')}</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                {displayedAmenities.map((amenity, index) => (
                    <div
                        key={index}
                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-50">
                            <Check className="h-4 w-4 text-[#2d8653]" />
                        </div>
                        <span className="text-sm text-navy-900/90">{amenity}</span>
                    </div>
                ))}
            </div>

            {totalCount > 8 && (
                <Button
                    variant="outline"
                    className="gap-2 rounded-xl text-navy-950 border-gray-200"
                    onClick={() => setIsModalOpen(true)}
                >
                    {t('showAllAmenities', { count: totalCount })}
                    <ChevronRight className="h-4 w-4" />
                </Button>
            )}

            {/* Premium Amenities Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="fixed inset-0 z-[100] bg-navy-950/20 backdrop-blur-sm"
                        />

                        {/* Modal Container */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} // smooth cubic-bezier
                            className="fixed inset-4 md:inset-10 lg:inset-x-[25%] lg:top-[120px] lg:bottom-[5%] z-[110] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto ring-1 ring-black/5"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-white z-10">
                                <h3 className="text-2xl font-bold text-navy-950 font-serif">
                                    {t('amenities')}
                                </h3>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <X className="h-6 w-6 text-navy-950" />
                                </button>
                            </div>

                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10 luxury-scrollbar">
                                {localizedAmenities.map((group, idx) => (
                                    <div key={idx}>
                                        <div className="flex items-center gap-3 mb-4 pb-2 border-b border-gray-100">
                                            {getCategoryIcon(group.category)}
                                            <h4 className="text-lg font-bold text-navy-950">
                                                {group.category}
                                            </h4>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                                            {group.items.map((item, itemIdx) => (
                                                <div key={itemIdx} className="flex items-start gap-3">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-[#B08D4A] mt-2 flex-shrink-0 opacity-60" /> {/* Subtle bullet */}
                                                    <span className="text-navy-900/80 leading-relaxed text-base">
                                                        {item}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Footer Gradient Fade (Optional aesthetic touch) */}
                            <div className="h-6 absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <style jsx global>{`
                .luxury-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .luxury-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .luxury-scrollbar::-webkit-scrollbar-thumb {
                    background: #E1E6EC;
                    border-radius: 10px;
                }
                .luxury-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #D1D9E0;
                }
            `}</style>
        </section>
    );
}
