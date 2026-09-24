import { getSupabaseAdmin } from '@/lib/supabase';
import { hashApiKey } from './keys';

/**
 * Key lookup, rate limiting and request logging for the partner API.
 * Uses the service role: partner_api_keys / partner_api_requests have RLS with
 * no policies, so nothing else can read them.
 */

export const RATE_LIMIT_PER_MINUTE = 60;

export interface PartnerKey {
    id: string;
    partnerName: string;
    refSlug: string;
}

export interface RequestLogEntry {
    keyId: string;
    httpStatus: number;
    status: string;
    errorCode?: string;
    resultCount?: number;
    durationMs: number;
}

/** Active (non-revoked) key for this token, or null. Throws on DB failure. */
export async function findActiveKey(token: string): Promise<PartnerKey | null> {
    const db = await getSupabaseAdmin();
    const { data, error } = await db
        .from('partner_api_keys')
        .select('id, partner_name, ref_slug')
        .eq('key_hash', hashApiKey(token))
        .is('revoked_at', null)
        .maybeSingle();
    if (error) throw new Error(`partner_api_keys lookup failed: ${error.message}`);
    if (!data) return null;
    return { id: data.id, partnerName: data.partner_name, refSlug: data.ref_slug };
}

/**
 * True if this key made RATE_LIMIT_PER_MINUTE or more requests in the last 60s.
 * Approximate under concurrency (count-then-insert), acceptable at our volume.
 * Throws on DB failure.
 */
export async function isRateLimited(keyId: string): Promise<boolean> {
    const db = await getSupabaseAdmin();
    const since = new Date(Date.now() - 60_000).toISOString();
    const { count, error } = await db
        .from('partner_api_requests')
        .select('id', { count: 'exact', head: true })
        .eq('key_id', keyId)
        .gt('created_at', since);
    if (error) throw new Error(`partner_api_requests count failed: ${error.message}`);
    return (count ?? 0) >= RATE_LIMIT_PER_MINUTE;
}

/** Best-effort log + last_used_at bump. Never throws — logging must not break a response. */
export async function recordRequest(entry: RequestLogEntry): Promise<void> {
    try {
        const db = await getSupabaseAdmin();
        const [insert, touch] = await Promise.all([
            db.from('partner_api_requests').insert({
                key_id: entry.keyId,
                http_status: entry.httpStatus,
                status: entry.status,
                error_code: entry.errorCode ?? null,
                result_count: entry.resultCount ?? null,
                duration_ms: entry.durationMs,
            }),
            db.from('partner_api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', entry.keyId),
        ]);
        if (insert.error) console.error('[partner-api] request log failed:', insert.error.message);
        if (touch.error) console.error('[partner-api] last_used_at update failed:', touch.error.message);
    } catch (err) {
        console.error('[partner-api] request log exception:', err);
    }
}
