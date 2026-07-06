"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ── Config ────────────────────────────────────────────────
const CITIES = ["PORTO", "GAIA", "LISBOA", "ALGARVE", "MYKONOS"];
const SCRAMBLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&";
const MAX_LEN = Math.max(...CITIES.map((c) => c.length));

// How many ms each character scrambles before locking
const LOCK_STEP = 80;   // ms between each character locking
const SCRAMBLE_FPS = 40; // ms per scramble frame (25fps)
const HOLD_TIME = 3000; // ms city is shown

function randomChar() {
    return SCRAMBLE[Math.floor(Math.random() * SCRAMBLE.length)];
}

// ── Hook ──────────────────────────────────────────────────
function useScramble(target: string) {
    // Scramble at the target's own length so the block width stays equal to the
    // final word (no phantom padding slots that make short cities render too wide).
    const len = target.length;

    // Each char: null = still scrambling, string = locked value
    const [chars, setChars] = useState<(string | null)[]>(
        () => target.split("").map((c) => c)
    );

    const rafRef = useRef<number | null>(null);
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

    const scramble = useCallback(() => {
        // Clear all pending timers
        timersRef.current.forEach(clearTimeout);
        timersRef.current = [];
        if (rafRef.current) cancelAnimationFrame(rafRef.current);

        // Reset — everything back to scrambling (null)
        setChars(target.split("").map(() => null));

        // Start scramble loop
        let running = true;
        const loop = () => {
            if (!running) return;
            setChars((prev) =>
                prev.map((c) => (c === null ? randomChar() : c))
            );
            rafRef.current = setTimeout(() => requestAnimationFrame(loop), SCRAMBLE_FPS) as unknown as number;
        };
        requestAnimationFrame(loop);

        // Lock characters one by one, left to right
        target.split("").forEach((char, i) => {
            const t = setTimeout(() => {
                setChars((prev) => {
                    const next = [...prev];
                    next[i] = char; // lock this position
                    return next;
                });

                // If last char locked — stop scramble loop
                if (i === len - 1) {
                    running = false;
                    if (rafRef.current) cancelAnimationFrame(rafRef.current);
                }
            }, LOCK_STEP * (i + 1));
            timersRef.current.push(t);
        });
    }, [target, len]);

    useEffect(() => {
        scramble();
        return () => {
            timersRef.current.forEach(clearTimeout);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [scramble]);

    return chars;
}

// ── Single char display ───────────────────────────────────
function ScrambleChar({
    value,
    finalChar,
    locked,
    mainVariant = false,
}: {
    value: string;
    finalChar: string;
    locked: boolean;
    mainVariant?: boolean;
}) {
    return (
        <span
            style={{
                // Each slot reserves the width of its FINAL letter (an invisible copy
                // below), and the scrambling glyph is overlaid on top — so the block
                // width is constant across every frame and the word never jumps lines.
                position: "relative",
                display: "inline-block",
                letterSpacing: "0.02em",
                fontVariantNumeric: "tabular-nums",
            }}
        >
            {/* Width placeholder — the final letter, invisible */}
            <span style={{ visibility: "hidden" }}>{finalChar}</span>

            {/* Overlaid animated glyph, centered on the reserved slot */}
            <span
                style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: 0,
                    textAlign: "center",
                    color: locked
                        ? (mainVariant ? "#b09e80" : "transparent")
                        : (mainVariant ? "rgba(176,158,128,0.55)" : "rgba(201,169,110,0.55)"), // dim gold while scrambling
                    backgroundImage: locked && !mainVariant
                        ? "linear-gradient(135deg, #f5e6c8 0%, #c9a96e 45%, #e8d5a0 70%, #a07840 100%)"
                        : "none",
                    WebkitBackgroundClip: locked && !mainVariant ? "text" : "unset",
                    backgroundClip: locked && !mainVariant ? "text" : "unset",
                    textShadow: locked && !mainVariant
                        ? "0 0 24px rgba(201,169,110,0.6), 0 0 60px rgba(201,169,110,0.2)"
                        : "none",
                    fontVariantNumeric: "tabular-nums",
                    transition: locked && !mainVariant ? "color 120ms ease, text-shadow 200ms ease" : (locked && mainVariant ? "color 120ms ease" : "none"),
                }}
            >
                {value}
            </span>
        </span>
    );
}

// ── Main export ───────────────────────────────────────────
export default function CityScrambler({ mainVariant = false }: { mainVariant?: boolean }) {
    const [cityIdx, setCityIdx] = useState(0);
    const city = CITIES[cityIdx];
    const chars = useScramble(city);

    useEffect(() => {
        const t = setInterval(() => {
            setCityIdx((i) => (i + 1) % CITIES.length);
        }, HOLD_TIME + MAX_LEN * LOCK_STEP + 200);
        return () => clearInterval(t);
    }, []);

    return (
        <span
            style={{
                // inline-block + nowrap so the city wraps as a whole word instead of
                // breaking mid-word between the per-letter spans (e.g. "MYKON / OS")
                display: "inline-block",
                whiteSpace: "nowrap",
                fontFamily: "inherit",
                fontWeight: "inherit",
                fontSize: "inherit",
                lineHeight: "inherit",
            }}
            aria-label={city}
        >
            {chars.map((ch, i) => (
                <ScrambleChar
                    key={i}
                    value={ch ?? randomChar()}
                    finalChar={city[i]}
                    locked={ch !== null}
                    mainVariant={mainVariant}
                />
            ))}
        </span>
    );
}
