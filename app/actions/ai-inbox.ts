'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabase';
import { beds24Request } from '@/lib/beds24/client';
import {
    describeProvider, draftReply, buildContext, DEFAULT_BRAND_TONE_TEXT,
    mapPropertyBase, mapExtrasRow, EXTRAS_COLUMNS, PROPERTY_BASE_COLUMNS,
    type ProviderStatus, type PropertyKnowledge, type ThreadMessage,
} from '@/lib/ai-messaging';

/**
 * Server actions do inbox de IA (transporte Beds24).
 * Port de app/actions/ai-messaging.ts (branch feat/ai-guest-messaging) sem Hospitable:
 * fonte de verdade das mensagens = beds24_messages; envio = POST /bookings/messages.
 */

const ACCESS_BUCKET = 'property-access';

async function assertAdmin() {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll(); },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
                },
            },
        }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    // Rollout: super_admin apenas até o E2E estar validado pelo Marcelo;
    // depois alargar a 'admin' (uma linha).
    if (!profile || !INBOX_ROLES.includes(profile.role)) {
        throw new Error('Not authorized');
    }
    return user;
}

const INBOX_ROLES = ['super_admin'];

// ── Estado do motor ───────────────────────────────────────────────────────────

export async function getEngineStatus(): Promise<ProviderStatus> {
    await assertAdmin();
    return describeProvider();
}

// ── Inbox: lista de conversas + fila humana ──────────────────────────────────

export interface InboxConversation {
    reservationId: string;
    guestName: string | null;
    propertyName: string | null;
    externalPropertyId: string | null;
    checkIn: string | null;
    checkOut: string | null;
    lastMessageAt: string | null;
    lastMessagePreview: string | null;
    lastMessageSender: string | null;
    botEnabled: boolean;
    botOffReason: string | null;
    pendingDrafts: number;
}

export interface QueueItem {
    id: string;
    reservationId: string;
    guestName: string | null;
    propertyName: string | null;
    incomingMessage: string;
    draft: string | null;
    decision: string | null;
    knowledgeCitation: string | null;
    createdAt: string | null;
}

export interface InboxData {
    conversations: InboxConversation[];
    queue: QueueItem[];
    globalBotEnabled: boolean;
}

export async function getInboxData(): Promise<InboxData> {
    await assertAdmin();
    const admin = await getSupabaseAdmin();

    const [convRes, queueRes, settingsRes] = await Promise.all([
        admin.from('ai_conversation')
            .select('reservation_id, guest_name, property_name, external_property_id, check_in, check_out, last_message_at, last_message_preview, last_message_sender, bot_enabled, bot_off_reason')
            .order('last_message_at', { ascending: false, nullsFirst: false })
            .limit(100),
        admin.from('ai_message_log')
            .select('id, reservation_ref, guest_name, property_code, incoming_message, ai_draft, decision, knowledge_citation, created_at')
            .eq('status', 'draft')
            .order('created_at', { ascending: false })
            .limit(50),
        admin.from('ai_messaging_settings').select('bot_globally_enabled').eq('id', 1).maybeSingle(),
    ]);

    const queue: QueueItem[] = (queueRes.data ?? [])
        .filter((r) => /^\d+$/.test(String(r.reservation_ref)))
        .map((r) => ({
        id: r.id as string,
        reservationId: (r.reservation_ref as string) ?? '',
        guestName: (r.guest_name as string) ?? null,
        propertyName: (r.property_code as string) ?? null,
        incomingMessage: (r.incoming_message as string) ?? '',
        draft: (r.ai_draft as string) ?? null,
        decision: (r.decision as string) ?? null,
        knowledgeCitation: (r.knowledge_citation as string) ?? null,
        createdAt: (r.created_at as string) ?? null,
    }));

    const pendingByReservation = new Map<string, number>();
    for (const q of queue) {
        pendingByReservation.set(q.reservationId, (pendingByReservation.get(q.reservationId) ?? 0) + 1);
    }

    const conversations: InboxConversation[] = (convRes.data ?? [])
        // Só conversas Beds24 (reservation_id numérico). Exclui os dados legados
        // do Hospitable (reservation_id em UUID) da POC antiga.
        .filter((c) => /^\d+$/.test(String(c.reservation_id)))
        .map((c) => ({
        reservationId: c.reservation_id as string,
        guestName: (c.guest_name as string) ?? null,
        propertyName: (c.property_name as string) ?? null,
        externalPropertyId: (c.external_property_id as string) ?? null,
        checkIn: (c.check_in as string) ?? null,
        checkOut: (c.check_out as string) ?? null,
        lastMessageAt: (c.last_message_at as string) ?? null,
        lastMessagePreview: (c.last_message_preview as string) ?? null,
        lastMessageSender: (c.last_message_sender as string) ?? null,
        botEnabled: (c.bot_enabled as boolean) ?? true,
        botOffReason: (c.bot_off_reason as string) ?? null,
        pendingDrafts: pendingByReservation.get(c.reservation_id as string) ?? 0,
    }));

    return {
        conversations,
        queue,
        globalBotEnabled: settingsRes.data?.bot_globally_enabled !== false,
    };
}

