import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase';
import { feedLabel, maskFeedUrl, type FeedOutcome } from '@/lib/ical-feed-url';

/**
 * iCal import links (Airbnb/Booking calendar exports), stored in public.property_ical_feeds
 * (migration 20261114100000). **They are secrets**: whoever holds one reads the channel's
 * calendar for the listing, reservation codes and guest phone digits included.
 *
 * The table has RLS on, no policy and no grant for anon/authenticated, so only the service
 * role reaches it — which is why every function here uses getSupabaseAdmin(), and why this
 * module is `server-only` (importing it from a client component is a build error).
 *
 * **The full URL leaves this module in exactly one place: `feedsForSync`**, which hands it to
 * the iCal fetcher in app/actions/ical.ts. The backoffice only ever receives `maskFeedUrl`,
 * and logs/error messages only ever contain `feedLabel`. Callers must check authorisation
 * before calling the admin functions; this module does not know who is asking.
 */

export type SyncFeed = { id: string; propertyId: string; url: string; label: string };

export type AdminFeed = {
    id: string;
    label: string;
    masked: string;
    lastOutcome: FeedOutcome | null;
    lastError: string | null;
    lastOkAt: string | null;
    lastReadAt: string | null;
};

type FeedRow = {
    id: string;
    property_id: string;
    import_url: string;
    created_at: string;
    last_read_at: string | null;
    last_ok_at: string | null;
    last_outcome: FeedOutcome | null;
    last_error: string | null;
};

/** Feeds for the sync, keyed by property id, in creation order. Contains the real URLs. */
export async function feedsForSync(propertyIds: string[]): Promise<Map<string, SyncFeed[]>> {
    const byProperty = new Map<string, SyncFeed[]>();
    if (propertyIds.length === 0) return byProperty;
    const supabase = await getSupabaseAdmin();
    const { data, error } = await supabase
        .from('property_ical_feeds')
        .select('id, property_id, import_url, created_at')
        .in('property_id', propertyIds)
        .order('created_at', { ascending: true });
    if (error) throw new Error(`Could not load iCal feeds: ${error.message}`);
    for (const row of (data ?? []) as FeedRow[]) {
        const list = byProperty.get(row.property_id) ?? [];
        list.push({ id: row.id, propertyId: row.property_id, url: row.import_url, label: feedLabel(row.import_url, list.length) });
        byProperty.set(row.property_id, list);
    }
    return byProperty;
}

/** Ids of the properties that have at least one feed. */
export async function propertyIdsWithFeeds(): Promise<string[]> {
    const supabase = await getSupabaseAdmin();
    const { data, error } = await supabase.from('property_ical_feeds').select('property_id');
    if (error) throw new Error(`Could not load iCal feeds: ${error.message}`);
    return Array.from(new Set(((data ?? []) as { property_id: string }[]).map((r) => r.property_id)));
}

/** Number of feeds per property id (for the settings dashboard). */
export async function feedCounts(): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    const supabase = await getSupabaseAdmin();
    const { data, error } = await supabase.from('property_ical_feeds').select('property_id');
    if (error) throw new Error(`Could not load iCal feeds: ${error.message}`);
    for (const r of (data ?? []) as { property_id: string }[]) counts.set(r.property_id, (counts.get(r.property_id) ?? 0) + 1);
    return counts;
}

/** Records how one read went. `error` must already be link-free (see messageForOutcome). */
export async function recordFeedRead(feedId: string, outcome: FeedOutcome, error: string | null): Promise<void> {
    const supabase = await getSupabaseAdmin();
    const now = new Date().toISOString();
    const patch: Record<string, string | null> = {
        last_read_at: now,
        last_outcome: outcome,
        last_error: outcome === 'ok' ? null : (error ?? '').slice(0, 300) || null,
    };
    if (outcome === 'ok') patch.last_ok_at = now;
    const { error: updateError } = await supabase.from('property_ical_feeds').update(patch).eq('id', feedId);
    if (updateError) console.error('[iCal feeds] Could not record read for feed', feedId, updateError.message);
}

/** Masked feeds for the backoffice. Never returns the URL. Caller checks authorisation. */
export async function listFeedsForAdmin(propertyId: string): Promise<AdminFeed[]> {
    const supabase = await getSupabaseAdmin();
    const { data, error } = await supabase
        .from('property_ical_feeds')
        .select('id, property_id, import_url, created_at, last_read_at, last_ok_at, last_outcome, last_error')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: true });
    if (error) throw new Error(`Could not load iCal feeds: ${error.message}`);
    return ((data ?? []) as FeedRow[]).map((row, i) => ({
        id: row.id,
        label: feedLabel(row.import_url, i),
        masked: maskFeedUrl(row.import_url),
        lastOutcome: row.last_outcome,
        lastError: row.last_error,
        lastOkAt: row.last_ok_at,
        lastReadAt: row.last_read_at,
    }));
}

/** Stores a validated link. Returns false when the property already has this exact link. */
export async function insertFeed(propertyId: string, url: string): Promise<{ ok: true } | { ok: false; error: string }> {
    const supabase = await getSupabaseAdmin();
    const { error } = await supabase.from('property_ical_feeds').insert({ property_id: propertyId, import_url: url });
    if (error) {
        if (error.code === '23505') return { ok: false, error: 'This calendar link is already connected to this property.' };
        if (error.code === '23503') return { ok: false, error: 'Property not found.' };
        console.error('[iCal feeds] Insert failed:', error.code, error.message);
        return { ok: false, error: 'Could not save the calendar link.' };
    }
    return { ok: true };
}

/** Deletes one feed of a property. Returns false when nothing matched. */
export async function deleteFeed(propertyId: string, feedId: string): Promise<boolean> {
    const supabase = await getSupabaseAdmin();
    const { data, error } = await supabase
        .from('property_ical_feeds')
        .delete()
        .eq('id', feedId)
        .eq('property_id', propertyId)
        .select('id');
    if (error) {
        console.error('[iCal feeds] Delete failed:', error.code, error.message);
        return false;
    }
    return (data ?? []).length > 0;
}
