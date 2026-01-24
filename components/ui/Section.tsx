"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SectionProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    className?: string;
    id?: string;
    fullWidth?: boolean;
}

export const Section = ({ children, className, id, fullWidth = false, ...props }: SectionProps) => {
    return (
        <section id={id} className={cn("relative py-20 md:py-32 overflow-hidden", className)} {...props}>
            <div className={cn("container mx-auto px-6", fullWidth && "max-w-none px-0")}>
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                >
                    {children}
                </motion.div>
            </div>
        </section>
    );
};