// ── Thread de uma conversa ────────────────────────────────────────────────────

export interface ThreadEntry {
    id: string;
    role: 'guest' | 'host';
    body: string;
    at: string | null;
    /** 'webhook' | 'polling' | 'manual' — como a mensagem nos chegou. */
    seenVia: string | null;
    latencyMs: number | null;
    /** Preenchido quando a mensagem foi enviada por nós (bot ou painel). */
    sentByBot: boolean;
    knowledgeCitation: string | null;
}

export interface ThreadData {
    ok: boolean;
    entries: ThreadEntry[];
    booking: {
        arrival: string | null; departure: string | null; price: number | null;
        status: string | null; channel: string | null; numAdult: number | null;
        guestName: string | null;
    } | null;
    error?: string;
}

export async function getThread(reservationId: string): Promise<ThreadData> {
    await assertAdmin();
    try {
        const admin = await getSupabaseAdmin();
        const bookingId = Number(reservationId);
        const [msgsRes, logRes, bookingRes] = await Promise.all([
            admin.from('beds24_messages')
                .select('beds24_message_id, source, message, message_time, first_seen_via, latency_ms')
                .eq('beds24_booking_id', bookingId)
                .order('message_time', { ascending: true })
                .limit(200),
            admin.from('ai_message_log')
                .select('sent_message, knowledge_citation, decision, sent_at')
                .eq('reservation_ref', reservationId)
                .eq('status', 'sent'),
            admin.from('beds24_bookings')
                .select('arrival, departure, price, status, channel, num_adult, guest_first_name, guest_last_name')
                .eq('beds24_booking_id', bookingId)
                .maybeSingle(),
        ]);

        const botSent = (logRes.data ?? []).filter((r) => r.sent_message);
        const entries: ThreadEntry[] = (msgsRes.data ?? [])
            .filter((m) => m.message && (m.source === 'guest' || m.source === 'host'))
            .map((m) => {
                const mine = m.source === 'host'
                    ? botSent.find((b) => b.sent_message === m.message)
                    : undefined;
                return {
                    id: String(m.beds24_message_id),
                    role: m.source as 'guest' | 'host',
                    body: m.message as string,
                    at: (m.message_time as string) ?? null,
                    seenVia: (m.first_seen_via as string) ?? null,
                    latencyMs: (m.latency_ms as number) ?? null,
                    sentByBot: !!mine && mine.decision === 'auto_sent',
                    knowledgeCitation: mine?.knowledge_citation ?? null,
                };
            });

        const b = bookingRes.data;
        return {
            ok: true,
            entries,
            booking: b ? {
                arrival: b.arrival ?? null, departure: b.departure ?? null,
                price: b.price ?? null, status: b.status ?? null, channel: b.channel ?? null,
                numAdult: b.num_adult ?? null,
                guestName: [b.guest_first_name, b.guest_last_name].filter(Boolean).join(' ') || null,
            } : null,
        };
    } catch (err) {
        return { ok: false, entries: [], booking: null, error: err instanceof Error ? err.message : 'Load failed' };
    }
}

// ── Fila: editar / enviar / ignorar / regenerar ──────────────────────────────

export async function updateDraft(rowId: string, text: string): Promise<{ ok: boolean; error?: string }> {
    await assertAdmin();
    try {
        const admin = await getSupabaseAdmin();
        const { error } = await admin.from('ai_message_log')
            .update({ ai_draft: text, updated_at: new Date().toISOString() })
            .eq('id', rowId)
            .eq('status', 'draft');
        if (error) throw error;
        return { ok: true };
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Save failed' };
    }
}

