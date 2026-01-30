"use client";

import { Car, Footprints, MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useTranslations } from "next-intl";
import { useState } from "react";
import dynamic from "next/dynamic";

const PropertyMapLeaflet = dynamic(() => import("./PropertyMapLeaflet"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full bg-gray-100 flex items-center justify-center animate-pulse">
            <span className="text-gray-400 font-light tracking-widest uppercase">LOADING MAP...</span>
        </div>
    )
});

interface NearbyPlace {
    name: string;
    subtitle?: string;
    time: string;
    icon: "car" | "walk";
    coordinates?: [number, number];
}

interface NearbyCategory {
    category: string;
    items: NearbyPlace[];
}

interface LocationSectionProps {
    propertyId: string;
    nearbyPlaces: NearbyCategory[];
    coordinates?: [number, number];
    address: string;
}

export function LocationSection({ propertyId, nearbyPlaces, coordinates, address }: LocationSectionProps) {
    const t = useTranslations('PropertyDetail');
    const tp = useTranslations('Properties');
    const [selectedPlaceCoords, setSelectedPlaceCoords] = useState<[number, number] | null>(null);

    // Filter categories that have items
    const categories = nearbyPlaces.filter(c => c.items && c.items.length > 0);

    return (
        <section className="py-6 border-t border-[#E1E6EC]">
            <div className="mb-8 pt-2">
                <h2 className="text-2xl font-bold text-navy-950">{t('location')}</h2>
            </div>

            {/* Map */}
            <div className="relative rounded-2xl overflow-hidden mb-10 h-[400px] shadow-sm border border-[#E1E6EC] group">
                {coordinates ? (
                    <PropertyMapLeaflet
                        coordinates={coordinates}
                        address={address}
                        destinationCoordinates={selectedPlaceCoords}
                    />
                ) : (
                    // Fallback if no coordinates
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <p className="text-navy-900/40">{t('mapUnavailable')}</p>
                    </div>
                )}
            </div>

            {/* Nearby Places */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {categories.map((category, index) => (
                    <div key={index}>
                        <h4 className="font-medium mb-5 text-xs uppercase tracking-widest text-[#B08D4A]">
                            {category.category}
                        </h4>
                        <div className="space-y-1">
                            {category.items.map((item, itemIndex) => {
                                const isSelected = selectedPlaceCoords && item.coordinates &&
                                    selectedPlaceCoords[0] === item.coordinates[0] &&
                                    selectedPlaceCoords[1] === item.coordinates[1];

                                return (
                                    <div
                                        key={itemIndex}
                                        onClick={() => {
                                            if (item.coordinates) {
                                                setSelectedPlaceCoords(prev => {
                                                    if (prev && item.coordinates && prev[0] === item.coordinates[0] && prev[1] === item.coordinates[1]) {
                                                        return null;
                                                    }
                                                    return item.coordinates || null;
                                                });
                                            }
                                        }}
                                        className={`flex items-center justify-between py-3.5 px-4 -mx-4 rounded-xl transition-colors cursor-pointer group ${isSelected
                                            ? 'bg-navy-50/50 ring-1 ring-[#0a1128]/10'
                                            : 'hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className="flex-1 min-w-0 pr-4 text-left">
                                            {item.subtitle && (
                                                <p className="text-[10px] text-navy-900/40 mb-0.5 uppercase tracking-wide">{item.name}</p>
                                            )}
                                            <p className="font-medium text-sm text-navy-950 group-hover:text-[#B08D4A] transition-colors truncate">
                                                {item.subtitle || item.name}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-navy-900/60 flex-shrink-0">
                                            <span className="tabular-nums">{item.time}</span>
                                            <div className={`w-7 h-7 rounded-full border flex items-center justify-center shadow-sm transition-colors ${isSelected
                                                ? 'bg-[#0a1128] border-[#0a1128] text-white'
                                                : 'bg-white border-[#E1E6EC] text-navy-900/60 group-hover:border-[#B08D4A]'
                                                }`}>
                                                {item.icon === "car" ? (
                                                    <Car className={`h-3.5 w-3.5 transition-colors ${isSelected ? 'text-white' : 'group-hover:text-[#B08D4A]'}`} />
                                                ) : (
                                                    <Footprints className={`h-3.5 w-3.5 transition-colors ${isSelected ? 'text-white' : 'group-hover:text-[#B08D4A]'}`} />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
