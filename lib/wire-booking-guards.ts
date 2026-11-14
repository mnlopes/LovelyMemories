import 'server-only';
import { randomInt } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

// Guards for the public bank-transfer booking (processReservation), audit 2026-11-13, S-4.
//
// processReservation is a public endpoint. Each call that succeeds creates a 'pending'
// reservation, which blocks the dates on the site and on Airbnb/Booking (iCal export), and
// emails the address typed in the form. Without limits, a script could fill every calendar or
// use the Lovely Memories address to mail anyone. Card payments go through Stripe and are not
// affected by anything here.

/**
 * Limits on unpaid bank-transfer bookings. Counted from the reservations table, so they hold
 * across Vercel instances. No bank-transfer booking had ever been made when this was written
 * (14/11/2026), so the numbers leave a wide margin for real guests.
 */
export const WIRE_LIMITS = {
    perEmailPerDay: 3,
    sitePerHour: 5,
    sitePerDay: 15,
} as const;

export type WireLimitHit = 'email' | 'site_hour' | 'site_day';

const HOUR_MS = 60 * 60 * 1000;

/** Returns which limit a new bank-transfer booking for `email` would exceed, or null. */
export async function wireBookingLimitReached(
    supabase: SupabaseClient,
    email: string,
    now: number = Date.now(),
): Promise<WireLimitHit | null> {
    const dayAgo = new Date(now - 24 * HOUR_MS).toISOString();
    const hourAgo = new Date(now - HOUR_MS).toISOString();

    // One request: the bank-transfer bookings of the last 24 h (at most a handful, the
    // site-wide daily limit keeps it small).
    const { data, error } = await supabase
        .from('reservations')
        .select('created_at, guest_email')
        .eq('payment_method', 'wire')
        .gte('created_at', dayAgo)
        .limit(500);
    if (error) throw error;

    const rows = data ?? [];
    const target = email.trim().toLowerCase();
    const sameEmail = rows.filter((r) => (r.guest_email ?? '').trim().toLowerCase() === target).length;
    const lastHour = rows.filter((r) => r.created_at >= hourAgo).length;

    if (sameEmail >= WIRE_LIMITS.perEmailPerDay) return 'email';
    if (lastHour >= WIRE_LIMITS.sitePerHour) return 'site_hour';
    if (rows.length >= WIRE_LIMITS.sitePerDay) return 'site_day';
    return null;
}

// Same alphabet and length as generateCode in lib/booking-session.ts (no I, O, 0, 1).
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_FORMAT = /^[A-HJ-NP-Z2-9]{6}$/;

/**
 * Reference for a bank-transfer booking. The checkout already shows "LM-<code>" in the
 * transfer details before the guest confirms (the guest may use it at the bank), so a
 * well-formed code from the browser is kept. Anything else is replaced by a server code: the
 * reference goes into the emails, the subject and the transfer description, so it never
 * carries text chosen by the caller.
 */
export function bookingReference(clientCode: string | null | undefined): string {
    const code = (clientCode ?? '').trim().toUpperCase();
    if (CODE_FORMAT.test(code)) return `LM-${code}`;
    let generated = '';
    for (let i = 0; i < 6; i++) generated += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
    return `LM-${generated}`;
}