export async function dismissDraft(rowId: string): Promise<{ ok: boolean; error?: string }> {
    await assertAdmin();
    try {
        const admin = await getSupabaseAdmin();
        const { error } = await admin.from('ai_message_log')
            .update({ status: 'skipped', skip_reason: 'dismissed by admin', updated_at: new Date().toISOString() })
            .eq('id', rowId)
            .eq('status', 'draft');
        if (error) throw error;
        return { ok: true };
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Dismiss failed' };
    }
}

/** Envia texto para o hóspede via Beds24. Com draftRowId marca essa linha como enviada;
 *  sem ele regista uma linha 'sent' nova (resposta manual) — o registo é o que permite
 *  ao bridge distinguir mensagens nossas de respostas humanas no Airbnb. */
export async function sendReply(reservationId: string, text: string, draftRowId?: string): Promise<{ ok: boolean; error?: string }> {
    await assertAdmin();
    const body = text.trim();
    if (!body) return { ok: false, error: 'Mensagem vazia.' };
    try {
        const admin = await getSupabaseAdmin();
        const bookingId = Number(reservationId);

        const res = await beds24Request<unknown>('POST', '/bookings/messages', {
            body: [{ bookingId, message: body }],
            context: 'action',
        }) as Array<{ success: boolean; errors?: unknown }>;
        if (!res?.[0]?.success) {
            const msg = `Envio falhou: ${JSON.stringify(res?.[0]?.errors ?? res).slice(0, 200)}`;
            if (draftRowId) {
                await admin.from('ai_message_log')
                    .update({ status: 'failed', error: msg, updated_at: new Date().toISOString() })
                    .eq('id', draftRowId);
            }
            return { ok: false, error: msg };
        }

        if (draftRowId) {
            await admin.from('ai_message_log').update({
                status: 'sent', sent_message: body, sent_at: new Date().toISOString(),
                updated_at: new Date().toISOString(), error: null,
            }).eq('id', draftRowId);
        } else {
            await admin.from('ai_message_log').insert({
                reservation_ref: reservationId,
                channel: 'airbnb',
                incoming_message: '(resposta manual do painel)',
                sent_message: body,
                status: 'sent',
                sent_at: new Date().toISOString(),
            });
        }
        return { ok: true };
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Send failed' };
    }
}

/** Regenera o draft de uma linha da fila com o contexto atual (tom/knowledge). */
export async function regenerateDraft(rowId: string): Promise<{ ok: boolean; draft?: string; error?: string }> {
    await assertAdmin();
    try {
        const admin = await getSupabaseAdmin();
        const { data: row, error } = await admin.from('ai_message_log')
            .select('id, reservation_ref, incoming_message, status')
            .eq('id', rowId).single();
        if (error || !row) throw new Error('Linha não encontrada.');
        if (!['draft', 'failed'].includes(row.status)) return { ok: false, error: 'Só um draft pode ser regenerado.' };

        const bookingId = Number(row.reservation_ref);
        const [{ data: booking }, { data: threadRows }] = await Promise.all([
            admin.from('beds24_bookings')
                .select('beds24_property_id, arrival, departure, num_adult, guest_first_name, guest_last_name')
                .eq('beds24_booking_id', bookingId).maybeSingle(),
            admin.from('beds24_messages')
                .select('source, message, message_time')
                .eq('beds24_booking_id', bookingId)
                .order('message_time', { ascending: false }).limit(10),
        ]);
        const history: ThreadMessage[] = (threadRows ?? [])
            .reverse()
            .filter((r) => r.message && (r.source === 'guest' || r.source === 'host'))
            .map((r) => ({ role: r.source as 'guest' | 'host', content: r.message as string, at: r.message_time }));

        const ctx = await buildContext({
            guestMessage: row.incoming_message,
            externalPropertyId: booking?.beds24_property_id ? String(booking.beds24_property_id) : null,
            reservation: booking ? {
                guestName: [booking.guest_first_name, booking.guest_last_name].filter(Boolean).join(' ') || null,
                checkInDate: booking.arrival ?? null,
                checkOutDate: booking.departure ?? null,
                guests: booking.num_adult ?? null,
            } : null,
            history,
        });
        const draft = await draftReply(ctx);
        await admin.from('ai_message_log')
            .update({ ai_draft: draft, status: 'draft', error: null, updated_at: new Date().toISOString() })
            .eq('id', rowId);
        return { ok: true, draft };
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Regenerate failed' };
    }
}

// ── Toggles do bot ────────────────────────────────────────────────────────────

