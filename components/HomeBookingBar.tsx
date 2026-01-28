"use client";

import React from 'react';
import { MobileBookingCard } from './MobileBookingCard';
import { Calendar, MapPin, Search, User } from 'lucide-react';
import { useTranslations } from "next-intl";

export const HomeBookingBar = () => {
    const t = useTranslations('BookingBar');

    return (
        <React.Fragment>
            {/* Mobile View - Keeping existing component */}
            <div className="md:hidden relative z-20 -mt-10">
                <MobileBookingCard />
            </div>

            {/* Desktop View - Refined Design per User Feedback */}
            <div className="hidden md:block w-full max-w-[95%] xl:max-w-[1440px] mx-auto">

                {/* My Trip Tab - "Glued" to the top */}
                <div className="relative z-30 ml-0 w-fit">
                    <div className="bg-white rounded-t-[15px] px-[30px] py-[13px] min-w-[200px] shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.1)] flex items-center justify-center gap-[10px] relative top-[1px]">
                        <Calendar className="w-5 h-5 text-[#b09e80]" />
                        <span className="text-[#b09e80] font-bold uppercase tracking-widest text-sm">{t('myTrip')}</span>
                    </div>
                </div>

                {/* Main Card Container - Squared rounded (rounded-xl) with more padding */}
                <div className="w-full shadow-2xl rounded-tr-[15px] rounded-br-[15px] rounded-bl-[15px] rounded-tl-none bg-white py-5 px-10 relative z-20">
                    <form className="flex items-center w-full min-h-[92px]" action="#" method="get" onSubmit={(e) => e.preventDefault()}>

                        {/* Destination Input */}
                        <div className="flex-1 pl-2 pr-8 border-r border-gray-100 flex flex-col justify-center h-full group relative">
                            <label className="text-xs font-bold uppercase tracking-widest text-[#b09e80] mb-3 block group-hover:text-[#9e8c6d] transition-colors ml-0">
                                {t('destinationLabel')}
                            </label>
                            <div className="relative flex items-center w-full">
                                {/* Icon Inside Left */}
                                <MapPin className="w-6 h-6 text-[#b09e80] absolute left-0 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    name="location"
                                    placeholder={t('destinationPlaceholder')}
                                    className="w-full pl-10 font-sans text-xl font-bold text-[#192537] placeholder-gray-400 focus:outline-none bg-transparent h-12 leading-12 truncate"
                                />
                            </div>
                        </div>

                        {/* Arrival Date */}
                        <div className="flex-1 px-8 border-r border-gray-100 flex flex-col justify-center h-full relative cursor-pointer group">
                            <label className="text-xs font-bold uppercase tracking-widest text-[#b09e80] mb-3 block group-hover:text-[#9e8c6d] transition-colors">
                                {t('arrival')}
                            </label>
                            <div className="relative flex items-center w-full">
                                <input
                                    type="text"
                                    name="from"
                                    placeholder={t('selectDate')}
                                    readOnly
                                    className="yith-wcbk-booking-start-date w-full font-sans text-xl font-bold text-[#192537] placeholder-gray-400 focus:outline-none bg-transparent h-12 leading-12 truncate cursor-pointer pr-10"
                                />
                                {/* Icon Inside Right */}
                                <Calendar className="w-6 h-6 text-[#b09e80] absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </div>

                        {/* Departure Date */}
                        <div className="flex-1 px-8 border-r border-gray-100 flex flex-col justify-center h-full relative cursor-pointer group">
                            <label className="text-xs font-bold uppercase tracking-widest text-[#b09e80] mb-3 block group-hover:text-[#9e8c6d] transition-colors">
                                {t('departure')}
                            </label>
                            <div className="relative flex items-center w-full">
                                <input
                                    type="text"
                                    name="to"
                                    placeholder={t('selectDate')}
                                    readOnly
                                    className="yith-wcbk-booking-end-date w-full font-sans text-xl font-bold text-[#192537] placeholder-gray-400 focus:outline-none bg-transparent h-12 leading-12 truncate cursor-pointer pr-10"
                                />
                                {/* Icon Inside Right */}
                                <Calendar className="w-6 h-6 text-[#b09e80] absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </div>

                        {/* Travellers */}
                        <div className="flex-1 px-8 flex flex-col justify-center h-full relative cursor-pointer group">
                            <label className="text-xs font-bold uppercase tracking-widest text-[#b09e80] mb-3 block group-hover:text-[#9e8c6d] transition-colors">
                                {t('travellers')}
                            </label>
                            <div className="yith-wcbk-people-selector__toggle-handler relative flex items-center h-12 cursor-pointer w-full">
                                <span className="yith-wcbk-people-selector__totals font-sans text-xl font-bold text-[#192537] leading-12 truncate w-full pr-10">
                                    {t('selectPeople')}
                                </span>
                                {/* Icon Inside Right */}
                                <User className="w-6 h-6 text-[#b09e80] absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
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
            </div>
        </React.Fragment>
    );
};
