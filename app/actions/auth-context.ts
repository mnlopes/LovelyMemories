"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Resolves the effective user for the current session.
 * If a Super Admin is impersonating an owner, returns the owner's ID.
 * Otherwise returns the real authenticated user's ID.
 */
export async function getEffectiveUser() {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { userId: null, realUser: null, isImpersonating: false };

    const { getSupabaseAdmin } = await import('@/lib/supabase');
    const adminSupabase = await getSupabaseAdmin();

    // Get real user profile to check role
    const { data: profile } = await adminSupabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    const isSuperAdmin = profile?.role === 'super_admin';
    const impersonatedId = cookieStore.get('impersonate_owner_id')?.value;

    if (isSuperAdmin && impersonatedId) {
        const { data: impersonatedProfile } = await adminSupabase
            .from('profiles')
            .select('id, role')
            .eq('id', impersonatedId)
            .single();

        if (impersonatedProfile) {
            return {
                userId: impersonatedId,
                realUser: user,
                realProfile: profile,
                isImpersonating: true
            };
        }
    }

    return {
        userId: user.id,
        realUser: user,
        realProfile: profile,
        isImpersonating: false
    };
}

/**
 * Guard for owner-side mutations. "View as owner" is strictly read-only, so any write
 * action an admin could reach while impersonating must refuse server-side too (the UI
 * already disables the forms, this is defense-in-depth — and prevents an impersonating
 * admin from accidentally mutating their OWN account, since these actions run on the
 * real session).
 */
export async function assertNotImpersonating() {
    const { isImpersonating } = await getEffectiveUser();
    if (isImpersonating) {
        throw new Error('Read-only: you are viewing this account as an admin. Exit view mode to make changes.');
    }
}
