"use client";

import Link from "next/link";
import { LegacyIcon } from "./LegacyIcon";

export const Hero = () => {
    return (
        <section className="section-block section-hero" style={{ marginBottom: "89px" }}>
            <div className="hero">
                <div
                    className="hero__bg"
                    style={{ backgroundImage: "url(/legacy/home/images/hero-image.png)" }}
                ></div>
                <div className="hero__content">
                    <div className="container">
                        <div className="row align-items-center" style={{ minHeight: "411px" }}>
                            <div className="col-12 col-xl-7">
                                <h6 className="color-white hero__content--pretitle">Book one of our exquisite, curated Homes</h6>
                                <h1 className="color-white text-bold hero__content--title">And create your own Lovely, Long Last Memories of Porto</h1>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="hero__booking" id="heroBooking" style={{ bottom: "-89px" }}>
                    <div className="container">
                        <div className="row">
                            <div className="col-12">
                                <div className="booking-bar">
                                    <div className="booking-bar__title">
                                        <LegacyIcon name="calendar" size={24} className="text-[#AD9C7E]" />
                                        <p className="alt-p mb-0">My Trip</p>
                                    </div>
                                    <div className="booking-bar__form">
                                        {/* Inline styles from legacy */}
                                        <style jsx global>{`
                                            .yith-wcbk-booking-search-form-1115, .yith_wcbk_booking_search_form_widget-1115{background: transparent !important; color: #333333 !important} 
                                            .yith-wcbk-booking-search-form-1115 .yith-wcbk-booking-search-form-submit{background: #b09e80 !important; color: #ffffff !important; border-radius: 30px 30px 30px 30px !important} 
                                            .yith-wcbk-booking-search-form-1115 .yith-wcbk-booking-search-form-submit:hover{background: #c7bfad !important; color: #ffffff !important}
                                        `}</style>

                                        <div className="yith-wcbk-booking-search-form yith-wcbk-booking-search-form-1115 yith-wcbk-booking-search-form--horizontal-layout show-results-shop" data-search-form-id="1115" data-search-form-result="#yith-wcbk-booking-search-form-result-1115">
                                            <form method="get" encType="multipart/form-data" action="#" autoComplete="off">
                                                <input type="hidden" name="yith-wcbk-booking-search" value="search-bookings" />

                                                <div className="yith-wcbk-booking-search-form__fields">

                                                    <div className="yith-wcbk-booking-search-form__row yith-wcbk-booking-search-form__row--location">
                                                        <label className="yith-wcbk-booking-search-form__row__label">
                                                            Your Destination    </label>
                                                        <div className="yith-wcbk-booking-search-form__row__content">
                                                            <input type="text" name="location" className="yith-wcbk-booking-location yith-wcbk-booking-field yith-wcbk-google-maps-places-autocomplete yith-wcbk-google-maps-places-autocomplete--initialized pac-target-input" placeholder="Introduza uma localização" autoComplete="off" />
                                                        </div>
                                                    </div>

                                                    <input type="hidden" name="location_range" className="yith-wcbk-booking-location-range" value="30" />

                                                    <div className="yith-wcbk-booking-search-form__row yith-wcbk-booking-search-form__row--start-date">
                                                        <label className="yith-wcbk-booking-search-form__row__label" htmlFor="start-date-input">
                                                            Arrival </label>
                                                        <div className="yith-wcbk-booking-search-form__row__content">
                                                            <div className="yith-wcbk-date-picker-wrapper yith-wcbk-clearfix">
                                                                <input type="text" id="start-date-input" name="from" className="yith-wcbk-date-picker yith-wcbk-booking-field yith-wcbk-booking-date yith-wcbk-booking-start-date" readOnly />
                                                                <span className="yith-wcbk-booking-date-icon yith-icon yith-icon-calendar"></span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="yith-wcbk-booking-search-form__row yith-wcbk-booking-search-form__row--end-date">
                                                        <label className="yith-wcbk-booking-search-form__row__label" htmlFor="end-date-input">
                                                            Departure   </label>
                                                        <div className="yith-wcbk-booking-search-form__row__content">
                                                            <div className="yith-wcbk-date-picker-wrapper yith-wcbk-clearfix">
                                                                <input type="text" id="end-date-input" name="to" className="yith-wcbk-date-picker yith-wcbk-booking-field yith-wcbk-booking-date yith-wcbk-booking-end-date" readOnly />
                                                                <span className="yith-wcbk-booking-date-icon yith-icon yith-icon-calendar"></span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="yith-wcbk-booking-search-form__row yith-wcbk-booking-search-form__row--persons">
                                                        <label className="yith-wcbk-booking-search-form__row__label">
                                                            Travellers      </label>
                                                        <div className="yith-wcbk-booking-search-form__row__content">
                                                            <div className="yith-wcbk-people-selector yith-wcbk-people-selector--closed">
                                                                <div className="yith-wcbk-people-selector__toggle-handler">
                                                                    <span className="yith-wcbk-people-selector__totals">Select people</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="yith-wcbk-booking-search-form__row yith-wcbk-booking-search-form__row--submit">
                                                        <div className="yith-wcbk-booking-search-form__row__content">
                                                            <button type="submit" className="button alt yith-wcbk-booking-search-form-submit">Search</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
