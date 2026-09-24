'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getLocalizedStr } from '@/lib/data-utils';
import { generateApiKey, hashApiKey, displayPrefix } from '@/lib/partner-api/keys';
import { effectiveCity } from '@/lib/partner-api/destinations';
import { toNumber } from '@/lib/partner-api/serialize';
import { logActivity } from './audit';

/**
 * Admin actions for /admin/partners. Server actions are callable directly,
 * without going through the page, so EVERY action checks super_admin itself —
 * the segment layout guard is not enough.
 */

export type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

export interface PartnerKeyListItem {
    id: string;
    partnerName: string;
    refSlug: string;
    keyPrefix: string;
    createdAt: string;
    lastUsedAt: string | null;
    revokedAt: string | null;
    requests24h: number;
}

export interface PartnerPropertyListItem {
    id: string;
    name: string;
    city: string;
    maxGuests: number;
    enabled: boolean;
    icalFailed: boolean;
}

export interface PartnerApiSummary {
    apiEnabled: boolean;
    requests24h: number;
    activeKeys: number;
    exposedProperties: number;
    totalProperties: number;
}

const REF_SLUG_RE = /^[a-z0-9-]{2,32}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getSessionClient() {
    const cookieStore = await cookies();
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
                    } catch {
                        // Called from a context where cookies are read-only; session refresh is handled by proxy.ts.
                    }
                },
            },
        },
    );
}

/** The current user's id if they are super_admin, otherwise null. */
async function requireSuperAdmin(): Promise<string | null> {
    const supabase = await getSessionClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    return profile?.role === 'super_admin' ? user.id : null;
}

const FORBIDDEN: { success: false; error: string } = { success: false, error: 'Not authorized' };
const since24h = () => new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

type PropertyAdminRow = {
    id: string; slug: string; title: unknown; city: unknown; max_guests: unknown;
    sync_status: string | null; partner_api_enabled: boolean;
    parent_id: string | null; is_multi_unit: boolean | null;
};

/** Active, public, bookable leaves — the same universe the API can ever expose. */
async function loadBookableProperties(): Promise<PropertyAdminRow[]> {
    const db = await getSupabaseAdmin();
    const { data, error } = await db
        .from('properties')
        .select('id, slug, title, city, max_guests, sync_status, partner_api_enabled, parent_id, is_multi_unit')
        .eq('is_active', true)
        .neq('status', 'hidden');
    if (error) throw new Error(error.message);
    return ((data ?? []) as PropertyAdminRow[]).filter(p => p.parent_id !== null || !p.is_multi_unit);
}

export async function listPartnerKeys(): Promise<ActionResult<PartnerKeyListItem[]>> {
    if (!(await requireSuperAdmin())) return FORBIDDEN;
    try {
        const db = await getSupabaseAdmin();
        const { data: keys, error: keysError } = await db
            .from('partner_api_keys')
            .select('id, partner_name, ref_slug, key_prefix, created_at, last_used_at, revoked_at')
            .order('created_at', { ascending: false });
        if (keysError) throw new Error(keysError.message);

        // A plain `select('key_id')` over all recent requests is silently capped at 1000 rows
        // by PostgREST, which undercounts busy keys. Count per key instead (head-only, exact).
        const since = since24h();
        const countResults = await Promise.all(
            (keys ?? []).map(k =>
                db.from('partner_api_requests')
                    .select('id', { count: 'exact', head: true })
                    .eq('key_id', k.id)
                    .gt('created_at', since),
            ),
        );
        const counts = new Map<string, number>();
        countResults.forEach((res, i) => {
            if (res.error) throw new Error(res.error.message);
            counts.set(keys![i].id, res.count ?? 0);
        });

        return {
            success: true,
            data: (keys ?? []).map(k => ({
                id: k.id,
                partnerName: k.partner_name,
                refSlug: k.ref_slug,
                keyPrefix: k.key_prefix,
                createdAt: k.created_at,
                lastUsedAt: k.last_used_at,
                revokedAt: k.revoked_at,
                requests24h: counts.get(k.id) ?? 0,
            })),
        };
    } catch (err) {
        console.error('SERVER ACTION ERROR [listPartnerKeys]:', err);
        return { success: false, error: 'Failed to load API keys' };
    }
}

export async function createPartnerKey(
    input: { partnerName: string; refSlug: string },
): Promise<ActionResult<{ id: string; key: string; keyPrefix: string }>> {
    const userId = await requireSuperAdmin();
    if (!userId) return FORBIDDEN;

    const partnerName = (input.partnerName ?? '').trim();
    const refSlug = (input.refSlug ?? '').trim().toLowerCase();
    if (partnerName.length < 2 || partnerName.length > 60) {
        return { success: false, error: 'Partner name must be 2–60 characters' };
    }
    if (!REF_SLUG_RE.test(refSlug)) {
        return { success: false, error: 'Ref must be 2–32 characters: lowercase letters, numbers and hyphens' };
    }

    try {
        const key = generateApiKey();
        const keyPrefix = displayPrefix(key);
        const db = await getSupabaseAdmin();
        const { data, error } = await db
            .from('partner_api_keys')
            .insert({ partner_name: partnerName, ref_slug: refSlug, key_prefix: keyPrefix, key_hash: hashApiKey(key), created_by: userId })
            .select('id')
            .single();
        if (error || !data) throw new Error(error?.message ?? 'insert returned no row');

        await logActivity(userId, 'CREATE', 'SETTINGS', data.id, { area: 'partner_api', partner: partnerName, ref: refSlug, key_prefix: keyPrefix });
        // The full key is returned ONCE here and never stored or logged.
        return { success: true, data: { id: data.id, key, keyPrefix } };
    } catch (err) {
        console.error('SERVER ACTION ERROR [createPartnerKey]:', err);
        return { success: false, error: 'Failed to create API key' };
    }
}

