"use client";

import React, { useState } from 'react';
import { MapPin, Calendar, Users, Search } from 'lucide-react';
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from 'next/navigation';
import { DateRange } from 'react-day-picker';
import { format } from "date-fns";
import { pt, enGB } from "date-fns/locale";
import { HomeLocationPopover } from "./HomeLocationPopover";
import { HomeCalendarPopover } from "./HomeCalendarPopover";
import { BookingGuestPopover } from './property-details/BookingGuestPopover';

export const MobileBookingCard = () => {
    const t = useTranslations('BookingBar');
    const tp = useTranslations('PropertyDetail');
    const router = useRouter();
    const locale = useLocale();
    const dateLocale = locale === 'pt' ? pt : enGB;

    const [location, setLocation] = useState('');
    const [selectedRange, setSelectedRange] = useState<DateRange | undefined>();
    const [adults, setAdults] = useState(1);
    const [children, setChildren] = useState(0);
    const [infants, setInfants] = useState(0);
    const [openPopover, setOpenPopover] = useState<'location' | 'arrival' | 'departure' | 'guests' | null>(null);

    const guestsTotal = adults + children + infants;

    const handleSearch = () => {
        const params = new URLSearchParams();
        if (location) params.append('location', location);
        if (selectedRange?.from) params.append('from', format(selectedRange.from, 'yyyy-MM-dd'));
        if (selectedRange?.to) params.append('to', format(selectedRange.to, 'yyyy-MM-dd'));
        if (adults > 0) params.append('adults', adults.toString());
        if (children > 0) params.append('children', children.toString());
        if (infants > 0) params.append('infants', infants.toString());
        router.push(`/${locale}/search?${params.toString()}`);
    };

    return (
        <div className="mobile-booking-card md:hidden">
            <style jsx>{`
                .mobile-booking-card {
                    width: 100%;
                    max-width: 400px;
                    margin: 0 auto;
                    font-family: var(--font-montserrat), sans-serif;
                }

                .tab {
                    background: white;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 20px;
                    border-top-left-radius: 12px;
                    border-top-right-radius: 12px;
                    font-weight: 700;
                    font-size: 13px;
                    color: #b09e80;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    box-shadow: 0 -5px 15px rgba(0,0,0,0.03);
                }

                .card {
                    background: white;
                    border-radius: 20px;
                    border-top-left-radius: 0;
                    padding: 24px;
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                    box-shadow: 0 15px 40px rgba(0,0,0,0.08);
                }

                .row {
                    border-bottom: 1px solid #f3f4f6;
                    padding-bottom: 16px;
                    position: relative;
                }

                .row:last-of-type {
                    border-bottom: none;
                    padding-bottom: 0;
                }

                .trigger {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    cursor: pointer;
                }

                .label {
                    font-size: 10px;
                    color: #b09e80;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.8px;
                    margin-left: 42px;
                }

                .content {
                    position: relative;
                    min-height: 32px;
                }

                .icon-container {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #b09e80;
                }

                .control {
                    margin-left: 42px;
                    font-size: 18px;
                    font-weight: 700;
                    color: #192537;
                    height: 32px;
                    line-height: 32px;
                    display: block;
                    width: calc(100% - 42px);
                    cursor: pointer;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .control.is-placeholder {
                    color: #9ca3af;
                    font-weight: 400;
                }

                .submit-btn {
                    background: #b09e80;
                    color: white;
                    border: none;
                    border-radius: 50px;
                    height: 58px;
                    font-size: 18px;
                    font-weight: 700;
                    margin-top: 10px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 15px rgba(176, 158, 128, 0.3);
                }

                .submit-btn:active {
                    transform: scale(0.98);
                }
            `}</style>

            {/* Tab */}
            <div className="tab">
                <Calendar size={16} strokeWidth={2.5} />
                <span>{t('myTrip')}</span>
            </div>

            {/* Card Content */}
            <div className="card">
                {/* Destination */}
                <div className="row">
                    <div className="trigger" onClick={() => setOpenPopover('location')}>
                        <span className="label">{t('destinationLabel')}</span>
                        <div className="content">
                            <div className="icon-container">
                                <MapPin size={22} strokeWidth={2} />
                            </div>
                            <span className={`control ${location ? '' : 'is-placeholder'}`}>
                                {location || t('destinationPlaceholder')}
                            </span>
                        </div>
                    </div>
                    <HomeLocationPopover
                        isOpen={openPopover === 'location'}
                        onClose={() => setOpenPopover(null)}
                        onSelect={(loc) => setLocation(loc)}
                    />
                </div>

                {/* Arrival */}
                <div className="row">
                    <div className="trigger" onClick={() => setOpenPopover('arrival')}>
                        <span className="label">{t('arrival')}</span>
                        <div className="content">
                            <div className="icon-container">
                                <Calendar size={22} strokeWidth={2} />
                            </div>
                            <span className={`control ${selectedRange?.from ? '' : 'is-placeholder'}`}>
                                {selectedRange?.from ? format(selectedRange.from, 'd MMM yyyy', { locale: dateLocale }) : t('addDate')}
                            </span>
                        </div>
                    </div>
                    <HomeCalendarPopover
                        isOpen={openPopover === 'arrival'}
                        onClose={() => setOpenPopover(null)}
                        selectionMode="single"
                        selectedDate={selectedRange?.from}
                        onSelect={(date) => {
                            if (date instanceof Date) {
                                // Drop the departure if it's no longer after the new arrival (prevents check-out before check-in).
                                setSelectedRange(prev => ({ from: date, to: (prev?.to && prev.to > date) ? prev.to : undefined }));
                                setOpenPopover(null);
                            } else if (date === undefined) {
                                setSelectedRange(prev => ({ to: prev?.to, from: undefined }));
                            }
                        }}
                        numberOfMonths={1}
                    />
                </div>

                {/* Departure */}
                <div className="row">
                    <div className="trigger" onClick={() => setOpenPopover('departure')}>
                        <span className="label">{t('departure')}</span>
                        <div className="content">
                            <div className="icon-container">
                                <Calendar size={22} strokeWidth={2} />
                            </div>
                            <span className={`control ${selectedRange?.to ? '' : 'is-placeholder'}`}>
                                {selectedRange?.to ? format(selectedRange.to, 'd MMM yyyy', { locale: dateLocale }) : t('addDate')}
                            </span>
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
                        numberOfMonths={1}
                        disabledDates={selectedRange?.from ? { before: selectedRange.from } : undefined}
                    />
                </div>

                {/* Travellers */}
                <div className="row">
                    <div className="trigger" onClick={() => setOpenPopover('guests')}>
                        <span className="label">{t('travellers')}</span>
                        <div className="content">
                            <div className="icon-container">
                                <Users size={22} strokeWidth={2} />
                            </div>
                            <span className={`control ${guestsTotal > 0 ? '' : 'is-placeholder'}`}>
                                {guestsTotal > 0
                                    ? `${guestsTotal} ${guestsTotal === 1 ? tp('guestSelector.person') : tp('guestSelector.people')}`
                                    : t('selectPeople')}
                            </span>
                        </div>
                    </div>
                    <BookingGuestPopover
                        isOpen={openPopover === 'guests'}
                        onClose={() => setOpenPopover(null)}
                        adults={adults}
                        setAdults={setAdults}
                        children={children}
                        setChildren={setChildren}
                        infants={infants}
                        setInfants={setInfants}
                        maxInfants={6}
                    />
                </div>

                {/* Submit button */}
                <button
                    className="submit-btn"
                    type="button"
                    onClick={handleSearch}
                >
                    <Search size={20} strokeWidth={2.5} />
                    <span>{t('search')}</span>
                </button>
            </div>
        </div>
    );
};
