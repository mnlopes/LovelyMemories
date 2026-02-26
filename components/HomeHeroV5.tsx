import React from "react";
import Image from "next/image";
import { HomeBookingBar } from "./HomeBookingBar";
import CityTypewriter from "./CityTypewriter";

export const HomeHeroV5 = () => {
    return (
        <section className="relative w-full z-30 mb-0 md:mb-36">
            <div className="relative w-full h-[500px] md:h-[600px] lg:h-[700px] flex items-center isolate">

                {/* Background */}
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
                        style={{ background: "linear-gradient(90deg, #192537cc 0%, #192537b3 55%, #19253700 100%)" }}
                    />
                </div>

                {/* Content */}
                <div className="relative z-10 container mx-auto px-4 h-full flex flex-col justify-center pb-20 md:pb-0">
                    <div className="w-full lg:w-10/12 xl:w-9/12 md:mt-24">
                        <h6 className="text-white mb-4 text-base md:text-xl font-medium tracking-widest uppercase opacity-80">
                            Booking one of our exquisite, curated Homes
                        </h6>
                        <h1 className="text-white text-[22px] md:text-4xl lg:text-5xl leading-tight font-sans font-bold drop-shadow-lg">
                            And create your own Lovely,{" "}
                            <br className="hidden sm:block" />
                            Long Last Memories of{" "}
                            <CityTypewriter />
                        </h1>
                    </div>
                </div>

                {/* Booking Bar Desktop */}
                <div className="hidden md:block absolute left-0 right-0 z-20 -bottom-12 px-4 pointer-events-none">
                    <div className="w-full pointer-events-auto">
                        <HomeBookingBar />
                    </div>
                </div>
            </div>

            {/* Booking Bar Mobile */}
            <div className="md:hidden relative z-40 -mt-24 px-4 mb-20">
                <HomeBookingBar />
            </div>
        </section>
    );
};
