import { createBrowserClient } from '@supabase/ssr';

// Use placeholders for build time if env vars are missing
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.warn('⚠️ Missing NEXT_PUBLIC_SUPABASE_URL, using placeholder for build.');
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true
    }
});

/**
 * Get a Supabase admin client with service_role privileges
 * This is used for server-side operations that require high privileges (e.g., Audit Logging, User Management)
 */
export async function getSupabaseAdmin() {
    const { createServerClient } = await import('@supabase/ssr');
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            cookies: {
                get(name: string) { return ''; },
                set(name: string, value: string, options: any) { },
                remove(name: string, options: any) { },
            },
        }
    );
}
