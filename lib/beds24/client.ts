import { getSupabaseAdmin } from '@/lib/supabase';
import type { Beds24ApiEnvelope, Beds24RequestOptions } from './types';

const BASE_URL = 'https://beds24.com/api/v2';

/**
 * Kill-switch: without BEDS24_REFRESH_TOKEN every Beds24 module is disabled.
 * In production the env var only exists in Vercel's Preview scope, so the
 * production deployment can never talk to Beds24 even if this code ships.
 */
export function isBeds24Enabled(): boolean {
    return !!process.env.BEDS24_REFRESH_TOKEN;
}

function assertEnabled() {
    if (!isBeds24Enabled()) {
        throw new Error('Beds24 is disabled: BEDS24_REFRESH_TOKEN is not set in this environment.');
    }
}

/**
 * Returns a valid 24h access token, refreshing it via the refresh token
 * when missing or within 10 minutes of expiry. Cached in beds24_config.
 */
async function getAccessToken(forceRefresh = false): Promise<string> {
    assertEnabled();
    const supabase = await getSupabaseAdmin();

    if (!forceRefresh) {
        const { data: config } = await supabase
            .from('beds24_config')
            .select('access_token, access_token_expires_at')
            .eq('id', 1)
            .single();

        if (config?.access_token && config.access_token_expires_at) {
            const expiresAt = new Date(config.access_token_expires_at).getTime();
            if (expiresAt - Date.now() > 10 * 60 * 1000) {
                return config.access_token;
            }
        }
    }

    const started = Date.now();
    const res = await fetch(`${BASE_URL}/authentication/token`, {
        headers: { accept: 'application/json', refreshToken: process.env.BEDS24_REFRESH_TOKEN! },
        cache: 'no-store',
    });
    const json = await res.json().catch(() => null);

    await logApiCall(supabase, {
        method: 'GET', endpoint: '/authentication/token', status: res.status,
        durationMs: Date.now() - started, context: 'auth',
        requestCost: headerNum(res, 'x-request-cost'),
        creditRemaining: headerNum(res, 'x-five-min-limit-remaining'),
        error: res.ok ? null : JSON.stringify(json)?.slice(0, 500),
    });

    if (!res.ok || !json?.token) {
        throw new Error(`Beds24 token refresh failed (HTTP ${res.status})`);
    }

    const expiresAt = new Date(Date.now() + (json.expiresIn ?? 86400) * 1000).toISOString();
    await supabase
        .from('beds24_config')
        .update({ access_token: json.token, access_token_expires_at: expiresAt, updated_at: new Date().toISOString() })
        .eq('id', 1);

    return json.token;
}

function headerNum(res: Response, name: string): number | null {
    const v = res.headers.get(name);
    return v === null || v === '' ? null : Number(v);
}

async function logApiCall(supabase: Awaited<ReturnType<typeof getSupabaseAdmin>>, entry: {
    method: string; endpoint: string; status: number | null; durationMs: number;
    context: string; requestCost: number | null; creditRemaining: number | null; error?: string | null;
}) {
    // Logging must never break the actual call.
    try {
        await supabase.from('beds24_api_log').insert({
            method: entry.method,
            endpoint: entry.endpoint,
            status: entry.status,
            duration_ms: entry.durationMs,
            context: entry.context,
            request_cost: entry.requestCost,
            credit_remaining: entry.creditRemaining,
            error: entry.error ?? null,
        });
        if (entry.creditRemaining !== null) {
            await supabase.from('beds24_config').update({
                credit_remaining: entry.creditRemaining,
                updated_at: new Date().toISOString(),
            }).eq('id', 1);
        }
    } catch (e) {
        console.error('[beds24] api log failed:', e);
    }
}

function buildQuery(query?: Beds24RequestOptions['query']): string {
    if (!query) return '';
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
        if (value === undefined) continue;
        if (Array.isArray(value)) {
            for (const v of value) params.append(key, String(v));
        } else {
            params.append(key, String(value));
        }
    }
    const s = params.toString();
    return s ? `?${s}` : '';
}

/**
 * Core request wrapper: auth header, one automatic retry on 401 (token
 * refresh), and credit/latency logging for every call.
 */
export async function beds24Request<T = unknown>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    options: Beds24RequestOptions = {},
): Promise<Beds24ApiEnvelope<T> | T> {
    assertEnabled();
    const supabase = await getSupabaseAdmin();
    const url = `${BASE_URL}${path}${buildQuery(options.query)}`;

    let token = await getAccessToken();

    for (let attempt = 0; attempt < 2; attempt++) {
        const started = Date.now();
        const res = await fetch(url, {
            method,
            headers: {
                accept: 'application/json',
                token,
                ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
            },
            body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
            cache: 'no-store',
        });

        const json = await res.json().catch(() => null);

        await logApiCall(supabase, {
            method, endpoint: path, status: res.status,
            durationMs: Date.now() - started,
            context: options.context ?? 'action',
            requestCost: headerNum(res, 'x-request-cost'),
            creditRemaining: headerNum(res, 'x-five-min-limit-remaining'),
            error: res.ok ? null : JSON.stringify(json)?.slice(0, 500),
        });

        if (res.status === 401 && attempt === 0) {
            token = await getAccessToken(true);
            continue;
        }

        if (!res.ok) {
            throw new Error(`Beds24 ${method} ${path} failed (HTTP ${res.status}): ${JSON.stringify(json)?.slice(0, 300)}`);
        }

        return json as Beds24ApiEnvelope<T> | T;
    }

    throw new Error(`Beds24 ${method} ${path}: unreachable retry state`);
}
