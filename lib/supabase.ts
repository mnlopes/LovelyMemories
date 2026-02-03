import { createBrowserClient } from '@supabase/ssr';

// Use placeholders for build time if env vars are missing
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.warn('⚠️ Missing NEXT_PUBLIC_SUPABASE_URL, using placeholder for build.');
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
