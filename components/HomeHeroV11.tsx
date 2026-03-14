"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { HomeBookingBar } from "./HomeBookingBar";
import { CITIES } from "./CityLiquidMorph";
import CityLiquidMorph from "./CityLiquidMorph";
import WebGLDisplacementBg from "./WebGLDisplacementBg";

const IMAGES = CITIES.map(c => c.image);
const TRANS_MS = 1600;

export const HomeHeroV11 = () => {
    const [cityIdx, setCityIdx] = useState(0);

    return (
        <section className="relative w-full z-30 mb-0 md:mb-36">
            <div className="relative w-full h-[500px] md:h-[600px] lg:h-[700px] flex items-center isolate overflow-hidden">

                {/* ── WebGL displacement warp ── */}
                <WebGLDisplacementBg images={IMAGES} cityIdx={cityIdx} duration={TRANS_MS} />

                {/* Dark overlay */}
                <div
                    className="absolute inset-0 z-10"
                    style={{
                        background:
                            "linear-gradient(90deg, rgba(10,18,35,0.90) 0%, rgba(10,18,35,0.50) 55%, rgba(10,18,35,0.08) 100%)",
                    }}
                />

                {/* ── Content ── */}
                <div className="relative z-20 container mx-auto px-4 h-full flex flex-col justify-center pb-20 md:pb-0">
                    <div className="w-full lg:w-10/12 xl:w-9/12 md:mt-24">
                        <motion.p
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 0.7, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.3 }}
                            className="text-white text-base md:text-xl font-medium tracking-widest uppercase mb-4"
                        >
                            Book one of our exquisite, curated homes
                        </motion.p>

                        <h1 className="text-white text-[22px] md:text-4xl lg:text-5xl leading-tight font-sans font-bold drop-shadow-lg">
                            And create your own Lovely,{" "}
                            <br className="hidden sm:block" />
                            long lasting Memories of{" "}
                            <CityLiquidMorph onCityChange={setCityIdx} />
                        </h1>

                        <div className="mt-6 flex items-center gap-3">
                            <span style={{
                                fontSize: 11, letterSpacing: "0.25em",
                                textTransform: "uppercase", color: "rgba(255,255,255,0.4)",
                                fontWeight: 500, minWidth: 64,
                            }}>
                                {CITIES[cityIdx].name}
                            </span>
                            <div className="flex gap-2">
                                {CITIES.map((_, i) => (
                                    <motion.div
                                        key={i}
                                        animate={{ width: i === cityIdx ? 24 : 5, opacity: i === cityIdx ? 1 : 0.3 }}
                                        transition={{ duration: 0.5 }}
                                        style={{ height: 5, borderRadius: 3, background: "#c9a96e" }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Booking Bar Desktop */}
                <div className="hidden md:block absolute left-0 right-0 z-30 -bottom-12 px-4 pointer-events-none">
                    <div className="w-full pointer-events-auto"><HomeBookingBar /></div>
                </div>
            </div>

            {/* Booking Bar Mobile */}
            <div className="md:hidden relative z-40 -mt-24 px-4 mb-20">
                <HomeBookingBar />
            </div>
        </section>
    );
};
