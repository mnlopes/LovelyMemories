"use server";

import { revalidatePath } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getCurrentUserRole } from '@/app/actions/user';
import { beds24Request, isBeds24Enabled } from '@/lib/beds24/client';
import { ingestBookings, pollOnce } from '@/lib/beds24/sync';
import type { Beds24ApiEnvelope, Beds24Booking, Beds24CalendarDay, Beds24Message } from '@/lib/beds24/types';

/** Phase 1 panel actions. Admin/super_admin only; everything no-ops when Beds24 is disabled. */

const AIRBNB_USER_ID = '391837499'; // Lovely master account (Achilleas)

async function guard() {
    const role = await getCurrentUserRole();
    if (!role || !['admin', 'super_admin'].includes(role)) {
        throw new Error('Não autorizado');
    }
    if (!isBeds24Enabled()) {
        throw new Error('Beds24 desativado neste ambiente (sem BEDS24_REFRESH_TOKEN)');
    }
}

// ---------- Leitura para o painel ----------

export async function getBeds24Status() {
    await guard();
    const supabase = await getSupabaseAdmin();
    const [{ data: config }, { data: recentCalls }, { data: recentEvents }] = await Promise.all([
        supabase.from('beds24_config').select('*').eq('id', 1).single(),
        supabase.from('beds24_api_log').select('*').order('called_at', { ascending: false }).limit(20),
        supabase.from('beds24_webhook_events').select('id, received_at, payload_timestamp, latency_ms, event_type, beds24_booking_id, beds24_property_id, processed, processing_error').order('received_at', { ascending: false }).limit(30),
    ]);
    return { config, recentCalls: recentCalls ?? [], recentEvents: recentEvents ?? [] };
}

export async function getBeds24Properties() {
    await guard();
    const supabase = await getSupabaseAdmin();
    const { data } = await supabase.from('beds24_properties').select('*').order('name');
    return data ?? [];
}

export async function getBeds24Bookings(beds24PropertyId?: number) {
    await guard();
    const supabase = await getSupabaseAdmin();
    let query = supabase.from('beds24_bookings')
        .select('*')
        .order('arrival', { ascending: true })
        .gte('departure', new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10))
        .limit(300);
    if (beds24PropertyId) query = query.eq('beds24_property_id', beds24PropertyId);
    const { data } = await query;
    return data ?? [];
}

export async function getBeds24Messages(beds24BookingId?: number) {
    await guard();
    const supabase = await getSupabaseAdmin();
    let query = supabase.from('beds24_messages').select('*').order('message_time', { ascending: false }).limit(200);
    if (beds24BookingId) query = query.eq('beds24_booking_id', beds24BookingId);
    const { data } = await query;
    return data ?? [];
}

// ---------- Ações ----------

/** Sync manual: uma passagem de polling (bookings modificados + mensagens recentes). */
export async function runBeds24PollNow() {
    await guard();
    const result = await pollOnce();
    revalidatePath('/[locale]/admin/beds24', 'page');
    return result;
}

/**
 * Importa os anúncios PRIMARY OWNER da conta master para o Beds24
 * (connect: none — só dados, sem sync) e regista o mapa em beds24_properties.
 * Idempotente: anúncios já importados são ignorados.
 */
export async function importOwnedListings() {
    await guard();
    const supabase = await getSupabaseAdmin();

    const listingsRes = await beds24Request<{ airbnbListing: { id: string; name?: string } }>(
        'GET', '/channels/airbnb/listings',
        { query: { airbnbUserId: AIRBNB_USER_ID }, context: 'action' },
    ) as Beds24ApiEnvelope<{ airbnbListing: { id: string; name?: string } }>;

    const listings = (listingsRes.data ?? []).map((d) => d.airbnbListing).filter(Boolean);
    const { data: known } = await supabase.from('beds24_properties').select('airbnb_listing_id');
    const knownIds = new Set((known ?? []).map((r) => r.airbnb_listing_id));

    const results: Array<{ listingId: string; name?: string; status: string; beds24PropertyId?: number }> = [];

    for (const listing of listings) {
        if (knownIds.has(listing.id)) {
            results.push({ listingId: listing.id, name: listing.name, status: 'já importado' });
            continue;
        }
        const importRes = await beds24Request<unknown>('POST', '/channels/airbnb', {
            body: [{ action: 'importAsNewProperty', airbnbUserId: AIRBNB_USER_ID, airbnbListingId: listing.id, connect: 'none' }],
            context: 'action',
        }) as Array<{ success: boolean; new?: Array<{ propertyId: number; roomId: number }> }>;

        const created = importRes?.[0]?.new?.[0];
        if (importRes?.[0]?.success && created) {
            await supabase.from('beds24_properties').insert({
                beds24_property_id: created.propertyId,
                beds24_room_id: created.roomId,
                airbnb_listing_id: listing.id,
                airbnb_user_id: AIRBNB_USER_ID,
                name: listing.name ?? `Listing ${listing.id}`,
                role: 'primary_owner',
                sync_state: 'imported',
                raw: listing,
            });
            results.push({ listingId: listing.id, name: listing.name, status: 'importado', beds24PropertyId: created.propertyId });
        } else {
            results.push({ listingId: listing.id, name: listing.name, status: 'falhou' });
        }
    }

    revalidatePath('/[locale]/admin/beds24', 'page');
    return results;
}

/**
 * Liga a COBAIA ao sync (connect: "limited" = Prices & Availability).
 * Validação programática do par roomId<->listingId contra beds24_properties
 * (nunca escolher de uma lista à mão — ver risco no design doc).
 */