export async function setConversationBot(reservationId: string, enabled: boolean): Promise<{ ok: boolean; error?: string }> {
    const user = await assertAdmin();
    try {
        const admin = await getSupabaseAdmin();
        const { error } = await admin.from('ai_conversation').update({
            bot_enabled: enabled,
            bot_off_reason: enabled ? null : 'manual',
            bot_off_at: enabled ? null : new Date().toISOString(),
            bot_off_by: enabled ? null : (user.email ?? 'admin'),
            updated_at: new Date().toISOString(),
        }).eq('reservation_id', reservationId);
        if (error) throw error;
        return { ok: true };
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Update failed' };
    }
}

export async function setPropertyBotMode(beds24PropertyId: number, mode: 'off' | 'drafts' | 'auto'): Promise<{ ok: boolean; error?: string }> {
    await assertAdmin();
    try {
        const admin = await getSupabaseAdmin();
        const { error } = await admin.from('beds24_properties')
            .update({ bot_mode: mode, updated_at: new Date().toISOString() })
            .eq('beds24_property_id', beds24PropertyId);
        if (error) throw error;
        return { ok: true };
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Update failed' };
    }
}

export async function setGlobalBot(enabled: boolean): Promise<{ ok: boolean; error?: string }> {
    await assertAdmin();
    try {
        const admin = await getSupabaseAdmin();
        const { error } = await admin.from('ai_messaging_settings')
            .upsert({ id: 1, bot_globally_enabled: enabled, updated_at: new Date().toISOString() }, { onConflict: 'id' });
        if (error) throw error;
        return { ok: true };
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Update failed' };
    }
}

// ── Tom da marca ──────────────────────────────────────────────────────────────

export interface BrandToneSetting { tone: string; usingDefault: boolean; defaultTone: string }

export async function getBrandTone(): Promise<BrandToneSetting> {
    await assertAdmin();
    try {
        const admin = await getSupabaseAdmin();
        const { data } = await admin.from('ai_messaging_settings').select('brand_tone').eq('id', 1).maybeSingle();
        const saved = data?.brand_tone?.trim();
        return { tone: saved || DEFAULT_BRAND_TONE_TEXT, usingDefault: !saved, defaultTone: DEFAULT_BRAND_TONE_TEXT };
    } catch {
        return { tone: DEFAULT_BRAND_TONE_TEXT, usingDefault: true, defaultTone: DEFAULT_BRAND_TONE_TEXT };
    }
}

export async function updateBrandTone(text: string): Promise<{ ok: boolean; error?: string }> {
    await assertAdmin();
    try {
        const admin = await getSupabaseAdmin();
        const value = text.trim() ? text : null;
        const { error } = await admin.from('ai_messaging_settings')
            .upsert({ id: 1, brand_tone: value, updated_at: new Date().toISOString() }, { onConflict: 'id' });
        if (error) throw error;
        return { ok: true };
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Save failed' };
    }
}

// ── Ligação propriedade Beds24 ↔ propriedade do site ─────────────────────────

export interface PropertyLinkSuggestion {
    beds24PropertyId: number;
    beds24Name: string;
    botMode: string;
    suggestedPropertyId: string | null;
    currentPropertyId: string | null;
}
export interface LocalPropertyOption { id: string; title: string }
export interface PropertyLinkData { suggestions: PropertyLinkSuggestion[]; properties: LocalPropertyOption[] }

function propTitle(row: { title: unknown }): string {
    const t = row.title;
    if (typeof t === 'string') return t;
    if (t && typeof t === 'object') {
        const rec = t as Record<string, string>;
        return rec.en || rec.pt || Object.values(rec)[0] || '';
    }
    return '';
}

function matchTokens(...parts: (string | null | undefined)[]): Set<string> {
    const stop = new Set(['the', 'by', 'de', 'da', 'do', 'in', 'em', 'a', 'o', 'e', 'and', 'com', 'with', 'lovely', 'memories']);
    const tokens = new Set<string>();
    for (const p of parts) {
        for (const w of (p ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9]+/)) {
            if (w.length >= 3 && !stop.has(w)) tokens.add(w);
        }
    }
    return tokens;
}

function overlap(a: Set<string>, b: Set<string>): number {
    let n = 0;
    for (const t of a) if (b.has(t)) n++;
    return n;
}

