"use client";

import React, { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface ConciergeDeckProps {
    images: string[];
    alt: string;
}

// Stacked "deck of cards" photo gallery: the front card can be dragged/tapped
// to the back of the deck, cards behind fan out slightly on hover, and the
// deck advances on its own every few seconds. With a single image it renders
// as a plain static photo (same as the old layout).
export const ConciergeDeck = ({ images, alt }: ConciergeDeckProps) => {
    const [order, setOrder] = useState<number[]>(() => images.map((_, i) => i));
    const [isHovered, setIsHovered] = useState(false);
    const prefersReducedMotion = useReducedMotion();
    const many = images.length > 1;

    useEffect(() => {
        setOrder(images.map((_, i) => i));
    }, [images.length]);

    const sendTopToBack = () => setOrder((prev) => [...prev.slice(1), prev[0]]);
    const bringToFront = (idx: number) => setOrder((prev) => [idx, ...prev.filter((i) => i !== idx)]);

    useEffect(() => {
        if (!many || prefersReducedMotion || isHovered) return;
        const id = setInterval(sendTopToBack, 5000);
        return () => clearInterval(id);
    }, [many, prefersReducedMotion, isHovered]);

    const spring = prefersReducedMotion
        ? { duration: 0 }
        : { type: "spring" as const, stiffness: 240, damping: 26 };

    return (
        <div
            className="relative w-full max-w-[340px] sm:max-w-[400px] mx-auto select-none"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="relative w-full aspect-[4/5]">
                {order.map((imgIdx, pos) => {
                    const isTop = pos === 0;
                    const sign = pos % 2 === 1 ? -1 : 1;
                    const fan = isHovered ? 1.7 : 1;
                    return (
                        <motion.div
                            key={imgIdx}
                            className="absolute inset-0 rounded-[30px] md:rounded-[40px] overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] isolate bg-navy-950/5"
                            style={{ zIndex: images.length - pos, transformOrigin: "bottom center" }}
                            animate={{
                                rotate: isTop ? 0 : sign * Math.min(pos, 3) * 3.5 * fan,
                                x: isTop ? 0 : sign * Math.min(pos, 3) * 10 * fan,
                                y: isTop ? 0 : Math.min(pos, 3) * 8,
                                scale: 1 - Math.min(pos, 3) * 0.05,
                                filter: `brightness(${1 - Math.min(pos, 3) * 0.08})`,
                            }}
                            transition={spring}
                            drag={isTop && many}
                            dragSnapToOrigin
                            dragElastic={0.18}
                            onDragEnd={(_, info) => {
                                if (Math.hypot(info.offset.x, info.offset.y) > 120) sendTopToBack();
                            }}
                            onTap={isTop && many ? () => sendTopToBack() : undefined}
                        >
                            <img
                                src={images[imgIdx]}
                                alt={`${alt} ${imgIdx + 1}`}
                                className="w-full h-full object-cover"
                                draggable={false}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
                        </motion.div>
                    );
                })}
            </div>

            {many && (
                <div className="flex justify-center gap-2.5 mt-7">
                    {images.map((_, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => bringToFront(idx)}
                            aria-label={`${alt} ${idx + 1}`}
                            className={`h-2 rounded-full transition-all duration-300 ${
                                order[0] === idx
                                    ? "w-6 bg-[#B09E80]"
                                    : "w-2 bg-navy-950/15 hover:bg-navy-950/30"
                            }`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
