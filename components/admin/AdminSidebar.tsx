"use client";

import { type ClassValue, clsx } from "clsx";
import { LayoutGrid, LayoutDashboard, Hotel, Calendar, Users, Wallet, BarChart3, LogOut, Sparkles, Settings, Activity } from "lucide-react";
import { Link, usePathname } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export const AdminSidebar = () => {
    const pathname = usePathname();
    const t = useTranslations('AdminSidebar');
    const [role, setRole] = useState<string | null>(null);

    useEffect(() => {
        const fetchRole = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();
                if (profile) setRole(profile.role);
            }
        };
        fetchRole();
    }, []);

    const menuSections = [
        {
            title: t('management'),
            items: [
                // Only show Overview to Super Admins
                ...(role === 'super_admin' ? [
                    { icon: LayoutDashboard, label: t('overview'), path: "/admin" }
                ] : []),
                { icon: Hotel, label: t('properties'), path: "/admin/properties" },
                { icon: Calendar, label: t('bookings'), path: "/admin/reservations" },
                // Only show Users/Tenants to Admins and Super Admins
                ...(role === 'admin' || role === 'super_admin' ? [
                    { icon: Users, label: t('tenants'), path: "/admin/users" }
                ] : []),
                { icon: Sparkles, label: t('concierge'), path: "/admin/concierge" },
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
        <aside
            className={`bg-admin-surface border-r border-admin-border flex flex-col shrink-0 h-screen sticky top-0 z-50 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-72'}`}
        >
            {/* Logo Area */}
            <div className={`flex flex-col items-center justify-center transition-all duration-300 ${isCollapsed ? 'p-4' : 'p-8 gap-2 text-center'}`}>
                <div className={`flex items-center justify-center transition-all duration-300 ${isCollapsed ? 'w-10 h-10' : 'w-40 h-auto p-2'}`}>
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
            </div>

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
                                const isActive = pathname === item.path || (item.path === '/admin' && pathname === '/admin');
                                return (
                                    <Link
                                        key={item.path}
                                        href={item.path}
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
                {/* Collapse Toggle */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className={`w-full flex items-center transition-colors text-admin-text-secondary hover:text-admin-text-primary ${isCollapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2 text-xs font-medium'}`}
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
    );
};
