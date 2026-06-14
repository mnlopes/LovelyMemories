"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";

/**
 * Mobile top app bar for the owner portal. Hidden on lg+ (desktop uses the sidebar).
 * Shows the brand + current page title and a logout button (the sidebar logout is
 * not available on mobile).
 */
export const OwnerMobileHeader = () => {
    const pathname = usePathname();
    const t = useTranslations("OwnerSidebar");

    const current = "/" + pathname.split("/").slice(2).join("/");
    const title = current.startsWith("/owner/properties")
        ? t("properties")
        : current.startsWith("/owner/profile")
            ? t("profile")
            : t("dashboard");

    const handleLogout = async () => {
        await supabase.auth.signOut();
        const locale = window.location.pathname.split("/")[1] || "en";
        window.location.href = `/${locale}/login`;
    };

    return (
        <header className="lg:hidden sticky top-0 z-40 bg-[#0A1128] px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
                <img
                    src="/legacy/home/images/logo.svg"
                    alt="Lovely Memories"
                    className="h-6 w-auto shrink-0"
                    style={{ filter: "brightness(0) invert(1)" }}
                />
                <span className="text-white text-sm font-bold tracking-tight truncate">{title}</span>
            </div>
            <button
                onClick={handleLogout}
                aria-label={t("signOut")}
                className="text-white/70 hover:text-white transition-colors p-1.5 -mr-1.5"
            >
                <LogOut className="size-5" />
            </button>
        </header>
    );
};
