"use client";

import React from 'react';
import { notFound } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { getPropertyBySlug } from '@/lib/services';
import { DateRange } from "react-day-picker";
import { differenceInDays, format } from "date-fns";
import { pt, enGB } from "date-fns/locale";
import { Link } from '@/i18n/routing';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, MapPin, ChevronRight, X, Share2, Check } from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";
import { Button } from '@/components/ui/Button';
import { parseDateLocal } from '@/lib/utils';

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
    const gridT = useTranslations('PropertiesGrid');
    const router = useRouter();
    const locale = useLocale();
    const [isCopied, setIsCopied] = React.useState(false);

    const [property, setProperty] = React.useState<any>(null);
    const [conciergeServices, setConciergeServices] = React.useState<any[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    const [adults, setAdults] = React.useState(1);
    const [childrenCount, setChildren] = React.useState(0);
    const [infants, setInfants] = React.useState(0);
    const [availabilityStatus, setAvailabilityStatus] = React.useState<{ available: boolean; loading: boolean; error?: string }>({ available: true, loading: false });
    const [isDescriptionOpen, setIsDescriptionOpen] = React.useState(false);
    const [isHighlightsOpen, setIsHighlightsOpen] = React.useState(false);
    const [isMobileBookingOpen, setIsMobileBookingOpen] = React.useState(false);

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
                            from: parseDateLocal(fromStr),
                            to: parseDateLocal(toStr)
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

    const handleCopyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const handleWhatsApp = () => {
        const text = `Check out this amazing property: ${property?.title?.en || property?.title?.pt || 'Luxury Home'}\n\n${window.location.href}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

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
                {/* Header Actions (Back & Share) */}
                <div className="flex items-center justify-between mb-6">
                    <Link
                        href={(() => {
                            const params = new URLSearchParams(window.location.search);
                            const hasSearchFilters =
                                params.get('location') ||
                                params.get('from') ||
                                params.get('to') ||
                                params.get('adults') ||
                                params.get('children') ||
                                params.get('infants') ||
                                params.get('building') ||
                                params.get('fromsearch') === '1';

                            if (hasSearchFilters) {
                                return `/search?${params.toString()}`;
                            }
                            return `/properties`;
                        })()}
                        className="inline-flex items-center gap-2 text-sm text-navy-900/40 hover:text-navy-950 transition-colors group"
                    >
                        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                        {t('backToAll')}
                    </Link>

                    {/* Mobile Share Button */}
                    <div className="flex items-center gap-3 lg:hidden">
                        <button
                            onClick={handleWhatsApp}
                            className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center text-[#25D366] hover:bg-[#25D366]/5 transition-colors"
                        >
                            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                        </button>
                        <button
                            onClick={handleCopyLink}
                            className={`w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center transition-colors ${isCopied ? 'bg-green-50 text-green-600 border-green-200' : 'text-navy-950 hover:bg-gray-50'}`}
                        >
                            {isCopied ? <Check className="h-5 w-5" /> : <Share2 className="h-5 w-5" />}
                        </button>
                    </div>
                </div>

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
                                {
                                    label: property.region ? gridT(`regions.${property.region.toLowerCase()}`) : gridT('regions.porto'),
                                    href: `/properties?region=${property.region?.toLowerCase() || 'porto'}`
                                }
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
                                let paragraphs: string[] = [];
                                if (locale === 'pt' && Array.isArray(property.description_pt) && property.description_pt.length > 0) paragraphs = property.description_pt;
                                else if (locale === 'en' && Array.isArray(property.description_en) && property.description_en.length > 0) paragraphs = property.description_en;
                                // 2. Try the general description field (might be legacy array or new raw object)
                                else if (Array.isArray(property.description)) paragraphs = property.description;
                                // 3. Try to localize and split if it's a string/object
                                else {
                                    const localized = getLocalizedStr(property.description, locale);
                                    if (localized) paragraphs = localized.split('\n').filter(Boolean);
                                }

                                if (paragraphs.length === 0) return null;

                                const fullText = paragraphs.join('\n\n');
                                const shouldTruncate = fullText.length > 300;
                                const displayText = shouldTruncate ? fullText.substring(0, 300) : fullText;

                                return (
                                    <>
                                        <div className="text-navy-900/70 leading-relaxed text-base md:text-lg whitespace-pre-wrap">
                                            {displayText}
                                            {shouldTruncate && "..."}
                                        </div>
                                        {shouldTruncate && (
                                            <button
                                                onClick={() => setIsDescriptionOpen(true)}
                                                className="text-[#B08D4A] font-bold text-sm tracking-wider uppercase hover:underline flex items-center gap-2 mt-2"
                                            >
                                                {t('readMore') || "Read More"}
                                                <ChevronRight className="h-4 w-4" />
                                            </button>
                                        )}
                                    </>
                                );
                            })()}
                        </div>

                        {/* What to Expect Section */}
                        {(() => {
                            const intro = getLocalizedStr(property.highlights_intro, locale);
                            // Only show if intro exists and isn't just a placeholder or empty
                            if (!intro || intro.trim() === "") return null;

                            const shouldTruncate = intro.length > 300;
                            const displayText = shouldTruncate ? intro.substring(0, 300) : intro;

                            return (
                                <section className="mt-10 pt-8 border-t border-[#E1E6EC]">
                                    <h2 className="text-2xl font-bold text-navy-950 mb-4">{t('whatToExpect')}</h2>
                                    <div className="text-navy-900/70 leading-relaxed text-base md:text-lg mb-4 max-w-4xl whitespace-pre-wrap">
                                        {displayText}
                                        {shouldTruncate && "..."}
                                    </div>
                                    {shouldTruncate && (
                                        <button
                                            onClick={() => setIsHighlightsOpen(true)}
                                            className="text-[#B08D4A] font-bold text-sm tracking-wider uppercase hover:underline flex items-center gap-2"
                                        >
                                            {t('readMore') || "Read More"}
                                            <ChevronRight className="h-4 w-4" />
                                        </button>
                                    )}
                                </section>
                            );
                        })()}

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
                    <div id="booking-card-section" className="relative mt-8 lg:mt-0 pb-20 lg:pb-0">
                        <div className="lg:sticky lg:top-24 2xl:top-32">
                            <BookingCard
                                propertyId={property.id}
                                slug={property.slug}
                                price={property.price.perNight}
                                originalPrice={property.price.originalPrice}
                                discount={property.price.discount}
                                pricingRules={property.policies?.pricing}
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
                                maxGuests={property.guests}
                                availabilityStatus={availabilityStatus}
                            />
                        </div>
                    </div>
                </div>
            </main >

            {/* Mobile Booking Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-[#E1E6EC] p-4 lg:hidden z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                <div className="container mx-auto flex items-center justify-between">
                    <button
                        onClick={() => setIsMobileBookingOpen(true)}
                        className="text-left flex-1"
                    >
                        <div className="flex items-baseline gap-2 text-navy-950">
                            {property.price.originalPrice && (
                                <span className="text-navy-900/40 line-through text-xs font-medium">
                                    €{property.price.originalPrice}
                                </span>
                            )}
                            <span className="text-xl font-bold">€{property.price.perNight}</span>
                            <span className="text-navy-900/40 text-xs font-medium">/{t('perNight')}</span>
                        </div>
                        <p className="text-[10px] text-navy-900/40 font-bold uppercase tracking-wide underline decoration-navy-900/20 underline-offset-2 mt-0.5">
                            {(() => {
                                const guestCount = adults + childrenCount + infants;
                                const dateLocale = locale === 'pt' ? pt : enGB;
                                if (selectedRange?.from && selectedRange?.to) {
                                    const dateStr = `${format(selectedRange.from, 'd MMM', { locale: dateLocale })} - ${format(selectedRange.to, 'd MMM', { locale: dateLocale })}`;
                                    return `${dateStr} • ${guestCount} ${guestCount === 1 ? (t('guestSelector.person') || 'Guest') : (t('guestSelector.people') || 'Guests')}`;
                                }
                                return `${t('selectDates') || "Select dates"} • ${guestCount} ${guestCount === 1 ? (t('guestSelector.person') || 'Guest') : (t('guestSelector.people') || 'Guests')}`;
                            })()}
                        </p>
                    </button>
                    <Button
                        variant="luxury"
                        className="px-7 py-3 shadow-lg shadow-gold/20 hover:scale-[1.02] transition-transform ml-4"
                        onClick={() => {
                            if (!selectedRange?.from || !selectedRange?.to) {
                                setIsMobileBookingOpen(true);
                            } else {
                                const checkIn = format(selectedRange.from, 'yyyy-MM-dd');
                                const checkOut = format(selectedRange.to, 'yyyy-MM-dd');
                                const searchParams = new URLSearchParams({
                                    slug: property.slug,
                                    checkIn,
                                    checkOut,
                                    adults: adults.toString(),
                                    children: childrenCount.toString(),
                                    infants: infants.toString()
                                });
                                router.push(`/${locale}/booking/checkout?${searchParams.toString()}`);
                            }
                        }}
                    >
                        {(!selectedRange?.from || !selectedRange?.to) ? "Select Dates" : (t('reserveNow') || "Reserve now")}
                    </Button>
                </div>
            </div>

            {/* Mobile Booking Bottom Sheet */}
            <AnimatePresence>
                {isMobileBookingOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileBookingOpen(false)}
                            className="fixed inset-0 z-[100] bg-navy-950/40 backdrop-blur-sm lg:hidden"
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                            className="fixed inset-x-0 bottom-0 z-[110] bg-[#f8f9fa] rounded-t-[32px] overflow-hidden flex flex-col max-h-[90vh] lg:hidden shadow-[0_-20px_50px_rgba(0,0,0,0.15)]"
                        >
                            <div className="flex items-center justify-between p-6 bg-white border-b border-[#E1E6EC] sticky top-0 z-10 hidden">
                                <h3 className="text-xl font-bold font-montserrat text-navy-950">
                                    {t('reserveNow') || "Reserve"}
                                </h3>
                                <button
                                    onClick={() => setIsMobileBookingOpen(false)}
                                    className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-navy-950 hover:bg-gray-100 transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="overflow-y-auto w-full luxury-scrollbar p-6 pb-32">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-baseline gap-2 text-navy-950">
                                        <span className="text-3xl font-bold">€{property.price.perNight}</span>
                                        <span className="text-navy-900/60 font-medium">/{t('perNight')}</span>
                                    </div>
                                    <button
                                        onClick={() => setIsMobileBookingOpen(false)}
                                        className="w-10 h-10 rounded-full bg-white border border-[#E1E6EC] shadow-sm flex items-center justify-center text-navy-950 hover:bg-gray-50 transition-colors"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>

                                <BookingCard
                                    propertyId={property.id}
                                    slug={property.slug}
                                    price={property.price.perNight}
                                    originalPrice={property.price.originalPrice}
                                    discount={property.price.discount}
                                    pricingRules={property.policies?.pricing}
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
                                    maxGuests={property.guests}
                                    availabilityStatus={availabilityStatus}
                                    hideHeader={true}
                                />
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Modals */}
            <AnimatePresence>
                {/* Description Modal */}
                {isDescriptionOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsDescriptionOpen(false)}
                            className="fixed inset-0 z-[200] bg-navy-950/40 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="fixed inset-x-4 top-[10%] bottom-[10%] lg:inset-auto lg:left-1/2 lg:top-[120px] lg:-translate-x-1/2 lg:w-[800px] lg:max-h-[80vh] z-[210] bg-white rounded-[32px] overflow-hidden shadow-2xl flex flex-col shadow-[#0a1128]/20"
                        >
                            <div className="flex items-center justify-between p-8 border-b border-gray-100">
                                <h2 className="text-2xl font-bold text-navy-950 font-montserrat">{t('aboutThisHome') || "About this home"}</h2>
                                <button
                                    onClick={() => setIsDescriptionOpen(false)}
                                    className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-navy-950 hover:bg-gray-100 transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-8 lg:p-10 luxury-scrollbar text-left space-y-6">
                                {(() => {
                                    let paragraphs: string[] = [];
                                    if (locale === 'pt' && Array.isArray(property.description_pt) && property.description_pt.length > 0) paragraphs = property.description_pt;
                                    else if (locale === 'en' && Array.isArray(property.description_en) && property.description_en.length > 0) paragraphs = property.description_en;
                                    else if (Array.isArray(property.description)) paragraphs = property.description;
                                    else {
                                        const localized = getLocalizedStr(property.description, locale);
                                        if (localized) paragraphs = localized.split('\n').filter(Boolean);
                                    }
                                    return paragraphs.map((paragraph, index) => (
                                        <p key={index} className="text-navy-900/70 leading-relaxed text-base md:text-lg">
                                            {paragraph}
                                        </p>
                                    ));
                                })()}
                            </div>
                        </motion.div>
                    </>
                )}

                {/* Highlights Modal */}
                {isHighlightsOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsHighlightsOpen(false)}
                            className="fixed inset-0 z-[200] bg-navy-950/40 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="fixed inset-x-4 top-[10%] bottom-[10%] lg:inset-auto lg:left-1/2 lg:top-[120px] lg:-translate-x-1/2 lg:w-[800px] lg:max-h-[80vh] z-[210] bg-white rounded-[32px] overflow-hidden shadow-2xl flex flex-col shadow-[#0a1128]/20"
                        >
                            <div className="flex items-center justify-between px-8 py-6 border-b border-navy-50">
                                <h3 className="text-2xl font-bold text-navy-950 font-montserrat">{t('whatToExpect')}</h3>
                                <button
                                    onClick={() => setIsHighlightsOpen(false)}
                                    className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-navy-950 hover:bg-gray-100 transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 lg:p-10 luxury-scrollbar text-left">
                                <p className="text-navy-900/70 leading-relaxed text-base md:text-lg whitespace-pre-wrap">
                                    {getLocalizedStr(property.highlights_intro, locale)}
                                </p>
                            </div>

                            <div className="p-6 bg-navy-50/50 border-t border-navy-50">
                                <Button
                                    onClick={() => setIsHighlightsOpen(false)}
                                    variant="luxury"
                                    className="w-full lg:w-auto"
                                >
                                    {t('close') || "Close"}
                                </Button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div >
    );
};
