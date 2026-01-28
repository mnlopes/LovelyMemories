"use client";

import React from 'react';
import { MapPin, Calendar, Users, Search } from 'lucide-react';
import { useTranslations } from "next-intl";

export const MobileBookingCard = () => {
    const t = useTranslations('BookingBar');

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
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    border-bottom: 1px solid #f3f4f6;
                    padding-bottom: 16px;
                    position: relative;
                }

                .row:last-of-type {
                    border-bottom: none;
                    padding-bottom: 0;
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

                /* UNIFIED CONTROL CLASS FOR ALL ROWS */
                .control {
                    margin-left: 42px !important;
                    font-size: 18px !important;
                    font-weight: 700 !important;
                    color: #192537 !important;
                    border: none !important;
                    background: transparent !important;
                    padding: 0 !important;
                    height: 32px !important;
                    line-height: 32px !important;
                    display: block !important;
                    width: calc(100% - 42px) !important;
                    box-shadow: none !important;
                    outline: none !important;
                    cursor: pointer;
                    -webkit-appearance: none;
                    appearance: none;
                }

                .control::placeholder {
                    color: #9ca3af !important;
                    font-weight: 400 !important;
                }

                /* FORCE RESET FOR LEGACY ELEMENTS */
                 :global(.mobile-booking-card .yith-wcbk-people-selector__toggle-handler) {
                    margin-left: 42px !important;
                    padding: 0 !important;
                    border: none !important;
                    background: transparent !important;
                    height: 32px !important;
                }

                :global(.mobile-booking-card .yith-wcbk-people-selector__toggle-handler::before),
                :global(.mobile-booking-card .yith-wcbk-people-selector__toggle-handler::after) {
                    display: none !important;
                    content: none !important;
                }

                :global(.mobile-booking-card .yith-wcbk-people-selector__totals) {
                    font-size: 18px !important;
                    font-weight: 700 !important;
                    color: #192537 !important;
                    line-height: 32px !important;
                    padding: 0 !important;
                    margin: 0 !important;
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
                    <span className="label">{t('destinationLabel')}</span>
                    <div className="content">
                        <div className="icon-container">
                            <MapPin size={22} strokeWidth={2} />
                        </div>
                        <input
                            type="text"
                            className="control yith-wcbk-booking-location"
                            placeholder={t('destinationPlaceholder')}
                        />
                    </div>
                </div>

                {/* Arrival */}
                <div className="row">
                    <span className="label">{t('arrival')}</span>
                    <div className="content">
                        <div className="icon-container">
                            <Calendar size={22} strokeWidth={2} />
                        </div>
                        <input
                            type="text"
                            id="mobile-arrival-date"
                            className="control yith-wcbk-booking-date yith-wcbk-booking-start-date"
                            placeholder={t('addDate')}
                            readOnly
                        />
                        <input type="hidden" id="mobile-arrival-date--formatted" />
                    </div>
                </div>

                {/* Departure */}
                <div className="row">
                    <span className="label">{t('departure')}</span>
                    <div className="content">
                        <div className="icon-container">
                            <Calendar size={22} strokeWidth={2} />
                        </div>
                        <input
                            type="text"
                            id="mobile-departure-date"
                            className="control yith-wcbk-booking-date yith-wcbk-booking-end-date"
                            placeholder={t('addDate')}
                            readOnly
                        />
                        <input type="hidden" id="mobile-departure-date--formatted" />
                    </div>
                </div>

                {/* Travellers */}
                <div className="row">
                    <span className="label">{t('travellers')}</span>
                    <div className="content">
                        <div className="icon-container">
                            <Users size={22} strokeWidth={2} />
                        </div>
                        <div className="control yith-wcbk-people-selector__toggle-handler">
                            <span className="yith-wcbk-people-selector__totals">{t('selectPeople')}</span>
                        </div>
                    </div>
                </div>

                {/* Submit button */}
                <button className="submit-btn" type="button">
                    <Search size={20} strokeWidth={2.5} />
                    <span>{t('search')}</span>
                </button>
            </div>
        </div>
    );
};