export async function getPropertyLinkSuggestions(): Promise<PropertyLinkData> {
    await assertAdmin();
    const admin = await getSupabaseAdmin();
    const [b24Res, localRes] = await Promise.all([
        admin.from('beds24_properties').select('beds24_property_id, name, bot_mode, internal_property_id').order('name'),
        admin.from('properties').select('id, title, address').eq('is_active', true),
    ]);
    const locals = (localRes.data ?? []) as { id: string; title: unknown; address: string | null }[];
    const options: LocalPropertyOption[] = locals
        .map((l) => ({ id: l.id, title: propTitle(l) }))
        .sort((a, b) => a.title.localeCompare(b.title));
    const localTokens = locals.map((l) => ({ id: l.id, tokens: matchTokens(propTitle(l), l.address) }));

    const suggestions: PropertyLinkSuggestion[] = ((b24Res.data ?? []) as {
        beds24_property_id: number; name: string; bot_mode: string; internal_property_id: string | null;
    }[]).map((p) => {
        const pTokens = matchTokens(p.name);
        let best: { id: string; score: number } | null = null;
        for (const lt of localTokens) {
            const score = overlap(pTokens, lt.tokens);
            if (score > 0 && (!best || score > best.score)) best = { id: lt.id, score };
        }
        return {
            beds24PropertyId: p.beds24_property_id,
            beds24Name: p.name,
            botMode: p.bot_mode ?? 'off',
            suggestedPropertyId: p.internal_property_id ?? best?.id ?? null,
            currentPropertyId: p.internal_property_id ?? null,
        };
    });
    return { suggestions, properties: options };
}

/** Liga cada propriedade Beds24 a uma propriedade do site (beds24_properties.internal_property_id). */
export async function savePropertyLinks(links: { beds24PropertyId: number; propertyId: string | null }[]): Promise<{ ok: boolean; error?: string }> {
    await assertAdmin();
    try {
        const admin = await getSupabaseAdmin();
        for (const l of links) {
            const { error } = await admin.from('beds24_properties')
                .update({ internal_property_id: l.propertyId, updated_at: new Date().toISOString() })
                .eq('beds24_property_id', l.beds24PropertyId);
            if (error) throw error;
        }
        return { ok: true };
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Save failed' };
    }
}

// ── Knowledge por propriedade (editor) ────────────────────────────────────────

export async function listLinkedProperties(): Promise<PropertyKnowledge[]> {
    await assertAdmin();
    try {
        const admin = await getSupabaseAdmin();
        const { data: b24 } = await admin.from('beds24_properties')
            .select('beds24_property_id, name, internal_property_id')
            .not('internal_property_id', 'is', null);
        const rows = (b24 ?? []) as { beds24_property_id: number; name: string; internal_property_id: string }[];
        if (!rows.length) return [];
        const ids = rows.map((r) => r.internal_property_id);

        const [{ data: props }, { data: extras }] = await Promise.all([
            admin.from('properties').select(`id, ${PROPERTY_BASE_COLUMNS}`).in('id', ids),
            admin.from('property_ai_extras').select(EXTRAS_COLUMNS).in('property_id', ids),
        ]);
        const propById = new Map<string, Record<string, unknown>>();
        for (const p of (props ?? []) as Record<string, unknown>[]) propById.set(p.id as string, p);
        const extrasById = new Map<string, Record<string, unknown>>();
        for (const e of (extras ?? []) as Record<string, unknown>[]) extrasById.set(e.property_id as string, e);

        return rows
            .map((r) => ({
                id: r.internal_property_id,
                externalPropertyId: String(r.beds24_property_id),
                listingName: r.name,
                ...(propById.has(r.internal_property_id) ? mapPropertyBase(propById.get(r.internal_property_id)!) : {}),
                ...mapExtrasRow(extrasById.get(r.internal_property_id) ?? null),
            }))
            .sort((a, b) => (a.listingName ?? '').localeCompare(b.listingName ?? ''));
    } catch {
        return [];
    }
}

export interface PropertyExtrasInput {
    propertyId: string;
    wifiName?: string | null;
    wifiPassword?: string | null;
    doorCode?: string | null;
    buildingAccess?: string | null;
    apartmentAccess?: string | null;
    emergencyContact?: string | null;
    govFormUrl?: string | null;
    guidebookUrl?: string | null;
    tips?: string | null;
    toneNotes?: string | null;
}

