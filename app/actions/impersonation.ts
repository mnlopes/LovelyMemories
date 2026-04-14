"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { revalidatePath } from "next/cache";

/**
 * Starts impersonating an owner.
 * Only allowed for Super Admins.
 */
export async function startImpersonation(ownerId: string) {
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
    if (!user) throw new Error("Not authenticated");

    // Verify role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'super_admin') {
        throw new Error("Only Super Admins can impersonate owners");
    }

    // Set cookie (valid for 2 hours)
    cookieStore.set('impersonate_owner_id', ownerId, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 2 // 2 hours
    });

    revalidatePath('/', 'layout');
    return { success: true };
}

/**
 * Stops impersonating an owner.
 */
export async function stopImpersonation() {
    const cookieStore = await cookies();
    cookieStore.delete('impersonate_owner_id');
    revalidatePath('/', 'layout');
    return { success: true };
}
