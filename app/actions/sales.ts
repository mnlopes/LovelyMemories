'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireRole, PROPERTY_EDITORS } from '@/lib/auth/require-role';
import { checkPermission } from '@/app/actions/permissions';
import { logActivity } from '@/lib/audit-log';
import { loadSalePerformance } from '@/lib/sales/repo';
import { saleListingInputSchema, publishProblems, type PublishProblem } from '@/lib/sales/validation';
import { slugify } from '@/lib/sales/format';
import { copyFromProperty, type CopySourceProperty } from '@/lib/sales/copy-from-property';
import type { PerformanceSnapshot } from '@/lib/sales/performance';
import { ENERGY_CERT_DOC_ID, type Localized, type SaleListingPrivate } from '@/lib/sales/types';
import { isOwnDocPath } from '@/lib/sales/storage';

const idSchema = z.string().uuid();
const BUCKETS = ['sale-listings', 'sale-listings-private'] as const;
const LOCALES = ['en', 'pt'] as const;

// Not exported: every export of a 'use server' file is a public endpoint.
// Writes need can_edit; reads need can_view, the same check as the layout guard.
async function assertSalesEditor(): Promise<void> {
    await requireRole(PROPERTY_EDITORS);
    if (!(await checkPermission('sales', 'can_edit'))) throw new Error('Not authorized');
}

async function assertSalesViewer(): Promise<void> {
    await requireRole(PROPERTY_EDITORS);
    if (!(await checkPermission('sales', 'can_view'))) throw new Error('Not authorized');
}

async function currentUserId(): Promise<string | null> {
    const { createServerClient } = await import('@supabase/ssr');
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const serverSupabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll() {
                    // read-only here
                },
            },
        },
    );
    const {
        data: { user },
    } = await serverSupabase.auth.getUser();
    return user?.id ?? null;
}

function revalidateSales(slugs: (string | null | undefined)[]) {
    for (const locale of LOCALES) {
        revalidatePath(`/${locale}/for-sale`);
        revalidatePath(`/${locale}/admin/sales`);
        for (const slug of new Set(slugs.filter((s): s is string => !!s))) {
            revalidatePath(`/${locale}/for-sale/${slug}`);
        }
    }
    revalidatePath('/sitemap.xml');
}

export async function listSaleListings(): Promise<SaleListingPrivate[]> {
    await assertSalesViewer();
    const supabase = await getSupabaseAdmin();
    const { data, error } = await supabase
        .from('sale_listings')
        .select('*')
        .order('updated_at', { ascending: false });
    if (error) {
        console.error('listSaleListings failed:', error.code);
        throw new Error('load_failed');
    }
    return (data ?? []) as SaleListingPrivate[];
}

export async function getSaleListing(id: string): Promise<SaleListingPrivate | null> {
    await assertSalesViewer();
    if (!idSchema.safeParse(id).success) return null;
    const supabase = await getSupabaseAdmin();
    const { data, error } = await supabase.from('sale_listings').select('*').eq('id', id).maybeSingle();
    if (error) {
        console.error('getSaleListing failed:', error.code);
        return null;
    }
    return (data as SaleListingPrivate | null) ?? null;
}

export async function saveSaleListing(
    id: string,
    input: unknown,
): Promise<
    { ok: true; slug: string; reference: string | null } | { ok: false; error: string; problems?: PublishProblem[] }
