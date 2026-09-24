/**
 * Price parity check: lib/partner-api/pricing.ts (computeStayPrice) must give
 * EXACTLY the same result as lib/pricing.ts (calculateReservationPrice), which
 * is what the checkout charges.
 *
 * Read-only. Run: npx tsx scripts/check-partner-api-price-parity.ts
 * Exit code 1 on any mismatch.
 *
 * Note: custom_pricing was empty in production when this was written — the
 * custom-price branch is covered by lib/partner-api/__tests__/pricing.test.ts.
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const DAY_MS = 86_400_000;
const NIGHTS = [2, 5, 7, 10, 28];
const START_OFFSETS_DAYS = [30, 75];

function isoFromUtc(ms: number) { return new Date(ms).toISOString().slice(0, 10); }
function localDate(iso: string) { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); }

async function main() {
    // Dynamic imports so dotenv runs before lib/supabase reads the env.
    const { supabase } = await import('../lib/supabase');
    const { calculateReservationPrice } = await import('../lib/pricing');
    const { computeStayPrice, PRICING_RULES_COLUMNS, CUSTOM_PRICING_COLUMNS } = await import('../lib/partner-api/pricing');
    type Rules = import('../lib/partner-api/pricing').PricingRulesRow;
    type Custom = import('../lib/partner-api/pricing').CustomPricingRow;

    const { data: rulesRows, error } = await supabase.from('pricing_rules').select(PRICING_RULES_COLUMNS);
    if (error || !rulesRows) throw new Error(`pricing_rules: ${error?.message}`);

    const { data: props } = await supabase.from('properties').select('id, max_guests');
    const maxGuests = new Map<string, number>();
    for (const p of props ?? []) maxGuests.set(p.id, Math.max(1, parseInt(String((p.max_guests as any)?.en ?? p.max_guests), 10) || 1));

    const { data: allCustom } = await supabase.from('custom_pricing').select(CUSTOM_PRICING_COLUMNS);
    const overlaps = new Set<string>();
    for (const a of (allCustom ?? []) as Custom[]) {
        for (const b of (allCustom ?? []) as Custom[]) {
            if (a !== b && a.property_id === b.property_id && a.start_date < b.end_date && b.start_date < a.end_date) {
                overlaps.add(a.property_id);
            }
        }
    }

    const today = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate());
    let checked = 0;
    const mismatches: string[] = [];

    for (const rules of rulesRows as Rules[]) {
        const guestsOptions = Array.from(new Set([1, maxGuests.get(rules.property_id) ?? 2]));
        for (const offset of START_OFFSETS_DAYS) {
            for (const nights of NIGHTS) {
                const checkIn = isoFromUtc(today + offset * DAY_MS);
                const checkOut = isoFromUtc(today + (offset + nights) * DAY_MS);
                const { data: custom } = await supabase.from('custom_pricing').select(CUSTOM_PRICING_COLUMNS)
                    .eq('property_id', rules.property_id).gte('end_date', checkIn).lte('start_date', checkOut);

                for (const guests of guestsOptions) {
                    const original = await calculateReservationPrice({
                        propertyId: rules.property_id, checkIn: localDate(checkIn), checkOut: localDate(checkOut),
                        adults: guests, children: 0,
                    });
                    const mirror = computeStayPrice({ rules, customPrices: (custom ?? []) as Custom[], checkIn, checkOut, guests });
                    checked++;

                    const label = `${rules.property_id} ${checkIn}→${checkOut} guests=${guests}`;
                    if ('error' in original || 'error' in mirror) {
                        const a = 'error' in original ? original.error : 'OK';
                        const b = 'error' in mirror ? mirror.error : 'OK';
                        if (a !== b) mismatches.push(`${label}: original=${a} mirror=${b}`);
                        continue;
                    }
                    for (const field of ['nights', 'basePrice', 'discountPercent', 'discountAmount', 'cleaningFee', 'cityTaxTotal', 'totalPrice'] as const) {
                        if (original[field] !== mirror[field]) {
                            mismatches.push(`${label}: ${field} original=${original[field]} mirror=${mirror[field]}`);
                        }
                    }
                }
            }
        }
    }

    for (const id of overlaps) console.warn(`⚠️  ${id} has overlapping custom_pricing periods — order is not guaranteed; clean them up in the admin.`);
    console.log(`Checked ${checked} scenarios across ${rulesRows.length} properties.`);
    if (mismatches.length) {
        console.error(`❌ ${mismatches.length} mismatches:`);
        for (const m of mismatches) console.error('  ' + m);
        process.exit(1);
    }
    console.log('✅ Price parity OK — 0 differences.');
}

main().catch(err => { console.error(err); process.exit(1); });
