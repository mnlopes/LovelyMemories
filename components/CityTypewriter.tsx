"use client";

import { useState, useEffect, useRef } from "react";

// ── Config ────────────────────────────────────────────────
const CITIES = ["Porto", "Gaia", "Lisboa", "Algarve", "Madeira"];

const TYPE_SPEED = 95;   // ms per char while typing
const DELETE_SPEED = 55;  // ms per char while deleting
const HOLD_TIME = 2800; // ms city is shown before deleting
const PAUSE_AFTER = 350;  // ms pause before typing the next city

// Gold gradient style (same as CityScrambler's locked chars)
const GOLD_STYLE: React.CSSProperties = {
    backgroundImage:
        "linear-gradient(135deg, #f5e6c8 0%, #c9a96e 45%, #e8d5a0 70%, #a07840 100%)",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
    textShadow: "none",
    display: "inline",
};

// ── Main export ───────────────────────────────────────────
export default function CityTypewriter() {
    const [displayed, setDisplayed] = useState("");
    const [cityIdx, setCityIdx] = useState(0);
    // phase: "typing" | "holding" | "deleting" | "pausing"
    const [phase, setPhase] = useState<"typing" | "holding" | "deleting" | "pausing">("typing");

    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const charRef = useRef(0); // how many chars are currently shown

    // Clear any running timer on unmount
    useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

    // Main state machine
    useEffect(() => {
        const city = CITIES[cityIdx];

        if (phase === "typing") {
            if (charRef.current < city.length) {
                timerRef.current = setTimeout(() => {
                    charRef.current += 1;
                    setDisplayed(city.slice(0, charRef.current));
                }, TYPE_SPEED);
            } else {
                // Fully typed → hold
                timerRef.current = setTimeout(() => setPhase("deleting"), HOLD_TIME);
            }
        }

        if (phase === "deleting") {
            if (charRef.current > 0) {
                timerRef.current = setTimeout(() => {
                    charRef.current -= 1;
                    setDisplayed(city.slice(0, charRef.current));
                }, DELETE_SPEED);
            } else {
                // Fully deleted → pause then next city
                setPhase("pausing");
            }
        }

        if (phase === "pausing") {
            timerRef.current = setTimeout(() => {
                setCityIdx((i) => (i + 1) % CITIES.length);
                setPhase("typing");
            }, PAUSE_AFTER);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase, displayed, cityIdx]);

    return (
        <span
            style={{
                display: "inline",
                fontFamily: "inherit",
                fontWeight: "inherit",
                fontSize: "inherit",
                lineHeight: "inherit",
                whiteSpace: "nowrap",
            }}
            aria-label={CITIES[cityIdx]}
        >
            {/* The typed city name */}
            <span style={GOLD_STYLE}>{displayed}</span>

            {/* Blinking cursor bar */}
            <span
                style={{
                    display: "inline-block",
                    width: "3px",
                    height: "0.85em",
                    marginLeft: "2px",
                    verticalAlign: "middle",
                    borderRadius: "2px",
                    backgroundColor: "#c9a96e",
                    boxShadow: "0 0 8px rgba(201,169,110,0.8)",
                    animation: "lm-cursor-blink 0.75s step-start infinite",
                }}
                aria-hidden="true"
            />

            {/* Cursor keyframe (injected once) */}
            <style>{`
                @keyframes lm-cursor-blink {
                    0%, 100% { opacity: 1; }
                    50%       { opacity: 0; }
                }
            `}</style>
        </span>
    );
}