> {
    await assertSalesEditor();
    if (!idSchema.safeParse(id).success) return { ok: false, error: 'invalid_id' };
    const parsed = saleListingInputSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: 'invalid_input' };
    const data = parsed.data;
    if (data.energy_cert_path && !data.energy_cert_path.startsWith(`${id}/docs/`)) {
        return { ok: false, error: 'invalid_input' };
    }
    // Documents point only at files in this listing's own private folder, each id once.
    if (
        data.documents.some((d) => !isOwnDocPath(d.path, id)) ||
        new Set(data.documents.map((d) => d.id)).size !== data.documents.length
    ) {
        return { ok: false, error: 'invalid_input' };
    }

    if (data.published) {
        const problems = publishProblems(data);
        if (problems.length > 0) return { ok: false, error: 'publish_blocked', problems };
    }

    const supabase = await getSupabaseAdmin();
    const { data: existing, error: readError } = await supabase
        .from('sale_listings')
        .select('id, slug, published_at')
        .eq('id', id)
        .maybeSingle();
    if (readError) {
        console.error('saveSaleListing read failed:', readError.code);
        return { ok: false, error: 'db_error' };
    }

    const now = new Date().toISOString();
    const baseSlug = slugify(data.slug);
    if (!baseSlug) return { ok: false, error: 'invalid_slug' };
    const row = {
        ...data,
        // The income summary needs a linked home: without one it is switched off.
        show_performance: data.property_id ? data.show_performance : false,
        published_at: data.published ? (existing?.published_at ?? now) : (existing?.published_at ?? null),
        updated_at: now,
    };

    let saved = false;
    let reference: string | null = null;
    let finalSlug = baseSlug;
    let suffix = 1;
    for (let attempt = 0; attempt < 2 && !saved; attempt++) {
        // find a free slug (another row may already hold it)
        for (;;) {
            if (suffix > 50) return { ok: false, error: 'slug_taken' };
            const candidate = suffix === 1 ? baseSlug : `${baseSlug}-${suffix}`;
            const { data: clash, error: clashError } = await supabase
                .from('sale_listings')
                .select('id')
                .eq('slug', candidate)
                .neq('id', id)
                .limit(1);
            if (clashError) {
                console.error('saveSaleListing slug check failed:', clashError.code);
                return { ok: false, error: 'db_error' };
            }
            if (!clash || clash.length === 0) {
                finalSlug = candidate;
                break;
            }
            suffix++;
        }

        const payload = { ...row, slug: finalSlug };
        // The reference (LM-V-0001) is set by the database: read it back so a new listing shows it at once.
        const { data: written, error } = existing
            ? await supabase.from('sale_listings').update(payload).eq('id', id).select('reference').maybeSingle()
            : await supabase
                  .from('sale_listings')
                  .insert({ ...payload, id, created_by: await currentUserId() })
                  .select('reference')
                  .maybeSingle();
        if (!error) {
            saved = true;
            reference = (written as { reference: string | null } | null)?.reference ?? null;
        } else if (error.code === '23505' && attempt === 0) {
            suffix++; // lost a race on the unique slug index: retry with the next suffix
        } else {
            console.error('saveSaleListing write failed:', error.code);
            return { ok: false, error: error.code === '23505' ? 'slug_taken' : 'db_error' };
        }
    }
    if (!saved) return { ok: false, error: 'db_error' };

    const actorId = await currentUserId();
    const details = { slug: finalSlug, published: data.published };
    if (!existing || !(await recentlyLoggedSameUpdate(supabase, actorId, id, details))) {
        await logActivity(actorId, existing ? 'UPDATE' : 'CREATE', 'SALE_LISTING', id, details);
    }
    revalidateSales([finalSlug, existing?.slug]);
    return { ok: true, slug: finalSlug, reference };
}

/** Window in which repeated autosaves of one listing by one person share a single audit line. */
const AUDIT_UPDATE_WINDOW_MS = 15 * 60 * 1000;

/**
 * True when the same person already logged an UPDATE of this listing in the last 15 minutes with the same
 * slug and published state: the editor autosaves every few seconds, and the log keeps one line per editing
 * session. Creating, publishing, unpublishing and slug changes always differ, so they are always logged.
 * Decided here on the server from the log itself (not a client flag), so it cannot be used to hide a change.
 * Not exported: every export of a 'use server' file is a public endpoint.
 */
async function recentlyLoggedSameUpdate(
    supabase: Awaited<ReturnType<typeof getSupabaseAdmin>>,
    actorId: string | null,
    listingId: string,
    details: { slug: string; published: boolean },
): Promise<boolean> {
    if (!actorId) return false;
    const since = new Date(Date.now() - AUDIT_UPDATE_WINDOW_MS).toISOString();
    const { data, error } = await supabase
        .from('audit_logs')
        .select('details')
        .eq('actor_id', actorId)
        .eq('action_type', 'UPDATE')
        .eq('resource_type', 'SALE_LISTING')
        .eq('resource_id', listingId)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(1);
    if (error || !data || data.length === 0) return false; // when in doubt, log
    const last = (data[0] as { details: { slug?: unknown; published?: unknown } | null }).details;
    return last?.slug === details.slug && last?.published === details.published;
}

