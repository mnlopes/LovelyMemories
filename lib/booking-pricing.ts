/**
 * Client-side booking total calculation.
 *
 * This mirrors the inline breakdown used by components/property-details/BookingCard.tsx
 * so the mobile sticky footer bar can display the exact same total without
 * duplicating the formula in multiple places. Keep this in sync with BookingCard
 * if the breakdown logic ever changes.
 */

export interface ClientPricingRules {
    min_nights: number;
    cleaning_fee: number;
    weekly_discount_percent: number;
    monthly_discount_percent: number;
    city_tax_per_night: number;
}

export interface ClientSelectedExtras {
    breakfast: boolean;
    breakfastDays: number;
    transfer: boolean;
    transferType?: 'one_way' | 'round_trip';
}

export interface ClientExtraPrices {
    breakfast?: number;
    transfer?: number;
}

export interface CalculateClientTotalParams {
    price: number;
    nights: number;
    adults: number;
    children: number;
    infants: number;
    pricingRules?: Partial<ClientPricingRules>;
    selectedExtras?: ClientSelectedExtras;
    extraPrices?: ClientExtraPrices;
}

const DEFAULT_PRICING_RULES: ClientPricingRules = {
    min_nights: 2,
    cleaning_fee: 85,
    weekly_discount_percent: 5,
    monthly_discount_percent: 15,
    city_tax_per_night: 2,
};

export function calculateClientTotal({
    price,
    nights,
    adults,
    children,
    infants,
    pricingRules,
    selectedExtras,
    extraPrices,
}: CalculateClientTotalParams) {
    const rules = { ...DEFAULT_PRICING_RULES, ...(pricingRules || {}) };

    const nightsStay = nights > 0 ? nights : 0;
    const guestCount = adults + children + infants;
    const baseSubtotal = price * nightsStay;

    // Long-stay discount
    let activeDiscountPercent = 0;
    if (nightsStay >= 28) {
        activeDiscountPercent = rules.monthly_discount_percent;
    } else if (nightsStay >= 7) {
        activeDiscountPercent = rules.weekly_discount_percent;
    }
    const discountAmount = activeDiscountPercent > 0
        ? Math.round(baseSubtotal * (activeDiscountPercent / 100))
        : 0;

    // City / tourist tax (adults + children, capped at 7 nights)
    const cityTaxPerNight = rules.city_tax_per_night ?? 2.0;
    const taxableGuests = adults + children;
    const taxableNights = Math.min(nightsStay, 7);
    const cityTaxTotal = cityTaxPerNight * taxableGuests * taxableNights;

    // Extras
    const breakfastPrice = extraPrices?.breakfast || 15;
    const transferPrice = extraPrices?.transfer || 55;
    const breakfastDays = selectedExtras?.breakfastDays || 1;
    const breakfastTotal = selectedExtras?.breakfast ? breakfastPrice * guestCount * breakfastDays : 0;
    const transferMultiplier = selectedExtras?.transferType === 'round_trip' ? 2 : 1;
    const transferTotal = selectedExtras?.transfer ? transferPrice * transferMultiplier : 0;

    const cleaningFee = rules.cleaning_fee;
    const total = baseSubtotal - discountAmount + cleaningFee + cityTaxTotal + breakfastTotal + transferTotal;

    return {
        nights: nightsStay,
        baseSubtotal,
        discountAmount,
        cityTaxTotal,
        cleaningFee,
        breakfastTotal,
        transferTotal,
        total,
    };
}
