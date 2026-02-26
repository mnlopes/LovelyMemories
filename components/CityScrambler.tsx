"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ── Config ────────────────────────────────────────────────
const CITIES = ["PORTO", "LISBOA", "ALGARVE", "MADEIRA"];
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
    const maxLen = MAX_LEN;
    const padded = target.padEnd(maxLen, " ");

    // Each char: null = still scrambling, string = locked value
    const [chars, setChars] = useState<(string | null)[]>(
        () => padded.split("").map((c) => c)
    );

    const rafRef = useRef<number | null>(null);
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

    const scramble = useCallback(() => {
        // Clear all pending timers
        timersRef.current.forEach(clearTimeout);
        timersRef.current = [];
        if (rafRef.current) cancelAnimationFrame(rafRef.current);

        // Reset — everything back to scrambling (null)
        setChars(padded.split("").map(() => null));

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
        padded.split("").forEach((char, i) => {
            const t = setTimeout(() => {
                setChars((prev) => {
                    const next = [...prev];
                    next[i] = char; // lock this position
                    return next;
                });

                // If last char locked — stop scramble loop
                if (i === maxLen - 1) {
                    running = false;
                    if (rafRef.current) cancelAnimationFrame(rafRef.current);
                }
            }, LOCK_STEP * (i + 1));
            timersRef.current.push(t);
        });
    }, [padded, maxLen]);

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
    locked,
}: {
    value: string;
    locked: boolean;
}) {
    const isSpace = value === " " || value === "";

    return (
        <span
            style={{
                display: "inline-block",
                color: locked
                    ? "transparent"
                    : "rgba(201,169,110,0.55)", // dim gold while scrambling
                backgroundImage: locked
                    ? "linear-gradient(135deg, #f5e6c8 0%, #c9a96e 45%, #e8d5a0 70%, #a07840 100%)"
                    : "none",
                WebkitBackgroundClip: locked ? "text" : "unset",
                backgroundClip: locked ? "text" : "unset",
                textShadow: locked
                    ? "0 0 24px rgba(201,169,110,0.6), 0 0 60px rgba(201,169,110,0.2)"
                    : "none",
                fontVariantNumeric: "tabular-nums",
                letterSpacing: isSpace ? "0" : "0.02em",
                transition: locked ? "color 120ms ease, text-shadow 200ms ease" : "none",
                minWidth: isSpace ? "0.35em" : undefined,
            }}
        >
            {isSpace ? "\u00A0" : value}
        </span>
    );
}

// ── Main export ───────────────────────────────────────────
export default function CityScrambler() {
    const [cityIdx, setCityIdx] = useState(0);
    const chars = useScramble(CITIES[cityIdx]);

    useEffect(() => {
        const t = setInterval(() => {
            setCityIdx((i) => (i + 1) % CITIES.length);
        }, HOLD_TIME + MAX_LEN * LOCK_STEP + 200);
        return () => clearInterval(t);
    }, []);

    return (
        <span
            style={{
                display: "inline",
                fontFamily: "inherit",
                fontWeight: "inherit",
                fontSize: "inherit",
                lineHeight: "inherit",
            }}
            aria-label={CITIES[cityIdx]}
        >
            {chars.map((ch, i) => (
                <ScrambleChar
                    key={i}
                    value={ch ?? randomChar()}
                    locked={ch !== null}
                />
            ))}
        </span>
    );
}
