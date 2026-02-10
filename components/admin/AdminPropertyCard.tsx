
"use client";

import { motion } from "framer-motion";
import { MapPin, Users, Bed, Bath, Plus, Edit2, Trash2, LayoutGrid, List } from "lucide-react";
import { Property } from "@/lib/data";

interface AdminPropertyCardProps {
    property: Property;
}

import { useTranslations } from "next-intl";

export const AdminPropertyCard = ({ property }: AdminPropertyCardProps) => {
    const t = useTranslations('AdminPropertyCard');

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="group bg-admin-surface rounded-[32px] p-6 border border-admin-border hover:shadow-xl hover:border-admin-accent/30 transition-all duration-500"
        >
            <div className="flex flex-col lg:flex-row gap-8 items-center">
                {/* Image Section */}
                <div className="w-full lg:w-[320px] aspect-[4/3] rounded-[24px] overflow-hidden relative">
                    <img
                        src={property.image}
                        alt={property.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute top-4 left-4 flex gap-2">
                        <span className="px-4 py-1.5 bg-admin-surface/90 backdrop-blur-md text-admin-text-primary text-[10px] font-bold uppercase tracking-widest rounded-full shadow-sm">
                            {property.region}
                        </span>
                        {property.isComingSoon && (
                            <span className="px-4 py-1.5 bg-admin-accent text-white text-[10px] font-bold uppercase tracking-widest rounded-full shadow-sm">
                                {t('comingSoon')}
                            </span>
                        )}
                    </div>
                </div>

                {/* Content Section */}
                <div className="flex-1 flex flex-col justify-between py-2 w-full">
                    <div>
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="text-2xl font-playfair font-bold text-admin-text-primary mb-2 group-hover:text-admin-accent transition-colors">
                                    {property.title}
                                </h3>
                                <div className="flex items-center gap-2 text-admin-text-secondary font-medium text-sm">
                                    <MapPin className="w-4 h-4 text-admin-accent" />
                                    {property.location.address}, {property.location.city}
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-admin-text-secondary text-[10px] font-bold uppercase tracking-widest mb-1">{t('pricePerNight')}</p>
                                <p className="text-2xl font-playfair font-bold text-admin-text-primary">€{property.price.perNight}</p>
                            </div>
                        </div>

                        {/* Specs Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                            {[
                                { icon: Users, label: t('guests'), value: property.guests },
                                { icon: Bed, label: t('bedrooms'), value: property.bedrooms },
                                { icon: Bed, label: t('beds'), value: property.beds },
                                { icon: Bath, label: t('baths'), value: property.bathrooms },
                            ].map((spec) => (
                                <div key={spec.label} className="p-4 bg-admin-bg/50 rounded-2xl border border-admin-border group-hover:bg-admin-surface transition-colors">
                                    <spec.icon className="w-4 h-4 text-admin-accent mb-2" />
                                    <p className="text-[10px] font-bold text-admin-text-secondary uppercase tracking-widest">{spec.label}</p>
                                    <p className="text-sm font-bold text-admin-text-primary">{spec.value}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer / Actions */}
                    <div className="flex items-center justify-between pt-6 border-t border-admin-border">
                        <div className="flex items-center gap-2">
                            <div className="flex -space-x-2">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="w-8 h-8 rounded-full border-2 border-admin-surface bg-admin-bg flex items-center justify-center text-[10px] font-bold text-admin-text-primary font-mono">
                                        M{i}
                                    </div>
                                ))}
                            </div>
                            <span className="text-xs font-bold text-admin-text-secondary ml-2 uppercase tracking-widest">{t('activeTenants')}</span>
                        </div>

                        <div className="flex items-center gap-3">
                            <button className="p-3 bg-admin-surface border border-admin-border text-admin-text-primary rounded-xl hover:border-admin-accent transition-all group/btn">
                                <Edit2 className="w-4 h-4" />
                            </button>
                            <button className="p-3 bg-admin-surface border border-admin-border text-rose-500 rounded-xl hover:bg-rose-50 hover:border-rose-200 transition-all group/btn">
                                <Trash2 className="w-4 h-4" />
                            </button>
                            <button className="ml-2 px-6 py-3 bg-admin-text-primary text-admin-surface rounded-xl font-bold text-[10px] uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-3">
                                {t('viewDetails')}
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
