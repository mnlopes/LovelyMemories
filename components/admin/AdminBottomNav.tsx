"use client";

import { Link } from "@/i18n/routing";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, Calendar, Sparkles, Hotel, Menu, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useAdminNav } from "./AdminNavProvider";
import { getPendingDecisionCount } from "@/app/actions/ai-inbox";

/**
 * Barra de navegação inferior do admin no mobile (espelha o padrão do OwnerBottomNav).
 * Escondida em lg+ (desktop usa o sidebar). Os separadores respeitam o role/permissões
 * como o AdminSidebar; "More" abre a gaveta com o menu completo.
 */
export const AdminBottomNav = () => {
    const pathname = usePathname();
    const t = useTranslations("AdminSidebar");
    const { setMobileOpen } = useAdminNav();
    const [role, setRole] = useState<string | null>(null);
    const [permissions, setPermissions] = useState<{ module_name: string; can_view: boolean }[]>([]);
    const [pending, setPending] = useState(0);

    useEffect(() => {
        const load = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
            if (!profile) return;
            setRole(profile.role);
            if (profile.role !== "super_admin") {
                const { data: perms } = await supabase.from("role_permissions").select("module_name, can_view").eq("role_name", profile.role);
                if (perms) setPermissions(perms);
            }
        };
        void load();
    }, []);

    useEffect(() => {
        if (role !== "super_admin" && role !== "admin") return;
        let alive = true;
        const load = () => { void getPendingDecisionCount().then((n) => { if (alive) setPending(n); }).catch(() => {}); };
        load();
        const id = setInterval(load, 60_000);
        return () => { alive = false; clearInterval(id); };
    }, [role]);

    const hasAccess = (moduleName: string) => role === "super_admin" || permissions.find((p) => p.module_name === moduleName)?.can_view || false;

    const items: { icon: LucideIcon; label: string; path: string; badge?: number }[] = [
        ...(role === "super_admin" || role === "admin" ? [{ icon: LayoutDashboard, label: t("overview"), path: "/admin" }] : []),
        ...(hasAccess("bookings") ? [{ icon: Calendar, label: t("bookings"), path: "/admin/reservations" }] : []),
        ...(role === "super_admin" || role === "admin" ? [{ icon: Sparkles, label: "Co-Host", path: "/admin/cohost", badge: pending }] : []),
        ...(hasAccess("properties") ? [{ icon: Hotel, label: t("properties"), path: "/admin/properties" }] : []),
    ];

    const isActive = (path: string) => {
        const current = "/" + pathname.split("/").slice(2).join("/");
        return current === path;
    };

    return (
        <nav
            className="md:hidden fixed bottom-0 inset-x-0 z-40 flex bg-admin-surface border-t border-admin-border"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
            {items.map((item) => {
                const active = isActive(item.path);
                return (
                    <Link
                        key={item.path}
                        href={item.path}
                        className={cn(
                            "relative flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-bold tracking-tight transition-colors",
                            active ? "text-admin-text-primary" : "text-admin-text-secondary hover:text-admin-text-primary",
                        )}
                    >
                        {!!item.badge && item.badge > 0 && (
                            <span className="absolute top-1 right-[calc(50%-18px)] min-w-4 h-4 px-1 rounded-full bg-[#c5a059] text-white text-[9px] leading-4 text-center font-bold">
                                {item.badge}
                            </span>
                        )}
                        <item.icon className="size-5 stroke-[1.5px]" />
                        {item.label}
                    </Link>
                );
            })}
            <button
                onClick={() => setMobileOpen(true)}
                className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-bold tracking-tight text-admin-text-secondary hover:text-admin-text-primary transition-colors"
            >
                <Menu className="size-5 stroke-[1.5px]" />
                {t("more")}
            </button>
        </nav>
    );
};
