"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Toaster } from "sonner";

export type Theme = "light" | "creme" | "dark" | "soft-dark" | "midnight";

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const AdminThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const [theme, setThemeState] = useState<Theme>("light");

    useEffect(() => {
        const storedTheme = localStorage.getItem("admin-theme") as Theme;
        if (storedTheme) {
            setThemeState(storedTheme);
        } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
            setThemeState("dark");
        }
    }, []);

    useEffect(() => {
        // Handle Tailwind 'dark' class for variants
        if (theme === "dark" || theme === "soft-dark" || theme === "midnight") {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }

        // Handle Semantic Theme attribute
        document.documentElement.setAttribute("data-admin-theme", theme);
    }, [theme]);

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
        localStorage.setItem("admin-theme", newTheme);
    };

    const toggleTheme = () => {
        const themes: Theme[] = ["light", "creme", "dark", "soft-dark"];
        const currentIndex = themes.indexOf(theme);
        const nextIndex = (currentIndex + 1) % themes.length;
        setTheme(themes[nextIndex]);
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useAdminTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useAdminTheme must be used within an AdminThemeProvider");
    }
    return context;
};
