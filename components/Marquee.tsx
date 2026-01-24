"use client";

import { motion } from "framer-motion";

const PHRASES = [
    "RELAXED STATE OF MIND",
    "ELEVATED LIVING",
    "TIMELESS ELEGANCE",
    "CURATED EXPERIENCES",
    "ART OF LIVING"
];

export const Marquee = () => {
    return (
        <div className="relative w-full py-16 bg-navy-950 overflow-hidden border-y border-white/5">
            <div className="flex whitespace-nowrap">
                <motion.div
                    initial={{ x: 0 }}
                    animate={{ x: "-50%" }}
                    transition={{
                        duration: 50,
                        repeat: Infinity,
                        ease: "linear",
                    }}
                    className="flex flex-shrink-0"
                >
                    {[...Array(2)].map((_, i) => (
                        <div key={i} className="flex">
                            {PHRASES.map((phrase, index) => (
                                <div key={index} className="flex items-center mx-8 md:mx-16">
                                    <span className="text-6xl md:text-8xl font-playfair font-bold text-transparent bg-clip-text bg-gradient-to-b from-white/10 to-transparent">
                                        {phrase}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ))}
                </motion.div>
            </div>
        </div>
    );
};
