import { getSupabaseAdmin } from '@/lib/supabase';
import { beds24Request } from './client';
import type { Beds24ApiEnvelope, Beds24Booking, Beds24Message, SyncVia } from './types';

/**
 * Shared ingestion for both sync sources (webhook + polling).
 * first_seen_via / first_seen_at are written once on insert and preserved
 * on update — that is the A/B measurement of which source saw the event first.
 */

export async function ingestBookings(bookings: Beds24Booking[], via: SyncVia): Promise<{ inserted: number; updated: number }> {
    if (bookings.length === 0) return { inserted: 0, updated: 0 };
    const supabase = await getSupabaseAdmin();
    const now = new Date().toISOString();

    const ids = bookings.map((b) => b.id);
    const { data: existing } = await supabase
        .from('beds24_bookings')
        .select('beds24_booking_id')
        .in('beds24_booking_id', ids);
    const existingIds = new Set((existing ?? []).map((r) => r.beds24_booking_id));

    const mapRow = (b: Beds24Booking) => ({
        beds24_booking_id: b.id,
        beds24_property_id: b.propertyId,
        beds24_room_id: b.roomId ?? null,
        status: b.status ?? null,
        sub_status: b.subStatus ?? null,
        arrival: b.arrival ?? null,
        departure: b.departure ?? null,
        guest_first_name: b.firstName ?? null,
        guest_last_name: b.lastName ?? null,
        guest_email: b.email ?? null,
        guest_phone: b.phone ?? b.mobile ?? null,
        num_adult: b.numAdult ?? null,
        num_child: b.numChild ?? null,
        price: b.price ?? null,
        commission: b.commission ?? null,
        channel: b.channel ?? b.referer ?? null,
        api_source: b.apiSource ?? null,
        api_reference: b.apiReference ?? null,
        booking_time: b.bookingTime ?? null,
        modified_time: b.modifiedTime ?? null,
        cancel_time: b.cancelTime ?? null,
        raw: b,
        last_synced_at: now,
        updated_at: now,
    });

    const toInsert = bookings.filter((b) => !existingIds.has(b.id));
    const toUpdate = bookings.filter((b) => existingIds.has(b.id));

    if (toInsert.length > 0) {
        const { error } = await supabase.from('beds24_bookings').insert(
            toInsert.map((b) => ({ ...mapRow(b), first_seen_via: via, first_seen_at: now })),
        );
        if (error) throw new Error(`beds24_bookings insert failed: ${error.message}`);
    }
    for (const b of toUpdate) {
        const { error } = await supabase
            .from('beds24_bookings')
            .update(mapRow(b))
            .eq('beds24_booking_id', b.id);
        if (error) throw new Error(`beds24_bookings update failed (${b.id}): ${error.message}`);
    }

    return { inserted: toInsert.length, updated: toUpdate.length };
}

export async function ingestMessages(messages: Beds24Message[], via: SyncVia): Promise<{ inserted: number }> {
    if (messages.length === 0) return { inserted: 0 };
    const supabase = await getSupabaseAdmin();
    const now = new Date().toISOString();

    const ids = messages.map((m) => m.id).filter(Boolean);
    const { data: existing } = await supabase
        .from('beds24_messages')
        .select('beds24_message_id')
        .in('beds24_message_id', ids);
    const existingIds = new Set((existing ?? []).map((r) => r.beds24_message_id));

    const toInsert = messages.filter((m) => !existingIds.has(m.id));
    if (toInsert.length > 0) {
        const { error } = await supabase.from('beds24_messages').insert(
            toInsert.map((m) => ({
                beds24_message_id: m.id,
                beds24_booking_id: m.bookingId,
                beds24_property_id: m.propertyId ?? null,
                source: m.source ?? null,
                message: m.message ?? null,
                message_time: m.time ?? null,
                read: m.read ?? null,
                first_seen_via: via,
                first_seen_at: now,
                latency_ms: m.time ? Math.max(0, Date.now() - new Date(m.time).getTime()) : null,
                raw: m,
            })),
        );
        if (error) throw new Error(`beds24_messages insert failed: ${error.message}`);
    }

    // Mark messages we already had as read if Beds24 now says so.
    const toMaybeUpdate = messages.filter((m) => existingIds.has(m.id) && m.read !== undefined);
    for (const m of toMaybeUpdate) {
        await supabase.from('beds24_messages').update({ read: m.read }).eq('beds24_message_id', m.id);
    }

    return { inserted: toInsert.length };
}

/**
 * One polling pass: bookings modified since the last pass (2 min overlap for
 * safety) + recent messages. Same ingestion path as the webhook — dedupe by
 * external id decides who saw each event first.
 */
export async function pollOnce(): Promise<{ bookings: { inserted: number; updated: number }; messages: { inserted: number } }> {
    const supabase = await getSupabaseAdmin();
    const { data: config } = await supabase
        .from('beds24_config')
        .select('last_poll_modified_from')
        .eq('id', 1)
        .single();

    const overlapMs = 2 * 60 * 1000;
    const since = config?.last_poll_modified_from
        ? new Date(new Date(config.last_poll_modified_from).getTime() - overlapMs)
        : new Date(Date.now() - 24 * 60 * 60 * 1000);
    // Beds24 expects "YYYY-MM-DD HH:mm:ss"
    const modifiedFrom = since.toISOString().slice(0, 19).replace('T', ' ');
    const pollStarted = new Date().toISOString();

    const bookingsRes = await beds24Request<Beds24Booking>('GET', '/bookings', {
        query: { modifiedFrom, includeInvoiceItems: false },
        context: 'poll',
    }) as Beds24ApiEnvelope<Beds24Booking>;
    const bookings = await ingestBookings(bookingsRes.data ?? [], 'polling');

    const messagesRes = await beds24Request<Beds24Message>('GET', '/bookings/messages', {
        query: { maxAge: 2 },
        context: 'poll',
    }) as Beds24ApiEnvelope<Beds24Message>;
    const messages = await ingestMessages(messagesRes.data ?? [], 'polling');

    await supabase.from('beds24_config').update({
        last_poll_at: pollStarted,
        last_poll_modified_from: pollStarted,
        updated_at: pollStarted,
    }).eq('id', 1);

    return { bookings, messages };
}