async function removeFolder(
    supabase: Awaited<ReturnType<typeof getSupabaseAdmin>>,
    bucket: string,
    folder: string,
): Promise<boolean> {
    const { data, error } = await supabase.storage.from(bucket).list(folder, { limit: 1000 });
    if (error || !data) {
        console.error('deleteSaleListing storage list failed:', bucket, folder, error?.name ?? 'no_data');
        return false;
    }
    const files = data.filter((o) => o.id !== null).map((o) => `${folder}/${o.name}`);
    if (files.length > 0) {
        const { error: rmError } = await supabase.storage.from(bucket).remove(files);
        if (rmError) {
            console.error('deleteSaleListing storage remove failed:', bucket, folder, rmError.name);
            return false;
        }
    }
    return true;
}

export async function deleteSaleListing(id: string): Promise<{ ok: boolean }> {
    await assertSalesEditor();
    if (!idSchema.safeParse(id).success) return { ok: false };
    const supabase = await getSupabaseAdmin();

    const { data: existing } = await supabase.from('sale_listings').select('slug').eq('id', id).maybeSingle();

    for (const bucket of BUCKETS) {
        for (const folder of [id, `${id}/photos`, `${id}/docs`]) {
            let ok = false;
            try {
                ok = await removeFolder(supabase, bucket, folder);
            } catch (e) {
                console.error('deleteSaleListing storage cleanup failed:', (e as Error).name);
            }
            if (!ok) return { ok: false };
        }
    }

    const { error } = await supabase.from('sale_listings').delete().eq('id', id);
    if (error) {
        console.error('deleteSaleListing failed:', error.code);
        return { ok: false };
    }
    await logActivity(await currentUserId(), 'DELETE', 'SALE_LISTING', id, { slug: existing?.slug ?? null });
    revalidateSales([existing?.slug]);
    return { ok: true };
}

export async function searchLinkableProperties(
    query: string,
): Promise<{ id: string; slug: string; title: Localized; city: string | null }[]> {
    await assertSalesViewer();
    const q = String(query ?? '')
        .replace(/[%,()]/g, '')
        .trim()
        .slice(0, 80);
    const supabase = await getSupabaseAdmin();
    let req = supabase
        .from('properties')
        .select('id, slug, title, city')
        .eq('is_multi_unit', false)
        .order('title->>en', { ascending: true })
        .limit(50);
    if (q) {
        req = req.or(`slug.ilike.%${q}%,title->>en.ilike.%${q}%,title->>pt.ilike.%${q}%`);
    }
    const { data, error } = await req;
    if (error) {
        console.error('searchLinkableProperties failed:', error.code);
        return [];
    }
    return (data ?? []) as { id: string; slug: string; title: Localized; city: string | null }[];
}

export async function getPropertyCopy(propertyId: string): Promise<ReturnType<typeof copyFromProperty>> {
    await assertSalesViewer();
    if (!idSchema.safeParse(propertyId).success) throw new Error('Invalid property');
    const supabase = await getSupabaseAdmin();
    const { data, error } = await supabase
        .from('properties')
        .select('images, bedrooms, bathrooms, area, description, city, lat, lng, address, amenities')
        .eq('id', propertyId)
        .maybeSingle();
    if (error || !data) throw new Error('Property not found');
    const p = data as Record<string, unknown>;
    return copyFromProperty({
        images: Array.isArray(p.images) ? (p.images as CopySourceProperty['images']) : [],
        bedrooms: (p.bedrooms as number | null) ?? null,
        bathrooms: (p.bathrooms as number | null) ?? null,
        area: (p.area as number | null) ?? null,
        description: (p.description as Localized | null) ?? null,
        city: (p.city as string | null) ?? null,
        lat: (p.lat as number | null) ?? null,
        lng: (p.lng as number | null) ?? null,
        address: (p.address as string | null) ?? null,
        amenities: Array.isArray(p.amenities) ? (p.amenities as CopySourceProperty['amenities']) : null,
    });
}

export async function previewSalePerformance(
    propertyId: string,
    price: number | null,
    priceOnRequest: boolean,
): Promise<PerformanceSnapshot | null> {
    await assertSalesViewer();
    const args = z
        .object({ id: idSchema, price: z.number().min(0).nullable(), por: z.boolean() })
        .safeParse({ id: propertyId, price, por: priceOnRequest });
    if (!args.success) return null;
    try {
        return await loadSalePerformance(args.data.id, args.data.price, args.data.por);
    } catch (e) {
        console.error('previewSalePerformance failed:', (e as Error).message);
        return null;
    }
}

