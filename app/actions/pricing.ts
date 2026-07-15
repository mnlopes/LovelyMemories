'use server';

import { getSupabaseAdmin } from '@/lib/supabase';
import { getCurrentUserRole } from '@/app/actions/user';
import { buildSiteDailyPrices, type DayPriceInfo } from '@/lib/site-daily-prices';

// NOTE: this is a 'use server' file — it may only *export* async functions.
// DayPriceInfo/SiteDailyPricesResult stay module-internal; import DayPriceInfo
// from '@/lib/site-daily-prices' directly if a consumer needs the type.
type SiteDailyPricesResult =
    | { ok: true; prices: Record<string, DayPriceInfo> }
    | { ok: false; error: string };

/**
 * Per-night SITE price for a property over [startDate, endDate) (endDate EXCLUSIVE).
 * Readable by any authenticated admin (the site rail is the default calendar view).
 * Best-effort; never throws.
 */
export async function getSiteDailyPrices(propertyId: string, startDate: string, endDate: string): Promise<SiteDailyPricesResult> {
    try {
        const role = await getCurrentUserRole();
        if (!role) return { ok: false, error: 'Não autorizado' };

        const supabase = await getSupabaseAdmin();
        const { data: rules } = await supabase
            .from('pricing_rules')
            .select('base_price_per_night, min_nights')
            .eq('property_id', propertyId)
            .single();
        if (!rules) return { ok: true, prices: {} };

        const { data: customPrices } = await supabase
            .from('custom_pricing')
            .select('start_date, end_date, price_per_night')
            .eq('property_id', propertyId)
            .lt('start_date', endDate)
            .gt('end_date', startDate);

        const prices = buildSiteDailyPrices(
            rules.base_price_per_night ?? null,
            rules.min_nights ?? null,
            customPrices ?? [],
            startDate,
            endDate,
        );
        return { ok: true, prices };
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Site prices failed' };
    }
}
