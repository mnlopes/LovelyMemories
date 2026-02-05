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
    newStatus: 'pending' | 'confirmed' | 'cancelled',
    adminId: string
) {
    const adminSupabase = await getSupabaseAdmin();

    // 1. Fetch current reservation for change comparison or detailed logging
    const { data: current, error: fetchError } = await adminSupabase
        .from('reservations')
        .select('*, properties(title)')
        .eq('id', id)
        .single();

    if (fetchError || !current) {
        throw new Error("Reserva não encontrada.");
    }

    // 2. Perform the update
    const { error: updateError } = await adminSupabase
        .from('reservations')
        .update({ status: newStatus })
        .eq('id', id);

    if (updateError) {
        console.error("Error updating reservation status:", updateError);
        throw new Error("Erro ao atualizar o estado da reserva.");
    }

    // 3. Log Activity
    try {
        await logActivity(
            adminId,
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

    // 4. Invalidate cache to reflect changes in UI
    revalidatePath('/[locale]/admin/reservations', 'page');
    revalidatePath('/[locale]/admin/reservations/[id]', 'page');

    return { success: true };
}
