import { addDays, format } from "date-fns";

export type DayPriceInfo = { price: number | null; minStay: number | null };

/**
 * Per-night SITE price map for [startDate, endDate) (endDate EXCLUSIVE).
 * price = the custom_pricing override whose [start_date, end_date) contains the day,
 * else basePrice. minStay = minNights (constant per property). Pure; no I/O.
 * Override match mirrors lib/pricing.ts: dateStr >= start_date && dateStr < end_date.
 */
export function buildSiteDailyPrices(
    basePrice: number | null,
    minNights: number | null,
    customPrices: { start_date: string; end_date: string; price_per_night: number }[],
    startDate: string,
    endDate: string,
): Record<string, DayPriceInfo> {
    const prices: Record<string, DayPriceInfo> = {};
    let d = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    while (d < end) {
        const ds = format(d, "yyyy-MM-dd");
        const custom = customPrices.find((cp) => ds >= cp.start_date && ds < cp.end_date);
        const price = custom ? Number(custom.price_per_night) : (basePrice != null ? Number(basePrice) : null);
        prices[ds] = { price, minStay: minNights };
        d = addDays(d, 1);
    }
    return prices;
}
