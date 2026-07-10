"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { logActivity } from "./audit";
import { revalidatePath } from "next/cache";

/**
 * Build and send the guest-facing "Reservation Cancelled" email for a reservation row.
 * `current` must include the reservation fields plus `properties(title)` (as fetched below).
 * No authorization / eligibility checks here — callers gate when to invoke it.
 */
async function sendGuestCancellationEmail(current: any) {
    const { sendEmail } = await import('@/lib/email');
    const { bookingGuestCancellationEmail } = await import('@/lib/email-templates');

    const titleObj = current.properties?.title;
    const propertyTitle = typeof titleObj === 'object'
        ? (titleObj?.en || titleObj?.pt || 'The property')
        : (titleObj || 'The property');

    const fmtDate = (d?: string) => {
        if (!d) return '';
        const [y, m, day] = d.split('-');
        return day && m && y ? `${day}/${m}/${y}` : d;
    };

    const locale = current.locale || 'pt';
    const isEn = locale === 'en';

    return sendEmail({
        to: current.guest_email,
        subject: isEn
            ? `Lovely Memories | Reservation Cancelled [Ref: ${current.reference_id}]`
            : `Lovely Memories | Reserva Cancelada [Ref: ${current.reference_id}]`,
        html: bookingGuestCancellationEmail({
            guest_name: current.guest_name,
            property_title: propertyTitle,
            reference_id: current.reference_id,
            check_in: fmtDate(current.check_in),
            check_out: fmtDate(current.check_out),
            adults: current.adults,
            children: current.children,
            infants: current.infants,
            total_price: current.total_price,
        }, locale),
    });
}

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

    // 4b. Notify the guest when a CONFIRMED (paid) reservation is cancelled.
    // Deliberately NOT sent when rejecting a still-pending request (no payment was taken) or
    // for owner blocks / Airbnb imports (no real guest inbox). Non-blocking: an email failure
    // must never roll back the cancellation.
    if (
        newStatus === 'cancelled' &&
        current.status === 'confirmed' &&
        !current.is_manual_block &&
        !current.is_airbnb &&
        current.guest_email
    ) {
        try {
            await sendGuestCancellationEmail(current);
        } catch (emailErr) {
            console.error('Failed to send cancellation email to guest:', emailErr);
        }
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

/**
 * Manually (re)send the "Reservation Cancelled" email to the guest for an already-cancelled
 * reservation. Used by the detail-sheet button — e.g. when the automatic send failed or the
 * reservation was cancelled before this feature existed. Restricted to Super Admins and Admins.
 */
export async function resendCancellationEmail(id: string) {
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
        throw new Error('Not authorized');
    }

    const adminSupabase = await getSupabaseAdmin();
    const { data: current, error: fetchError } = await adminSupabase
        .from('reservations')
        .select('*, properties(title)')
        .eq('id', id)
        .single();

    if (fetchError || !current) {
        throw new Error('Reserva não encontrada.');
    }

    if (current.is_manual_block || current.is_airbnb) {
        throw new Error('Esta entrada não é uma reserva de hóspede.');
    }
    if (!current.guest_email) {
        throw new Error('Esta reserva não tem email de hóspede.');
    }

    const result = await sendGuestCancellationEmail(current);
    if (!result?.success) {
        throw new Error('Falha ao enviar o email. Verifique a configuração de email.');
    }

    try {
        await logActivity(
            user.id,
            'UPDATE',
            'RESERVATION',
            id,
            { action: 'resend_cancellation_email', to: current.guest_email, ref: current.reference_id }
        );
    } catch (logErr) {
        console.error('Failed to log resend activity:', logErr);
    }

    return { success: true };
}
