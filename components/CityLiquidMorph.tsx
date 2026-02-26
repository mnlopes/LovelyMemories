"use client";

import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";

// ── Config ────────────────────────────────────────────────
export const CITIES = [
    {
        name: "Porto",
        image: "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=1600&q=80&auto=format&fit=crop",
        overlay: "rgba(12,20,35,0.55)",
    },
    {
        name: "Lisboa",
        image: "https://images.unsplash.com/photo-1513735492246-483525079686?w=1600&q=80&auto=format&fit=crop",
        overlay: "rgba(10,18,30,0.50)",
    },
    {
        name: "Algarve",
        image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&q=80&auto=format&fit=crop",
        overlay: "rgba(15,25,20,0.45)",
    },
    {
        name: "Madeira",
        image: "https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=1600&q=80&auto=format&fit=crop",
        overlay: "rgba(10,20,25,0.50)",
    },
];

const HOLD_MS = 4000; // how long city is shown
const FILTER_ID = "lm-liquid-morph";

// ── SVG Liquid Morph Filter ────────────────────────────────
// feTurbulence + feDisplacementMap creates the dissolve warp
function LiquidFilter({ animating }: { animating: boolean }) {
    const stdRef = useRef<SVGAnimateElement>(null);

    return (
        <svg style={{ position: "absolute", width: 0, height: 0 }} aria-hidden="true">
            <defs>
                <filter id={FILTER_ID} x="-20%" y="-20%" width="140%" height="140%"
                    colorInterpolationFilters="sRGB">
                    <feTurbulence
                        type="fractalNoise"
                        baseFrequency={animating ? "0.035 0.04" : "0.01 0.01"}
                        numOctaves="4"
                        seed="2"
                        result="noise"
                    >
                        {animating && (
                            <animate
                                ref={stdRef}
                                attributeName="baseFrequency"
                                from="0.01 0.01"
                                to="0.06 0.07"
                                dur="0.55s"
                                fill="freeze"
                            />
                        )}
                    </feTurbulence>
                    <feDisplacementMap
                        in="SourceGraphic"
                        in2="noise"
                        scale={animating ? 55 : 0}
                        xChannelSelector="R"
                        yChannelSelector="G"
                    >
                        {animating && (
                            <animate
                                attributeName="scale"
                                from="0"
                                to="55"
                                dur="0.55s"
                                fill="freeze"
                            />
                        )}
                    </feDisplacementMap>
                </filter>
            </defs>
        </svg>
    );
}

// ── City text with liquid dissolve ────────────────────────
type Phase = "visible" | "dissolving" | "materialising";

function CityText({ city }: { city: typeof CITIES[0] }) {
    return (
        <span
            style={{
                backgroundImage: "linear-gradient(135deg, #f5e6c8 0%, #c9a96e 45%, #e8d5a0 70%, #a07840 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                fontFamily: "inherit",
                fontWeight: "inherit",
                fontSize: "inherit",
                lineHeight: "inherit",
                display: "inline",
            }}
        >
            {city.name}
        </span>
    );
}

// ── Main City Morph component ─────────────────────────────
export default function CityLiquidMorph({
    onCityChange,
}: {
    onCityChange?: (idx: number) => void;
}) {
    const [idx, setIdx] = useState(0);
    const [phase, setPhase] = useState<Phase>("visible");

    // Phase machine
    useEffect(() => {
        if (phase === "visible") {
            const t = setTimeout(() => setPhase("dissolving"), HOLD_MS);
            return () => clearTimeout(t);
        }
        if (phase === "dissolving") {
            // dissolve out takes 550ms, then swap + materialise
            const t = setTimeout(() => {
                const next = (idx + 1) % CITIES.length;
                setIdx(next);
                onCityChange?.(next);
                setPhase("materialising");
            }, 580);
            return () => clearTimeout(t);
        }
        if (phase === "materialising") {
            // materialise-in takes 550ms, then hold
            const t = setTimeout(() => setPhase("visible"), 580);
            return () => clearTimeout(t);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase, idx]);

    const isAnimating = phase !== "visible";

    // AnimatePresence key changes on idx so we get a fresh mount per city
    const opacity =
        phase === "dissolving" ? 0
            : phase === "materialising" ? 1
                : 1;

    const blur =
        phase === "dissolving" ? "blur(12px)"
            : phase === "materialising" ? "blur(0px)"
                : "blur(0px)";

    const scale =
        phase === "dissolving" ? 0.88
            : phase === "materialising" ? 1
                : 1;

    return (
        <span style={{ display: "inline-block", position: "relative", verticalAlign: "baseline" }}>
            <LiquidFilter animating={isAnimating} />

            <AnimatePresence mode="wait">
                <motion.span
                    key={idx}
                    initial={{ opacity: 0, filter: "blur(16px)", scale: 1.05 }}
                    animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
                    exit={{ opacity: 0, filter: "blur(16px)", scale: 0.92 }}
                    transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                        display: "inline-block",
                        filter: isAnimating
                            ? `url(#${FILTER_ID}) blur(0px)`
                            : undefined,
                    }}
                >
                    <CityText city={CITIES[idx]} />
                </motion.span>
            </AnimatePresence>
        </span>
    );
}
