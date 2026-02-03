"use client";

import React from 'react';
import { notFound } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { getPropertyBySlug } from '@/lib/services';
import { DateRange } from "react-day-picker";
import { differenceInDays, format } from "date-fns";
import { Link } from '@/i18n/routing';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/Button';

// Helper to safely extract string from potential localized object
const getLocalizedStr = (val: any, locale: string = 'en'): string => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
        const preferred = val[locale] || val['en'] || val['pt'] || Object.values(val)[0];
        return typeof preferred === 'string' ? preferred : String(preferred || '');
    }
    return String(val || '');
};

// Helper to safely extract number from potential object/string
const safeCount = (val: any): number => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') return parseInt(val, 10) || 0;
    if (typeof val === 'object' && val !== null) {
        return parseInt(val.en || val.pt || val.he || Object.values(val)[0] || '0', 10) || 0;
    }
    return 0;
};

// New Components
import { Breadcrumb } from './property-details/Breadcrumb';
import { PropertyGallery } from './property-details/PropertyGallery';
import { PropertyStats } from './property-details/PropertyStats';
import { BookingCard } from './property-details/BookingCard';
import { HighlightsSection } from './property-details/HighlightsSection';
import { HomeTruthsSection } from './property-details/HomeTruthsSection';
import { AmenitiesSection } from './property-details/AmenitiesSection';
import { BedroomsSection } from './property-details/BedroomsSection';
import { LocationSection } from './property-details/LocationSection';
import { BookingPoliciesSection } from './property-details/BookingPoliciesSection';
import { ConciergeSection } from './property-details/ConciergeSection';

interface PropertyDetailsProps {
    slug: string;
}

