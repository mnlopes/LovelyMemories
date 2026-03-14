"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { HomeBookingBar } from "./HomeBookingBar";
import CityLiquidMorph, { CITIES } from "./CityLiquidMorph";

export const HomeHeroV7 = () => {
    const [cityIdx, setCityIdx] = useState(0);

    return (
        <section className="relative w-full z-30 mb-0 md:mb-36">
            <div className="relative w-full h-[500px] md:h-[600px] lg:h-[700px] flex items-center isolate">

                {/* ── Background: crossfade per city ── */}
                <div className="absolute inset-0 z-0 overflow-hidden">
                    <AnimatePresence mode="sync">
                        <motion.div
                            key={cityIdx}
                            className="absolute inset-0"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 1.2, ease: "easeInOut" }}
                            style={{
                                backgroundImage: `url(${CITIES[cityIdx].image})`,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                            }}
                        />
                    </AnimatePresence>

                    {/* Dark + left gradient overlay */}
                    <motion.div
                        key={`overlay-${cityIdx}`}
                        className="absolute inset-0 z-10"
                        initial={{ backgroundColor: "rgba(0,0,0,0)" }}
                        animate={{ backgroundColor: CITIES[cityIdx].overlay }}
                        transition={{ duration: 1.2, ease: "easeInOut" }}
                    />
                    <div
                        className="absolute inset-0 z-10"
                        style={{
                            background: "linear-gradient(90deg, rgba(25,37,55,0.75) 0%, rgba(25,37,55,0.40) 55%, transparent 100%)",
                        }}
                    />
                </div>

                {/* ── Hero Content ── */}
                <div className="relative z-10 container mx-auto px-4 h-full flex flex-col justify-center pb-20 md:pb-0">
                    <div className="w-full lg:w-10/12 xl:w-9/12 md:mt-24">

                        {/* City label badge */}
                        <motion.div
                            key={`badge-${cityIdx}`}
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                            className="mb-4 inline-flex items-center gap-2"
                        >
                            <span className="text-white text-base md:text-xl font-medium tracking-widest uppercase opacity-80">
                                Book one of our exquisite, curated homes
                            </span>
                        </motion.div>

                        <h1 className="text-white text-[22px] md:text-4xl lg:text-5xl leading-tight font-sans font-bold drop-shadow-lg">
                            And create your own Lovely,{" "}
                            <br className="hidden sm:block" />
                            long lasting Memories of{" "}
                            <CityLiquidMorph onCityChange={setCityIdx} />
                        </h1>

                        {/* Subtle city name indicator dots */}
                        <div className="mt-6 flex gap-2">
                            {CITIES.map((c, i) => (
                                <motion.div
                                    key={i}
                                    animate={{
                                        width: i === cityIdx ? 28 : 6,
                                        opacity: i === cityIdx ? 1 : 0.35,
                                    }}
                                    transition={{ duration: 0.4, ease: "easeInOut" }}
                                    style={{
                                        height: 6,
                                        borderRadius: 3,
                                        background: "#c9a96e",
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Booking Bar Desktop ── */}
                <div className="hidden md:block absolute left-0 right-0 z-20 -bottom-12 px-4 pointer-events-none">
                    <div className="w-full pointer-events-auto">
                        <HomeBookingBar />
                    </div>
                </div>
            </div>

            {/* ── Booking Bar Mobile ── */}
            <div className="md:hidden relative z-40 -mt-24 px-4 mb-20">
                <HomeBookingBar />
            </div>
        </section>
    );
};