export async function upsertPropertyExtras(input: PropertyExtrasInput): Promise<{ ok: boolean; error?: string }> {
    await assertAdmin();
    try {
        const admin = await getSupabaseAdmin();
        const { error } = await admin.from('property_ai_extras').upsert({
            property_id: input.propertyId,
            wifi_name: input.wifiName ?? null,
            wifi_password: input.wifiPassword ?? null,
            door_code: input.doorCode ?? null,
            building_access: input.buildingAccess ?? null,
            apartment_access: input.apartmentAccess ?? null,
            emergency_contact: input.emergencyContact ?? null,
            gov_form_url: input.govFormUrl ?? null,
            guidebook_url: input.guidebookUrl ?? null,
            tips: input.tips ?? null,
            tone_notes: input.toneNotes ?? null,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'property_id' });
        if (error) throw error;
        return { ok: true };
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Save failed' };
    }
}

async function readAccessPhotos(admin: Awaited<ReturnType<typeof getSupabaseAdmin>>, propertyId: string): Promise<string[]> {
    const { data } = await admin.from('property_ai_extras').select('access_photos').eq('property_id', propertyId).maybeSingle();
    return Array.isArray(data?.access_photos) ? (data!.access_photos as string[]) : [];
}

export async function uploadAccessPhoto(propertyId: string, formData: FormData): Promise<{ ok: boolean; photos?: string[]; error?: string }> {
    await assertAdmin();
    try {
        const file = formData.get('file');
        if (!(file instanceof File)) return { ok: false, error: 'No file provided.' };
        if (!file.type.startsWith('image/')) return { ok: false, error: 'That file is not an image.' };
        if (file.size > 5 * 1024 * 1024) return { ok: false, error: 'Image too large (max 5 MB).' };

        const admin = await getSupabaseAdmin();
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
        const path = `${propertyId}/${Date.now()}.${ext}`;
        const buffer = Buffer.from(await file.arrayBuffer());

        const { error: upErr } = await admin.storage.from(ACCESS_BUCKET).upload(path, buffer, { contentType: file.type, upsert: false });
        if (upErr) throw upErr;
        const { data: pub } = admin.storage.from(ACCESS_BUCKET).getPublicUrl(path);

        const photos = [...(await readAccessPhotos(admin, propertyId)), pub.publicUrl];
        const { error: updErr } = await admin.from('property_ai_extras')
            .upsert({ property_id: propertyId, access_photos: photos, updated_at: new Date().toISOString() }, { onConflict: 'property_id' });
        if (updErr) throw updErr;
        return { ok: true, photos };
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Upload failed' };
    }
}

export async function removeAccessPhoto(propertyId: string, url: string): Promise<{ ok: boolean; photos?: string[]; error?: string }> {
    await assertAdmin();
    try {
        const admin = await getSupabaseAdmin();
        const photos = (await readAccessPhotos(admin, propertyId)).filter((u) => u !== url);
        const { error: updErr } = await admin.from('property_ai_extras')
            .upsert({ property_id: propertyId, access_photos: photos, updated_at: new Date().toISOString() }, { onConflict: 'property_id' });
        if (updErr) throw updErr;

        const marker = `/${ACCESS_BUCKET}/`;
        const idx = url.indexOf(marker);
        if (idx >= 0) await admin.storage.from(ACCESS_BUCKET).remove([url.slice(idx + marker.length)]);
        return { ok: true, photos };
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Remove failed' };
    }
}

/** Knowledge efetivo de uma propriedade Beds24 (para o painel de contexto: coberto ✓ / em falta ⚠). */
export async function getKnowledgeForProperty(externalPropertyId: string): Promise<PropertyKnowledge | null> {
    await assertAdmin();
    const { loadPropertyKnowledge } = await import('@/lib/ai-messaging');
    return loadPropertyKnowledge(externalPropertyId);
}

// ── Modos por propriedade (lista para settings) ──────────────────────────────

export interface PropertyBotRow {
    beds24PropertyId: number;
    name: string;
    botMode: 'off' | 'drafts' | 'auto';
    linked: boolean;
}

export async function listPropertyBotModes(): Promise<PropertyBotRow[]> {
    await assertAdmin();
    const admin = await getSupabaseAdmin();
    const { data } = await admin.from('beds24_properties')
        .select('beds24_property_id, name, bot_mode, internal_property_id')
        .order('name');
    return ((data ?? []) as { beds24_property_id: number; name: string; bot_mode: string | null; internal_property_id: string | null }[])
        .map((p) => ({
            beds24PropertyId: p.beds24_property_id,
            name: p.name,
            botMode: (p.bot_mode as 'off' | 'drafts' | 'auto') ?? 'off',
            linked: !!p.internal_property_id,
        }));
}
