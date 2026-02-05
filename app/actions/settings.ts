"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * Fetch a system setting by key.
 */
export async function getSystemSetting(key: string) {
    const { createServerClient } = await import('@supabase/ssr');
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const serverSupabase = createServerClient(
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

    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await serverSupabase
        .from('system_settings')
        .select('value')
        .eq('key', key)
        .single();

    if (error) {
        console.error(`Error fetching setting ${key}:`, error);
        return null;
    }

    return data.value;
}

/**
 * Update a system setting. Restricted to Super Admin.
 */
export async function updateSystemSetting(key: string, value: any) {
    const { createServerClient } = await import('@supabase/ssr');
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const serverSupabase = createServerClient(
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

    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Role check
    const { data: profile } = await serverSupabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile || profile.role !== 'super_admin') {
        throw new Error('Unauthorized: Only Super Admins can change system settings');
    }

    const { error } = await serverSupabase
        .from('system_settings')
        .upsert({
            key,
            value,
            updated_at: new Date().toISOString()
        });

    if (error) {
        console.error(`Error updating setting ${key}:`, error);
        return { success: false, error: error.message };
    }

    revalidatePath("/admin");
    return { success: true };
}

/**
 * Check if Resend API key is valid and working.
 */
export async function checkResendStatus() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        return { success: false, error: "RESEND_API_KEY not found in environment" };
    }

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
            },
            cache: 'no-store'
        });

        if (response.ok) {
            return { success: true, type: 'full' };
        } else {
            const errorData = await response.json();

            // If the error is exactly about restriction, it means the key IS VALID, just limited.
            if (errorData.message && errorData.message.toLowerCase().includes('restricted')) {
                return {
                    success: true,
                    type: 'restricted',
                    message: "This API key is restricted to only send emails (Valid)"
                };
            }

            return { success: false, error: errorData.message || "Invalid API Key" };
        }
    } catch (error: any) {
        console.error("Resend status check failed:", error);
        return { success: false, error: error.message || "Connection failed" };
    }
}

/**
 * Flush all cached paths to ensure data freshness.
 */
export async function flushGlobalCache() {
    try {
        // Revalidate the entire site structure
        revalidatePath("/", "layout");
        return { success: true, message: "Global cache revalidated successfully" };
    } catch (error: any) {
        console.error("Cache flush failed:", error);
        return { success: false, error: error.message || "Failed to flush cache" };
    }
}

/**
 * Check connectivity and health of the Supabase database.
 */
export async function checkDatabaseStatus() {
    const { createServerClient } = await import('@supabase/ssr');
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();

    try {
        const serverSupabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() { return cookieStore.getAll() },
                    setAll() { },
                },
            }
        );

        // Simple query to verify connection
        const start = Date.now();
        const { error } = await serverSupabase.from('profiles').select('id').limit(1);
        const latency = Date.now() - start;

        if (error) throw error;

        return {
            success: true,
            latency: `${latency}ms`,
            timestamp: new Date().toISOString()
        };
    } catch (error: any) {
        console.error("Database health check failed:", error);
        return { success: false, error: error.message || "Database unreachable" };
    }
}

/**
 * Get visitor statistics for the analytics dashboard.
 */
