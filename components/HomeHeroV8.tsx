"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { HomeBookingBar } from "./HomeBookingBar";
import CityLiquidMorph, { CITIES } from "./CityLiquidMorph";

// Diagonal wipe: new image sweeps in from top-right corner to bottom-left
// using a parallelogram clip-path that slides across the viewport
const WIPE_DURATION = 1.1; // seconds
const WIPE_EASE = [0.76, 0, 0.24, 1] as const; // easeInOutQuart

export const HomeHeroV8 = () => {
    const [cityIdx, setCityIdx] = useState(0);

    return (
        <section className="relative w-full z-30 mb-0 md:mb-36 overflow-visible">
            <div className="relative w-full h-[500px] md:h-[600px] lg:h-[700px] flex items-center isolate overflow-hidden" style={{ clipPath: "none" }}>

                {/* ── Backgrounds with diagonal wipe ── */}
                <AnimatePresence initial={false}>
                    {CITIES.map((city, i) =>
                        i === cityIdx ? (
                            <motion.div
                                key={i}
                                className="absolute inset-0 z-0"
                                // Enter via diagonal clip-path sweep from top-right → bottom-left
                                initial={{
                                    clipPath: "polygon(110% 0%, 110% 0%, 100% 100%, 100% 100%)",
                                }}
                                animate={{
                                    clipPath: "polygon(-10% 0%, 110% 0%, 100% 100%, -10% 100%)",
                                }}
                                exit={{
                                    clipPath: "polygon(-10% 0%, -10% 0%, -20% 100%, -20% 100%)",
                                }}
                                transition={{ duration: WIPE_DURATION, ease: WIPE_EASE }}
                                style={{
                                    backgroundImage: `url(${city.image})`,
                                    backgroundSize: "cover",
                                    backgroundPosition: "center",
                                }}
                            />
                        ) : null
                    )}
                </AnimatePresence>

                {/* Dark gradient overlay — always on top of images */}
                <div
                    className="absolute inset-0 z-10"
                    style={{
                        background:
                            "linear-gradient(90deg, rgba(15,25,45,0.82) 0%, rgba(15,25,45,0.50) 55%, transparent 100%)",
                    }}
                />

                {/* ── Hero Content ── */}
                <div className="relative z-20 container mx-auto px-4 h-full flex flex-col justify-center pb-20 md:pb-0">
                    <div className="w-full lg:w-10/12 xl:w-9/12 md:mt-24">

                        {/* Diagonal accent line — premium detail */}
                        <motion.div
                            className="mb-5 flex items-center gap-3"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                        >
                            <span
                                style={{
                                    display: "block",
                                    width: 40,
                                    height: 1.5,
                                    background: "linear-gradient(90deg, #c9a96e, transparent)",
                                }}
                            />
                            <span className="text-white text-sm md:text-base font-medium tracking-widest uppercase opacity-70">
                                Book one of our exquisite, curated homes
                            </span>
                        </motion.div>

                        <h1 className="text-white text-[22px] md:text-4xl lg:text-5xl leading-tight font-sans font-bold drop-shadow-lg">
                            And create your own Lovely,{" "}
                            <br className="hidden sm:block" />
                            long lasting Memories of{" "}
                            <CityLiquidMorph onCityChange={setCityIdx} />
                        </h1>

                        {/* Dots only (city name removed) */}
                        <div className="mt-6 flex items-center gap-2">
                            {CITIES.map((_, i) => (
                                <motion.div
                                    key={i}
                                    animate={{
                                        width: i === cityIdx ? 24 : 5,
                                        opacity: i === cityIdx ? 1 : 0.3,
                                    }}
                                    transition={{ duration: 0.4, ease: "easeInOut" }}
                                    style={{
                                        height: 5,
                                        borderRadius: 3,
                                        background: "#c9a96e",
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Booking Bar Desktop — outside overflow-hidden so Search is not clipped ── */}
            <div className="hidden md:block absolute left-0 right-0 z-30 -bottom-12 px-4 pointer-events-none">
                <div className="w-full pointer-events-auto">
                    <HomeBookingBar />
                </div>
            </div>

            {/* ── Booking Bar Mobile ── */}
            <div className="md:hidden relative z-40 -mt-24 px-4 mb-20">
                <HomeBookingBar />
            </div>
        </section>
    );
};
