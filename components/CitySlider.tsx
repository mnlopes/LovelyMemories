"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ── Config ────────────────────────────────────────────────
const CITIES = ["Porto", "Gaia", "Lisboa", "Algarve", "Madeira"];
const AUTO_DELAY = 4000; // ms before auto-advance

// ── Types ─────────────────────────────────────────────────
type Dir = "next" | "prev";

// ── Animated City Name ────────────────────────────────────
function CityName({
    city,
    animKey,
    dir,
}: {
    city: string;
    animKey: number;
    dir: Dir;
}) {
    return (
        <span
            key={animKey}
            style={{
                display: "inline-block",
                animation: `citySlide${dir === "next" ? "In" : "InReverse"} 500ms cubic-bezier(0.16,1,0.3,1) both`,
            }}
        >
            {city}
        </span>
    );
}

// ── Progress Bar ──────────────────────────────────────────
function ProgressBar({
    active,
    total,
    progress, // 0-100
    onPrev,
    onNext,
}: {
    active: number;
    total: number;
    progress: number;
    onPrev: () => void;
    onNext: () => void;
}) {
    return (
        <div className="flex items-center gap-3 mt-5">
            {/* Prev button */}
            <button
                onClick={onPrev}
                aria-label="Previous city"
                className="group flex items-center justify-center w-8 h-8 rounded-full border border-white/30 hover:border-[#c9a96e] transition-colors duration-200"
            >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M9 2L4 7L9 12" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                        className="group-hover:stroke-[#c9a96e] transition-colors duration-200" />
                </svg>
            </button>

            {/* Dot + progress track */}
            <div className="flex items-center gap-2">
                {CITIES.map((_, i) => (
                    <div key={i} className="relative">
                        {i === active ? (
                            /* Active: progress bar track */
                            <div
                                className="relative overflow-hidden rounded-full"
                                style={{ width: "36px", height: "3px", background: "rgba(255,255,255,0.2)" }}
                            >
                                <div
                                    style={{
                                        position: "absolute",
                                        top: 0, left: 0, bottom: 0,
                                        width: `${progress}%`,
                                        background: "linear-gradient(90deg, #f5e6c8, #c9a96e)",
                                        borderRadius: "9999px",
                                        transition: "width 100ms linear",
                                    }}
                                />
                            </div>
                        ) : (
                            /* Inactive: small dot */
                            <div
                                style={{
                                    width: "6px",
                                    height: "3px",
                                    borderRadius: "9999px",
                                    background: "rgba(255,255,255,0.3)",
                                }}
                            />
                        )}
                    </div>
                ))}
            </div>

            {/* Next button */}
            <button
                onClick={onNext}
                aria-label="Next city"
                className="group flex items-center justify-center w-8 h-8 rounded-full border border-white/30 hover:border-[#c9a96e] transition-colors duration-200"
            >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M5 2L10 7L5 12" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                        className="group-hover:stroke-[#c9a96e] transition-colors duration-200" />
                </svg>
            </button>
        </div>
    );
}

// ── Main export ───────────────────────────────────────────
export default function CitySlider() {
    const [idx, setIdx] = useState(0);
    const [dir, setDir] = useState<Dir>("next");
    const [animKey, setAnimKey] = useState(0);
    const [progress, setProgress] = useState(0);

    const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const autoRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const startProgress = useCallback(() => {
        setProgress(0);
        if (progressRef.current) clearInterval(progressRef.current);
        const start = Date.now();
        progressRef.current = setInterval(() => {
            const elapsed = Date.now() - start;
            const pct = Math.min((elapsed / AUTO_DELAY) * 100, 100);
            setProgress(pct);
            if (pct >= 100) clearInterval(progressRef.current!);
        }, 80);
    }, []);

    const goTo = useCallback((newIdx: number, direction: Dir) => {
        setDir(direction);
        setIdx(newIdx);
        setAnimKey((k) => k + 1);
        startProgress();
    }, [startProgress]);

    const goNext = useCallback(() => {
        if (autoRef.current) clearTimeout(autoRef.current);
        if (progressRef.current) clearInterval(progressRef.current);
        goTo((idx + 1) % CITIES.length, "next");
    }, [idx, goTo]);

    const goPrev = useCallback(() => {
        if (autoRef.current) clearTimeout(autoRef.current);
        if (progressRef.current) clearInterval(progressRef.current);
        goTo((idx - 1 + CITIES.length) % CITIES.length, "prev");
    }, [idx, goTo]);

    // Auto-advance
    useEffect(() => {
        startProgress();
        autoRef.current = setTimeout(() => {
            goTo((idx + 1) % CITIES.length, "next");
        }, AUTO_DELAY);
        return () => {
            if (autoRef.current) clearTimeout(autoRef.current);
            if (progressRef.current) clearInterval(progressRef.current);
        };
    }, [idx]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <span>
            {/* City name inline with h1 */}
            <span
                style={{
                    background: "linear-gradient(135deg, #f5e6c8 0%, #c9a96e 50%, #e8d5a0 100%)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    textShadow: "none",
                    display: "inline-block",
                    overflow: "hidden",
                    verticalAlign: "baseline",
                }}
            >
                <CityName city={CITIES[idx]} animKey={animKey} dir={dir} />
            </span>

            {/* Navigation bar — on its own line */}
            <ProgressBar
                active={idx}
                total={CITIES.length}
                progress={progress}
                onPrev={goPrev}
                onNext={goNext}
            />
        </span>
    );
}
