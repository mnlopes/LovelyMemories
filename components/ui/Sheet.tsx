"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const SheetContext = React.createContext<{
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    modal: boolean;
} | null>(null);

export const Sheet = ({ children, open, onOpenChange, modal = true }: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    modal?: boolean;
}) => {
    const [internalOpen, setInternalOpen] = React.useState(false);
    const isOpen = open !== undefined ? open : internalOpen;
    const setIsOpen = onOpenChange || setInternalOpen;

    return (
        <SheetContext.Provider value={{ isOpen, setIsOpen, modal }}>
            {children}
        </SheetContext.Provider>
    );
};

export const SheetTrigger = ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => {
    const context = React.useContext(SheetContext);
    if (!context) throw new Error("SheetTrigger must be used within a Sheet");

    const Comp = asChild ? React.Fragment : "button";

    // If asChild is true, we need to clone the child and add the onClick handler
    if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children as React.ReactElement, {
            onClick: () => context.setIsOpen(true)
        } as React.DOMAttributes<HTMLElement>);
    }

    return (
        // @ts-ignore
        <Comp onClick={() => context.setIsOpen(true)}>
            {children}
        </Comp>
    );
};

const SheetContent = ({ children, className }: { children: React.ReactNode; className?: string }) => {
    const context = React.useContext(SheetContext);
    const contentRef = React.useRef<HTMLDivElement>(null);

    if (!context) throw new Error("SheetContent must be used within a Sheet");

    React.useEffect(() => {
        if (context.isOpen && !context.modal) {
            const handleClickOutside = (event: MouseEvent) => {
                if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
                    context.setIsOpen(false);
                }
            };
            document.addEventListener("mousedown", handleClickOutside);
            return () => {
                document.removeEventListener("mousedown", handleClickOutside);
            };
        }
    }, [context.isOpen, context.modal, context.setIsOpen]);

    return (
        <AnimatePresence>
            {context.isOpen && (
                <>
                    {context.modal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => context.setIsOpen(false)}
                            className="fixed inset-0 bg-black/20 z-[100] backdrop-blur-sm"
                        />
                    )}
                    <motion.div
                        ref={contentRef}
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className={cn(
                            "fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-admin-dark-surface shadow-2xl z-[101] flex flex-col p-6 overflow-y-auto",
                            className
                        )}
                    >
                        <div className="absolute right-4 top-4">
                            <button
                                type="button"
                                onClick={() => context.setIsOpen(false)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X className="size-4" />
                            </button>
                        </div>
                        {children}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
export { SheetContent };

export const SheetHeader = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn("mb-6 space-y-2", className)}>{children}</div>
);

export const SheetTitle = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h2 className={cn("text-lg font-bold text-navy-900 dark:text-white", className)}>{children}</h2>
);

export const SheetDescription = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <p className={cn("text-sm text-gray-500 dark:text-gray-400", className)}>{children}</p>
);
