"use client";

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { getProperties } from '@/lib/services';
import { Link } from '@/i18n/routing';
import { DateRange } from 'react-day-picker';
import { ArrowLeft, MapPin, Building2, Bed, Home, Calendar, Users, Sparkles, User, ChevronDown, Search, X, Bath, Maximize } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { format } from "date-fns";
import { pt, enGB } from "date-fns/locale";
import { SearchCalendarPopover } from './SearchCalendarPopover';
import { HomeLocationPopover } from "./HomeLocationPopover";
import { BookingGuestPopover } from './property-details/BookingGuestPopover';

const getLocalizedStr = (val: any, locale: string = 'en'): string => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
        const preferred = val[locale] || val['en'] || val['pt'] || Object.values(val)[0];
        return typeof preferred === 'string' ? preferred : String(preferred || '');
    }
    return String(val || '');
};

const safeCount = (val: any): number => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') return parseInt(val, 10) || 0;
    if (typeof val === 'object' && val !== null) {
        return parseInt(val.en || val.pt || val.he || Object.values(val)[0] || '0', 10) || 0;
    }
    return 0;
};

const SkeletonGrid = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-y-12 gap-x-8">
        {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <div className="aspect-[1/1] bg-gray-200 animate-pulse" />
                <div className="p-6 space-y-4">
                    <div className="h-6 w-3/4 bg-gray-100 rounded animate-pulse mx-auto" />
                    <div className="h-4 w-1/2 bg-gray-50 rounded animate-pulse mx-auto" />
                    <div className="pt-4 border-t border-gray-50 grid grid-cols-2 gap-4 w-full px-4">
                        <div className="h-4 w-full bg-gray-50 rounded animate-pulse" />
                        <div className="h-4 w-full bg-gray-50 rounded animate-pulse" />
                        <div className="h-4 w-full bg-gray-50 rounded animate-pulse" />
                        <div className="h-4 w-full bg-gray-50 rounded animate-pulse" />
                    </div>
                </div>
            </div>
        ))}
    </div>
);

const SearchSkeleton = () => (
    <div className="py-20 bg-[#f8f9fa] min-h-screen">
        <div className="container mx-auto px-4">
            <div className="mb-12 h-40 bg-white rounded-3xl animate-pulse border border-gray-100" />
            <SkeletonGrid />
        </div>
    </div>
);

