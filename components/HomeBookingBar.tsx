"use client";

import React, { useState } from 'react';
import { MobileBookingCard } from './MobileBookingCard';
import { Calendar, MapPin, Search, User } from 'lucide-react';
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from 'next/navigation';
import { DateRange } from 'react-day-picker';
import { format } from "date-fns";
import { pt, enGB } from "date-fns/locale";
import { HomeCalendarPopover } from "./HomeCalendarPopover";
import { HomeLocationPopover } from "./HomeLocationPopover";
import { BookingGuestPopover } from './property-details/BookingGuestPopover';
import { motion, AnimatePresence } from 'framer-motion';

export const HomeBookingBar = () => {
    const t = useTranslations('BookingBar');
    const tp = useTranslations('PropertyDetail'); // Loading PropertyDetail for shared strings
    const router = useRouter();
    const locale = useLocale();
    const dateLocale = locale === 'pt' ? pt : enGB;

    const [location, setLocation] = useState('');
    const [selectedRange, setSelectedRange] = useState<DateRange | undefined>();
    const [adults, setAdults] = useState(1);
    const [infants, setInfants] = useState(0);

    const [openPopover, setOpenPopover] = useState<'location' | 'arrival' | 'departure' | 'guests' | null>(null);
    const [placement, setPlacement] = useState<'bottom-start' | 'top-start' | 'bottom-center' | 'top-center'>('bottom-start');

    // Refs for trigger elements to calculate position
    const locationRef = React.useRef<HTMLDivElement>(null);
    const arrivalRef = React.useRef<HTMLDivElement>(null);
    const departureRef = React.useRef<HTMLDivElement>(null);
    const guestsRef = React.useRef<HTMLDivElement>(null);

    const handleOpenPopover = (type: 'location' | 'arrival' | 'departure' | 'guests') => {
        let ref: any = null;
        if (type === 'location') ref = locationRef;
        if (type === 'arrival') ref = arrivalRef;
        if (type === 'departure') ref = departureRef;
        if (type === 'guests') ref = guestsRef;

        if (ref && ref.current) {
            const rect = ref.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const neededSpace = 480;

            if (type === 'guests') {
                setPlacement(spaceBelow < neededSpace ? 'top-center' : 'bottom-center');
            } else {
                setPlacement(spaceBelow < neededSpace ? 'top-start' : 'bottom-start');
            }
        }
        setOpenPopover(type);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();

        const params = new URLSearchParams();
        if (location) params.append('location', location);
        if (selectedRange?.from) params.append('from', format(selectedRange.from, 'yyyy-MM-dd'));
        if (selectedRange?.to) params.append('to', format(selectedRange.to, 'yyyy-MM-dd'));
        if (adults > 0) params.append('adults', adults.toString());
        if (infants > 0) params.append('infants', infants.toString());

        router.push(`/${locale}/properties?${params.toString()}`);
    };

    const guestsTotal = adults + infants;

    return (
        <React.Fragment>
            {/* Mobile View - Keeping existing component */}
            <div className="md:hidden relative z-20 -mt-10">
                <MobileBookingCard />
            </div>

            {/* Desktop View - Refined Design per User Feedback */}
            <div className="hidden md:block w-full max-w-[95%] xl:max-w-[1440px] mx-auto relative z-50">

                {/* My Trip Tab - "Glued" to the top */}
                <div className="relative z-30 ml-0 w-fit">
                    <div className="bg-white rounded-t-[15px] px-[30px] py-[13px] min-w-[200px] shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.1)] flex items-center justify-center gap-[10px] relative top-[1px]">
                        <Calendar className="w-5 h-5 text-[#b09e80]" />
                        <span className="text-[#b09e80] font-bold uppercase tracking-widest text-sm">{t('myTrip')}</span>
                    </div>
                </div>

                {/* Main Card Container - Squared rounded (rounded-xl) with more padding */}
                <div className={`w-full shadow-2xl rounded-tr-[15px] rounded-br-[15px] rounded-bl-[15px] rounded-tl-none bg-white py-5 px-10 relative ${openPopover ? 'z-50' : 'z-20'}`}>
                    <form
                        className="flex items-center w-full min-h-[92px]"
                        onSubmit={handleSearch}
                    >

                        {/* Destination Input */}
                        <div
                            className="flex-1 pl-2 pr-8 border-r border-gray-100 flex flex-col justify-center h-full group relative cursor-pointer"
                            onClick={() => handleOpenPopover('location')}
                            ref={locationRef}
                        >
                            <label className="text-xs font-bold uppercase tracking-widest text-[#b09e80] mb-3 block group-hover:text-[#9e8c6d] transition-colors ml-0">
                                {t('destinationLabel')}
                            </label>
                            <div className="relative flex items-center w-full">
                                <MapPin className="w-6 h-6 text-[#b09e80] absolute left-0 top-1/2 -translate-y-1/2" />
                                <span className={`w-full pl-10 font-sans text-xl font-bold ${location ? 'text-[#192537]' : 'text-gray-400'} h-12 flex items-center truncate`}>
                                    {location || t('destinationPlaceholder')}
                                </span>
                            </div>

                            <HomeLocationPopover
                                isOpen={openPopover === 'location'}
                                onClose={() => setOpenPopover(null)}
                                onSelect={(loc) => setLocation(loc)}
                                placement={placement}
                            />
                        </div>

                        {/* Arrival Date */}
                        <div
                            className="flex-1 px-8 border-r border-gray-100 flex flex-col justify-center h-full relative cursor-pointer group"
                            ref={arrivalRef}
                        >
                            <div onClick={() => handleOpenPopover('arrival')} className="w-full h-full">
                                <label className="text-xs font-bold uppercase tracking-widest text-[#b09e80] mb-3 block group-hover:text-[#9e8c6d] transition-colors">
                                    {t('arrival')}
                                </label>
                                <div className="relative flex items-center w-full">
                                    <span className={`w-full font-sans text-xl font-bold ${selectedRange?.from ? 'text-[#192537]' : 'text-gray-400'} h-12 flex items-center truncate cursor-pointer pr-10`}>
                                        {selectedRange?.from ? format(selectedRange.from, 'd MMM yyyy', { locale: dateLocale }) : t('selectDate')}
                                    </span>
                                    <Calendar className="w-6 h-6 text-[#b09e80] absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                            </div>



                            <HomeCalendarPopover
                                isOpen={openPopover === 'arrival'}
                                onClose={() => setOpenPopover(null)}
                                selectionMode="single"
                                selectedDate={selectedRange?.from}
                                onSelect={(date) => {
                                    if (date instanceof Date) {
                                        setSelectedRange(prev => ({ to: prev?.to, from: date }));
                                        setOpenPopover('departure');
                                    } else if (date === undefined) {
                                        setSelectedRange(prev => ({ to: prev?.to, from: undefined }));
                                    }
                                }}
                                placement={placement}
                                numberOfMonths={1}
                            />
                        </div>

                        {/* Departure Date */}
                        <div
                            className="flex-1 px-8 border-r border-gray-100 flex flex-col justify-center h-full relative cursor-pointer group"
                            ref={departureRef}
                        >
                            <div onClick={() => handleOpenPopover('departure')} className="w-full h-full">
                                <label className="text-xs font-bold uppercase tracking-widest text-[#b09e80] mb-3 block group-hover:text-[#9e8c6d] transition-colors">
                                    {t('departure')}
                                </label>
                                <div className="relative flex items-center w-full">
                                    <span className={`w-full font-sans text-xl font-bold ${selectedRange?.to ? 'text-[#192537]' : 'text-gray-400'} h-12 flex items-center truncate cursor-pointer pr-10`}>
                                        {selectedRange?.to ? format(selectedRange.to, 'd MMM yyyy', { locale: dateLocale }) : t('selectDate')}
                                    </span>
                                    <Calendar className="w-6 h-6 text-[#b09e80] absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                            </div>

                            <HomeCalendarPopover
                                isOpen={openPopover === 'departure'}
                                onClose={() => setOpenPopover(null)}
                                selectionMode="single"
                                selectedDate={selectedRange?.to}
                                onSelect={(date) => {
                                    if (date instanceof Date) {
                                        setSelectedRange(prev => ({ from: prev?.from, to: date }));
                                        setOpenPopover(null);
                                    } else if (date === undefined) {
                                        setSelectedRange(prev => ({ from: prev?.from, to: undefined }));
                                    }
                                }}
                                placement={placement}
                                numberOfMonths={1}
                                disabledDates={selectedRange?.from ? { before: selectedRange.from } : undefined}
                            />
                        </div>

                        {/* Travellers */}
                        <div
                            className="flex-1 px-8 flex flex-col justify-center h-full relative cursor-pointer group"
                            ref={guestsRef}
                        >
                            <div onClick={() => handleOpenPopover('guests')} className="w-full h-full">
                                <label className="text-xs font-bold uppercase tracking-widest text-[#b09e80] mb-3 block group-hover:text-[#9e8c6d] transition-colors">
                                    {t('travellers')}
                                </label>
                                <div className="relative flex items-center h-12 cursor-pointer w-full">
                                    <span className={`w-full font-sans text-xl font-bold ${guestsTotal > 0 ? 'text-[#192537]' : 'text-gray-400'} leading-12 truncate pr-10`}>
                                        {guestsTotal > 0
                                            ? `${guestsTotal} ${guestsTotal === 1 ? tp('guestSelector.person') : tp('guestSelector.people')}`
                                            : t('selectPeople')}
                                    </span>
                                    <User className="w-6 h-6 text-[#b09e80] absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                            </div>

                            {/* Guest Popover */}
                            <BookingGuestPopover
                                isOpen={openPopover === 'guests'}
                                onClose={() => setOpenPopover(null)}
                                adults={adults}
                                setAdults={setAdults}
                                infants={infants}
                                setInfants={setInfants}
                                placement={placement}
                            />
                        </div>

                        {/* Search Button */}
                        <div className="pl-4">
                            <button
                                type="submit"
                                className="h-[70px] px-12 rounded-xl bg-[#b09e80] text-white font-bold uppercase tracking-widest hover:bg-[#8e7d65] transition-all shadow-lg flex items-center gap-3 transform active:scale-95 text-lg cursor-pointer"
                            >
                                <Search className="w-6 h-6" />
                                <span>{t('search')}</span>
                            </button>
                        </div>

                    </form>
                </div>
            </div >
        </React.Fragment >
    );
};
