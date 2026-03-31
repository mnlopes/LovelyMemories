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

/**
 * Finish a reservation or block early by setting its check_out (or end_date) to today.
 */
export async function finishReservationEarly(
    id: string,
    isManualBlock: boolean = false
) {
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

    const adminSupabase = await getSupabaseAdmin();
    const todayStr = new Date().toISOString().split('T')[0];

    if (isManualBlock) {
        // Update blocked_dates
        // We know it starts with 'block-' if it's passed from the UI
        const blockId = id.startsWith('block-') ? id.replace('block-', '') : id;
        
        // Prevent finishing future blocks (constraint check)
        const { data: block } = await adminSupabase.from('blocked_dates').select('start_date').eq('id', blockId).single();
        if (block && new Date(block.start_date) > new Date(todayStr)) {
             throw new Error("Este bloqueio inicia-se no futuro. Por favor, utilize a opção 'Apagar' em vez de terminar.");
        }
        
        const { error } = await adminSupabase
            .from('blocked_dates')
            .update({ end_date: todayStr })
            .eq('id', blockId);

        if (error) {
            console.error("Error setting end_date of block:", error);
            throw new Error("Erro ao terminar o bloqueio.");
        }
        
    } else {
        // Prevent finishing future reservations
        const { data: res } = await adminSupabase.from('reservations').select('check_in').eq('id', id).single();
        if (res && new Date(res.check_in) > new Date(todayStr)) {
             throw new Error("Esta reserva inicia-se no futuro. Por favor, cancele ou elimine a reserva em vez de terminar.");
        }

        // Update reservations
        const { error } = await adminSupabase
            .from('reservations')
            .update({ check_out: todayStr, status: 'completed' })
            .eq('id', id);

        if (error) {
            console.error("Error setting check_out of reservation:", error);
            throw new Error("Erro ao terminar a reserva.");
        }
        
        // Log Activity
        try {
            await logActivity(
                user.id,
                'UPDATE',
                'RESERVATION',
                id,
                { action: 'finish_early', target_date: todayStr }
            );
        } catch (logErr) {
            console.error("Failed to log activity:", logErr);
        }
    }

    revalidatePath('/[locale]/admin/reservations', 'page');
    revalidatePath('/[locale]/admin/reservations/[id]', 'page');

    return { success: true };
}
