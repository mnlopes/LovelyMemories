"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { logActivity } from "./audit";
import { revalidatePath } from "next/cache";

/**
 * Update the status of a reservation (Approve/Confirm or Reject/Cancel)
 * Restricted to Super Admins and Admins.
 */
export async function updateReservationStatus(
    id: string,
    newStatus: 'pending' | 'confirmed' | 'cancelled'
) {
    // 1. Authenticate and check role
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

    const { data: profile } = await serverSupabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile || (profile.role !== 'super_admin' && profile.role !== 'admin')) {
        throw new Error('Not authorized to update reservations');
    }

    const adminSupabase = await getSupabaseAdmin();

    // 2. Fetch current reservation for change comparison or detailed logging
    const { data: current, error: fetchError } = await adminSupabase
        .from('reservations')
        .select('*, properties(title)')
        .eq('id', id)
        .single();

    if (fetchError || !current) {
        throw new Error("Reserva não encontrada.");
    }

    // 3. Perform the update
    const { error: updateError } = await adminSupabase
        .from('reservations')
        .update({ status: newStatus })
        .eq('id', id);

    if (updateError) {
        console.error("Error updating reservation status:", updateError);
        throw new Error("Erro ao atualizar o estado da reserva.");
    }

    // 4. Log Activity
    try {
        await logActivity(
            user.id,
            'UPDATE',
            'RESERVATION',
            id,
            {
                guest_name: current.guest_name,
                old_status: current.status,
                new_status: newStatus,
                property: current.properties?.title?.pt || current.properties?.title?.en || 'Unknown',
                ref: current.reference_id
            }
        );
    } catch (logErr) {
        console.error("Failed to log status update activity:", logErr);
    }

    // 5. Invalidate cache to reflect changes in UI
    revalidatePath('/[locale]/admin/reservations', 'page');
    revalidatePath('/[locale]/admin/reservations/[id]', 'page');

    return { success: true };
}
