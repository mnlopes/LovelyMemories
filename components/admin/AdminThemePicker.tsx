"use client";

import { Sun, Moon, Sparkles, CloudMoon, MoonStar } from "lucide-react";
import { useAdminTheme, type Theme } from "./AdminThemeProvider";
import { cn } from "@/lib/utils";

const THEMES: { id: Theme; icon: typeof Sun; label: string; color: string; mobileOnly?: boolean }[] = [
    { id: 'light', icon: Sun, label: 'Light', color: 'text-orange-500' },
    { id: 'creme', icon: Sparkles, label: 'Creme', color: 'text-[#8c734b]' },
    { id: 'soft-dark', icon: CloudMoon, label: 'Soft Dark', color: 'text-blue-400' },
    { id: 'dark', icon: Moon, label: 'Deep Dark', color: 'text-indigo-500' },
    { id: 'midnight', icon: MoonStar, label: 'Midnight', color: 'text-sky-400', mobileOnly: true },
];

/** Swatches de tema. `surface` filtra: o Midnight só é oferecido no mobile. */
export const AdminThemePicker = ({ surface, className }: { surface: "desktop" | "mobile"; className?: string }) => {
    const { theme, setTheme } = useAdminTheme();
    const themes = surface === "mobile" ? THEMES : THEMES.filter((t) => !t.mobileOnly);

    return (
        <div className={cn("flex items-center gap-1.5 p-1.5 bg-admin-bg rounded-2xl border border-admin-border shadow-sm", className)}>
            {themes.map((t) => (
                <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={cn(
                        "p-2 rounded-xl transition-all duration-300",
                        theme === t.id
                            ? "bg-admin-surface shadow-md scale-105 ring-1 ring-black/5 dark:ring-white/10"
                            : "text-admin-text-secondary hover:text-admin-text-primary hover:bg-admin-surface/50"
                    )}
                    title={t.label}
                    aria-label={t.label}
                    aria-pressed={theme === t.id}
                >
                    <t.icon className={cn("size-4.5 stroke-[1.5px]", theme === t.id ? t.color : "")} />
                </button>
            ))}
        </div>
    );
};
