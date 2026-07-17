"use client";

import { type ClassValue, clsx } from "clsx";
import { LayoutGrid, LayoutDashboard, Hotel, Calendar, Users, Wallet, BarChart3, LogOut, ConciergeBell, Settings, Activity, KeyRound, Ticket, FileUp, X, Sparkles, type LucideIcon } from "lucide-react";
import { Link } from "@/i18n/routing";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useAdminNav } from "./AdminNavProvider";
import { AdminThemePicker } from "./AdminThemePicker";
import { getPendingDecisionCount } from "@/app/actions/ai-inbox";

type NavItem = { icon: LucideIcon; label: string; path: string; badge?: number };

export const AdminSidebar = () => {
    const pathname = usePathname();
    const t = useTranslations('AdminSidebar');
    const { mobileOpen, setMobileOpen } = useAdminNav();
    const [role, setRole] = useState<string | null>(null);
    const [permissions, setPermissions] = useState<{ module_name: string; can_view: boolean }[]>([]);
    const [cohostPending, setCohostPending] = useState(0);

    const checkActive = (path: string) => {
        const pathParts = pathname.split('/');
        const currentPathWithoutLocale = '/' + pathParts.slice(2).join('/');
        return currentPathWithoutLocale === path || (path === '/admin' && currentPathWithoutLocale === '/admin');
    };

    useEffect(() => {
        const fetchRoleAndPermissions = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();
                if (profile) {
                    setRole(profile.role);
                    if (profile.role !== 'super_admin') {
                        const { data: perms } = await supabase
                            .from('role_permissions')
                            .select('module_name, can_view')
                            .eq('role_name', profile.role);
                        if (perms) {
                            setPermissions(perms);
                        }
                    }
                }
            }
        };
        fetchRoleAndPermissions();
    }, []);

    useEffect(() => {
        if (role !== "super_admin" && role !== "admin") return;
        let alive = true;
        const load = () => { void getPendingDecisionCount().then((n) => { if (alive) setCohostPending(n); }).catch(() => {}); };
        load();
        const id = setInterval(load, 60_000);
        return () => { alive = false; clearInterval(id); };
    }, [role]);

    const hasAccess = (moduleName: string) => {
        if (role === 'super_admin') return true;
        const p = permissions.find(p => p.module_name === moduleName);
        return p?.can_view || false;
    };

    const menuSections: { title: string; items: NavItem[] }[] = [
        {
            title: t('management'),
            items: [
                // Overview: super_admin + admin (2026-07-17)
                ...(role === 'super_admin' || role === 'admin' ? [
                    { icon: LayoutDashboard, label: t('overview'), path: "/admin" }
                ] : []),
                ...(hasAccess('properties') ? [{ icon: Hotel, label: t('properties'), path: "/admin/properties" }] : []),
                ...(hasAccess('bookings') ? [{ icon: Calendar, label: t('bookings'), path: "/admin/reservations" }] : []),
                ...(hasAccess('team') ? [{ icon: Users, label: t('tenants'), path: "/admin/users" }] : []),
                ...(hasAccess('owners') ? [{ icon: KeyRound, label: t('owners'), path: "/admin/owners" }] : []),
                ...(hasAccess('coupons') ? [{ icon: Ticket, label: t('coupons'), path: "/admin/coupons" }] : []),
                ...(hasAccess('concierge') ? [{ icon: ConciergeBell, label: t('concierge'), path: "/admin/concierge" }] : []),
                ...(hasAccess('content') || role === 'super_admin' || role === 'admin' ? [{ icon: LayoutGrid, label: t('content'), path: "/admin/content" }] : []),
            ]
        },
        // Only show Reports to Super Admins
        ...(role === 'super_admin' ? [
            {
                title: t('reports'),
                items: [
                    { icon: Wallet, label: t('finances'), path: "/admin/finances" },
                    { icon: BarChart3, label: t('performance'), path: "/admin/performance" },
                ]
            }
        ] : []),
        // Only show System/Settings to Super Admins (and Activity to Admins)
        ...(role === 'super_admin' || role === 'admin' ? [
            {
                title: "System",
                items: [
                    ...(hasAccess('imports') || role === 'super_admin' || role === 'admin' ? [{ icon: FileUp, label: "Imports", path: "/admin/imports" }] : []),
                    ...(role === 'super_admin' || role === 'admin' ? [{ icon: Sparkles, label: "Co-Host", path: "/admin/cohost", badge: cohostPending }] : []),
                    { icon: Activity, label: "Activity", path: "/admin/activity" },
                    // Settings only for Super Admin
                    ...(role === 'super_admin' ? [
                        { icon: Settings, label: "Settings", path: "/admin/settings" }
                    ] : [])
                ]
            }
        ] : [])
    ];

    const [isCollapsed, setIsCollapsed] = useState(false);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        const locale = window.location.pathname.split('/')[1] || 'en';
        window.location.href = `/${locale}/login`;
    };

    return (
        <>
            {/* Mobile backdrop */}
            <div
                className={cn(
                    "fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300",
                    mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={() => setMobileOpen(false)}
            />
            <aside
                className={cn(
                    "bg-admin-surface border-r border-admin-border flex flex-col shrink-0 h-screen z-50 transition-transform duration-300",
                    "fixed inset-y-0 left-0 md:sticky md:top-0",
                    mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
                    "w-72",
                    isCollapsed ? "md:w-20" : "md:w-72"
                )}
            >
            {/* Mobile close button */}
            <button
                onClick={() => setMobileOpen(false)}
                className="md:hidden absolute top-4 right-4 p-2 text-admin-text-secondary hover:text-admin-text-primary rounded-xl z-10"
                aria-label="Close menu"
            >
                <X className="size-5" />
            </button>

            {/* Logo Area */}
            <Link 
                href="/"
                className={cn(
                    "flex flex-col items-center justify-center transition-all duration-300 hover:opacity-80 active:scale-95 group/logo",
                    isCollapsed ? 'p-4' : 'p-8 gap-2 text-center'
                )}
            >
                <div className={cn("flex items-center justify-center transition-all duration-300", isCollapsed ? 'w-10 h-10' : 'w-40 h-auto p-2')}>
                    <img
                        src="/legacy/home/images/logo.svg"
                        alt="Lovely Memories"
                        className="w-full h-full object-contain dark:brightness-0 dark:invert transition-all duration-500"
                    />
                </div>
                {!isCollapsed && (
                    <h1 className="text-xl font-bold tracking-tight text-admin-text-primary whitespace-nowrap overflow-hidden animate-in fade-in slide-in-from-left-4 duration-300">
                        Lovely Memories
                    </h1>
                )}
            </Link>

            {/* Navigation */}
            <nav className={`flex-1 space-y-8 overflow-y-auto custom-scrollbar ${isCollapsed ? 'px-3' : 'px-6'}`}>
                {menuSections.map((section) => (
                    <div key={section.title}>
                        <div className={`mb-4 transition-all duration-300 ${isCollapsed ? 'px-0 text-center' : 'px-3'}`}>
                            {!isCollapsed ? (
                                <p className="text-[10px] font-bold text-admin-text-secondary uppercase tracking-[0.2em] whitespace-nowrap">{section.title}</p>
                            ) : (
                                <div className="h-px w-8 bg-admin-border mx-auto" />
                            )}
                        </div>
                        <div className="space-y-1">
                            {section.items.map((item) => {
                                const isActive = checkActive(item.path);
                                return (
                                    <Link
                                        key={item.path}
                                        href={item.path}
                                        onClick={() => setMobileOpen(false)}
                                        className={cn(
                                            "flex items-center transition-all group relative",
                                            isCollapsed ? "justify-center p-3 rounded-xl" : "gap-3 px-3 py-2.5 rounded-xl",
                                            isActive
                                                ? "bg-admin-bg text-admin-text-primary border border-admin-border shadow-sm"
                                                : "text-admin-text-secondary hover:text-admin-text-primary hover:bg-admin-bg"
                                        )}
                                        title={isCollapsed ? item.label : undefined}
                                    >
                                        <item.icon className={cn("size-5 stroke-[1.5px] transition-colors shrink-0", isActive ? "text-admin-accent" : "text-admin-text-secondary group-hover:text-admin-text-primary")} />

                                        {!isCollapsed && (
                                            <span className="text-sm font-bold tracking-tight whitespace-nowrap overflow-hidden animate-in fade-in slide-in-from-left-2 duration-200">
                                                {item.label}
                                            </span>
                                        )}

                                        {!isCollapsed && !!item.badge && (
                                            <span className="ml-auto rounded-full bg-[#c5a059] px-1.5 py-0.5 text-[10px] font-bold text-white min-w-4 text-center">
                                                {item.badge}
                                            </span>
                                        )}

                                        {isActive && !isCollapsed && (
                                            <div className="ml-auto size-1.5 rounded-full bg-admin-accent shadow-sm" />
                                        )}
                                        {isActive && isCollapsed && (
                                            <div className="absolute right-1 top-1 size-1.5 rounded-full bg-admin-accent shadow-sm" />
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Footer Area */}
            <div className={`p-6 border-t border-admin-border ${isCollapsed ? 'px-2 items-center' : ''}`}>
                {/* Theme Selector (mobile only; desktop lives in the header) */}
                <AdminThemePicker surface="mobile" className="md:hidden mb-2 w-full justify-between" />

                {/* Collapse Toggle */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className={`hidden md:flex w-full items-center transition-colors text-admin-text-secondary hover:text-admin-text-primary ${isCollapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2 text-xs font-medium'}`}
                    title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    <LayoutGrid className="size-4" />
                    {!isCollapsed && <span>{isCollapsed ? "Expand" : "Collapse View"}</span>}
                </button>

                {/* Logout Button */}
                <button
                    onClick={handleLogout}
                    className={`mt-2 w-full flex items-center transition-colors text-red-500 hover:bg-red-500/10 rounded-lg ${isCollapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2 text-xs font-bold'}`}
                    title={t('signOut')}
                >
                    <LogOut className="size-4" />
                    {!isCollapsed && <span>{t('signOut')}</span>}
                </button>
            </div>
            </aside>
        </>
    );
};
