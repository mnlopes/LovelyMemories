import 'server-only';
import { unstable_cache } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabase';
import { ENERGY_CERT_DOC_ID, PUBLIC_SALE_COLUMNS, type SaleDocument, type SaleListing, type SalePublicDocument } from './types';
import { isOwnDocPath } from './storage';
import { approxCoord } from './format';
import { OWNER_REPORT_STATUSES } from '@/lib/owner-revenue';
import { computePerformance, type PerfReservation, type PerformanceSnapshot } from './performance';

function roundCoords(l: SaleListing): SaleListing {
    return { ...l, lat: approxCoord(l.lat), lng: approxCoord(l.lng) };
}

/** Today in Europe/Lisbon as YYYY-MM-DD. */
function lisbonToday(): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon' }).format(new Date());
}

function shiftDays(iso: string, days: number): string {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export async function getPublishedSaleListings(): Promise<SaleListing[]> {
    const supabase = await getSupabaseAdmin();
    const { data, error } = await supabase
        .from('sale_listings')
        .select(PUBLIC_SALE_COLUMNS)
        .eq('published', true)
        .order('published_at', { ascending: false });
    if (error) {
        console.error('getPublishedSaleListings failed:', error.code);
        return [];
    }
    return ((data ?? []) as unknown as SaleListing[]).map(roundCoords);
}

// Private columns read only to work out which documents the page may link to; stripped before returning.
type DocColumns = { documents: SaleDocument[] | null; energy_cert_public: boolean | null; energy_cert_path: string | null };

const asDocList = (v: unknown): SaleDocument[] => (Array.isArray(v) ? (v as SaleDocument[]) : []);

/** The page's view of a listing's documents: names of the public ones, never their paths. */
function withPublicDocuments(row: SaleListing & DocColumns): SaleListing {
    const { documents, energy_cert_public, energy_cert_path, ...listing } = row;
    const public_documents: SalePublicDocument[] = asDocList(documents)
        .filter((d) => d.public && isOwnDocPath(d.path, listing.id))
        .map((d) => ({ id: d.id, name: d.name ?? {} }));
    return { ...listing, public_documents, energy_cert_downloadable: !!(energy_cert_public && energy_cert_path) };
}

export async function getSaleListingBySlug(
    slug: string,
    opts: { includeDrafts?: boolean } = {},
): Promise<SaleListing | null> {
    const supabase = await getSupabaseAdmin();
    let q = supabase
        .from('sale_listings')
        .select(`${PUBLIC_SALE_COLUMNS},documents,energy_cert_public,energy_cert_path`)
        .eq('slug', slug);
    if (!opts.includeDrafts) q = q.eq('published', true);
    const { data, error } = await q.maybeSingle();
    if (error) {
        console.error('getSaleListingBySlug failed:', error.code);
        return null;
    }
    return data ? roundCoords(withPublicDocuments(data as unknown as SaleListing & DocColumns)) : null;
}

/**
 * Storage path (private bucket) of a document a visitor may download: the listing must be published
 * (or `includeDrafts`, for the team's preview) and the document marked public. Null otherwise.
 */
export async function getPublicSaleDocumentPath(
    listingId: string,
    docId: string,
    opts: { includeDrafts?: boolean } = {},
): Promise<{ path: string; name: string } | null> {
    const supabase = await getSupabaseAdmin();
    const { data, error } = await supabase
        .from('sale_listings')
        .select('id, slug, published, documents, energy_cert_public, energy_cert_path')
        .eq('id', listingId)
        .maybeSingle();
    if (error || !data) return null;
    const row = data as { id: string; slug: string; published: boolean } & DocColumns;
    if (!row.published && !opts.includeDrafts) return null;
    if (docId === ENERGY_CERT_DOC_ID) {
        if (!row.energy_cert_public || !row.energy_cert_path || !isOwnDocPath(row.energy_cert_path, row.id)) return null;
        return { path: row.energy_cert_path, name: `${row.slug}-energy-certificate` };
    }
    const doc = asDocList(row.documents).find((d) => d.id === docId);
    if (!doc || !doc.public || !isOwnDocPath(doc.path, row.id)) return null;
    return { path: doc.path, name: `${row.slug}-${docId.slice(0, 8)}` };
}

/**
 * Uncached loader, shared by the cached public read and the backoffice preview.
 *
 * The window bounds come from the home's whole history (first counted check-in, last imported
 * Airbnb check-out), looked up separately; only the stays that touch the window are then loaded.
 */
export async function loadSalePerformance(
    propertyId: string,
    price: number | null,
    priceOnRequest: boolean,
): Promise<PerformanceSnapshot | null> {
    const today = lisbonToday();
    const statuses = [...OWNER_REPORT_STATUSES];
    const supabase = await getSupabaseAdmin();

    const [first, lastImported] = await Promise.all([
        supabase
            .from('reservations')
            .select('check_in')
            .eq('property_id', propertyId)
            .in('status', statuses)
            .order('check_in', { ascending: true })
            .limit(1),
        supabase
            .from('reservations')
            .select('check_out')
            .eq('property_id', propertyId)
            .in('status', statuses)
            .eq('platform', 'airbnb')
            .not('import_batch_id', 'is', null)
            .order('check_out', { ascending: false })
            .limit(1),
    ]);
    if (first.error) throw new Error('perf_load_failed:' + first.error.code);
    if (lastImported.error) throw new Error('perf_load_failed:' + lastImported.error.code);

    const firstCheckIn = (first.data?.[0]?.check_in as string | undefined)?.slice(0, 10) ?? null;
    if (!firstCheckIn) return null;
    const lastImportedCheckOut = (lastImported.data?.[0]?.check_out as string | undefined)?.slice(0, 10) ?? null;

    // Same rule as computePerformance: the data date is the oldest of today and the last import.
    const windowEnd = lastImportedCheckOut && lastImportedCheckOut < today ? lastImportedCheckOut : today;
    const { data, error } = await supabase
        .from('reservations')
        .select(
            'check_in,check_out,status,platform,import_batch_id,net_amount,total_price,city_tax_total,breakfast_total,transfer_total',
        )
        .eq('property_id', propertyId)
        .in('status', statuses)
        .gt('check_out', shiftDays(windowEnd, -365))
        .lt('check_in', windowEnd);
    if (error) {
        throw new Error('perf_load_failed:' + error.code);
    }
    return computePerformance((data ?? []) as PerfReservation[], {
        today,
        price,
        priceOnRequest,
        firstCheckIn,
        lastImportedCheckOut,
    });
}

export async function getSalePerformance(l: SaleListing): Promise<PerformanceSnapshot | null> {
    if (!l.property_id || !l.show_performance) return null;
    const propertyId = l.property_id;
    const cached = unstable_cache(
        () => loadSalePerformance(propertyId, l.price, l.price_on_request),
        ['sale-perf', propertyId, String(l.price), String(l.price_on_request)],
        { revalidate: 86400, tags: ['sale-perf-' + propertyId] },
    );
    try {
        return await cached();
    } catch (e) {
        console.error('getSalePerformance failed:', (e as Error).message);
        return null;
    }
}

const DEFAULT_LEADS_EMAIL = 'info@lovelymemories.pt';

/**
 * Where buyer requests from the sale pages are sent: `sales_contact.leads_email` in Settings → Sales,
 * or info@lovelymemories.pt when it is empty or not a plain email address.
 */
export async function getSalesLeadsEmail(): Promise<string> {
    const supabase = await getSupabaseAdmin();
    const { data, error } = await supabase.from('system_settings').select('value').eq('key', 'sales_contact').maybeSingle();
    if (error || !data) return DEFAULT_LEADS_EMAIL;
    const raw = (data.value as { leads_email?: unknown } | null)?.leads_email;
    const email = typeof raw === 'string' ? raw.trim() : '';
    return /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(email) && email.length <= 120 ? email : DEFAULT_LEADS_EMAIL;
}

export async function getSalesContact(): Promise<{ amiLicense: string | null; whatsapp: string | null }> {
    const supabase = await getSupabaseAdmin();
    const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'sales_contact')
        .maybeSingle();
    if (error || !data) return { amiLicense: null, whatsapp: null };
    const v = (data.value ?? {}) as { ami_license?: unknown; whatsapp?: unknown };
    const clean = (x: unknown) => (typeof x === 'string' && x.trim() ? x.trim() : null);
    return { amiLicense: clean(v.ami_license), whatsapp: clean(v.whatsapp) };
}
