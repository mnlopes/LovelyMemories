"use client";

import { useState, useEffect } from "react";

// ── Config ────────────────────────────────────────────────
const CITIES = [
    { name: "Porto", accent: "#c9a96e" },
    { name: "Gaia", accent: "#e2b49a" },
    { name: "Lisboa", accent: "#a8c5da" },
    { name: "Algarve", accent: "#b5d5a0" },
    { name: "Madeira", accent: "#d4a5b0" },
];

const STAGGER = 45;      // ms between letters
const DURATION = 520;    // ms per letter transition
const HOLD = 3200;       // ms city is shown before exiting

// ── Types ─────────────────────────────────────────────────
type Phase = "hidden" | "visible" | "exit";

// ── Letter ────────────────────────────────────────────────
function Letter({
    char,
    index,
    phase,
    accent,
    total,
}: {
    char: string;
    index: number;
    phase: Phase;
    accent: string;
    total: number;
}) {
    // Exit: reverse stagger (last letter first)
    const revIdx = total - 1 - index;
    const enterDelay = `${index * STAGGER}ms`;
    const exitDelay = `${revIdx * STAGGER}ms`;
    const delay = phase === "exit" ? exitDelay : enterDelay;

    const style: React.CSSProperties = {
        display: "inline-block",
        color: accent,
        transition: `transform ${DURATION}ms cubic-bezier(0.16,1,0.3,1) ${delay},
                     opacity  ${DURATION - 80}ms ease ${delay},
                     filter   ${DURATION - 80}ms ease ${delay}`,
        willChange: "transform, opacity, filter",
    };

    if (phase === "hidden") {
        style.transform = "translateY(30px) rotateX(50deg)";
        style.opacity = 0;
        style.filter = "blur(8px)";
    } else if (phase === "visible") {
        style.transform = "translateY(0px) rotateX(0deg)";
        style.opacity = 1;
        style.filter = "blur(0px)";
    } else {
        // exit: fly up + blur
        style.transform = "translateY(-24px) rotateX(-40deg)";
        style.opacity = 0;
        style.filter = "blur(6px)";
    }

    return (
        <span style={style}>
            {char === " " ? "\u00A0" : char}
        </span>
    );
}

// ── Word ──────────────────────────────────────────────────
function CityWord({ city, phase }: { city: typeof CITIES[0]; phase: Phase }) {
    const letters = city.name.split("");
    return (
        <span style={{ display: "inline-block", perspective: "600px" }}>
            {letters.map((char, i) => (
                <Letter
                    key={i}
                    char={char}
                    index={i}
                    phase={phase}
                    accent={city.accent}
                    total={letters.length}
                />
            ))}
        </span>
    );
}

// ── Main ──────────────────────────────────────────────────
export default function CityAnimator() {
    const [idx, setIdx] = useState(0);
    const [phase, setPhase] = useState<Phase>("hidden");

    useEffect(() => {
        // Mount → trigger enter on next frame
        const raf = requestAnimationFrame(() => setPhase("visible"));
        return () => cancelAnimationFrame(raf);
    }, []);

    useEffect(() => {
        if (phase !== "visible") return;

        // Hold, then exit
        const holdTimer = setTimeout(() => {
            setPhase("exit");
        }, HOLD);

        return () => clearTimeout(holdTimer);
    }, [phase, idx]);

    useEffect(() => {
        if (phase !== "exit") return;

        // Wait for exit animation to complete, then swap city + enter
        const total = CITIES[idx].name.length;
        const exitMs = (total - 1) * STAGGER + DURATION + 60;

        const swapTimer = setTimeout(() => {
            const next = (idx + 1) % CITIES.length;
            setIdx(next);
            setPhase("hidden");
            // One frame later → enter
            requestAnimationFrame(() =>
                requestAnimationFrame(() => setPhase("visible"))
            );
        }, exitMs);

        return () => clearTimeout(swapTimer);
    }, [phase, idx]);

    return (
        <span style={{ display: "inline-block", verticalAlign: "baseline" }}>
            <CityWord city={CITIES[idx]} phase={phase} />
        </span>
    );
}
