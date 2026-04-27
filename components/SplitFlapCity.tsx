"use client";

import { useState, useEffect, useRef } from "react";

const CHARS = " ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const CITIES = ["PORTO", "GAIA", "LISBOA", "ALGARVE", "MADEIRA"];

function charIdx(c: string) {
    const i = CHARS.indexOf(c.toUpperCase());
    return i < 0 ? 0 : i;
}

// ── Single character — no box, pure text ──────────────────
function AnimChar({ target, delay = 0 }: { target: string; delay?: number }) {
    const [display, setDisplay] = useState(target);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const prevTarget = useRef(target);
    const mounted = useRef(false);

    useEffect(() => {
        if (!mounted.current) {
            mounted.current = true;
            return;
        }
        if (prevTarget.current === target) return;
        prevTarget.current = target;
        let cancelled = false;

        const steps: string[] = [];
        let s = charIdx(display);
        for (let i = 0; i < CHARS.length; i++) {
            s = (s + 1) % CHARS.length;
            steps.push(CHARS[s]);
            if (CHARS[s] === target) break;
        }

        let i = 0;
        const next = () => {
            if (cancelled || i >= steps.length) return;
            setDisplay(steps[i]);
            i++;
            timerRef.current = setTimeout(next, 52);
        };
        timerRef.current = setTimeout(next, delay);

        return () => {
            cancelled = true;
            if (timerRef.current) clearTimeout(timerRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [target]);

    const d = display === " " || display === "\u00A0" ? "\u00A0" : display;

    return (
        <span style={{ color: "#c9a96e", textShadow: "0 0 16px rgba(180,140,80,0.3)" }}>
            {d}
        </span>
    );
}

// ── Word ──────────────────────────────────────────────────
function SplitFlapWord({ word }: { word: string }) {
    const maxLen = Math.max(...CITIES.map((c) => c.length));
    const padded = word.toUpperCase().padEnd(maxLen, "\u00A0");

    return (
        <span aria-label={word}>
            {padded.split("").map((c, i) => (
                <AnimChar key={i} target={c} delay={i * 65} />
            ))}
        </span>
    );
}

// ── Export ────────────────────────────────────────────────
export default function SplitFlapCity() {
    const [cityIdx, setCityIdx] = useState(0);

    useEffect(() => {
        const t = setInterval(() => {
            setCityIdx((i) => (i + 1) % CITIES.length);
        }, 3000);
        return () => clearInterval(t);
    }, []);

    return <SplitFlapWord word={CITIES[cityIdx]} />;
}
