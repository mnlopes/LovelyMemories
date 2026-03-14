"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HomeBookingBar } from "./HomeBookingBar";
import { CITIES } from "./CityLiquidMorph";

// ── Timing ────────────────────────────────────────────────
const HOLD_MS = 4200;  // city is shown
const COVER_MS = 580;   // curtain slides up covering screen
const PAUSE_MS = 120;   // held fully covered (swap fires here)
const REVEAL_MS = 680;   // curtain exits up, new city revealed

type Phase = "idle" | "covering" | "covered" | "revealing";

// Gold gradient text
const GOLD: React.CSSProperties = {
    backgroundImage: "linear-gradient(135deg, #f5e6c8 0%, #c9a96e 45%, #e8d5a0 70%, #a07840 100%)",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
};

// ── Grain texture overlay (CSS, no image needed) ──────────
const GRAIN_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.06'/%3E%3C/svg%3E")`;

export const HomeHeroV10 = () => {
    const [cityIdx, setCityIdx] = useState(0);
    const [phase, setPhase] = useState<Phase>("idle");
    const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

    function clear() { timers.current.forEach(clearTimeout); timers.current = []; }

    // State machine
    useEffect(() => {
        if (phase !== "idle") return;
        const t = setTimeout(() => setPhase("covering"), HOLD_MS);
        timers.current.push(t);
        return clear;
    }, [phase]);

    useEffect(() => {
        if (phase !== "covering") return;
        const t = setTimeout(() => setPhase("covered"), COVER_MS);
        timers.current.push(t);
        return clear;
    }, [phase]);

    useEffect(() => {
        if (phase !== "covered") return;
        // Swap city while hidden
        setCityIdx(i => (i + 1) % CITIES.length);
        const t = setTimeout(() => setPhase("revealing"), PAUSE_MS);
        timers.current.push(t);
        return clear;
    }, [phase]);

    useEffect(() => {
        if (phase !== "revealing") return;
        const t = setTimeout(() => setPhase("idle"), REVEAL_MS);
        timers.current.push(t);
        return clear;
    }, [phase]);

    const isCovering = phase === "covering" || phase === "covered";
    const isRevealing = phase === "revealing";

    return (
        <section className="relative w-full z-30 mb-0 md:mb-36 overflow-hidden">

            {/* ── Curtain — slides within the hero section only ── */}
            <motion.div
                aria-hidden="true"
                initial={{ y: "100%" }}
                animate={{
                    y: isCovering ? "0%" : isRevealing ? "-100%" : "100%",
                }}
                transition={{
                    duration: isCovering ? COVER_MS / 1000 : REVEAL_MS / 1000,
                    ease: isCovering
                        ? [0.76, 0, 0.24, 1]   // easeInOutQuart — fast cover
                        : [0.22, 1, 0.36, 1],  // easeOutExpo   — snappy reveal
                }}
                style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 50,
                    background: "linear-gradient(180deg, #0d1a2b 0%, #192537 60%, #0d1a2b 100%)",
                    backgroundImage: `${GRAIN_SVG}, linear-gradient(180deg, #0d1a2b 0%, #192537 60%, #0d1a2b 100%)`,
                    backgroundBlendMode: "overlay",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    pointerEvents: "none",
                }}
            >
                {/* Lovely Memories wordmark on the curtain */}
                <motion.span
                    animate={{ opacity: isCovering || isRevealing ? 1 : 0 }}
                    transition={{ duration: 0.3 }}
                    style={{
                        ...GOLD,
                        fontSize: "clamp(14px, 2vw, 22px)",
                        fontWeight: 600,
                        letterSpacing: "0.35em",
                        textTransform: "uppercase",
                    }}
                >
                    Lovely Memories
                </motion.span>
            </motion.div>

            <div className="relative w-full h-[500px] md:h-[600px] lg:h-[700px] flex items-center isolate overflow-hidden">

                {/* ── Background (simple crossfade under curtain) ── */}
                <AnimatePresence mode="sync">
                    <motion.div
                        key={cityIdx}
                        className="absolute inset-0 z-0"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.01 }} // instant swap — curtain hides it
                        style={{
                            backgroundImage: `url(${CITIES[cityIdx].image})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                        }}
                    />
                </AnimatePresence>

                {/* Gradient overlay */}
                <div
                    className="absolute inset-0 z-10"
                    style={{
                        background: "linear-gradient(90deg, rgba(13,26,43,0.88) 0%, rgba(13,26,43,0.52) 55%, transparent 100%)",
                    }}
                />

                {/* ── Hero Content ── */}
                <div className="relative z-20 container mx-auto px-4 h-full flex flex-col justify-center pb-20 md:pb-0">
                    <div className="w-full lg:w-10/12 xl:w-9/12 md:mt-24">

                        {/* Eyebrow */}
                        <p className="text-white/70 text-base md:text-xl font-medium tracking-widest uppercase mb-4">
                            Book one of our exquisite, curated homes
                        </p>

                        {/* Headline with city */}
                        <h1 className="text-white text-[22px] md:text-4xl lg:text-5xl leading-tight font-sans font-bold drop-shadow-lg">
                            And create your own Lovely,{" "}
                            <br className="hidden sm:block" />
                            long lasting Memories of{" "}
                            <span style={GOLD}>{CITIES[cityIdx].name}</span>
                        </h1>

                        {/* City dots */}
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
                                        transition={{ duration: 0.4 }}
                                        style={{ height: 5, borderRadius: 3, background: "#c9a96e" }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Booking Bar Desktop ── */}
                <div className="hidden md:block absolute left-0 right-0 z-30 -bottom-12 px-4 pointer-events-none">
                    <div className="w-full pointer-events-auto"><HomeBookingBar /></div>
                </div>
            </div>

            {/* ── Booking Bar Mobile ── */}
            <div className="md:hidden relative z-40 -mt-24 px-4 mb-20">
                <HomeBookingBar />
            </div>
        </section>
    );
};
