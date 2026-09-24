import type { SupabaseClient } from '@supabase/supabase-js';
import { cityMatches } from './destinations';
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
    const { data: rows, error: propsError } = await db
        .from('properties')
        .select(PROPERTY_COLUMNS)
        .eq('is_active', true)
        .neq('status', 'hidden')
        .eq('partner_api_enabled', true);
    if (propsError) throw new Error(`properties query failed: ${propsError.message}`);

    // 2. Bookable leaves only (units, or standalone houses), in the destination, with capacity.
    const candidates = ((rows ?? []) as unknown as PropertyRow[]).filter(p =>
        (p.parent_id !== null || !p.is_multi_unit)
        && cityMatches(p.city, req.cities)
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
        results.push(serializeProperty(row, price, req, refSlug));
    }

    // 6. Cheapest first, id as a stable tie-breaker.
    return results.sort((a, b) => a.total_price - b.total_price || a.id.localeCompare(b.id));
}