export async function getVisitorStats(includeAdmin = false) {
    const { createServerClient } = await import('@supabase/ssr');
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();

    try {
        const serverSupabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() { return cookieStore.getAll() },
                    setAll() { },
                },
            }
        );

        // 1. Live Visitors (Last 5 minutes) - Unique IPs ONLY
        const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const { data: liveData, error: liveErr } = await (includeAdmin
            ? serverSupabase.from('visitor_logs').select('ip_address, user_id').gt('created_at', fiveMinsAgo).eq('is_admin_view', false)
            : serverSupabase.from('visitor_logs').select('ip_address, user_id').gt('created_at', fiveMinsAgo).eq('is_admin_view', false).neq('user_role', 'super_admin'));

        if (liveErr) throw liveErr;

        // Count unique visitors by IP address (this tells us exactly how many separate connections exist)
        const uniqueVisitors = new Set(liveData?.map(v => v.ip_address).filter(Boolean)).size || (liveData?.length ? 1 : 0);

        // 2. Top Countries
        const { data: countryData, error: countryErr } = await (includeAdmin
            ? serverSupabase.from('visitor_logs').select('country').limit(1000)
            : serverSupabase.from('visitor_logs').select('country').neq('user_role', 'super_admin').limit(1000));

        if (countryErr) throw countryErr;

        const countries: Record<string, number> = {};
        countryData.forEach(log => {
            const c = log.country || 'Unknown';
            countries[c] = (countries[c] || 0) + 1;
        });

        const sortedCountries = Object.entries(countries)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));

        return {
            success: true,
            liveVisitors: uniqueVisitors || 0,
            topCountries: sortedCountries
        };
    } catch (error: any) {
        console.error("Analytics fetch failed:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Get the latest detailed visitor logs.
 */
export async function getRecentVisits(limit = 15, includeAdmin = false) {
    const { createServerClient } = await import('@supabase/ssr');
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();

    try {
        const serverSupabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() { return cookieStore.getAll() },
                    setAll() { },
                },
            }
        );

        const { data, error } = await (includeAdmin
            ? serverSupabase.from('visitor_logs').select('*').order('created_at', { ascending: false }).limit(limit)
            : serverSupabase.from('visitor_logs').select('*').neq('user_role', 'super_admin').order('created_at', { ascending: false }).limit(limit));

        if (error) throw error;

        return { success: true, logs: data };
    } catch (error: any) {
        console.error("Recent visits fetch failed:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Clear all visitor logs.
 */
export async function clearVisitorLogs() {
    const { createServerClient } = await import('@supabase/ssr');
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();

    try {
        const serverSupabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() { return cookieStore.getAll() },
                    setAll() { },
                },
            }
        );

        // Delete all logs
        const { error } = await serverSupabase
            .from('visitor_logs')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete everything

        if (error) throw error;

        return { success: true };
    } catch (error: any) {
        console.error("Failed to clear logs:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Get bucketed traffic data for the timeline chart with multiple ranges.
 */
export async function getTrafficData(range: '60m' | '6h' | '12h' | '24h' = '60m', includeAdmin = false) {
    const { createServerClient } = await import('@supabase/ssr');
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();

    try {
        const serverSupabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() { return cookieStore.getAll() },
                    setAll() { },
                },
            }
        );

        const rangeMap = {
            '60m': 60,
            '6h': 360,
            '12h': 720,
            '24h': 1440
        };

        const totalMins = rangeMap[range];
        const rangeDate = new Date(Date.now() - totalMins * 60 * 1000).toISOString();

        const { data, error } = await (includeAdmin
            ? serverSupabase.from('visitor_logs').select('created_at').gt('created_at', rangeDate)
            : serverSupabase.from('visitor_logs').select('created_at').gt('created_at', rangeDate).neq('user_role', 'super_admin'));

        if (error) throw error;

        // Still use 60 buckets for the UI
        const buckets = Array(60).fill(0);
        const now = Date.now();
        const intervalMs = (totalMins * 60 * 1000) / 60; // Size of each bucket in MS

        data.forEach(log => {
            const logTime = new Date(log.created_at).getTime();
            const diffMs = now - logTime;
            const bucketIndex = Math.floor(diffMs / intervalMs);
            if (bucketIndex >= 0 && bucketIndex < 60) {
                buckets[59 - bucketIndex]++;
            }
        });

        return { success: true, data: buckets };
    } catch (error: any) {
        console.error("Traffic data fetch failed:", error);
        return { success: false, error: error.message };
    }
}
/**
 * Get the total count of logs in the database.
 */
export async function getLogCount() {
    const { createServerClient } = await import('@supabase/ssr');
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();

    try {
        const serverSupabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() { return cookieStore.getAll() },
                    setAll() { },
                },
            }
        );

        const { count, error } = await serverSupabase
            .from('visitor_logs')
            .select('*', { count: 'exact', head: true });

        if (error) throw error;
        return { success: true, count: count || 0 };
    } catch (error: any) {
        console.error("Log count fetch failed:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Purge logs older than X days.
 */
export async function purgeLogs(days = 7) {
    const { createServerClient } = await import('@supabase/ssr');
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();

    try {
        const serverSupabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() { return cookieStore.getAll() },
                    setAll() { },
                },
            }
        );

        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

        const { error } = await serverSupabase
            .from('visitor_logs')
            .delete()
            .lt('created_at', cutoff);

        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        console.error("Log purge failed:", error);
        return { success: false, error: error.message };
    }
}
