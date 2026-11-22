import 'server-only';
import { createHmac } from 'node:crypto';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * Server-side rate limit backed by the `hit_rate_limit` database function.
 * The counter key is an HMAC of `${scope}:${value}`, so no IP or email is stored in clear.
 * Returns true when the request may proceed. Fails open by default (`failOpen: false` returns false on error): on any error returns `failOpen`
 * and logs only the scope and the error message.
 */
export async function hitRateLimit(
    scope: string,
    value: string,
    windowSeconds: number,
    max: number,
    { failOpen = true }: { failOpen?: boolean } = {},
): Promise<boolean> {
    try {
        const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!secret) {
            console.error(`[rate-limit] ${scope}: signing key missing`);
            return failOpen;
        }
        const key = createHmac('sha256', secret)
            .update(`${scope}:${value.trim().toLowerCase()}`)
            .digest('hex');

        const supabase = await getSupabaseAdmin();
        const { data, error } = await supabase.rpc('hit_rate_limit', {
            p_key: key,
            p_window_seconds: windowSeconds,
            p_max: max,
        });
        if (error) {
            console.error(`[rate-limit] ${scope}: ${error.message}`);
            return failOpen;
        }
        // Fail-closed callers proceed only on an explicit true (a null result is not a yes).
        return failOpen ? data !== false : data === true;
    } catch (e) {
        console.error(`[rate-limit] ${scope}: ${e instanceof Error ? e.message : 'unknown error'}`);
        return failOpen;
    }
}
