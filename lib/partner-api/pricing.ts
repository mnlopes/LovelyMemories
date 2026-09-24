/**
 * Pure mirror of calculateReservationPrice() in lib/pricing.ts.
 *
 * That function is the price the checkout actually charges (via
 * app/actions/stripe.ts). It is deliberately NOT refactored — the checkout is
 * not to be touched — so this file copies its formula step by step. Parity is
 * enforced by scripts/check-partner-api-price-parity.ts; run it whenever either
 * file changes.
 *
 * Differences allowed (and only these):
 * - rules/custom prices are passed in (batch-loaded) instead of queried here;
 * - dates are YYYY-MM-DD strings iterated in UTC instead of local Date objects
 *   (same calendar days);
 * - guests are all treated as adults (children = 0), per the API contract;
 * - it also returns nightlyAverage for the API response.
 */

export interface PricingRulesRow {
    property_id: string;
    base_price_per_night: number | string;
    cleaning_fee: number | string;
    min_nights: number;
    weekly_discount_percent: number | string | null;
    monthly_discount_percent: number | string | null;
    city_tax_per_night: number | string | null;
}

export interface CustomPricingRow {
    property_id: string;
    start_date: string;
    end_date: string;
    price_per_night: number | string;
}

export const PRICING_RULES_COLUMNS =
    'property_id, base_price_per_night, cleaning_fee, min_nights, weekly_discount_percent, monthly_discount_percent, city_tax_per_night';
export const CUSTOM_PRICING_COLUMNS = 'property_id, start_date, end_date, price_per_night';

export interface StayPrice {
    nights: number;
    basePrice: number;
    discountPercent: number;
    discountAmount: number;
    cleaningFee: number;
    cityTaxTotal: number;
    totalPrice: number;
    /** (base − discount) / nights, rounded to cents. Excludes cleaning and tax. */
    nightlyAverage: number;
}

export type StayPriceError = { error: 'errorCheckoutAfterCheckin' | 'errorMinNights' };

const DAY_MS = 86_400_000;
const round2 = (n: number) => Math.round(n * 100) / 100;

function utcMs(date: string): number {
    const [y, m, d] = date.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
}

function isoDate(ms: number): string {
    return new Date(ms).toISOString().slice(0, 10);
}

export function computeStayPrice(input: {
    rules: PricingRulesRow;
    customPrices: CustomPricingRow[];
    checkIn: string;
    checkOut: string;
    guests: number;
}): StayPrice | StayPriceError {
    const { rules, customPrices, checkIn, checkOut, guests } = input;

    // 1. Nights
    const nights = Math.round((utcMs(checkOut) - utcMs(checkIn)) / DAY_MS);
    if (nights <= 0) return { error: 'errorCheckoutAfterCheckin' };

    // 2. Min nights
    if (nights < rules.min_nights) return { error: 'errorMinNights' };

    // 4. Nightly prices with custom overrides (first match wins, like the original find())
    let totalBasePrice = 0;
    const start = utcMs(checkIn);
    for (let i = 0; i < nights; i++) {
        const dateStr = isoDate(start + i * DAY_MS);
        const custom = customPrices.find(cp => dateStr >= cp.start_date && dateStr < cp.end_date);
        totalBasePrice += custom ? Number(custom.price_per_night) : Number(rules.base_price_per_night);
    }

    // 5. Standard discounts
    let discountPercent = 0;
    if (nights >= 28) {
        discountPercent = Number(rules.monthly_discount_percent);
    } else if (nights >= 7) {
        discountPercent = Number(rules.weekly_discount_percent);
    }
    const discountAmount = totalBasePrice * (discountPercent / 100);
    const priceAfterDiscount = totalBasePrice - discountAmount;

    // 6. City tax: all guests are adults, max 7 nights
    const cityTaxPerNight = Number(rules.city_tax_per_night ?? 2.00);
    const cityTaxTotal = cityTaxPerNight * guests * Math.min(nights, 7);

    // 7. Total
    const cleaningFee = Number(rules.cleaning_fee);
    const totalPrice = priceAfterDiscount + cleaningFee + cityTaxTotal;

    return {
        nights,
        basePrice: totalBasePrice,
        discountPercent,
        discountAmount,
        cleaningFee,
        cityTaxTotal,
        totalPrice: round2(totalPrice),
        nightlyAverage: round2(priceAfterDiscount / nights),
    };
}
