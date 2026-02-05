"use client";

import { Search, Bell, User, Sun, Moon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAdminTheme } from "./AdminThemeProvider";
import { NotificationsPopover } from "./NotificationsPopover";

export const AdminHeader = ({ user, profile }: any) => {
    const t = useTranslations('AdminHeader');
    const { theme, toggleTheme } = useAdminTheme();

    return (
        <header className="h-20 bg-white dark:bg-admin-dark-bg border-b border-[#f5f5f5] dark:border-admin-dark-border flex items-center justify-between px-10 sticky top-0 z-20">
            <div />

            {/* Actions */}
            <div className="flex items-center gap-8">
                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="p-2.5 rounded-xl text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white hover:bg-[#fafafa] dark:hover:bg-white/10 transition-all shadow-sm border border-transparent dark:hover:border-white/20"
                    title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                >
                    {theme === 'light' ? (
                        <Moon className="size-5 stroke-[1.5px]" />
                    ) : (
                        <Sun className="size-5 stroke-[1.5px]" />
                    )}
                </button>

                <NotificationsPopover lastReadAt={profile?.last_read_notifications_at || null} />

                <div className="flex items-center gap-4 group cursor-pointer pl-4 border-l border-[#f5f5f5] dark:border-white/10">
                    <div className="text-right">
                        <p className="text-sm font-bold text-[#171717] dark:text-admin-dark-text-primary group-hover:text-gold-400 dark:group-hover:text-white transition-colors">{profile?.full_name || user?.email?.split('@')[0] || 'Admin'}</p>
                        <p className="text-[10px] text-[#a3a3a3] dark:text-admin-dark-text-secondary uppercase tracking-[0.2em] font-black">{profile?.role || t('role')}</p>
                    </div>
                    <div
                        className="size-11 rounded-full bg-[#f5f5f5] dark:bg-white/10 border border-[#eeeeee] dark:border-white/20 bg-cover bg-center overflow-hidden flex items-center justify-center transition-all group-hover:border-gold-400 dark:group-hover:border-white shadow-sm"
                        style={profile?.avatar_url ? { backgroundImage: `url(${profile.avatar_url})` } : {}}
                    >
                        {!profile?.avatar_url && <User className="size-5 text-[#a3a3a3] dark:text-admin-dark-text-secondary" />}
                    </div>
                </div>
            </div>
        </header>
    );
};
