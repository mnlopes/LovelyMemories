"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function markNotificationsAsRead() {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        cookieStore.set(name, value, options)
                    )
                },
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
        .from('profiles')
        .update({ last_read_notifications_at: new Date().toISOString() })
        .eq('id', user.id);

    revalidatePath('/', 'layout');
}

export async function getUnreadNotificationsCount(lastReadAt: string | null) {
    if (!lastReadAt) return 0; // If never tracking, maybe 0 or everything. Let's assume 0 until migration applied.

    // This query logic duplicates `getAuditLogs` somewhat but is optimized for count
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        cookieStore.set(name, value, options)
                    )
                },
            },
        }
    );

    // We only care about RESERVATION CREATION or Severity CRITICAL for now as "Alerts"
    const { count, error } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .gt('created_at', lastReadAt)
        .or('resource_type.eq.RESERVATION,severity.eq.CRITICAL'); // Only count reservations or critical errors

    if (error) {
        console.error("Error counting notifications:", error);
        return 0;
    }

    return count || 0;
}
