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
        .eq('key', key);

    if (error) {
        console.error(`Error fetching setting ${key}:`, error);
        return null;
    }

    if (!data || data.length === 0) {
        return null;
    }

    return data[0].value;
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

    const adminSupabase = await getSupabaseAdmin();
    const { error } = await adminSupabase
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
    const { unstable_noStore: noStore } = await import('next/cache');
    noStore(); // Force dynamic rendering for real-time stats

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
            ? serverSupabase.from('visitor_logs').select('ip_address, user_id, country').gt('created_at', fiveMinsAgo).eq('is_admin_view', false)
            : serverSupabase.from('visitor_logs').select('ip_address, user_id, country').gt('created_at', fiveMinsAgo).eq('is_admin_view', false).neq('user_role', 'super_admin'));

        if (liveErr) throw liveErr;

        // Calculate Active Visitors per Country directly from the "Live" dataset
        // This guarantees the Map matches the "Live Visitor" count exactly.
        const activeVisitorsPerCountry: Record<string, Set<string>> = {};
        const allActiveIPs = new Set<string>();

        // Normalize Country Codes to Names for Map Compatibility
        const countryMap: Record<string, string> = {
            'PT': 'Portugal',
            'US': 'United States',
            'GB': 'United Kingdom',
            'BR': 'Brazil',
            'FR': 'France',
            'ES': 'Spain',
            'DE': 'Germany',
            'IT': 'Italy',
            'CA': 'Canada',
            'AU': 'Australia',
            'NL': 'Netherlands',
            'CH': 'Switzerland',
            'BE': 'Belgium',
            'SE': 'Sweden',
            'NO': 'Norway',
            'DK': 'Denmark',
            'FI': 'Finland',
            'IE': 'Ireland',
            'NZ': 'New Zealand',
            'ZA': 'South Africa',
            'JP': 'Japan',
            'CN': 'China',
            'IN': 'India',
            'RU': 'Russia',
            'KR': 'South Korea',
            'SG': 'Singapore',
            'HK': 'Hong Kong',
            'AE': 'United Arab Emirates',
            'SA': 'Saudi Arabia',
            'UA': 'Ukraine',
            'PL': 'Poland',
            'AT': 'Austria',
            'GR': 'Greece',
            'CZ': 'Czech Republic',
            'RO': 'Romania',
            'HU': 'Hungary'
        };

        liveData?.forEach(v => {
            if (!v.ip_address) return;
            allActiveIPs.add(v.ip_address);

            let c = v.country || 'Unknown';

            // Normalize here too!
            if (countryMap[c]) {
                c = countryMap[c];
            }

            // Apply DEV FIX for localhost matching
            if (c === 'Unknown' && (process.env.NODE_ENV === 'development' || v.ip_address === '::1' || v.ip_address === '127.0.0.1')) {
                c = 'Portugal';
            }

            if (!activeVisitorsPerCountry[c]) activeVisitorsPerCountry[c] = new Set();
            activeVisitorsPerCountry[c].add(v.ip_address);
        });

        const uniqueVisitors = allActiveIPs.size || (liveData?.length ? 1 : 0);

        // Fallback: If we determine there IS a visitor (uniqueVisitors > 0) but we couldn't track their IP 
        // (allActiveIPs is empty), we must attribute this visitor to a country so the Map matches the Card.
        if (uniqueVisitors > 0 && allActiveIPs.size === 0) {
            const defaultCountry = process.env.NODE_ENV === 'development' ? 'Portugal' : 'Unknown';
            if (!activeVisitorsPerCountry[defaultCountry]) activeVisitorsPerCountry[defaultCountry] = new Set();
            activeVisitorsPerCountry[defaultCountry].add('fallback-visitor');
        }

        // 2. Fetch Data for Panels (Countries, Devices, Browsers, Sources)
        // Fetches last 2000 records for a decent sample size
        const { data: logData, error: logErr } = await (includeAdmin
            ? serverSupabase.from('visitor_logs').select('country, device_type, referer, user_agent, ip_address, created_at').limit(2000).order('created_at', { ascending: false })
            : serverSupabase.from('visitor_logs').select('country, device_type, referer, user_agent, ip_address, created_at').neq('user_role', 'super_admin').limit(2000).order('created_at', { ascending: false }));

        if (logErr) throw logErr;

        // --- Aggregations ---
        const countries: Record<string, number> = {};
        const devices: Record<string, number> = { Mobile: 0, Desktop: 0 };
        const browsers: Record<string, number> = {};
        const sources: Record<string, number> = {};

        const now = new Date();
        const fiveMinsInMillis = 5 * 60 * 1000;

        logData.forEach(log => {
            // Country
            let c = log.country || 'Unknown';

            // Normalize Country Codes to Names for Map Compatibility
            // The Map GeoJSON uses full names (e.g. "Portugal"), but DB might have codes ("PT")
            const countryMap: Record<string, string> = {
                'PT': 'Portugal',
                'US': 'United States',
                'GB': 'United Kingdom',
                'BR': 'Brazil',
                'FR': 'France',
                'ES': 'Spain',
                'DE': 'Germany',
                'IT': 'Italy',
                'CA': 'Canada',
                'AU': 'Australia',
                'NL': 'Netherlands',
                'CH': 'Switzerland',
                'BE': 'Belgium',
                'SE': 'Sweden',
                'NO': 'Norway',
                'DK': 'Denmark',
                'FI': 'Finland',
                'IE': 'Ireland',
                'NZ': 'New Zealand',
                'ZA': 'South Africa',
                'JP': 'Japan',
                'CN': 'China',
                'IN': 'India',
                'RU': 'Russia',
                'KR': 'South Korea',
                'SG': 'Singapore',
                'HK': 'Hong Kong',
                'AE': 'United Arab Emirates',
                'SA': 'Saudi Arabia',
                'UA': 'Ukraine',
                'PL': 'Poland',
                'AT': 'Austria',
                'GR': 'Greece',
                'CZ': 'Czech Republic',
                'RO': 'Romania',
                'HU': 'Hungary'
            };

            if (countryMap[c]) {
                c = countryMap[c];
            }

            // DEV FIX: If 'Unknown' (likely localhost), map to a default country (e.g., Portugal) 
            // so the admin can see the map working.
            if (c === 'Unknown' && (process.env.NODE_ENV === 'development' || log.ip_address === '::1' || log.ip_address === '127.0.0.1')) {
                c = 'Portugal';
            }

            countries[c] = (countries[c] || 0) + 1;

            // Device
            const d = log.device_type === 'Mobile' ? 'Mobile' : 'Desktop';
            devices[d] = (devices[d] || 0) + 1;

            // Browser (Simple User-Agent parsing)
            const ua = log.user_agent || '';
            let b = 'Other';

            // Order matters for detection
            if (ua.includes('Firefox') || ua.includes('FxiOS')) b = 'Firefox';
            else if (ua.includes('SamsungBrowser')) b = 'Samsung Internet';
            else if (ua.includes('Opera') || ua.includes('OPR')) b = 'Opera';
            else if (ua.includes('Edg')) b = 'Edge';
            else if (ua.includes('Chrome') || ua.includes('CriOS')) b = 'Chrome';
            else if (ua.includes('Safari')) b = 'Safari';
            else if (ua.includes('bot') || ua.includes('crawler')) b = 'Bot';

            browsers[b] = (browsers[b] || 0) + 1;

            // Source
            let s = 'Direct';
            if (log.referer && log.referer !== 'Direct') {
                try {
                    const url = new URL(log.referer);
                    s = url.hostname.replace('www.', '');
                } catch {
                    s = 'Direct';
                }
            }

            // Normalizing Sources
            const sLower = s.toLowerCase();
            if (sLower.includes('google')) s = 'Google';
            else if (sLower.includes('facebook') || sLower.includes('fb.com')) s = 'Facebook';
            else if (sLower.includes('instagram')) s = 'Instagram';
            else if (sLower.includes('t.co') || sLower.includes('twitter') || sLower.includes('x.com')) s = 'Twitter/X';
            else if (sLower.includes('linkedin')) s = 'LinkedIn';
            else if (sLower.includes('vercel.app')) s = 'Vercel Preview';
            else if (sLower.includes('localhost') || sLower.includes('127.0.0.1')) s = 'Localhost';

            sources[s] = (sources[s] || 0) + 1;
        });

        // Helper to sort and slice
        const getTop = (obj: Record<string, number>, limit = 5) => Object.entries(obj)
            .sort(([, a], [, b]) => b - a)
            .slice(0, limit)
            .map(([name, count]) => ({ name, count }));

        // Special handling for countries to include unique visitor count
        // We include ALL countries with data for the map, not just top 10
        let allCountries = Object.keys({ ...countries, ...activeVisitorsPerCountry }).map(name => {
            const count = countries[name] || 0;
            const visitors = activeVisitorsPerCountry[name]?.size || 0;
            return { name, count, visitors };
        }).sort((a, b) => b.count - a.count);

        // --- SAFETY NET ---
        // Ensure the sum of visitors on the map equals the global uniqueVisitors count.
        // If there's a mismatch (e.g. IP didn't map to a country correctly), assign the remainder to the default country.
        const totalVisitorsOnMap = allCountries.reduce((sum, c) => sum + c.visitors, 0);

        if (totalVisitorsOnMap < uniqueVisitors) {
            const difference = uniqueVisitors - totalVisitorsOnMap;
            const defaultCountry = process.env.NODE_ENV === 'development' ? 'Portugal' : 'Unknown';

            const existingCountry = allCountries.find(c => c.name === defaultCountry);
            if (existingCountry) {
                existingCountry.visitors += difference;
            } else {
                allCountries.push({ name: defaultCountry, count: 0, visitors: difference });
            }

            // Re-sort after modification
            allCountries.sort((a, b) => b.count - a.count);
        }

        return {
            success: true,
            liveVisitors: uniqueVisitors || 0,
            topCountries: allCountries.slice(0, 10), // Keep top 10 for any lists
            mapData: allCountries, // Send all data for the map
            topDevices: getTop(devices, 2), // Should be just Mobile/Desktop
            topBrowsers: getTop(browsers, 5),
            topSources: getTop(sources, 5),
            totalSample: logData.length
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

/**
 * Fetch all properties with their iCal sync status.
 * Restricted to Super Admin.
 */
export async function getPropertySyncStatuses() {
    const { createServerClient } = await import('@supabase/ssr');
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
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

    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Role check
    const { data: profile } = await serverSupabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile || profile.role !== 'super_admin') {
        throw new Error('Unauthorized');
    }

    const { data, error } = await serverSupabase
        .from('properties')
        .select('id, title, last_sync_at, sync_status, last_sync_error, is_active, ical_import_urls')
        .order('last_sync_at', { ascending: false, nullsFirst: false });

    if (error) throw error;

    return { success: true, properties: data };
}