/**
 * Short-lived link (10 minutes) for the team to open a private file: the energy certificate
 * (docId `energy-certificate`) or one of the listing's documents.
 */
export async function getSaleDocUrl(id: string, docId: string): Promise<string | null> {
    await assertSalesViewer();
    if (!idSchema.safeParse(id).success || typeof docId !== 'string' || docId.length > 60) return null;
    const supabase = await getSupabaseAdmin();
    const { data } = await supabase
        .from('sale_listings')
        .select('energy_cert_path, documents')
        .eq('id', id)
        .maybeSingle();
    const row = data as { energy_cert_path: string | null; documents: { id: string; path: string }[] | null } | null;
    if (!row) return null;
    const path =
        docId === ENERGY_CERT_DOC_ID
            ? row.energy_cert_path
            : ((Array.isArray(row.documents) ? row.documents : []).find((d) => d.id === docId)?.path ?? null);
    if (!path || !isOwnDocPath(path, id)) return null;
    const { data: signed, error } = await supabase.storage.from('sale-listings-private').createSignedUrl(path, 600);
    if (error || !signed) {
        console.error('getSaleDocUrl sign failed:', error?.name ?? 'no_data');
        return null;
    }
    return signed.signedUrl;
}

// ---------------------------------------------------------------------------
// Sales contacts (AMI licence, WhatsApp, email that receives buyer requests), shown on every listing.
// Managed from the Sale listings page by whoever can edit listings (it used to be super admin only,
// in Settings). Stored in system_settings.sales_contact, read on the server by lib/sales/repo.ts.
// ---------------------------------------------------------------------------

export type SalesContactSettings = { ami_license: string; whatsapp: string; leads_email: string };

// Same rule as getSalesLeadsEmail: a plain address, no lists or display names.
const LEADS_EMAIL_RE = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;

const salesContactSchema = z.object({
    ami_license: z.string().trim().max(40),
    whatsapp: z.string().trim().max(30),
    leads_email: z.string().trim().max(120),
});

async function readSalesContact(supabase: Awaited<ReturnType<typeof getSupabaseAdmin>>): Promise<SalesContactSettings> {
    const { data } = await supabase.from('system_settings').select('value').eq('key', 'sales_contact').maybeSingle();
    const v = ((data?.value ?? {}) as Record<string, unknown>) || {};
    const str = (x: unknown) => (typeof x === 'string' ? x : '');
    return { ami_license: str(v.ami_license), whatsapp: str(v.whatsapp), leads_email: str(v.leads_email) };
}

export async function getSalesContactSettings(): Promise<SalesContactSettings | null> {
    await assertSalesViewer();
    try {
        return await readSalesContact(await getSupabaseAdmin());
    } catch (e) {
        console.error('getSalesContactSettings failed:', (e as Error).name);
        return null;
    }
}

export async function saveSalesContactSettings(
    input: unknown,
): Promise<{ ok: true } | { ok: false; error: 'invalid_email' | 'invalid_input' | 'db_error' }> {
    await assertSalesEditor();
    const parsed = salesContactSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: 'invalid_input' };
    const next = parsed.data;
    if (next.leads_email && !LEADS_EMAIL_RE.test(next.leads_email)) return { ok: false, error: 'invalid_email' };

    const supabase = await getSupabaseAdmin();
    const before = await readSalesContact(supabase);
    const { error } = await supabase
        .from('system_settings')
        .upsert({ key: 'sales_contact', value: next, updated_at: new Date().toISOString() });
    if (error) {
        console.error('saveSalesContactSettings failed:', error.code);
        return { ok: false, error: 'db_error' };
    }
    // Where buyer requests go is worth a trace: log which fields changed (values included, none are secret).
    const changed = (Object.keys(next) as (keyof SalesContactSettings)[]).filter((k) => before[k] !== next[k]);
    if (changed.length > 0) {
        await logActivity(await currentUserId(), 'UPDATE', 'SETTINGS', 'sales_contact', {
            changed,
            ...(changed.includes('leads_email') ? { leads_email: { from: before.leads_email, to: next.leads_email } } : {}),
        });
    }
    // The AMI card and the WhatsApp button are on every listing page.
    for (const locale of LOCALES) revalidatePath(`/${locale}/admin/sales`);
    revalidatePath('/[locale]/for-sale/[slug]', 'page');
    return { ok: true };
}
