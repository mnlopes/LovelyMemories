"use client";

import { User, Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAdminNav } from "./AdminNavProvider";
import { AdminThemePicker } from "./AdminThemePicker";
import { NotificationsPopover } from "./NotificationsPopover";

export const AdminHeader = ({ user, profile }: any) => {
    const t = useTranslations('AdminHeader');
    const { setMobileOpen } = useAdminNav();

    return (
        <header className="h-16 md:h-20 bg-admin-surface border-b border-admin-border flex items-center justify-between px-4 md:px-10 sticky top-0 z-20">
            {/* Mobile hamburger */}
            <button
                onClick={() => setMobileOpen(true)}
                className="md:hidden p-2 -ml-2 text-admin-text-secondary hover:text-admin-text-primary rounded-xl"
                aria-label="Open menu"
            >
                <Menu className="size-6" />
            </button>
            <div className="hidden md:block" />

            {/* Actions */}
            <div className="flex items-center gap-3 md:gap-8">
                {/* Theme Selector (desktop only; mobile lives in the drawer) */}
                <AdminThemePicker surface="desktop" className="hidden md:flex" />

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
