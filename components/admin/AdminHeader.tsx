"use client";

import { useEffect, useRef, useState } from "react";
import { User, ChevronDown, Lock, LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { supabase } from "@/lib/supabase";
import { AdminThemePicker } from "./AdminThemePicker";
import { NotificationsPopover } from "./NotificationsPopover";

export const AdminHeader = ({ user, profile }: any) => {
    const t = useTranslations('AdminHeader');
    const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Admin';
    const role = profile?.role || t('role');

    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close on click outside / Escape — the menu is the only floating layer in the header.
    useEffect(() => {
        if (!menuOpen) return;
        const onPointerDown = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setMenuOpen(false);
        };
        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [menuOpen]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        const locale = window.location.pathname.split('/')[1] || 'en';
        window.location.href = `/${locale}/login`;
    };

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

                <div ref={menuRef} className="relative md:pl-4 md:border-l border-admin-border">
                    <button
                        type="button"
                        onClick={() => setMenuOpen(!menuOpen)}
                        aria-haspopup="menu"
                        aria-expanded={menuOpen}
                        aria-label={t('accountMenu')}
                        className="flex items-center gap-3 md:gap-4 group cursor-pointer"
                    >
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
                        <ChevronDown className={`size-4 text-admin-text-secondary transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {menuOpen && (
                        <div
                            role="menu"
                            className="absolute right-0 top-full mt-3 w-64 bg-admin-surface border border-admin-border rounded-2xl shadow-xl overflow-hidden z-30 animate-in fade-in zoom-in duration-150"
                        >
                            <div className="px-4 py-3 border-b border-admin-border">
                                <p className="text-sm font-bold text-admin-text-primary truncate">{displayName}</p>
                                <p className="text-xs text-admin-text-secondary truncate">{user?.email}</p>
                            </div>

                            <Link
                                href="/admin/account"
                                role="menuitem"
                                onClick={() => setMenuOpen(false)}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-admin-text-primary hover:bg-admin-bg transition-colors"
                            >
                                <User className="size-4 text-admin-text-secondary" />
                                {t('myAccount')}
                            </Link>

                            <Link
                                href="/admin/account#password"
                                role="menuitem"
                                onClick={() => setMenuOpen(false)}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-admin-text-primary hover:bg-admin-bg transition-colors"
                            >
                                <Lock className="size-4 text-admin-text-secondary" />
                                {t('changePassword')}
                            </Link>

                            <button
                                type="button"
                                role="menuitem"
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-500/10 transition-colors border-t border-admin-border"
                            >
                                <LogOut className="size-4" />
                                {t('signOut')}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};
