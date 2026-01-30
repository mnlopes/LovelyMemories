"use client";

import { Users, Bed, Bath, Maximize, Star } from "lucide-react";
import { useTranslations } from "next-intl";

interface PropertyStatsProps {
    guests: number;
    bedrooms: number;
    beds: number;
    bathrooms: number;
    sqm: number;
}

export function PropertyStats({ guests, bedrooms, beds, bathrooms, sqm }: PropertyStatsProps) {
    const t = useTranslations('PropertyDetail');
    const details = [
        { icon: Users, label: t('guestsCount', { count: guests }) },
        { icon: Bed, label: t('bedroomsCount', { count: bedrooms }) },
        { icon: Bath, label: t('bathroomsCount', { count: bathrooms }) },
        { icon: Maximize, label: `${sqm} m²` },
    ];

    return (
        <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#B08D4A]/10 rounded-full text-sm">
                <Star className="h-4 w-4 text-[#B08D4A] fill-[#B08D4A]" />
                <span className="font-medium text-[#B08D4A]">{t('superhost')}</span>
            </div>
            <span className="text-muted-foreground/30">•</span>
            {details.map((detail, index) => (
                <div key={index} className="flex items-center">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <detail.icon className="h-4 w-4" />
                        <span>{detail.label}</span>
                    </div>
                    {index < details.length - 1 && (
                        <span className="mx-3 text-muted-foreground/30">•</span>
                    )}
                </div>
            ))}
        </div>
    );
}
