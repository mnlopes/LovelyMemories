import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

// Last availability check before a booking is saved (audit 2026-11-13, L-3).
//
// Availability is checked when the guest starts paying (createPaymentIntent /
// processReservation), but minutes can pass before the payment completes. Meanwhile the iCal
// robot may import an Airbnb/Booking stay, another guest may book, or the team may block the
// dates. finalizeBooking runs this right before the insert.
//
// The database rule reservations_no_overlap (migration 20261115090000) closes the remaining
// race between two saves at the same moment; finalizeBooking treats its error (23P01) the
// same way as a conflict found here.

/**
 * Status of a paid booking whose dates turned out to be taken. It is outside the database
 * rule (which covers 'pending' and 'confirmed' only), so the payment is never lost: the
 * reservation is saved, the team is alerted and decides (another house, other dates, refund).
 */
export const REVIEW_STATUS = 'needs_review';

/** Postgres error for an EXCLUDE constraint (reservations_no_overlap). */
export const OVERLAP_ERROR_CODE = '23P01';

export type StayConflict = {
    kind: 'reservation' | 'block';
    id: string;
    checkIn: string;
    checkOut: string;
    /** Reservation reference or block reason, for the team's alert email. */
    label: string | null;
};

/**
 * Returns what already occupies [checkIn, checkOut) on this property, or null.
 * Mirrors verifyAvailability in lib/pricing.ts (same comparisons, so check-out and check-in
 * on the same day are not a conflict), except the 15-minute checkout locks, which are
 * ignored on purpose: the payment already went through, and another guest's lock is not a stay.
 */
export async function findStayConflict(
    supabase: SupabaseClient,
    propertyId: string,
    checkIn: string,
    checkOut: string,
    /** The reservation being re-confirmed in the backoffice, which must not conflict with itself. */
    excludeReservationId?: string,
): Promise<StayConflict | null> {
    let reservationQuery = supabase
        .from('reservations')
        .select('id, check_in, check_out, reference_id')
        .eq('property_id', propertyId)
        .neq('status', 'cancelled')
        .gt('check_out', checkIn)
        .lt('check_in', checkOut);
    if (excludeReservationId) reservationQuery = reservationQuery.neq('id', excludeReservationId);

    const [reservations, blocks] = await Promise.all([
        reservationQuery.limit(1),
        supabase
            .from('blocked_dates')
            .select('id, start_date, end_date, reason')
            .eq('property_id', propertyId)
            .gt('end_date', checkIn)
            .lt('start_date', checkOut)
            .limit(1),
    ]);
    if (reservations.error) throw reservations.error;
    if (blocks.error) throw blocks.error;

    const r = reservations.data?.[0];
    if (r) return { kind: 'reservation', id: r.id, checkIn: r.check_in, checkOut: r.check_out, label: r.reference_id ?? null };
    const b = blocks.data?.[0];
    if (b) return { kind: 'block', id: b.id, checkIn: b.start_date, checkOut: b.end_date, label: b.reason ?? null };
    return null;
}
