'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

export default function Hero() {
    return (
        <section className="relative h-screen w-full overflow-hidden">
            {/* Background Image */}
            <div className="absolute inset-0">
                <Image
                    src="/images/hero-bg.png"
                    alt="Lovely Memories Background"
                    fill
                    className="object-cover"
                    priority
                    quality={100}
                />
                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-b from-navy-950/30 via-transparent to-navy-950/90" />
            </div>

            {/* Content */}
            <div className="relative z-10 flex h-full flex-col items-center justify-center text-center px-4">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.2 }}
                >
                    <h2 className="text-gold-200 uppercase tracking-[0.2em] text-sm md:text-base font-medium mb-4">
                        Capturing Moments
                    </h2>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                >
                    <h1 className="font-playfair text-5xl md:text-7xl lg:text-8xl text-white mb-6 drop-shadow-lg">
                        Lovely <span className="italic text-gold-300">Memories</span>
                    </h1>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.6 }}
                    className="max-w-2xl mx-auto"
                >
                    <p className="text-gray-200 text-lg md:text-xl font-light leading-relaxed mb-10 text-pretty">
                        Preserving the beauty of your most cherished stories with elegance and timeless style.
                    </p>

                    <button className="px-8 py-3 bg-gold-600/90 hover:bg-gold-500 text-white rounded-full 
            transition-all duration-300 backdrop-blur-sm border border-gold-400/30
            hover:shadow-[0_0_20px_rgba(185,168,137,0.4)] transform hover:-translate-y-1">
                        Explore Gallery
                    </button>
                </motion.div>
            </div>

            {/* Scroll Indicator */}
            <motion.div
                className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5, duration: 1 }}
            >
                <div className="w-[1px] h-24 bg-gradient-to-b from-transparent via-gold-300 to-transparent opacity-50" />
            </motion.div>
        </section>
    );
}
