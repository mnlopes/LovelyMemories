import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isBeds24Enabled } from '@/lib/beds24/client';
import { ingestBookings, ingestMessages } from '@/lib/beds24/sync';
import { processBotMessages } from '@/lib/beds24/bot-bridge';
import type { Beds24WebhookPayload } from '@/lib/beds24/types';

/**
 * Beds24 booking webhook receiver (Phase 1).
 * Configured per property in Beds24 (Settings > Properties > Access) with a
 * custom header: x-beds24-secret: {BEDS24_WEBHOOK_SECRET}.
 * Records every event with measured latency (payload timeStamp -> received).
 */
export async function POST(request: NextRequest) {
    if (!isBeds24Enabled()) {
        return NextResponse.json({ error: 'not found' }, { status: 404 });
    }

    const secret = process.env.BEDS24_WEBHOOK_SECRET;
    // Trim so an accidental leading/trailing space in the Beds24 custom-header
    // config never causes a spurious 401.
    const provided = request.headers.get('x-beds24-secret')?.trim();
    if (!secret || provided !== secret.trim()) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const receivedAt = new Date();
    let payload: Beds24WebhookPayload | null = null;
    try {
        payload = await request.json();
    } catch {
        return NextResponse.json({ error: 'invalid json' }, { status: 400 });
    }

    const supabase = await getSupabaseAdmin();
    const payloadTs = payload?.timeStamp ? new Date(payload.timeStamp) : null;
    const latencyMs = payloadTs ? Math.max(0, receivedAt.getTime() - payloadTs.getTime()) : null;

    const { data: event, error: insertError } = await supabase
        .from('beds24_webhook_events')
        .insert({
            received_at: receivedAt.toISOString(),
            payload_timestamp: payloadTs?.toISOString() ?? null,
            latency_ms: latencyMs,
            event_type: payload?.booking ? 'booking' : 'unknown',
            beds24_booking_id: payload?.booking?.id ?? null,
            beds24_property_id: payload?.booking?.propertyId ?? null,
            payload: payload ?? {},
        })
        .select('id')
        .single();

    if (insertError) {
        console.error('[beds24 webhook] event insert failed:', insertError);
        return NextResponse.json({ error: 'storage failed' }, { status: 500 });
    }

    // Process: same ingestion path as polling (dedupe decides first_seen_via).
    let processingError: string | null = null;
    try {
        if (payload?.booking) {
            await ingestBookings([payload.booking], 'webhook');
        }
        if (payload?.messages?.length) {
            await ingestMessages(payload.messages, 'webhook');
            // Bot bridge: corre depois da ingestão e nunca lança — o webhook
            // responde 200 e a medição de latência não muda.
            await processBotMessages(payload?.booking ?? null, payload.messages);
        }
    } catch (e) {
        processingError = e instanceof Error ? e.message : String(e);
        console.error('[beds24 webhook] processing failed:', e);
    }

    await supabase
        .from('beds24_webhook_events')
        .update({ processed: processingError === null, processing_error: processingError })
        .eq('id', event.id);

    // Always 200 so Beds24 does not retry storms on our processing bugs;
    // the raw payload is stored and reprocessable.
    return NextResponse.json({ ok: true });
}
