"use client";

import { useState, useEffect, useRef } from "react";

// ── Config ────────────────────────────────────────────────
const CHARSET = " ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const CITIES = ["PORTO", "GAIA", "LISBOA", "ALGARVE", "MADEIRA"];
const MAX_LEN = Math.max(...CITIES.map((c) => c.length));

const STAGGER = 80;    // ms between columns starting
const HOLD_MS = 3200;  // ms to show city before next

// Steps to go from char A to char B through the charset
function stepsTo(from: string, to: string): string[] {
    const steps: string[] = [];
    let s = CHARSET.indexOf(from.toUpperCase());
    if (s < 0) s = 0;
    for (let i = 0; i < CHARSET.length; i++) {
        s = (s + 1) % CHARSET.length;
        steps.push(CHARSET[s]);
        if (CHARSET[s] === to.toUpperCase()) break;
    }
    return steps;
}

// ── Single flap char ──────────────────────────────────────
// Uses a 2-phase scaleY animation (fold out → swap → fold in)
// so it works perfectly as inline text without position hacks.
type FlapPhase = "idle" | "out" | "in";

function FlapChar({ target, delay = 0 }: { target: string; delay?: number }) {
    const [shown, setShown] = useState(target);
    const [phase, setPhase] = useState<FlapPhase>("idle");

    const queueRef = useRef<string[]>([]);
    const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
    const prevTarget = useRef(target);
    const mounted = useRef(false);

    function clear() { timers.current.forEach(clearTimeout); timers.current = []; }

    // Drain one step from the queue
    const drainStep = useRef<() => void>(() => { });
    drainStep.current = () => {
        if (queueRef.current.length === 0) { setPhase("idle"); return; }
        const next = queueRef.current.shift()!;
        setPhase("out");
        // after out animation completes (60ms), swap char and fold back in
        const t = setTimeout(() => {
            setShown(next === " " ? "\u00A0" : next);
            setPhase("in");
            // after in animation completes, drain next step
            const t2 = setTimeout(() => drainStep.current(), 60);
            timers.current.push(t2);
        }, 60);
        timers.current.push(t);
    };

    useEffect(() => {
        if (!mounted.current) { mounted.current = true; return; }
        if (prevTarget.current === target) return;
        clear();
        queueRef.current = stepsTo(prevTarget.current, target);
        prevTarget.current = target;

        const t0 = setTimeout(() => drainStep.current(), delay);
        timers.current.push(t0);
        return clear;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [target]);

    const disp = shown === " " ? "\u00A0" : shown;

    const transform =
        phase === "out" ? "scaleY(0)"
            : phase === "in" ? "scaleY(1)"
                : "scaleY(1)";

    const transition =
        phase === "out" ? "transform 60ms ease-in"
            : phase === "in" ? "transform 60ms ease-out"
                : "none";

    return (
        <span
            style={{
                display: "inline-block",
                transformOrigin: "center",
                transform,
                transition,
                backgroundImage: "linear-gradient(135deg, #f5e6c8 0%, #c9a96e 45%, #e8d5a0 70%, #a07840 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                textShadow: "none",
                fontVariantNumeric: "tabular-nums",
                letterSpacing: disp === "\u00A0" ? "0" : "0.02em",
                minWidth: disp === "\u00A0" ? "0.38em" : undefined,
            }}
        >
            {disp}
        </span>
    );
}

// ── Word ──────────────────────────────────────────────────
function SplitFlapWord({ word }: { word: string }) {
    const padded = word.toUpperCase().padEnd(MAX_LEN, " ");
    return (
        <span style={{ display: "inline" }} aria-label={word}>
            {padded.split("").map((ch, i) => (
                <FlapChar key={i} target={ch} delay={i * STAGGER} />
            ))}
        </span>
    );
}

// ── Main export ───────────────────────────────────────────
// Total time for all columns to finish one cycle
const CYCLE_MS = MAX_LEN * STAGGER + CHARSET.length * 120 + 200;

export default function SplitFlapCityV2() {
    const [cityIdx, setCityIdx] = useState(0);

    useEffect(() => {
        const t = setInterval(
            () => setCityIdx((i) => (i + 1) % CITIES.length),
            HOLD_MS + CYCLE_MS
        );
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
        >
            <SplitFlapWord word={CITIES[cityIdx]} />
        </span>
    );
}
