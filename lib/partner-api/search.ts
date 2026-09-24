import type { SupabaseClient } from '@supabase/supabase-js';
import { getLocalizedStr } from '@/lib/data-utils';
import { cityMatches, effectiveCity } from './destinations';
import {
    computeStayPrice, PRICING_RULES_COLUMNS, CUSTOM_PRICING_COLUMNS,
    type PricingRulesRow, type CustomPricingRow,
} from './pricing';
import { PROPERTY_COLUMNS, serializeProperty, toNumber, type PropertyRow } from './serialize';
import type { AvailabilityRequest, PartnerProperty } from './types';

/**
 * dates + guests + destination → available, priced, serialized properties.
 *
 * `db` MUST be an anon client: the API may only see what the public site sees.
 * Reservations are only reachable through the SECURITY DEFINER RPC, which
 * returns property ids and nothing else.
 *
 * Any query failure throws — we never return partial results or assume
 * "available" when availability could not be checked.
 */
export async function searchAvailableProperties(
    db: SupabaseClient,
    req: AvailabilityRequest,
    refSlug: string,
): Promise<PartnerProperty[]> {
    // 1. Allow-listed, active, public properties (same visibility filter as the site search).
    // Owners asked that properties with a currently-failing iCal sync be hidden from partners
    // (stale/unreliable availability); `.neq` alone would also drop NULL sync_status rows
    // (properties that were never synced), so this needs an explicit `is null OR <> 'failed'`.
    const { data: rows, error: propsError } = await db
        .from('properties')
        .select(PROPERTY_COLUMNS)
        .eq('is_active', true)
        .neq('status', 'hidden')
        .eq('partner_api_enabled', true)
        .or('sync_status.is.null,sync_status.neq.failed');
    if (propsError) throw new Error(`properties query failed: ${propsError.message}`);

    const rowsTyped = (rows ?? []) as unknown as PropertyRow[];

    // 1b. Units may leave `city` blank and inherit it from their parent building
    // (e.g. `the-meadow` has city = null, its parent has city = "Porto"). Load only
    // the parents actually needed, with the same anon client.
    const ownCity = (p: PropertyRow) => getLocalizedStr(p.city, 'en').trim();
    const parentIdsNeeded = Array.from(new Set(
        rowsTyped
            .filter(p => !ownCity(p) && p.parent_id)
            .map(p => p.parent_id as string),
    ));
    let parentCityById = new Map<string, unknown>();
    if (parentIdsNeeded.length > 0) {
        const { data: parents, error: parentsError } = await db
            .from('properties')
            .select('id, city')
            .in('id', parentIdsNeeded);
        if (parentsError) throw new Error(`parent properties query failed: ${parentsError.message}`);
        parentCityById = new Map(
            ((parents ?? []) as { id: string; city: unknown }[]).map(p => [p.id, p.city]),
        );
    }
    const effectiveCityById = new Map(
        rowsTyped.map(p => [p.id, effectiveCity(p.city, p.parent_id ? parentCityById.get(p.parent_id) : undefined)]),
    );

    // 2. Bookable leaves only (units, or standalone houses), in the destination, with capacity.
    const candidates = rowsTyped.filter(p =>
        (p.parent_id !== null || !p.is_multi_unit)
        && cityMatches(effectiveCityById.get(p.id), req.cities)
        && toNumber(p.max_guests) >= req.guests,
    );
    if (candidates.length === 0) return [];

    // 3. Availability — blocked_dates (incl. iCal imports), reservations, active locks.
    const { data: unavailable, error: rpcError } = await db.rpc('get_unavailable_property_ids', {
        p_check_in: req.checkIn,
        p_check_out: req.checkOut,
    });
    if (rpcError) throw new Error(`availability RPC failed: ${rpcError.message}`);
    const unavailableIds = new Set(((unavailable ?? []) as { property_id: string }[]).map(r => r.property_id));
    const available = candidates.filter(p => !unavailableIds.has(p.id));
    if (available.length === 0) return [];

    // 4. Prices, batch-loaded. The custom_pricing filter matches calculateReservationPrice's exactly.
    // NOTE: PostgREST caps unpaginated selects at 1000 rows by default. custom_pricing is empty
    // today, so this can't silently truncate yet — revisit (paginate or narrow the date filter
    // further) if seasonal pricing grows past that.
    const ids = available.map(p => p.id);
    const [rulesRes, customRes] = await Promise.all([
        db.from('pricing_rules').select(PRICING_RULES_COLUMNS).in('property_id', ids),
        db.from('custom_pricing').select(CUSTOM_PRICING_COLUMNS).in('property_id', ids)
            .gte('end_date', req.checkIn).lte('start_date', req.checkOut),
    ]);
    if (rulesRes.error) throw new Error(`pricing_rules query failed: ${rulesRes.error.message}`);
    if (customRes.error) throw new Error(`custom_pricing query failed: ${customRes.error.message}`);

    const rulesById = new Map((rulesRes.data as PricingRulesRow[]).map(r => [r.property_id, r]));
    const customRows = (customRes.data ?? []) as CustomPricingRow[];

    // 5. Price + serialize. No rules or below min nights → silently excluded.
    const results: PartnerProperty[] = [];
    for (const row of available) {
        const rules = rulesById.get(row.id);
        if (!rules) continue;
        const price = computeStayPrice({
            rules,
            customPrices: customRows.filter(c => c.property_id === row.id),
            checkIn: req.checkIn,
            checkOut: req.checkOut,
            guests: req.guests,
        });
        if ('error' in price) continue;
        // `city` here is the effective (own-or-parent) city; still an internal row, not a
        // response object — serializeProperty stays the sole whitelist boundary.
        results.push(serializeProperty({ ...row, city: effectiveCityById.get(row.id) ?? '' }, price, req, refSlug));
    }

    // 6. Cheapest first, id as a stable tie-breaker.
    return results.sort((a, b) => a.total_price - b.total_price || a.id.localeCompare(b.id));
}
