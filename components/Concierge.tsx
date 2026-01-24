"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import React, { useRef, useState, useEffect } from "react";

const SERVICES = [
    {
        title: "Private transfers",
        image: "/legacy/home/images/services-image-1.png"
    },
    {
        title: "Breakfast at Home",
        image: "/legacy/home/images/services-image-2.png"
    },
    {
        title: "Chef at Home",
        image: "/legacy/home/images/services-image-3.png"
    },
    {
        title: "Another Service",
        image: "/legacy/home/images/services-image-2-1.png"
    },
    {
        title: "Experiences",
        image: "/legacy/home/images/services-image-1.png"
    }
];

export const Concierge = () => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isMouseDown, setIsMouseDown] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const handleButtonClick = (direction: 'left' | 'right') => {
        if (!scrollRef.current) return;
        const amount = 320;
        const target = direction === 'left'
            ? scrollRef.current.scrollLeft - amount
            : scrollRef.current.scrollLeft + amount;

        scrollRef.current.scrollTo({
            left: target,
            behavior: 'smooth'
        });
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!scrollRef.current) return;
        setIsMouseDown(true);
        setStartX(e.pageX - scrollRef.current.offsetLeft);
        setScrollLeft(scrollRef.current.scrollLeft);
    };

    const handleMouseUp = () => {
        setIsMouseDown(false);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isMouseDown || !scrollRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walk = (x - startX) * 2; // scroll-speed
        scrollRef.current.scrollLeft = scrollLeft - walk;
    };

    return (
        <section className="section-block section-services py-20 bg-[#F9F9F9] overflow-hidden">
            <div className="container mx-auto px-4">
                <div className="flex flex-col lg:flex-row gap-[10px] items-center justify-center">

                    {/* INFO CARD - Final Technical Refinement */}
                    <div
                        className="bg-white p-12 pt-[60px] pb-[50px] rounded-[12px] shadow-[0_5px_25px_rgba(0,0,0,0.02)] border border-gray-100/30 flex-shrink-0 flex flex-col justify-between"
                        style={{ width: '600px', height: '408px' }}
                    >
                        {/* Title: Pixel Perfect 26px/700 Bold at the top */}
                        <div className="w-full">
                            <h2 className="!text-[26px] !font-bold font-sans text-[#0A1128] leading-[1.2] tracking-tight">
                                Customise your trip with one of our preferred partner services
                            </h2>
                        </div>

                        {/* List items: Positioned at the bottom, exact 510px width as requested */}
                        <ul className="space-y-4 w-[510px]">
                            {[
                                { icon: "/legacy/home/images/alt-check.svg", text: "Exclusive Selection" },
                                { icon: "/legacy/home/images/padlock-icon.svg", text: "Safety Guaranteed" },
                                { icon: "/legacy/home/images/chat-icon.svg", text: "24h Customer Support" }
                            ].map((item, idx) => (
                                <li key={idx} className="flex items-center gap-3 h-6 font-bold">
                                    <div className="w-6 h-6 flex items-center justify-center">
                                        <img
                                            src={item.icon}
                                            alt=""
                                            className="w-full h-full object-contain"
                                            style={{
                                                /* Precise Filter for #AD9C7E */
                                                filter: 'brightness(0) saturate(100%) invert(67%) sepia(16%) saturate(601%) hue-rotate(3deg) brightness(87%) contrast(85%)'
                                            }}
                                        />
                                    </div>
                                    <span className="text-[17px] leading-none text-[#192537] font-sans">
                                        {item.text}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* SLIDER WRAPPER - Fixed height 408px */}
                    <div className="relative" style={{ height: '408px', width: 'calc(100% - 610px)' }}>

                        {/* ARROWS - Centered on slider height */}
                        <div className="absolute top-1/2 -translate-y-1/2 -left-5 z-50 pointer-events-none w-[calc(100%+2.5rem)] hidden lg:flex justify-between items-center">
                            <button
                                onClick={() => handleButtonClick('left')}
                                className="w-10 h-10 bg-[#B09E80] hover:bg-[#9E8C6D] text-white flex items-center justify-center shadow-lg transition-all transform hover:scale-105 active:scale-95 pointer-events-auto cursor-pointer"
                                style={{ borderRadius: '50%' }}
                                type="button"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => handleButtonClick('right')}
                                className="w-10 h-10 bg-[#B09E80] hover:bg-[#9E8C6D] text-white flex items-center justify-center shadow-lg transition-all transform hover:scale-105 active:scale-95 pointer-events-auto cursor-pointer"
                                style={{ borderRadius: '50%' }}
                                type="button"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>

                        {/* ACTUAL SLIDER - 10px GAP as requested */}
                        <div
                            ref={scrollRef}
                            onMouseDown={handleMouseDown}
                            onMouseLeave={handleMouseUp}
                            onMouseUp={handleMouseUp}
                            onMouseMove={handleMouseMove}
                            className={`flex gap-[10px] overflow-x-auto hide-scrollbar select-none cursor-grab active:cursor-grabbing h-full touch-pan-x snap-x snap-mandatory`}
                            style={{ scrollBehavior: 'smooth' }}
                        >
                            {SERVICES.map((service, i) => (
                                <div
                                    key={i}
                                    className="flex-shrink-0 snap-start rounded-[12px] overflow-hidden relative shadow-sm"
                                    style={{ width: '280px', height: '408px' }}
                                >
                                    <img
                                        src={service.image}
                                        alt={service.title}
                                        className="w-full h-full object-cover pointer-events-none"
                                        draggable={false}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none"></div>
                                    <h4 className="absolute bottom-6 left-6 text-white text-[18px] font-bold font-playfair pr-6 pointer-events-none leading-tight">
                                        {service.title}
                                    </h4>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
            <style jsx>{`
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .hide-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </section>
    );
};
