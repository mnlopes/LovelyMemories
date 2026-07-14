"use server";

import { revalidatePath } from 'next/cache';
import { getLocale } from 'next-intl/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getCurrentUserRole } from '@/app/actions/user';
import { beds24Request, isBeds24Enabled } from '@/lib/beds24/client';
import { ingestBookings, pollOnce } from '@/lib/beds24/sync';
import type { Beds24ApiEnvelope, Beds24Booking, Beds24CalendarDay, Beds24Message } from '@/lib/beds24/types';

/** Phase 1 panel actions. Admin/super_admin only; everything no-ops when Beds24 is disabled. */

const AIRBNB_USER_ID = '391837499'; // Lovely master account (Achilleas)

async function guard() {
    const role = await getCurrentUserRole();
    if (role !== 'super_admin') {
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

// ---------- Preview do calendário admin (switch iCal ↔ Beds24) ----------

export interface Beds24CalendarBooking {
    id: string;                 // `b24-${beds24_booking_id}` — nunca colide com uuids
    beds24_booking_id: number;  // id numérico Beds24 — para abrir a ficha de detalhe
    property_id: string;        // internal_property_id (propriedade do site)
    guest_name: string;
    check_in: string;           // arrival (YYYY-MM-DD)
    check_out: string;          // departure
    total_price: number | null;
    channel: string | null;
    status: string;             // 'confirmed' | 'new'
    is_airbnb: boolean;
    is_beds24: true;
}

export type Beds24CalendarPreviewResult =
    | { ok: true; internalPropertyIds: string[]; bookings: Beds24CalendarBooking[] }
    | { ok: false; error: string };

/**
 * Reservas Beds24 das propriedades LIGADAS (internal_property_id preenchido), já no
 * shape que o MultiCalendarView consome. Alimenta o switch de preview do calendário
 * admin — leitura via service-role (RLS das beds24_* fica intocada). Nunca lança:
 * o cliente decide mostrar toast e voltar a iCal.
 */
export async function getBeds24CalendarPreview(): Promise<Beds24CalendarPreviewResult> {
    try {
        await guard();
        const supabase = await getSupabaseAdmin();
        const { data: props, error: propsError } = await supabase
            .from('beds24_properties')
            .select('beds24_property_id, internal_property_id')
            .not('internal_property_id', 'is', null);
        if (propsError) throw propsError;
        const linkMap = new Map<number, string>(
            (props ?? []).map((p) => [p.beds24_property_id as number, p.internal_property_id as string]),
        );
        if (!linkMap.size) return { ok: true, internalPropertyIds: [], bookings: [] };

        // 60 dias de histórico chegam para o calendário; evita puxar a tabela inteira.
        const since = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
        const { data: rows, error } = await supabase
            .from('beds24_bookings')
            .select('beds24_booking_id, beds24_property_id, status, arrival, departure, guest_first_name, guest_last_name, price, channel')
            .in('beds24_property_id', [...linkMap.keys()])
            .in('status', ['confirmed', 'new'])
            .gte('departure', since)
            .order('arrival', { ascending: true })
            .limit(500);
        if (error) throw error;

        const bookings: Beds24CalendarBooking[] = (rows ?? [])
            .filter((r) => r.arrival && r.departure)
            .map((r) => ({
                id: `b24-${r.beds24_booking_id}`,
                beds24_booking_id: r.beds24_booking_id as number,
                property_id: linkMap.get(r.beds24_property_id as number)!,
                guest_name: [r.guest_first_name, r.guest_last_name].filter(Boolean).join(' ') || 'Airbnb guest',
                check_in: r.arrival as string,
                check_out: r.departure as string,
                total_price: typeof r.price === 'number' ? r.price : (r.price ? Number(r.price) : null),
                channel: (r.channel as string) ?? null,
                status: r.status as string,
                is_airbnb: ((r.channel as string) ?? '').toLowerCase().includes('airbnb'),
                is_beds24: true,
            }));
        return { ok: true, internalPropertyIds: [...new Set(linkMap.values())], bookings };
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Preview failed' };
    }
}

// ---------- Ficha de detalhe read-only (clique na barra Beds24 do calendário) ----------

export interface Beds24InvoiceItem {
    description: string;
    amount: number;
}

export interface Beds24BookingDetail {
    beds24_booking_id: number;
    guest_name: string;
    guest_email: string | null;
    guest_phone: string | null;
    channel: string | null;
    status: string | null;
    sub_status: string | null;
    arrival: string;
    departure: string;
    nights: number;
    num_adult: number | null;
    num_child: number | null;
    property_title: string | null;
    price: number | null;
    commission: number | null;
    net_payout: number | null;
    invoice_items: Beds24InvoiceItem[];
    api_reference: string | null;
    booking_time: string | null;
    modified_time: string | null;
    first_seen_via: string | null;
}

export type Beds24BookingDetailResult =
    | { ok: true; booking: Beds24BookingDetail }
    | { ok: false; error: string };

/**
 * Detalhe completo de UMA reserva Beds24 (fetch-on-click do calendário admin).
 * PII (email/telefone) só sai daqui, nunca no preview magro. Nunca lança.
 */
export async function getBeds24BookingDetail(beds24BookingId: number): Promise<Beds24BookingDetailResult> {
    try {
        await guard();
        const supabase = await getSupabaseAdmin();
        const { data: row, error } = await supabase
            .from('beds24_bookings')
            .select('*')
            .eq('beds24_booking_id', beds24BookingId)
            .single();
        if (error || !row) throw new Error(error?.message || 'Reserva não encontrada');

        // Título da propriedade do site via ligação beds24_properties → properties
        let propertyTitle: string | null = null;
        const { data: link } = await supabase
            .from('beds24_properties')
            .select('internal_property_id, name')
            .eq('beds24_property_id', row.beds24_property_id)
            .single();
        if (link?.internal_property_id) {
            const { data: prop } = await supabase
                .from('properties')
                .select('title')
                .eq('id', link.internal_property_id)
                .single();
            // properties.title é um campo JSONB localizado ({en,pt,he}) — resolver p/ string
            // (senão o React tenta renderizar o objeto e rebenta). Mesmo fallback do resto do admin.
            const locale = await getLocale();
            const localize = (field: unknown): string | null => {
                if (!field) return null;
                if (typeof field === 'string') return field;
                if (typeof field === 'object') {
                    const rec = field as Record<string, unknown>;
                    const v = rec[locale] ?? rec.en ?? Object.values(rec)[0];
                    return typeof v === 'string' ? v : null;
                }
                return null;
            };
            propertyTitle = localize(prop?.title) ?? (link?.name as string) ?? null;
        } else {
            propertyTitle = (link?.name as string) ?? null;
        }

        // invoiceItems best-effort do raw JSONB (forma varia; nunca rebenta)
        const rawItems = (row.raw as Record<string, unknown> | null)?.invoiceItems;
        const invoiceItems: Beds24InvoiceItem[] = Array.isArray(rawItems)
            ? rawItems
                .map((it): Beds24InvoiceItem | null => {
                    if (!it || typeof it !== 'object') return null;
                    const rec = it as Record<string, unknown>;
                    const amount = Number(rec.lineTotal ?? rec.amount ?? NaN);
                    const description = String(rec.description ?? rec.type ?? '').trim();
                    return { description, amount };
                })
                .filter((it): it is Beds24InvoiceItem => it !== null && it.description !== '' && Number.isFinite(it.amount) && it.amount !== 0)
            : [];

        const toNum = (v: unknown): number | null => {
            const n = typeof v === 'number' ? v : v ? Number(v) : NaN;
            return Number.isFinite(n) ? n : null;
        };
        const price = toNum(row.price);
        const commission = toNum(row.commission);
        const nightsRaw = Math.round(
            (new Date(row.departure as string).getTime() - new Date(row.arrival as string).getTime()) / 86400000,
        );
        const nights = Number.isFinite(nightsRaw) ? Math.max(1, nightsRaw) : 1;

        return {
            ok: true,
            booking: {
                beds24_booking_id: row.beds24_booking_id as number,
                guest_name: [row.guest_first_name, row.guest_last_name].filter(Boolean).join(' ') || 'Airbnb guest',
                guest_email: (row.guest_email as string) ?? null,
                guest_phone: (row.guest_phone as string) ?? null,
                channel: (row.channel as string) ?? null,
                status: (row.status as string) ?? null,
                sub_status: (row.sub_status as string) ?? null,
                arrival: row.arrival as string,
                departure: row.departure as string,
                nights,
                num_adult: toNum(row.num_adult),
                num_child: toNum(row.num_child),
                property_title: propertyTitle,
                price,
                commission,
                net_payout: price !== null ? price - (commission ?? 0) : null,
                invoice_items: invoiceItems,
                api_reference: (row.api_reference as string) ?? null,
                booking_time: (row.booking_time as string) ?? null,
                modified_time: (row.modified_time as string) ?? null,
                first_seen_via: (row.first_seen_via as string) ?? null,
            },
        };
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Detail failed' };
    }
}