export async function connectCobaia(beds24PropertyId: number) {
    await guard();
    const supabase = await getSupabaseAdmin();
    const { data: prop } = await supabase.from('beds24_properties').select('*').eq('beds24_property_id', beds24PropertyId).single();
    if (!prop) throw new Error('Propriedade desconhecida');
    if (prop.role !== 'primary_owner') throw new Error('Só anúncios primary_owner podem ser ligados');
    if (!prop.airbnb_listing_id) throw new Error('Sem airbnb_listing_id no mapa');

    const res = await beds24Request<unknown>('POST', '/channels/airbnb', {
        body: [{
            action: 'connectToExistingRoom',
            airbnbUserId: prop.airbnb_user_id ?? AIRBNB_USER_ID,
            airbnbListingId: prop.airbnb_listing_id,
            roomId: String(prop.beds24_room_id),
            connect: 'limited',
        }],
        context: 'action',
    }) as Array<{ success: boolean; errors?: unknown }>;

    if (!res?.[0]?.success) {
        throw new Error(`Ligação recusada: ${JSON.stringify(res?.[0]?.errors ?? res).slice(0, 300)}`);
    }

    await supabase.from('beds24_properties').update({ sync_state: 'connected', is_cobaia: true, updated_at: new Date().toISOString() }).eq('beds24_property_id', beds24PropertyId);
    revalidatePath('/[locale]/admin/beds24', 'page');
    return res[0];
}

/** Importa as reservas futuras existentes da cobaia (depois de ligada). */
export async function importExistingBookings(beds24PropertyId: number) {
    await guard();
    const res = await beds24Request<Beds24Booking>('GET', '/bookings', {
        query: { propertyId: [beds24PropertyId], arrivalFrom: new Date().toISOString().slice(0, 10) },
        context: 'action',
    }) as Beds24ApiEnvelope<Beds24Booking>;
    const result = await ingestBookings(res.data ?? [], 'manual');
    revalidatePath('/[locale]/admin/beds24', 'page');
    return result;
}

/** Envia mensagem a um hóspede (só funciona em reservas OTA). */
export async function sendBeds24Message(beds24BookingId: number, message: string) {
    await guard();
    if (!message.trim()) throw new Error('Mensagem vazia');
    const res = await beds24Request<unknown>('POST', '/bookings/messages', {
        body: [{ bookingId: beds24BookingId, message: message.trim() }],
        context: 'action',
    }) as Array<{ success: boolean; errors?: unknown }>;
    if (!res?.[0]?.success) {
        throw new Error(`Envio falhou: ${JSON.stringify(res?.[0]?.errors ?? res).slice(0, 300)}`);
    }
    revalidatePath('/[locale]/admin/beds24', 'page');
    return res[0];
}

/** Reserva de TESTE em datas 2027 (não colide com nada real) + medição outbound. */
export async function createTestBooking(beds24PropertyId: number) {
    await guard();
    const supabase = await getSupabaseAdmin();
    const { data: prop } = await supabase.from('beds24_properties').select('beds24_room_id').eq('beds24_property_id', beds24PropertyId).single();
    if (!prop) throw new Error('Propriedade desconhecida');

    const res = await beds24Request<unknown>('POST', '/bookings', {
        body: [{
            roomId: prop.beds24_room_id,
            status: 'confirmed',
            arrival: '2027-03-10',
            departure: '2027-03-13',
            numAdult: 2,
            firstName: 'TESTE',
            lastName: 'Lovely PMS (apagar)',
            notes: 'Reserva de teste outbound — medir propagação ao Airbnb e cancelar.',
        }],
        context: 'action',
    }) as Array<{ success: boolean; new?: { id: number } }>;

    if (!res?.[0]?.success || !res[0].new?.id) throw new Error(`Criação falhou: ${JSON.stringify(res).slice(0, 300)}`);
    revalidatePath('/[locale]/admin/beds24', 'page');
    return { bookingId: res[0].new.id, createdAt: new Date().toISOString() };
}

export async function cancelTestBooking(beds24BookingId: number) {
    await guard();
    const res = await beds24Request<unknown>('POST', '/bookings', {
        body: [{ id: beds24BookingId, status: 'cancelled' }],
        context: 'action',
    }) as Array<{ success: boolean }>;
    if (!res?.[0]?.success) throw new Error(`Cancelamento falhou: ${JSON.stringify(res).slice(0, 300)}`);
    revalidatePath('/[locale]/admin/beds24', 'page');
    return res[0];
}

/** Comparação de preços/disponibilidade Beds24 (próximos 30 dias) para revisão pré-mapping. */
export async function getCalendarPreview(beds24PropertyId: number) {
    await guard();
    const supabase = await getSupabaseAdmin();
    const { data: prop } = await supabase.from('beds24_properties').select('beds24_room_id, name').eq('beds24_property_id', beds24PropertyId).single();
    if (!prop) throw new Error('Propriedade desconhecida');

    const start = new Date().toISOString().slice(0, 10);
    const end = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const res = await beds24Request<{ roomId: number; calendar: Beds24CalendarDay[] }>('GET', '/inventory/rooms/calendar', {
        query: { roomId: [prop.beds24_room_id], startDate: start, endDate: end, includePrices: true, includeNumAvail: true, includeMinStay: true, includeOverride: true },
        context: 'action',
    }) as Beds24ApiEnvelope<{ roomId: number; calendar: Beds24CalendarDay[] }>;

    return { name: prop.name, calendar: res.data?.[0]?.calendar ?? [] };
}

/** Buscar mensagens direto da API para uma reserva (bypass da BD, para debug). */
export async function fetchMessagesFromApi(beds24BookingId: number) {
    await guard();
    const res = await beds24Request<Beds24Message>('GET', '/bookings/messages', {
        query: { bookingId: [beds24BookingId] },
        context: 'action',
    }) as Beds24ApiEnvelope<Beds24Message>;
    return res.data ?? [];
}
