import { useRef } from "react";
import { useScroll, useTransform, motion } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils";

// Split text into words for granular animation
const Paragraph = ({ value, className }: { value: string; className?: string }) => {
    const element = useRef(null);
    const { scrollYProgress } = useScroll({
        target: element,
        offset: ["start 0.9", "start 0.25"],
    });

    const words = value.split(" ");

    return (
        <p
            className={cn(
                "text-4xl md:text-6xl lg:text-7xl font-playfair font-medium leading-tight flex flex-wrap gap-x-3 gap-y-2",
                className
            )}
            ref={element}
        >
            {words.map((word, i) => {
                const start = i / words.length;
                const end = start + 1 / words.length;
                return (
                    <Word key={i} progress={scrollYProgress} range={[start, end]}>
                        {word}
                    </Word>
                );
            })}
        </p>
    );
};

const Word = ({ children, progress, range }: { children: string; progress: any; range: [number, number] }) => {
    const opacity = useTransform(progress, range, [0.1, 1]);
    return (
        <span className="relative">
            <span className="absolute opacity-10">{children}</span>
            <motion.span style={{ opacity }}>{children}</motion.span>
        </span>
    );
};

export const Philosophy = () => {
    const containerRef = useRef(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    });

    // Expanding Image Transforms
    const scale = useTransform(scrollYProgress, [0, 1], [0.8, 1]);
    const borderRadius = useTransform(scrollYProgress, [0, 1], ["100px", "0px"]);

    return (
        <section className="relative bg-navy-950 py-32">
            <div className="container mx-auto px-6 mb-32">
                <Paragraph
                    value="Welcome to a world of refined luxury. Where every detail is curated to create an atmosphere of timeless elegance and unparalleled comfort."
                    className="text-white max-w-5xl mx-auto text-center"
                />
                <div className="h-20" />
                <Paragraph
                    value="Experience the art of living well, with bespoke services and exclusive properties designed for those who seek the extraordinary."
                    className="text-gold-100/80 max-w-4xl mx-auto text-center text-2xl md:text-4xl"
                />
            </div>

            {/* Expanding Image Section */}
            <div ref={containerRef} className="h-[200vh] relative">
                <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">
                    <motion.div
                        style={{ scale, borderRadius }}
                        className="relative w-full h-full md:w-[90vw] md:h-[90vh] overflow-hidden"
                    >
                        <Image
                            src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=2070&auto=format&fit=crop"
                            alt="Luxury Interior"
                            fill
                            className="object-cover"
                        />
                        <div className="absolute inset-0 bg-black/20" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <h2 className="text-white text-9xl font-playfair font-bold tracking-tighter mix-blend-overlay">ESCAPE</h2>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};
