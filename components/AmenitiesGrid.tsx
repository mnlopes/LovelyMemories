import { Wifi, Wind, Car, Coffee, Tv, Shield, ChefHat, Bath, BedDouble, Dumbbell, Waves, Utensils } from "lucide-react";
import { cn } from "@/lib/utils";
import { LegacyIcon } from "./LegacyIcon";

interface AmenitiesGridProps {
    amenities: { label: string; icon: string }[];
}

const ICON_MAP: Record<string, any> = {
    wifi: Wifi,
    ac: Wind,
    parking: Car,
    coffee: Coffee,
    cinema: Tv,
    security: Shield,
    kitchen: ChefHat,
    bath: Bath,
    bed: BedDouble,
    gym: Dumbbell,
    pool: Waves,
    utensils: Utensils,
    star: Shield, // fallback
};

export const AmenitiesGrid = ({ amenities }: AmenitiesGridProps) => {
    return (
        <section className="py-24 border-t border-gray-100">
            <h3 className="text-[11px] font-extrabold text-[#AD9C7E] uppercase tracking-[0.4em] mb-12">Amenities</h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-y-10 gap-x-16">
                {amenities.map((item, i) => {
                    const LucideIcon = ICON_MAP[item.icon];

                    return (
                        <div key={i} className="flex items-center gap-5 group">
                            <div className="w-12 h-12 rounded-full bg-[#FBFAF8] border border-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-[#F1EFEC] group-hover:text-[#AD9C7E] transition-all duration-500 shadow-sm">
                                {LucideIcon ? (
                                    <LucideIcon className="w-5 h-5 stroke-[1.5]" />
                                ) : (
                                    <LegacyIcon name={item.icon} className="w-5 h-5" />
                                )}
                            </div>
                            <span className="text-sm font-bold text-navy-950 tracking-tight group-hover:text-[#AD9C7E] transition-colors duration-300">
                                {item.label}
                            </span>
                        </div>
                    );
                })}
            </div>
            <button className="mt-16 px-10 py-5 border border-navy-950 text-navy-950 font-bold text-[11px] uppercase tracking-[0.2em] rounded-full hover:bg-navy-950 hover:text-white transition-all duration-300">
                Show all {amenities.length} amenities
            </button>
        </section>
    );
};
