"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { ArrowRight, MapPin, Bed, Bath, Users, FileSpreadsheet } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { getOwnerProperties } from "@/app/actions/owner-properties";
import { ExportMonthlyDataModal } from "@/components/owner/ExportMonthlyDataModal";

export default function OwnerPropertiesPage() {
    const locale = useLocale();
    const t = useTranslations('OwnerProperties');
    const [properties, setProperties] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Modal State
    const [exportModalProperty, setExportModalProperty] = useState<{id: string, name: string} | null>(null);

    useEffect(() => {
        async function loadProperties() {
            try {
                const data = await getOwnerProperties();
                setProperties(data);
            } finally {
                setIsLoading(false);
            }
        }
        loadProperties();
    }, []);

    if (isLoading) {
        return (
            <div className="space-y-8 max-w-[1400px] mx-auto animate-pulse">
                <div className="h-10 w-48 bg-gray-100 rounded-lg mb-2" />
                <div className="h-4 w-64 bg-gray-50 rounded-lg" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-[500px] bg-white rounded-[32px] border border-gray-100" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-[1400px] mx-auto">
            <div className="flex justify-between items-center">
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <h1 className="text-3xl font-bold font-playfair text-[#0A1128]">
                        {t('title')}
                    </h1>
                    <p className="text-gray-500 font-light tracking-wide mt-2">
                        {t('subtitle')}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {properties.map((property) => {
                    const title = (property.title as any)?.[locale] || (property.title as any)?.en || property.slug;
                    
                    const image = property.main_image || (Array.isArray(property.images) && property.images.length > 0 
                        ? (typeof property.images[0] === 'string' ? property.images[0] : property.images[0].url) 
                        : 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80');
                    
                    const city = (property.locations as any)?.[`name_${locale}`] || (property.locations as any)?.name_en || property.city || 'Portugal';

                    return (
                        <div key={property.id} className="bg-white rounded-[32px] border border-gray-100 overflow-hidden group hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-500">
                            <div className="relative aspect-[4/3] overflow-hidden">
                                <img
                                    src={image}
                                    alt={title}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                                />
                                <div className="absolute top-5 left-5 right-5 flex justify-between items-start pointer-events-none">
                                    <div className="bg-white/90 backdrop-blur-md px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-[#0A1128] shadow-sm pointer-events-auto">
                                        {t('active')}
                                    </div>
                                    
                                    <button
                                        onClick={() => setExportModalProperty({ id: property.id, name: title })}
                                        className="size-10 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center text-indigo-400 hover:text-indigo-600 hover:scale-110 transition-all shadow-sm pointer-events-auto group/export"
                                        title={t('exportExcel')}
                                    >
                                        <FileSpreadsheet className="size-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-8">
                                <h3 className="text-2xl font-bold font-playfair text-[#0A1128] mb-3 truncate" title={title}>
                                    {title}
                                </h3>
                                <div className="flex items-center gap-2.5 text-gray-500 text-sm mb-6">
                                    <div className="size-6 rounded-full bg-gray-50 flex items-center justify-center text-[#C5A059]">
                                        <MapPin className="size-3.5" />
                                    </div>
                                    <span className="font-medium">{city}</span>
                                </div>

                                <div className="flex items-center justify-between py-6 border-t border-gray-50">
                                    <div className="flex items-center gap-6 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                                        <div className="flex items-center gap-2">
                                            <Users className="size-4 text-[#0A1128]" />
                                            <span className="text-[#0A1128]">{property.max_guests || 0}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Bed className="size-4 text-[#0A1128]" />
                                            <span className="text-[#0A1128]">{property.bedrooms || 0}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Bath className="size-4 text-[#0A1128]" />
                                            <span className="text-[#0A1128]">{property.bathrooms || 0}</span>
                                        </div>
                                    </div>
                                </div>

                                <Link
                                    href={`/properties/${property.slug}`}
                                    target="_blank"
                                    className="flex items-center justify-between w-full px-6 py-4 bg-[#0A1128] rounded-2xl text-[11px] font-black text-white uppercase tracking-[0.2em] hover:bg-[#C5A059] transition-all transform active:scale-95 shadow-lg shadow-navy-100 group/btn"
                                >
                                    {t('viewLive')}
                                    <ArrowRight className="size-4 group-hover/btn:translate-x-1 transition-transform" />
                                </Link>
                            </div>
                        </div>
                    );
                })}

                {(!properties || properties.length === 0) && (
                    <div className="col-span-full py-20 text-center bg-gray-50 rounded-3xl border border-dashed border-gray-200 animate-in fade-in zoom-in duration-700">
                        <p className="text-gray-400 font-medium">{t('empty')}</p>
                        <p className="text-sm text-gray-400 mt-1">{t('emptySubtitle')}</p>
                    </div>
                )}
            </div>

            {/* Export Modal */}
            <ExportMonthlyDataModal 
                isOpen={!!exportModalProperty}
                onClose={() => setExportModalProperty(null)}
                propertyId={exportModalProperty?.id || ''}
                propertyName={exportModalProperty?.name || ''}
            />
        </div>
    );
}
