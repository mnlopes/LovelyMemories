"use client";

import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

interface ButtonProps extends HTMLMotionProps<"button"> {
    children: React.ReactNode;
    variant?: "primary" | "outline" | "ghost";
    icon?: boolean;
}

export const Button = ({ children, className, variant = "primary", icon = false, ...props }: ButtonProps) => {
    const variants = {
        primary: "bg-gold-400 text-navy-950 hover:bg-gold-300 border border-gold-400",
        outline: "bg-transparent text-gold-400 border border-gold-400 hover:bg-gold-400/10",
        ghost: "bg-transparent text-white hover:text-gold-300",
    };

    return (
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
                "px-8 py-4 rounded-full font-semibold transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer",
                variants[variant],
                className
            )}
            {...props}
        >
            {children}
            {icon && <ArrowRight className="w-4 h-4" />}
        </motion.button>
    );
};
