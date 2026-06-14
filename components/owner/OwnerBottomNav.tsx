"use client";

import { Link } from "@/i18n/routing";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LayoutDashboard, Hotel, User } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Mobile bottom tab bar for the owner portal. Hidden on lg+ (desktop uses the sidebar).
 */
export const OwnerBottomNav = () => {
    const pathname = usePathname();
    const t = useTranslations("OwnerSidebar");

    const items = [
        { icon: LayoutDashboard, label: t("dashboard"), path: "/owner" },
        { icon: Hotel, label: t("properties"), path: "/owner/properties" },
        { icon: User, label: t("profile"), path: "/owner/profile" },
    ];

    const isActive = (path: string) => {
        const current = "/" + pathname.split("/").slice(2).join("/");
        return current === path || (path === "/owner" && current === "/owner");
    };

    return (
        <nav
            className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200 flex"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
            {items.map((item) => {
                const active = isActive(item.path);
                return (
                    <Link
                        key={item.path}
                        href={item.path}
                        className={cn(
                            "flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-bold tracking-tight transition-colors",
                            active ? "text-[#192537]" : "text-gray-400 hover:text-[#192537]"
                        )}
                    >
                        <item.icon className="size-5 stroke-[1.5px]" />
                        {item.label}
                    </Link>
                );
            })}
        </nav>
    );
};
