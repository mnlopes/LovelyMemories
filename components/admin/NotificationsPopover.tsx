"use client";

import { Bell, Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { markNotificationsAsRead, getUnreadNotificationsCount } from "@/app/actions/notifications";
import { getAuditLogs } from "@/app/actions/audit";
import { format } from "date-fns";
import { useRouter } from "@/i18n/routing";
import { cn } from "@/lib/utils";

interface NotificationsPopoverProps {
    lastReadAt: string | null;
}

export function NotificationsPopover({ lastReadAt }: NotificationsPopoverProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // Poll for unread count occasionally? Or just checking on mount.
    // For now, check on mount.
    useEffect(() => {
        if (lastReadAt) {
            getUnreadNotificationsCount(lastReadAt).then(count => setUnreadCount(count));
        }
    }, [lastReadAt]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleToggle = async () => {
        if (!isOpen) {
            // Opening
            setIsOpen(true);
            setLoading(true);
            try {
                // Fetch recent "Alerts" - we now use the server-side specialized filter
                const alerts = await getAuditLogs({
                    limit: 15,
                    onlyAlerts: true
                });
                setNotifications(alerts || []);

                // Mark as read after a short delay (so user sees the dot disappear visually)
                // Or maybe explicitly when they click "Mark all as read"?
                // User said: "abrir os alertas para limpar" -> Open to clear.
                await markNotificationsAsRead();
                setUnreadCount(0); // Optimistic clear
            } catch (error) {
                console.error("Failed to load notifications", error);
            } finally {
                setLoading(false);
            }
        } else {
            setIsOpen(false);
        }
    };

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={handleToggle}
                className="p-2.5 rounded-xl text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white hover:bg-[#fafafa] dark:hover:bg-white/10 relative transition-all group border border-transparent dark:hover:border-white/20"
            >
                <Bell className={cn("size-5 stroke-[1.5px]", isOpen ? "text-black dark:text-white" : "")} />

                {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 size-2.5 bg-red-500 rounded-full border-2 border-white dark:border-admin-dark-bg shadow-sm animate-pulse"></span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 top-14 w-80 bg-white dark:bg-admin-dark-surface rounded-2xl shadow-xl border border-[#f5f5f5] dark:border-admin-dark-border z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-3 border-b border-[#f5f5f5] dark:border-admin-dark-border flex justify-between items-center bg-[#fafafa]/50 dark:bg-white/5">
                        <h3 className="font-bold text-sm text-[#171717] dark:text-white">Notifications</h3>
                        <span className="text-[10px] uppercase font-bold text-[#a3a3a3] tracking-wider">Recent Alerts</span>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto">
                        {loading ? (
                            <div className="p-6 text-center text-xs text-[#a3a3a3]">Loading...</div>
                        ) : notifications.length === 0 ? (
                            <div className="p-6 text-center text-xs text-[#a3a3a3]">No recent alerts.</div>
                        ) : (
                            <div className="divide-y divide-[#f5f5f5] dark:divide-admin-dark-border">
                                {notifications.map(notif => (
                                    <div key={notif.id} className="p-4 hover:bg-[#fafafa] dark:hover:bg-white/5 transition-colors cursor-pointer" onClick={() => {
                                        if (notif.resource_type === 'RESERVATION') {
                                            router.push(`/admin/reservations`);
                                            setIsOpen(false);
                                        }
                                    }}>
                                        <div className="flex gap-3">
                                            <div className="mt-1 size-2 rounded-full bg-blue-500 shrink-0" />
                                            <div>
                                                <p className="text-xs font-bold text-[#171717] dark:text-white">
                                                    New Reservation
                                                </p>
                                                <p className="text-xs text-[#a3a3a3] mt-0.5 line-clamp-2">
                                                    {notif.details?.guest_name ? `${notif.details.guest_name} booked a stay.` : 'A new reservation was created.'}
                                                </p>
                                                <p className="text-[10px] text-[#d4d4d4] mt-1.5 font-medium">
                                                    {format(new Date(notif.created_at), "MMM d, HH:mm")}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {notifications.length > 0 && (
                        <div className="p-2 border-t border-[#f5f5f5] dark:border-admin-dark-border bg-[#fafafa]/50 dark:bg-white/5 text-center">
                            <button className="text-[10px] font-bold text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white transition-colors" onClick={() => router.push('/admin/activity')}>
                                View All Activity
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
