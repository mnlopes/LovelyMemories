"use client";

import React from 'react';
import { PROPERTIES } from '@/lib/data';
import { notFound } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { DateRange } from "react-day-picker";
import { differenceInDays, format } from "date-fns";
import { Link } from '@/i18n/routing';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/Button';

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

    // Find the current property based on static data
    const property = PROPERTIES.find(p => p.slug === slug);

    const [selectedRange, setSelectedRange] = React.useState<DateRange | undefined>({
        from: new Date(2026, 1, 11), // 11 Feb 2026
        to: new Date(2026, 1, 14),   // 14 Feb 2026
    });

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

    if (!property) {
        notFound();
    }

    return (
        <div className="bg-white min-h-screen pb-24 lg:pb-0 font-sans">
            <main className="relative container mx-auto px-6 pt-32 pb-8">
                {/* Back link */}
                <Link
                    href="/properties"
                    className="inline-flex items-center gap-2 text-sm text-navy-900/40 hover:text-navy-950 transition-colors mb-6 group"
                >
                    <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                    {t('backToAll')}
                </Link>

                {/* Gallery */}
                <PropertyGallery
                    images={property.images}
                    title={property.title}
                    metadata={{
                        guests: property.guests,
                        bedrooms: property.bedrooms,
                        beds: property.beds,
                        bathrooms: property.bathrooms,
                        area: property.area
                    }}
                />

                {/* Content Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8 lg:gap-12 mt-10">
                    {/* Left Column - Property Info */}
                    <div>
                        {/* Breadcrumb */}
                        <Breadcrumb
                            items={[
                                { label: t('properties'), href: '/properties' },
                                { label: property.region, href: `/properties?region=${property.region}` }
                            ]}
                        />

                        {/* Title */}
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-navy-950 mt-5 mb-2 text-balance leading-tight">
                            {property.title}
                        </h1>

                        {/* Subtitle */}
                        {property.subtitle && (
                            <p className="text-xl md:text-2xl text-navy-900/60 font-medium mb-3">
                                {property.subtitle}
                            </p>
                        )}

                        {/* Location */}
                        <div className="flex items-center gap-2 text-navy-900/50 mb-8 max-w-2xl">
                            <MapPin className="h-4 w-4 flex-shrink-0" />
                            <span className="text-sm md:text-base">
                                {property.location.address}, {property.location.city}, {property.location.country}
                            </span>
                        </div>

                        {/* Property Stats */}
                        <PropertyStats
                            guests={property.guests}
                            bedrooms={property.bedrooms}
                            beds={property.beds}
                            bathrooms={property.bathrooms}
                            sqm={property.area}
                        />

                        {/* Description */}
                        <div className="mt-8 space-y-6">
                            {(Array.isArray(tp.raw(`${property.id}.description`))
                                ? tp.raw(`${property.id}.description`) as string[]
                                : property.description).map((paragraph, index) => (
                                    <p key={index} className="text-navy-900/70 leading-relaxed text-base md:text-lg">
                                        {paragraph}
                                    </p>
                                ))}
                        </div>

                        {/* What to Expect Section */}
                        <section className="mt-10 pt-8 border-t border-[#E1E6EC]">
                            <h2 className="text-2xl font-bold text-navy-950 mb-6">{t('whatToExpect')}</h2>
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
                            bedrooms={property.bedrooms}
                            beds={property.beds}
                            bathrooms={property.bathrooms}
                            rooms={property.rooms}
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
                        <div className="sticky top-32">
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
