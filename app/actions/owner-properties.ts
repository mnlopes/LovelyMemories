"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getEffectiveUser } from "./auth-context";

export async function getOwnerProperties() {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        cookieStore.set(name, value, options)
                    )
                },
            },
        }
    );

    const { userId } = await getEffectiveUser();
    if (!userId) return [];

    const { getSupabaseAdmin } = await import('@/lib/supabase');
    const adminSupabase = await getSupabaseAdmin();

    const { data: properties } = await adminSupabase
        .from('properties')
        .select(`
            *,
            locations (*)
        `)
        .eq('owner_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    return properties || [];
}