export async function revokePartnerKey(id: string): Promise<ActionResult<null>> {
    const userId = await requireSuperAdmin();
    if (!userId) return FORBIDDEN;
    if (!UUID_RE.test(id)) return { success: false, error: 'Invalid key id' };

    try {
        const db = await getSupabaseAdmin();
        const { data, error } = await db
            .from('partner_api_keys')
            .update({ revoked_at: new Date().toISOString() })
            .eq('id', id)
            .is('revoked_at', null)
            .select('partner_name, key_prefix')
            .maybeSingle();
        if (error) throw new Error(error.message);
        if (!data) return { success: false, error: 'Key not found or already revoked' };

        await logActivity(userId, 'STATUS_CHANGE', 'SETTINGS', id, { area: 'partner_api', action: 'revoke', partner: data.partner_name, key_prefix: data.key_prefix }, 'WARNING');
        return { success: true, data: null };
    } catch (err) {
        console.error('SERVER ACTION ERROR [revokePartnerKey]:', err);
        return { success: false, error: 'Failed to revoke API key' };
    }
}

export async function listPartnerProperties(): Promise<ActionResult<PartnerPropertyListItem[]>> {
    if (!(await requireSuperAdmin())) return FORBIDDEN;
    try {
        const rows = await loadBookableProperties();

        // Units may leave `city` blank and inherit it from their parent building —
        // loadBookableProperties only returns leaves, so fetch the parents' city too.
        const parentIdsNeeded = Array.from(new Set(
            rows.filter(p => !getLocalizedStr(p.city, 'en').trim() && p.parent_id).map(p => p.parent_id as string),
        ));
        let parentCityById = new Map<string, unknown>();
        if (parentIdsNeeded.length > 0) {
            const db = await getSupabaseAdmin();
            const { data: parents, error } = await db.from('properties').select('id, city').in('id', parentIdsNeeded);
            if (error) throw new Error(error.message);
            parentCityById = new Map(((parents ?? []) as { id: string; city: unknown }[]).map(p => [p.id, p.city]));
        }

        const items = rows.map(p => ({
            id: p.id,
            name: getLocalizedStr(p.title, 'en').trim() || p.slug,
            city: effectiveCity(p.city, p.parent_id ? parentCityById.get(p.parent_id) : undefined),
            maxGuests: toNumber(p.max_guests),
            enabled: p.partner_api_enabled === true,
            icalFailed: p.sync_status === 'failed',
        }));
        items.sort((a, b) => a.name.localeCompare(b.name));
        return { success: true, data: items };
    } catch (err) {
        console.error('SERVER ACTION ERROR [listPartnerProperties]:', err);
        return { success: false, error: 'Failed to load properties' };
    }
}

export async function setPartnerPropertyEnabled(id: string, enabled: boolean): Promise<ActionResult<null>> {
    const userId = await requireSuperAdmin();
    if (!userId) return FORBIDDEN;
    if (!UUID_RE.test(id) || typeof enabled !== 'boolean') return { success: false, error: 'Invalid input' };

    try {
        const db = await getSupabaseAdmin();
        const { error } = await db.from('properties').update({ partner_api_enabled: enabled }).eq('id', id);
        if (error) throw new Error(error.message);
        await logActivity(userId, 'UPDATE', 'PROPERTY', id, { area: 'partner_api', partner_api_enabled: enabled });
        return { success: true, data: null };
    } catch (err) {
        console.error('SERVER ACTION ERROR [setPartnerPropertyEnabled]:', err);
        return { success: false, error: 'Failed to update property' };
    }
}

export async function getPartnerApiSummary(): Promise<ActionResult<PartnerApiSummary>> {
    if (!(await requireSuperAdmin())) return FORBIDDEN;
    try {
        const db = await getSupabaseAdmin();
        const [reqRes, keysRes, rows] = await Promise.all([
            db.from('partner_api_requests').select('id', { count: 'exact', head: true }).gt('created_at', since24h()),
            db.from('partner_api_keys').select('id', { count: 'exact', head: true }).is('revoked_at', null),
            loadBookableProperties(),
        ]);
        if (reqRes.error) throw new Error(reqRes.error.message);
        if (keysRes.error) throw new Error(keysRes.error.message);
        return {
            success: true,
            data: {
                apiEnabled: process.env.PARTNER_API_ENABLED === 'true',
                requests24h: reqRes.count ?? 0,
                activeKeys: keysRes.count ?? 0,
                exposedProperties: rows.filter(p => p.partner_api_enabled).length,
                totalProperties: rows.length,
            },
        };
    } catch (err) {
        console.error('SERVER ACTION ERROR [getPartnerApiSummary]:', err);
        return { success: false, error: 'Failed to load summary' };
    }
}