export const PropertyDetails: React.FC<PropertyDetailsProps> = ({ slug }) => {
    const t = useTranslations('PropertyDetail');
    const tp = useTranslations('Properties');
    const router = useRouter();
    const locale = useLocale();

    const [property, setProperty] = React.useState<any>(null);
    const [conciergeServices, setConciergeServices] = React.useState<any[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    const [adults, setAdults] = React.useState(1);
    const [childrenCount, setChildren] = React.useState(0);
    const [infants, setInfants] = React.useState(0);
    const [availabilityStatus, setAvailabilityStatus] = React.useState<{ available: boolean; loading: boolean; error?: string }>({ available: true, loading: false });

    React.useEffect(() => {
        const fetchAll = async () => {
            setIsLoading(true);
            try {
                const [propertyData, conciergeData] = await Promise.all([
                    getPropertyBySlug(slug),
                    import('@/lib/services').then(m => m.getConciergeServices())
                ]);
                setProperty(propertyData);
                setConciergeServices(conciergeData);

                // Initialize from search params
                if (typeof window !== 'undefined') {
                    const params = new URLSearchParams(window.location.search);
                    const fromStr = params.get('from');
                    const toStr = params.get('to');
                    if (fromStr && toStr) {
                        setSelectedRange({
                            from: new Date(fromStr),
                            to: new Date(toStr)
                        });
                    }

                    setAdults(parseInt(params.get('adults') || '1', 10));
                    setChildren(parseInt(params.get('children') || '0', 10));
                    setInfants(parseInt(params.get('infants') || '0', 10));
                }
            } catch (error) {
                console.error('Error fetching property data:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAll();
    }, [slug]);

    const [selectedRange, setSelectedRange] = React.useState<DateRange | undefined>(undefined);

    // Validation Logic
    React.useEffect(() => {
        const validate = async () => {
            if (!property?.id || !selectedRange?.from || !selectedRange?.to) return;

            setAvailabilityStatus(prev => ({ ...prev, loading: true }));
            console.log('[DEBUG] PropertyDetails validation trigger:', {
                id: property.id,
                slug: property.slug,
                guests: adults + childrenCount
            });
            const { checkPropertyAvailability } = await import('@/lib/services');
            const result = await checkPropertyAvailability(
                property.id,
                selectedRange.from,
                selectedRange.to,
                adults + childrenCount
            );
            console.log('[DEBUG] PropertyDetails validation result:', result);
            setAvailabilityStatus({ available: result.available, loading: false, error: result.error });
        };
        validate();
    }, [property?.id, selectedRange, adults, childrenCount]);

    const nights = selectedRange?.from && selectedRange?.to
        ? differenceInDays(selectedRange.to, selectedRange.from)
        : 0;

    // Max breakfast days = nights.
    // Example: Check-in 11, Check-out 18 = 7 nights.
    // Breakfasts on mornings of: 12, 13, 14, 15, 16, 17, 18 = 7 days.
    // User confirmed: "so o dia 11 de entrada é que nao podemos ter breakfast".
    const maxBreakfastDays = Math.max(0, nights);

    const [selectedExtras, setSelectedExtras] = React.useState<{ breakfast: boolean; breakfastDays: number; transfer: boolean; transferType: 'one_way' | 'round_trip' }>({
        breakfast: false,
        breakfastDays: 1, // Default, will be clamped if needed
        transfer: false,
        transferType: 'one_way'
    });

    // Sync breakfast days to match nights exactly (Full Stay logic)
    React.useEffect(() => {
        if (selectedExtras.breakfast && maxBreakfastDays > 0) {
            setSelectedExtras(prev => ({ ...prev, breakfastDays: maxBreakfastDays }));
        }
    }, [maxBreakfastDays, selectedExtras.breakfast]);

    const handleDateChange = (range: DateRange | undefined) => {
        setSelectedRange(range);
    };

    const handleToggleExtra = (key: 'breakfast' | 'transfer') => {
        setSelectedExtras(prev => {
            const newState = { ...prev, [key]: !prev[key] };
            // Auto-set days to full stay (nights) when enabling breakfast
            if (key === 'breakfast' && newState.breakfast && !prev.breakfast) {
                newState.breakfastDays = Math.max(1, nights);
            }
            return newState;
        });
    };

    const handleUpdateBreakfastDays = (days: number) => {
        if (days < 1) return;
        if (days > maxBreakfastDays) return; // Enforce limit
        setSelectedExtras(prev => ({ ...prev, breakfastDays: days }));
    };

    const handleUpdateTransferType = (type: 'one_way' | 'round_trip') => {
        setSelectedExtras(prev => ({ ...prev, transferType: type }));
    };

    if (isLoading) {
        return (
            <div className="bg-white min-h-screen flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-[#b09e80] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!property) {
        notFound();
    }

    return (
        <div className="bg-white min-h-screen pb-24 lg:pb-0 font-sans">
            <main className="relative container mx-auto px-6 pt-32 pb-8">
                {/* Back link */}
                <Link
                    href={(() => {
                        const params = new URLSearchParams(window.location.search);
                        if (params.get('location') || params.get('from') || params.get('to')) {
                            return `/search?${params.toString()}`;
                        }
                        return `/properties`;
                    })()}
                    className="inline-flex items-center gap-2 text-sm text-navy-900/40 hover:text-navy-950 transition-colors mb-6 group"
                >
                    <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                    {t('backToAll')}
                </Link>

                {/* Gallery */}
                <PropertyGallery
                    images={property.images}
                    title={getLocalizedStr(property.title, locale)}
                    metadata={{
                        guests: safeCount(property.guests),
                        bedrooms: safeCount(property.bedrooms),
                        beds: safeCount(property.beds),
                        bathrooms: safeCount(property.bathrooms),
                        area: safeCount(property.area)
                    }}
                />

                {/* Content Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8 lg:gap-12 mt-10">
                    {/* Left Column - Property Info */}
                    <div className="min-w-0">
                        {/* Breadcrumb */}
                        <Breadcrumb
                            items={[
                                { label: t('properties'), href: '/properties' },
                                { label: property.region, href: `/properties?region=${property.region}` }
                            ]}
                        />

                        {/* Title */}
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-navy-950 mt-5 mb-2 text-balance leading-tight">
                            {getLocalizedStr(property.title, locale)}
                        </h1>

                        {/* Subtitle */}
                        {getLocalizedStr(property.subtitle, locale) && (
                            <p className="text-xl md:text-2xl text-navy-900/60 font-medium mb-3">
                                {getLocalizedStr(property.subtitle, locale)}
                            </p>
                        )}

                        {/* Location */}
                        <div className="flex items-center gap-2 text-navy-900/50 mb-8 max-w-2xl">
                            <MapPin className="h-4 w-4 flex-shrink-0" />
                            <span className="text-sm md:text-base">
                                {getLocalizedStr(property.location?.address, locale)}, {property.location?.city}, {property.location?.country}
                            </span>
                        </div>

                        {/* Property Stats */}
                        <PropertyStats
                            guests={safeCount(property.guests)}
                            bedrooms={safeCount(property.bedrooms)}
                            beds={safeCount(property.beds)}
                            bathrooms={safeCount(property.bathrooms)}
                            sqm={safeCount(property.area)}
                        />

                        {/* Description */}
                        <div className="mt-8 space-y-6">
                            {(() => {
                                // 1. Try localized arrays from service transformation
                                if (locale === 'pt' && Array.isArray(property.description_pt) && property.description_pt.length > 0) return property.description_pt;
                                if (locale === 'en' && Array.isArray(property.description_en) && property.description_en.length > 0) return property.description_en;

                                // 2. Try the general description field (might be legacy array or new raw object)
                                if (Array.isArray(property.description)) return property.description;

                                // 3. Try to localize and split if it's a string/object
                                const localized = getLocalizedStr(property.description, locale);
                                if (localized) return localized.split('\n').filter(Boolean);

                                return [];
                            })().map((paragraph: string, index: number) => (
                                <p key={index} className="text-navy-900/70 leading-relaxed text-base md:text-lg">
                                    {paragraph}
                                </p>
                            ))}
                        </div>

                        {/* What to Expect Section */}
                        <section className="mt-10 pt-8 border-t border-[#E1E6EC]">
                            <h2 className="text-2xl font-bold text-navy-950 mb-4">{t('whatToExpect')}</h2>
                            <p className="text-navy-900/70 leading-relaxed text-base md:text-lg mb-8 max-w-4xl">
                                {getLocalizedStr(property.highlights_intro, locale) || t('whatToExpectIntro')}
                            </p>
                        </section>

                        {/* Highlights */}
                        <HighlightsSection propertyId={property.id} highlights={property.highlights} />

                        {/* Home Truths & Check-in */}
                        <HomeTruthsSection
                            propertyId={property.id}
                            truths={property.homeTruths}
                            checkIn={property.policies?.checkIn}
                        />

                        {/* Amenities */}
                        <AmenitiesSection
                            propertyId={property.id}
                            amenities={property.amenities}
                        />

                        {/* Bedrooms */}
                        <BedroomsSection
                            propertyId={property.id}
                            bedrooms={safeCount(property.bedrooms)}
                            beds={safeCount(property.beds)}
                            bathrooms={safeCount(property.bathrooms)}
                            rooms={property.rooms}
                            bed_sizes={property.bed_sizes}
                            baby_equipment={property.baby_equipment}
                        />

                        {/* Location */}
                        <LocationSection
                            propertyId={property.id}
                            nearbyPlaces={property.nearbyPlaces}
                            coordinates={property.location.coordinates}
                            address={property.location.address}
                        />

                        {/* Concierge Services */}
                        <ConciergeSection
                            dbServices={conciergeServices}
                            vipServices={property.vip_services}
                            services={property.concierge}
                            prices={property.servicesPrice}
                            selectedExtras={selectedExtras}
                            onToggleExtra={handleToggleExtra}
                            onUpdateBreakfastDays={handleUpdateBreakfastDays}
                            onUpdateTransferType={handleUpdateTransferType}
                            maxBreakfastDays={maxBreakfastDays}
                        />

                        {/* Booking Policies */}
                        {property.policies && (
                            <BookingPoliciesSection policies={property.policies} />
                        )}
                    </div>

                    {/* Right Column - Booking Card (Sticky) */}
                    <div className="hidden lg:block relative">
                        <div className="sticky top-24 2xl:top-32">
                            <BookingCard
                                slug={property.slug}
                                price={property.price.perNight}
                                originalPrice={property.price.originalPrice}
                                discount={property.price.discount}
                                extraPrices={property.servicesPrice}
                                selectedExtras={selectedExtras}
                                onToggleExtra={handleToggleExtra}
                                selectedRange={selectedRange}
                                onDateChange={handleDateChange}
                                adults={adults}
                                setAdults={setAdults}
                                childrenCount={childrenCount}
                                setChildren={setChildren}
                                infants={infants}
                                setInfants={setInfants}
                                availabilityStatus={availabilityStatus}
                            />
                        </div>
                    </div>
                </div>
            </main >

            {/* Mobile Booking Bar */}
            < div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-[#E1E6EC] p-4 lg:hidden z-50 shadow-lg" >
                <div className="container mx-auto flex items-center justify-between">
                    <div>
                        <div className="flex items-baseline gap-2 text-navy-950">
                            {property.price.originalPrice && (
                                <span className="text-navy-900/40 line-through text-xs font-medium">
                                    €{property.price.originalPrice}
                                </span>
                            )}
                            <span className="text-xl font-bold">€{property.price.perNight}</span>
                            <span className="text-navy-900/40 text-xs font-medium">/{t('perNight')}</span>
                        </div>
                        <p className="text-[10px] text-navy-900/40 font-bold uppercase tracking-wide">11 - 14 Feb • 2 {t('guestsCount', { count: 2 })}</p>
                    </div>
                    <Button
                        variant="luxury"
                        className="px-7 py-3 shadow-lg shadow-gold/20 hover:scale-[1.02] transition-transform"
                        onClick={() => {
                            if (!selectedRange?.from || !selectedRange?.to) {
                                // Scroll to desktop booking card where calendar popover can be opened
                                // Or we could open a mobile date picker here
                                const card = document.querySelector('.lg\\:block .sticky');
                                card?.scrollIntoView({ behavior: 'smooth' });
                            } else {
                                const checkIn = format(selectedRange.from, 'yyyy-MM-dd');
                                const checkOut = format(selectedRange.to, 'yyyy-MM-dd');
                                const searchParams = new URLSearchParams({
                                    slug: property.slug,
                                    checkIn,
                                    checkOut,
                                    adults: "1", // Default for mobile bar if not selected
                                    infants: "0"
                                });
                                router.push(`/${locale}/booking/checkout?${searchParams.toString()}`);
                            }
                        }}
                    >
                        {t('reserveNow')}
                    </Button>
                </div>
            </div >
        </div >
    );
};
