"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
    Activity,
    User,
    Home,
    Calendar,
    Settings,
    Shield,
    Trash2,
    Edit,
    PlusCircle,
    Mail
} from "lucide-react";
import { getAuditLogs } from "@/app/actions/audit";
import { AuditLog } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ActivityTimelineProps {
    resourceId?: string;
    resourceType?: string;
    limit?: number;
    className?: string;
}

export function ActivityTimeline({ resourceId, resourceType, limit = 50, className }: ActivityTimelineProps) {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters & Settings
    const [selectedDate, setSelectedDate] = useState<string>(''); // YYYY-MM-DD
    const [retentionDays, setRetentionDays] = useState<number>(180);
    const [cleanupTime, setCleanupTime] = useState<string>('00:00');
    const [userRole, setUserRole] = useState<string | null>(null);
    const [isUpdatingRetention, setIsUpdatingRetention] = useState(false);

    useEffect(() => {
        async function fetchInitialData() {
            try {
                const { supabase } = await import("@/lib/supabase");
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
                    setUserRole(profile?.role || null);
                }

                const { getSystemSetting } = await import("@/app/actions/settings");
                const days = await getSystemSetting('audit_log_retention_days');
                if (days) setRetentionDays(Number(days));

                const schedule = await getSystemSetting('audit_log_cleanup_schedule');
                if (schedule && typeof schedule === 'string') {
                    // Convert cron "0 H * * *" to "HH:00"
                    const parts = schedule.split(' ');
                    if (parts.length >= 2) {
                        const hour = parts[1].padStart(2, '0');
                        setCleanupTime(`${hour}:00`);
                    }
                }
            } catch (err) {
                console.error("Error fetching admin data:", err);
            }
        }
        fetchInitialData();
    }, []);

    useEffect(() => {
        async function fetchLogs() {
            try {
                setLoading(true);

                let startDate, endDate;
                if (selectedDate) {
                    startDate = new Date(`${selectedDate}T00:00:00Z`).toISOString();
                    endDate = new Date(`${selectedDate}T23:59:59Z`).toISOString();
                }

                // Call server action
                const data = await getAuditLogs({
                    resourceId,
                    resourceType,
                    startDate,
                    endDate,
                    limit
                });

                setLogs(data as unknown as AuditLog[]);
            } catch (err) {
                console.error(err);
                setError("Failed to load activity history");
            } finally {
                setLoading(false);
            }
        }

        fetchLogs();
    }, [resourceId, resourceType, limit, selectedDate]);

    const handleRetentionChange = async (days: number) => {
        try {
            setIsUpdatingRetention(true);
            const { updateSystemSetting } = await import("@/app/actions/settings");
            const res = await updateSystemSetting('audit_log_retention_days', days);
            if (res.success) {
                setRetentionDays(days);
            }
        } catch (err) {
            console.error("Failed to update retention:", err);
        } finally {
            setIsUpdatingRetention(false);
        }
    };

    const handleCleanupTimeChange = async (time: string) => {
        try {
            setIsUpdatingRetention(true);
            const [hour] = time.split(':');
            const newCron = `0 ${parseInt(hour)} * * *`;

            const { updateSystemSetting } = await import("@/app/actions/settings");
            const res = await updateSystemSetting('audit_log_cleanup_schedule', newCron);
            if (res.success) {
                setCleanupTime(time);
            }
        } catch (err) {
            console.error("Failed to update cleanup time:", err);
        } finally {
            setIsUpdatingRetention(false);
        }
    };

    if (loading && logs.length === 0) {
        return <div className="p-4 text-center text-gray-500 animate-pulse">Loading activity...</div>;
    }

    if (error) {
        return <div className="p-4 text-center text-red-500">{error}</div>;
    }

    return (
        <div className={cn("space-y-6 relative ml-2", className)}>
            {/* Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-sm sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 px-1">Filter by Day</label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-gold-500 outline-none transition-all dark:text-white"
                        />
                    </div>
                    {selectedDate && (
                        <button
                            onClick={() => setSelectedDate('')}
                            className="mt-5 text-[10px] font-bold text-red-500 hover:text-red-600 transition-colors"
                        >
                            CLEAR
                        </button>
                    )}
                </div>

                {userRole === 'super_admin' && (
                    <div className="flex flex-wrap items-center gap-6">
                        <div className="flex flex-col items-end">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 px-1">Retention Policy</label>
                            <div className="flex items-center gap-2">
                                <select 
                                    value={retentionDays}
                                    onChange={(e) => handleRetentionChange(Number(e.target.value))}
                                    disabled={isUpdatingRetention}
                                    className="bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-gold-500 outline-none transition-all dark:text-white appearance-none cursor-pointer disabled:opacity-50"
                                >
                                    <option value={30}>30 Days</option>
                                    <option value={90}>90 Days</option>
                                    <option value={180}>180 Days (Default)</option>
                                    <option value={365}>365 Days</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex flex-col items-end">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 px-1">Cleanup Time</label>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="time"
                                    step="3600" // Only hours for simplicity in cron conversion
                                    value={cleanupTime}
                                    onChange={(e) => handleCleanupTimeChange(e.target.value)}
                                    disabled={isUpdatingRetention}
                                    className="bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-gold-500 outline-none transition-all dark:text-white disabled:opacity-50"
                                />
                                {isUpdatingRetention && <div className="size-3 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="absolute left-[19px] top-4 bottom-4 w-[2px] bg-gray-100 dark:bg-zinc-800" />

            {logs.length === 0 ? (
                <div className="p-12 text-center">
                    <div className="size-12 bg-gray-50 dark:bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100 dark:border-zinc-800">
                        <Activity className="text-gray-300" size={20} />
                    </div>
                    <p className="text-gray-400 italic text-sm">No activity found for this selection.</p>
                </div>
            ) : logs.map((log) => {
                const Icon = getActionIcon(log.action_type);
                const colorClass = getActionColor(log.action_type);
                const date = new Date(log.created_at);

                return (
                    <div key={log.id} className="relative flex gap-4 group">
                        <div className={cn(
                            "relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-4 border-white dark:border-zinc-950",
                            colorClass
                        )}>
                            <Icon size={16} className="text-white" />
                        </div>

                        <div className="flex-1 py-1">
                            <div className="flex justify-between items-start mb-1">
                                <div className="font-medium text-gray-900 dark:text-gray-100">
                                    {formatDescription(log)}
                                </div>
                                <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                                    {format(date, "MMM d, HH:mm")}
                                </span>
                            </div>

                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                <span className="font-semibold text-gray-700 dark:text-gray-300">
                                    {log.actor?.full_name || log.actor?.email || "System"}
                                </span>
                                {" • "}
                                <span className="capitalize text-xs bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                                    {log.actor?.role?.replace('_', ' ') || 'Unknown Role'}
                                </span>
                            </div>

                            {/* Optional: Render details diff or metadata */}
                            {log.details && Object.keys(log.details).length > 0 && (
                                <div className="mt-2 text-xs bg-gray-50 dark:bg-zinc-900/50 p-2 rounded border border-gray-100 dark:border-zinc-800">
                                    {/* Handle common details patterns */}
                                    {renderDetails(log.details)}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// Helpers

function getActionIcon(action: string) {
    switch (action) {
        case 'CREATE': return PlusCircle;
        case 'UPDATE': return Edit;
        case 'DELETE': return Trash2;
        case 'LOGIN': return User;
        case 'INVITE': return Mail;
        case 'STATUS_CHANGE': return Settings;
        default: return Activity;
    }
}

function getActionColor(action: string) {
    switch (action) {
        case 'CREATE': return "bg-emerald-500";
        case 'UPDATE': return "bg-blue-500";
        case 'DELETE': return "bg-red-500";
        case 'INVITE': return "bg-purple-500";
        case 'LOGIN': return "bg-teal-500";
        default: return "bg-gray-400";
    }
}

function formatDescription(log: AuditLog) {
    const resource = log.resource_type.toLowerCase();
    const action = log.action_type;
    const details = log.details as any;
    const resourceName = details?.title ? `: ${details.title}` : '';

    switch (action) {
        case 'CREATE': return `Created new ${resource}${resourceName}`;
        case 'UPDATE': return `Updated ${resource}${resourceName}`;
        case 'DELETE': return `Deleted ${resource}${resourceName}`;
        case 'INVITE': return `Invited user`;
        case 'STATUS_CHANGE': return `Status changed on ${resource}${resourceName}`;
        default: return `${action} on ${resource}${resourceName}`;
    }
}

function renderDetails(details: any) {
    if (details.changes) {
        return (
            <div className="flex flex-col gap-1 text-xs">
                {Object.entries(details.changes).map(([key, value]: [string, any]) => {
                    // Handle "from -> to" object style
                    if (typeof value === 'object' && value !== null && 'from' in value && 'to' in value) {
                        return (
                            <div key={key} className="flex flex-wrap gap-x-1 items-baseline">
                                <span className="font-semibold text-gray-500 capitalize">{key.replace('_', ' ')}:</span>
                                <span className="text-red-400 line-through decoration-red-400/50 opacity-80">{String(value.from || 'Empty')}</span>
                                <span className="text-gray-400 text-[10px]">➜</span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">{String(value.to || 'Empty')}</span>
                            </div>
                        );
                    }
                    // Fallback for simple values
                    return (
                        <div key={key} className="flex gap-2">
                            <span className="font-medium text-gray-500 capitalize">{key.replace('_', ' ')}:</span>
                            <span className="truncate max-w-[200px] text-gray-700 dark:text-gray-300">{String(value)}</span>
                        </div>
                    );
                })}
            </div>
        );
    }

    if (details.field) {
        // Specific field update
        return (
            <div>
                Changed <span className="font-medium text-gray-700 dark:text-gray-300">{details.field}</span>
                {details.old_role && <span> from {details.old_role} to {details.new_role}</span>}
                {details.previous_email && <span> (Previous: {details.previous_email})</span>}
            </div>
        );
    }

    if (details.email) {
        return <span>Email: {details.email} ({details.role})</span>;
    }

    return <pre className="whitespace-pre-wrap">{JSON.stringify(details, null, 2)}</pre>;
}
