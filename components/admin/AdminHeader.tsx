"use client";

import { User } from "lucide-react";
import { useTranslations } from "next-intl";
import { AdminThemePicker } from "./AdminThemePicker";
import { NotificationsPopover } from "./NotificationsPopover";

export const AdminHeader = ({ user, profile }: any) => {
    const t = useTranslations('AdminHeader');
    const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Admin';
    const role = profile?.role || t('role');

    return (
        <header className="h-16 md:h-20 bg-admin-surface border-b border-admin-border flex items-center justify-between px-4 md:px-10 sticky top-0 z-20">
            {/* Mobile: identidade à esquerda (sem hambúrguer — o "More" da barra inferior abre a gaveta) */}
            <div className="md:hidden min-w-0">
                <p className="text-sm font-bold text-admin-text-primary truncate">{displayName}</p>
                <p className="text-[10px] text-admin-text-secondary uppercase tracking-[0.2em] font-black">{role}</p>
            </div>
            <div className="hidden md:block" />

            {/* Actions */}
            <div className="flex items-center gap-3 md:gap-8">
                {/* Theme Selector (desktop only; mobile lives in the drawer) */}
                <AdminThemePicker surface="desktop" className="hidden md:flex" />

                <NotificationsPopover lastReadAt={profile?.last_read_notifications_at || null} />

                <div className="flex items-center gap-4 group cursor-pointer md:pl-4 md:border-l border-admin-border">
                    {/* Nome só no desktop — no mobile já está à esquerda */}
                    <div className="text-right hidden md:block">
                        <p className="text-sm font-bold text-admin-text-primary group-hover:text-admin-accent transition-colors">{displayName}</p>
                        <p className="text-[10px] text-admin-text-secondary uppercase tracking-[0.2em] font-black">{role}</p>
                    </div>
                    <div
                        className="size-9 md:size-11 rounded-full bg-admin-bg border border-admin-border bg-cover bg-center overflow-hidden flex items-center justify-center transition-all group-hover:border-admin-accent shadow-sm"
                        style={profile?.avatar_url ? { backgroundImage: `url(${profile.avatar_url})` } : {}}
                    >
                        {!profile?.avatar_url && <User className="size-5 text-admin-text-secondary" />}
                    </div>
                </div>
            </div>
        </header>
    );
};
