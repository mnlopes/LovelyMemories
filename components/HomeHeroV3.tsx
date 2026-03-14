import React from "react";
import Image from "next/image";
import { HomeBookingBar } from "./HomeBookingBar";
import CityAnimator from "./CityAnimator";

export const HomeHeroV3 = () => {
    return (
        <section className="relative w-full z-30 mb-0 md:mb-36">
            <div className="relative w-full h-[500px] md:h-[600px] lg:h-[700px] flex items-center isolate">

                {/* Background Image */}
                <div className="absolute inset-0 z-0">
                    <Image
                        src="/legacy/home/images/hero-image.png"
                        alt="Lovely Memories Hero"
                        fill
                        priority
                        className="object-cover object-center"
                    />
                    <div
                        className="absolute inset-0 z-10"
                        style={{ background: "linear-gradient(90deg, #192537b3 0%, #192537b3 60%, #19253700 100%)" }}
                    />
                </div>

                {/* Hero Content */}
                <div className="relative z-10 container mx-auto px-4 h-full flex flex-col justify-center pb-20 md:pb-0">
                    <div className="w-full lg:w-9/12 xl:w-8/12 md:mt-24">
                        <h6 className="text-white mb-4 text-base md:text-xl font-medium tracking-wide">
                            Book one of our exquisite, curated homes
                        </h6>
                        {/*
                            CityAnimator uses inline-block + perspective so it wraps
                            naturally inside the h1 without breaking layout.
                        */}
                        <h1
                            className="text-white text-[22px] md:text-4xl lg:text-5xl leading-tight font-sans font-bold drop-shadow-lg"
                            style={{ perspective: "1000px" }}
                        >
                            And create your own Lovely, long lasting Memories of{" "}
                            <CityAnimator />
                        </h1>
                    </div>
                </div>

                {/* Booking Bar - Desktop */}
                <div className="hidden md:block absolute left-0 right-0 z-20 -bottom-12 px-4 pointer-events-none">
                    <div className="w-full pointer-events-auto">
                        <HomeBookingBar />
                    </div>
                </div>
            </div>

            {/* Booking Bar - Mobile */}
            <div className="md:hidden relative z-40 -mt-24 px-4 mb-20">
                <HomeBookingBar />
            </div>
        </section>
    );
};
