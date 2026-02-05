"use client";

import { LayoutGrid, LayoutDashboard, Hotel, Calendar, Users, Wallet, BarChart3, LogOut, Sparkles, Settings, Activity } from "lucide-react";
import { Link, usePathname } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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

    const handleLogout = async () => {
        await supabase.auth.signOut();
        const locale = window.location.pathname.split('/')[1] || 'en';
        window.location.href = `/${locale}/login`;
    };

    return (
        <aside className="w-72 bg-white dark:bg-admin-dark-bg border-r border-[#f5f5f5] dark:border-admin-dark-border flex flex-col shrink-0 h-screen sticky top-0 z-50">
            {/* Logo Area */}
            <div className="p-8 flex flex-col items-center gap-2 text-center">
                <div className="w-40 h-auto flex items-center justify-center p-2">
                    <img
                        src="/legacy/home/images/logo.svg"
                        alt="Lovely Memories"
                        className="w-full h-full object-contain dark:brightness-0 dark:invert transition-all duration-500"
                    />
                </div>
                <h1 className="text-xl font-bold tracking-tight text-[#171717] dark:text-admin-dark-text-primary">Lovely Memories</h1>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-6 space-y-8">
                {menuSections.map((section) => (
                    <div key={section.title}>
                        <div className="px-3 mb-4">
                            <p className="text-[10px] font-bold text-[#a3a3a3] uppercase tracking-[0.2em]">{section.title}</p>
                        </div>
                        <div className="space-y-1">
                            {section.items.map((item) => {
                                const isActive = pathname === item.path || (item.path === '/admin' && pathname === '/admin');
                                return (
                                    <Link
                                        key={item.path}
                                        href={item.path}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative ${isActive
                                            ? 'bg-[#fafafa] dark:bg-white/5 text-[#171717] dark:text-admin-dark-text-primary border border-transparent dark:border-white/10 shadow-sm'
                                            : 'text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white hover:bg-[#fafafa] dark:hover:bg-white/5'
                                            }`}
                                    >
                                        <item.icon className={`size-5 stroke-[1.5px] transition-colors ${isActive ? 'text-[#171717] dark:text-admin-dark-text-primary' : 'text-[#a3a3a3] group-hover:text-[#171717] dark:group-hover:text-white'}`} />
                                        <span className="text-sm font-bold tracking-tight">{item.label}</span>
                                        {isActive && (
                                            <div className="ml-auto size-1.5 rounded-full bg-[#171717] dark:bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Footer Area */}
            <div className="p-6">
                {/* Logout Button */}
                <button
                    onClick={handleLogout}
                    className="mt-6 w-full flex items-center gap-3 px-3 py-2 text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white transition-colors text-xs font-medium"
                >
                    <LogOut className="size-4" />
                    {t('signOut')}
                </button>
            </div>
        </aside>
    );
};
