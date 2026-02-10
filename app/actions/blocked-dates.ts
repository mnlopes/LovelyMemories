"use server";

import { revalidatePath } from "next/cache";

export interface BlockedDate {
    id: string;
    property_id: string;
    start_date: string;
    end_date: string;
    reason: string;
    created_at: string;
}

export interface ReservationDate {
    id: string;
    check_in: string;
    check_out: string;
    status: string;
    guest_name?: string;
}

async function getAdminClientAndCheckRole() {
    const { createServerClient } = await import('@supabase/ssr');
    const { cookies } = await import('next/headers');
    const { getSupabaseAdmin } = await import('@/lib/supabase');
    const cookieStore = await cookies();

    const userClient = createServerClient(
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

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const admin = await getSupabaseAdmin();
    const { data: profile } = await admin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
        throw new Error('Not authorized');
    }

    return admin;
}

export async function getBlockedDates(propertyId: string) {
    try {
        const admin = await getAdminClientAndCheckRole();

        const { data, error } = await admin
            .from('blocked_dates')
            .select('*')
            .eq('property_id', propertyId)
            .order('start_date', { ascending: true });

        if (error) {
            console.error('Error fetching blocked dates:', error);
            return [];
        }

        return data as BlockedDate[];
    } catch (e) {
        console.error('Authorization or fetch error:', e);
        return [];
    }
}

export async function getUnavailableDates(propertyId: string) {
    try {
        const admin = await getAdminClientAndCheckRole();

        // Fetch manual blocks
        const { data: blocked, error: blockedError } = await admin
            .from('blocked_dates')
            .select('*')
            .eq('property_id', propertyId);

        if (blockedError) console.error('Error fetching blocked dates:', blockedError);

        // Fetch confirmed reservations
        const { data: reservations, error: reservationsError } = await admin
            .from('reservations')
            .select('id, check_in, check_out, status, guest_name')
            .eq('property_id', propertyId)
            .eq('status', 'confirmed');

        if (reservationsError) console.error('Error fetching reservations:', reservationsError);

        return {
            blockedDates: (blocked || []) as BlockedDate[],
            reservations: (reservations || []) as ReservationDate[]
        };
    } catch (e) {
        console.error('Authorization or fetch error:', e);
        return { blockedDates: [], reservations: [] };
    }
}

export async function createBlockedDate(data: {
    property_id: string;
    start_date: string;
    end_date: string;
    reason: string;
}) {
    try {
        const admin = await getAdminClientAndCheckRole();

        // Check for overlap with existing BLOCKS
        const { data: overlapBlock } = await admin
            .from('blocked_dates')
            .select('id')
            .eq('property_id', data.property_id)
            .or(`and(start_date.lte.${data.end_date},end_date.gte.${data.start_date})`);

        if (overlapBlock && overlapBlock.length > 0) {
            return { error: "Dates overlap with an existing block." };
        }

        // Check for overlap with EXISTING RESERVATIONS
        const { data: overlapRes } = await admin
            .from('reservations')
            .select('id')
            .eq('property_id', data.property_id)
            .eq('status', 'confirmed')
            .or(`and(check_in.lte.${data.end_date},check_out.gte.${data.start_date})`);

        if (overlapRes && overlapRes.length > 0) {
            return { error: "Dates overlap with an existing reservation." };
        }

        const { error } = await admin
            .from('blocked_dates')
            .insert([data]);

        if (error) {
            console.error('Error creating blocked date:', error);
            return { error: "Failed to block dates." };
        }

        revalidatePath('/admin/properties');
        revalidatePath(`/admin/properties/${data.property_id}`);
        revalidatePath('/');
        return { success: true };
    } catch (e: any) {
        console.error("Action error:", e);
        return { error: e.message || "Failed to execute action" };
    }
}

export async function deleteBlockedDate(id: string) {
    try {
        const admin = await getAdminClientAndCheckRole();

        const { error } = await admin
            .from('blocked_dates')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting blocked date:', error);
            return { error: "Failed to remove block." };
        }

        revalidatePath('/admin/properties');
        return { success: true };
    } catch (e: any) {
        return { error: e.message || "Failed to delete" };
    }
}
