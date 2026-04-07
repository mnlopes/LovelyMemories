"use client";

import { type ClassValue, clsx } from "clsx";
import { LayoutGrid, LayoutDashboard, Hotel, LogOut, User } from "lucide-react";
import { Link } from "@/i18n/routing";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export const OwnerSidebar = () => {
    const pathname = usePathname();
    const t = useTranslations('OwnerSidebar');

    const [isCollapsed, setIsCollapsed] = useState(false);

    const checkActive = (path: string) => {
        const pathParts = pathname.split('/');
        const currentPathWithoutLocale = '/' + pathParts.slice(2).join('/');
        return currentPathWithoutLocale === path || (path === '/owner' && currentPathWithoutLocale === '/owner');
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        const locale = window.location.pathname.split('/')[1] || 'en';
        window.location.href = `/${locale}/login`;
    };

    const menuItems = [
        { icon: LayoutDashboard, label: t('dashboard'), path: "/owner" },
        { icon: Hotel, label: t('properties'), path: "/owner/properties" },
        { icon: User, label: t('profile'), path: "/owner/profile" },
    ];

    return (
        <aside
            className={`bg-white border-r border-gray-200 flex flex-col shrink-0 h-screen sticky top-0 z-50 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-72'}`}
        >
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
                        className="w-full h-full object-contain transition-all duration-500"
                        style={{ filter: 'brightness(0) saturate(100%) invert(8%) sepia(35%) saturate(1210%) hue-rotate(188deg) brightness(96%) contrast(97%)' }}
                    />
                </div>
                {!isCollapsed && (
                    <h1 className="text-xl font-bold tracking-tight text-[#192537] whitespace-nowrap overflow-hidden">
                        Owner Portal
                    </h1>
                )}
            </Link>

            {/* Navigation */}
            <nav className={`flex-1 space-y-4 overflow-y-auto custom-scrollbar ${isCollapsed ? 'px-3' : 'px-6'} mt-8`}>
                <div className="space-y-1">
                    {menuItems.map((item) => {
                        const isActive = checkActive(item.path);
                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                className={cn(
                                    "flex items-center transition-all group relative",
                                    isCollapsed ? "justify-center p-3 rounded-xl" : "gap-3 px-3 py-3 rounded-xl",
                                    isActive
                                        ? "bg-[#192537] text-white shadow-md"
                                        : "text-gray-500 hover:text-[#192537] hover:bg-gray-50"
                                )}
                                title={isCollapsed ? item.label : undefined}
                            >
                                <item.icon className={cn("size-5 stroke-[1.5px] transition-colors shrink-0", isActive ? "text-white" : "text-gray-500 group-hover:text-[#192537]")} />

                                {!isCollapsed && (
                                    <span className="text-sm font-bold tracking-tight whitespace-nowrap overflow-hidden">
                                        {item.label}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* Footer Area */}
            <div className={`p-6 border-t border-gray-200 ${isCollapsed ? 'px-2 items-center' : ''}`}>
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className={`w-full flex items-center transition-colors text-gray-400 hover:text-[#192537] ${isCollapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2 text-xs font-medium'}`}
                    title={isCollapsed ? t('expand') : t('collapse')}
                >
                    <LayoutGrid className="size-4" />
                    {!isCollapsed && <span>{isCollapsed ? t('expand') : t('collapse')}</span>}
                </button>

                <button
                    onClick={handleLogout}
                    className={`mt-2 w-full flex items-center transition-colors text-red-500 hover:bg-red-50 rounded-lg ${isCollapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2 text-xs font-bold'}`}
                    title={t('signOut')}
                >
                    <LogOut className="size-4" />
                    {!isCollapsed && <span>{t('signOut')}</span>}
                </button>
            </div>
        </aside>
    );
};
