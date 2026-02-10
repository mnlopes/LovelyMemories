"use client";

import { Search, Bell, User, Sun, Moon, Sparkles, CloudMoon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAdminTheme } from "./AdminThemeProvider";
import { NotificationsPopover } from "./NotificationsPopover";
import { cn } from "@/lib/utils";

export const AdminHeader = ({ user, profile }: any) => {
    const t = useTranslations('AdminHeader');
    const { theme, setTheme } = useAdminTheme();

    return (
        <header className="h-20 bg-admin-surface border-b border-admin-border flex items-center justify-between px-10 sticky top-0 z-20">
            <div />

            {/* Actions */}
            <div className="flex items-center gap-8">
                {/* Theme Selector */}
                <div className="flex items-center gap-1.5 p-1.5 bg-admin-bg rounded-2xl border border-admin-border shadow-sm">
                    {[
                        { id: 'light', icon: Sun, label: 'Light', color: 'text-orange-500' },
                        { id: 'creme', icon: Sparkles, label: 'Creme', color: 'text-[#8c734b]' },
                        { id: 'soft-dark', icon: CloudMoon, label: 'Soft Dark', color: 'text-blue-400' },
                        { id: 'dark', icon: Moon, label: 'Deep Dark', color: 'text-indigo-500' }
                    ].map((t: any) => (
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
                        >
                            <t.icon className={cn("size-4.5 stroke-[1.5px]", theme === t.id ? t.color : "")} />
                        </button>
                    ))}
                </div>

                <NotificationsPopover lastReadAt={profile?.last_read_notifications_at || null} />

                <div className="flex items-center gap-4 group cursor-pointer pl-4 border-l border-admin-border">
                    <div className="text-right">
                        <p className="text-sm font-bold text-admin-text-primary group-hover:text-admin-accent transition-colors">{profile?.full_name || user?.email?.split('@')[0] || 'Admin'}</p>
                        <p className="text-[10px] text-admin-text-secondary uppercase tracking-[0.2em] font-black">{profile?.role || t('role')}</p>
                    </div>
                    <div
                        className="size-11 rounded-full bg-admin-bg border border-admin-border bg-cover bg-center overflow-hidden flex items-center justify-center transition-all group-hover:border-admin-accent shadow-sm"
                        style={profile?.avatar_url ? { backgroundImage: `url(${profile.avatar_url})` } : {}}
                    >
                        {!profile?.avatar_url && <User className="size-5 text-admin-text-secondary" />}
                    </div>
                </div>
            </div>
        </header>
    );
};