function SearchResultsContent() {
    const locale = useLocale();
    const t = useTranslations('PropertiesGrid');
    const tb = useTranslations('BookingBar');
    const tp = useTranslations('PropertyDetail');
    const searchParams = useSearchParams();
    const router = useRouter();
    const dateLocale = locale === 'pt' ? pt : enGB;

    // Search Filters State
    const [location, setLocation] = React.useState(searchParams.get('location') || '');
    const [selectedRange, setSelectedRange] = React.useState<DateRange | undefined>(() => {
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        if (from && to) {
            return { from: new Date(from), to: new Date(to) };
        }
        return undefined;
    });
    const [adults, setAdults] = React.useState(parseInt(searchParams.get('adults') || '1', 10));
    const [children, setChildren] = React.useState(parseInt(searchParams.get('children') || '0', 10));
    const [infants, setInfants] = React.useState(parseInt(searchParams.get('infants') || '0', 10));

    // Popover State
    const [openPopover, setOpenPopover] = React.useState<'location' | 'dates' | 'guests' | null>(null);
    const [isSearching, setIsSearching] = React.useState(false);

    const guestsTotal = adults + children + infants;
    const occupancyGuests = adults + children;

    const [properties, setProperties] = React.useState<any[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [visibleCount, setVisibleCount] = React.useState(8);

    React.useEffect(() => {
        const fetchProperties = async () => {
            setIsLoading(true);
            try {
                // Use new searchProperties service
                const { searchProperties } = await import('@/lib/services');

                const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined;
                const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined;
                const adults = parseInt(searchParams.get('adults') || '1', 10);
                const children = parseInt(searchParams.get('children') || '0', 10);
                const location = searchParams.get('location') || undefined;
                const building = searchParams.get('building') || undefined;

                const data = await searchProperties({
                    location,
                    guests: adults + children,
                    from,
                    to,
                    buildingSlug: building
                });

                setProperties(data);
            } catch (error) {
                console.error('Error fetching properties:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchProperties();
    }, [searchParams]);

    const handleManualSearch = () => {
        setIsSearching(true);
        const params = new URLSearchParams(searchParams.toString());

        if (location) params.set('location', location);
        else params.delete('location');

        params.set('adults', adults.toString());
        params.set('children', children.toString());
        params.set('infants', infants.toString());

        if (selectedRange?.from && selectedRange?.to) {
            params.set('from', format(selectedRange.from, 'yyyy-MM-dd'));
            params.set('to', format(selectedRange.to, 'yyyy-MM-dd'));
        } else {
            params.delete('from');
            params.delete('to');
        }

        const newPath = `/${locale}/search?${params.toString()}`;
        router.replace(newPath, { scroll: false });

        // Brief delay to give "searching" sensation
        setTimeout(() => {
            setIsSearching(false);
        }, 600);
    };

    const hasChanges = React.useMemo(() => {
        const currentLoc = searchParams.get('location') || '';
        const currentAdults = parseInt(searchParams.get('adults') || '1', 10);
        const currentChildren = parseInt(searchParams.get('children') || '0', 10);
        const currentInfants = parseInt(searchParams.get('infants') || '0', 10);
        const currentFrom = searchParams.get('from');
        const currentTo = searchParams.get('to');

        const locChanged = location !== currentLoc;
        const guestsChanged = adults !== currentAdults || children !== currentChildren || infants !== currentInfants;

        let datesChanged = false;
        if (selectedRange?.from && selectedRange?.to) {
            datesChanged = format(selectedRange.from, 'yyyy-MM-dd') !== currentFrom ||
                format(selectedRange.to, 'yyyy-MM-dd') !== currentTo;
        } else {
            datesChanged = !!currentFrom || !!currentTo;
        }

        return locChanged || guestsChanged || datesChanged;
    }, [location, adults, children, infants, selectedRange, searchParams]);


    // Filtering Logic based on URL params (the "Applied" filters)
    const appliedLocation = searchParams.get('location') || '';
    const appliedAdults = parseInt(searchParams.get('adults') || '1', 10);
    const appliedChildren = parseInt(searchParams.get('children') || '0', 10);
    const appliedOccupancy = appliedAdults + appliedChildren;

    // Filtering is now handled by the searchProperties service
    // We can keep specific client-side refinements if needed, but for now we trust the service.
    const filteredProperties = properties;

    const sortedProperties = [...filteredProperties].sort((a, b) => {
        if (!a.isComingSoon && b.isComingSoon) return -1;
        if (a.isComingSoon && !b.isComingSoon) return 1;
        return 0;
    });

    return (
        <section className="py-20 bg-[#f8f9fa] min-h-screen">
            <div className="container mx-auto px-4">

                {/* Header Section */}
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-[#b09e80] hover:text-[#9e8c6d] transition-colors mb-8 text-sm font-bold uppercase tracking-widest"
                >
                    <ArrowLeft className="w-4 h-4" />
                    {t('backToHome')}
                </Link>

                <div className="sticky top-28 z-40 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-3xl shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] border border-gray-100 mb-12">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-sans font-bold text-[#192537] mb-2">
                            Search Results
                        </h1>
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative">
                                <button
                                    onClick={() => setOpenPopover(openPopover === 'location' ? null : 'location')}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all hover:bg-gray-50 active:scale-95 ${location ? 'bg-[#b09e80]/10 border-[#b09e80]/30 text-[#b09e80]' : 'bg-[#f8f9fa] border-gray-100 text-[#192537]'}`}
                                >
                                    <MapPin className="w-3.5 h-3.5 text-[#b09e80]" />
                                    <span className="text-xs font-bold uppercase tracking-widest">{location || t('anywhere')}</span>
                                    <ChevronDown className={`w-3 h-3 transition-transform ${openPopover === 'location' ? 'rotate-180' : ''}`} />
                                </button>
                                <HomeLocationPopover
                                    isOpen={openPopover === 'location'}
                                    onClose={() => setOpenPopover(null)}
                                    onSelect={(loc) => {
                                        setLocation(loc);
                                        setOpenPopover(null);
                                    }}
                                    placement="bottom-start"
                                />
                            </div>

                            <div className="relative">
                                <button
                                    onClick={() => setOpenPopover(openPopover === 'guests' ? null : 'guests')}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all hover:bg-gray-50 active:scale-95 ${guestsTotal > 0 ? 'bg-[#b09e80]/10 border-[#b09e80]/30 text-[#b09e80]' : 'bg-[#f8f9fa] border-gray-100 text-[#192537]'}`}
                                >
                                    <Users className="w-3.5 h-3.5 text-[#b09e80]" />
                                    <span className="text-xs font-bold uppercase tracking-widest">{guestsTotal} {guestsTotal === 1 ? t('person') || 'Person' : t('people') || 'People'}</span>
                                    <ChevronDown className={`w-3 h-3 transition-transform ${openPopover === 'guests' ? 'rotate-180' : ''}`} />
                                </button>
                                <BookingGuestPopover
                                    isOpen={openPopover === 'guests'}
                                    onClose={() => setOpenPopover(null)}
                                    adults={adults}
                                    setAdults={setAdults}
                                    children={children}
                                    setChildren={setChildren}
                                    infants={infants}
                                    setInfants={setInfants}
                                    placement="bottom-start"
                                />
                            </div>

                            <div className="relative">
                                <button
                                    onClick={() => setOpenPopover(openPopover === 'dates' ? null : 'dates')}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all hover:bg-gray-50 active:scale-95 ${selectedRange?.from ? 'bg-[#b09e80]/10 border-[#b09e80]/30 text-[#b09e80]' : 'bg-[#f8f9fa] border-gray-100 text-[#192537]'}`}
                                >
                                    <Calendar className="w-3.5 h-3.5 text-[#b09e80]" />
                                    <span className="text-xs font-bold uppercase tracking-widest">
                                        {selectedRange?.from && selectedRange?.to
                                            ? `${format(selectedRange.from, 'd MMM')} - ${format(selectedRange.to, 'd MMM')}`
                                            : t('anyDates') || 'Any Dates'}
                                    </span>
                                    <ChevronDown className={`w-3 h-3 transition-transform ${openPopover === 'dates' ? 'rotate-180' : ''}`} />
                                </button>
                                <SearchCalendarPopover
                                    isOpen={openPopover === 'dates'}
                                    onClose={() => setOpenPopover(null)}
                                    onSelect={(range) => setSelectedRange(range)}
                                    selectedRange={selectedRange}
                                    placement="bottom-center"
                                    numberOfMonths={2}
                                />
                            </div>

                            {searchParams.get('building') && (
                                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#b09e80] border border-[#b09e80] text-white animate-in fade-in slide-in-from-left-2 transition-all shadow-md shadow-[#b09e80]/20">
                                    <Building2 className="w-3.5 h-3.5" />
                                    <span className="text-xs font-bold uppercase tracking-widest leading-none">
                                        {t('apartmentsIn') || 'Apartments in'}: {properties[0]?.parent?.title || searchParams.get('building')}
                                    </span>
                                    <button
                                        onClick={() => {
                                            const params = new URLSearchParams(searchParams.toString());
                                            params.delete('building');
                                            router.push(`/${locale}/search?${params.toString()}`);
                                        }}
                                        className="ml-1 p-0.5 hover:bg-white/20 rounded-full transition-colors"
                                        title={t('exitBuildingMode') || 'Exit Building Mode'}
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            )}

                            {/* Search Button */}
                            <button
                                onClick={handleManualSearch}
                                disabled={!hasChanges || isSearching}
                                className={`flex items-center gap-2 px-6 py-2 rounded-xl border font-bold uppercase tracking-widest text-xs transition-all active:scale-95 ${hasChanges
                                    ? 'bg-[#b09e80] border-[#b09e80] text-white shadow-lg shadow-[#b09e80]/20 hover:bg-[#9e8c6d]'
                                    : 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
                                    }`}
                            >
                                {isSearching ? (
                                    <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <Search className="w-3.5 h-3.5" />
                                )}
                                {tb('search')}
                            </button>
                        </div>
                    </div>

                    <div className="text-right flex flex-col items-end">
                        <span className="text-sm text-gray-400 font-medium block mb-1">{t('found')}</span>
                        <span className="text-2xl font-bold text-[#192537]">
                            {isLoading ? (
                                <div className="h-8 w-24 bg-gray-100 animate-pulse rounded-lg" />
                            ) : (
                                <>
                                    {filteredProperties.length} {searchParams.get('building') ? (filteredProperties.length === 1 ? t('apartment') || 'Apartment' : t('apartments') || 'Apartments') : (filteredProperties.length === 1 ? t('property') || 'Property' : t('properties') || 'Properties')}
                                </>
                            )}
                        </span>
                    </div>
                </div>

                {/* Grid Section */}
                {isLoading || isSearching ? (
                    <SkeletonGrid />
                ) : filteredProperties.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-32 bg-white rounded-[40px] border border-dashed border-gray-200">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                            <Sparkles className="w-10 h-10 text-gray-200" />
                        </div>
                        <h3 className="text-xl font-bold text-[#192537] mb-2">No results found</h3>
                        <p className="text-gray-400 max-w-xs text-center">Try adjusting your filters or destination to find your perfect stay.</p>
                        <Link
                            href="/properties"
                            className="mt-8 text-sm font-bold uppercase tracking-widest text-[#b09e80] hover:text-[#9e8c6d] border-b-2 border-[#b09e80]/20 pb-1"
                        >
                            Browse All Properties
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-y-12 gap-x-8">
                        {sortedProperties.slice(0, visibleCount).map((property: any, index: number) => (
                            <div
                                key={property.id || index}
                                className={`group block w-full bg-white rounded-2xl shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] border border-gray-100/50 overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.15)]`}
                            >
                                <div
                                    onClick={() => {
                                        if (property.isReserved) return;
                                        if (property.unitsCount >= 2) {
                                            const params = new URLSearchParams(searchParams.toString());
                                            params.set('building', property.slug);
                                            params.set('fromsearch', '1');
                                            router.push(`/${locale}/search?${params.toString()}`);
                                        } else {
                                            const params = new URLSearchParams(searchParams.toString());
                                            params.set('fromsearch', '1');
                                            router.push(`/${locale}/properties/${property.singleUnitSlug || property.slug}?${params.toString()}`);
                                        }
                                    }}
                                    className={`block relative aspect-[1/1] w-full overflow-hidden ${property.isReserved ? 'cursor-not-allowed grayscale-[0.3] contrast-[0.9]' : 'cursor-pointer'}`}
                                >
                                    <Image
                                        src={property.image || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop'}
                                        alt={getLocalizedStr(property.title, locale)}
                                        fill
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                                        style={{ objectFit: 'cover' }}
                                        className="transition-transform duration-1000 group-hover:scale-110"
                                    />
                                    {property.unitsCount >= 2 && (
                                        <div className="absolute top-4 right-4 z-30">
                                            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#AD9C7E]/40 backdrop-blur-md border border-white/30 text-white shadow-2xl scale-100 transition-all duration-300 group-hover:scale-105 group-hover:bg-[#AD9C7E] group-hover:border-[#AD9C7E]">
                                                <Building2 className="w-3.5 h-3.5" />
                                                <span className="text-[11px] font-bold uppercase tracking-widest leading-none">Building</span>
                                            </div>
                                        </div>
                                    )}
                                    {/* Reserved Overlay */}
                                    {property.isReserved && (
                                        <div className="absolute inset-0 bg-[#192537]/70 backdrop-blur-[2px] z-40 flex flex-col items-center justify-center transition-all duration-500">
                                            <div className="flex flex-col items-center justify-center transform -translate-y-4">
                                                <div className="w-[1px] h-8 bg-[#edc37c] mb-4"></div>
                                                <span className="text-white text-xs font-bold tracking-[0.3em] uppercase mb-1 drop-shadow-md">
                                                    Unavailable
                                                </span>
                                                <span className="text-[#edc37c] font-serif text-3xl italic drop-shadow-lg font-medium">
                                                    Reserved
                                                </span>
                                                <div className="w-[1px] h-8 bg-[#edc37c] mt-4"></div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10 opacity-90 pointer-events-none"></div>
                                    <div className={`absolute bottom-0 left-0 w-full p-6 text-center pointer-events-none ${property.isReserved ? 'z-50' : 'z-20'}`}>
                                        <h6 className={`text-white font-sans font-bold text-2xl mb-1 leading-tight tracking-tight drop-shadow-md ${property.isReserved ? 'opacity-60' : ''}`}>
                                            {getLocalizedStr(property.title, locale)}
                                        </h6>
                                        <p className={`text-white/80 text-sm font-light uppercase tracking-[0.2em] ${property.isReserved ? 'opacity-60' : ''}`}>
                                            {getLocalizedStr(property.subtitle, locale)}
                                        </p>
                                    </div>
                                </div>

                                <div className="p-6 space-y-4">
                                    <div className="flex items-center justify-between pb-4 border-b border-gray-50 px-2">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <MapPin className="text-[#AD9C7E] w-3.5 h-3.5 flex-shrink-0" />
                                            <p className="text-[#192537] text-[11px] font-bold uppercase tracking-wider truncate">
                                                {property.location.city}
                                            </p>
                                        </div>
                                        <p className="text-gray-400 text-[11px] font-medium truncate ml-4 max-w-[140px]">
                                            {property.location.address}
                                        </p>
                                    </div>

                                    <div className="flex flex-col items-center justify-center py-3 border-b border-gray-100 min-h-[5rem] px-4">
                                        {property.unitsCount >= 2 ? (
                                            <div className="flex items-center gap-2">
                                                <Building2 className="text-[#AD9C7E] w-[18px] h-[18px]" />
                                                <p className="text-[#192537] text-sm font-bold">
                                                    {safeCount(property.unitsCount)} {safeCount(property.unitsCount) === 1 ? t('apartment') || 'Apartment' : t('apartments') || 'Apartments'}
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-x-8 gap-y-4 items-center justify-center w-full max-w-[280px]">
                                                <div className="flex items-center gap-2">
                                                    <Users className="text-[#AD9C7E] w-[18px] h-[18px]" />
                                                    <p className="text-[#192537] text-sm">
                                                        <span className="font-bold">{property.guests}</span> {property.guests === 1 ? t('guest') || 'Guest' : t('guests') || 'Guests'}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Bed className="text-[#AD9C7E] w-[18px] h-[18px]" />
                                                    <p className="text-[#192537] text-sm whitespace-nowrap">
                                                        <span className="font-bold">{property.bedrooms}</span> {property.bedrooms === 1 ? t('bedroom') || 'Bedroom' : t('bedrooms') || 'Bedrooms'}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Maximize className="text-[#AD9C7E] w-[18px] h-[18px]" />
                                                    <p className="text-[#192537] text-sm whitespace-nowrap">
                                                        <span className="font-bold">{property.area || 0}</span> m²
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Bath className="text-[#AD9C7E] w-[18px] h-[18px]" />
                                                    <p className="text-[#192537] text-sm whitespace-nowrap">
                                                        <span className="font-bold">{property.bathrooms || 0}</span> {property.bathrooms === 1 ? t('bathroom') || 'Bathroom' : t('bathrooms') || 'Bathrooms'}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                </div>

                                {/* Disable buttons/links if reserved */}
                                <div className={`pt-0 pb-4 text-center ${property.isReserved ? 'opacity-30 pointer-events-none' : ''}`}>
                                    {property.unitsCount >= 2 ? (
                                        <button
                                            onClick={() => {
                                                const params = new URLSearchParams(searchParams.toString());
                                                params.set('building', property.slug);
                                                params.set('fromsearch', '1');
                                                router.push(`/${locale}/search?${params.toString()}`);
                                            }}
                                            className="inline-block text-[#b09e80] font-bold uppercase tracking-widest text-xs hover:text-[#9e8c6d] transition-colors cursor-pointer"
                                        >
                                            {t('discoverMore') || 'Discover More'}
                                        </button>
                                    ) : (
                                        <Link
                                            href={`/properties/${property.singleUnitSlug || property.slug}?${(() => {
                                                const p = new URLSearchParams(searchParams.toString());
                                                p.set('fromsearch', '1');
                                                return p.toString();
                                            })()}`}
                                            className="inline-block text-[#b09e80] font-bold uppercase tracking-widest text-xs hover:text-[#9e8c6d] transition-colors cursor-pointer"
                                        >
                                            {(() => {
                                                try {
                                                    return tp('viewDetails');
                                                } catch (e) {
                                                    return 'View Details';
                                                }
                                            })()}
                                        </Link>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Load More */}
                {visibleCount < filteredProperties.length && (
                    <div className="mt-20 flex justify-center">
                        <button
                            onClick={() => setVisibleCount(prev => prev + 4)}
                            className="px-10 py-4 border border-gray-200 rounded-full text-sm font-bold uppercase tracking-widest text-[#192537] hover:bg-[#192537] hover:text-white transition-all shadow-sm"
                        >
                            Load More
                        </button>
                    </div>
                )}
            </div>
        </section >
    );
}

export function SearchResults() {
    return (
        <Suspense fallback={<SearchSkeleton />}>
            <SearchResultsContent />
        </Suspense>
    );
}
