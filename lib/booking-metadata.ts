// Extra guest names in Stripe PaymentIntent metadata (audit 2026-11-13, L-4).
//
// Card/Link bookings are rebuilt from the PaymentIntent metadata (Stripe webhook and
// confirmStripePaymentIntent), so whatever is not in the metadata is lost. The other guests'
// names were missing (they are needed for the SEF/AIMA guest registration), while bank-transfer
// bookings kept them. Stripe limits each metadata value to 500 characters, so the list is
// stored as JSON under one key and trimmed from the end if it would not fit.

const STRIPE_METADATA_VALUE_MAX = 500;
const MAX_GUESTS = 20;

/** JSON list for the `eg` metadata key; '' when there are no names. */
export function packExtraGuests(names: readonly string[] | null | undefined): string {
    let clean = (names ?? []).map((n) => n.trim()).filter(Boolean).slice(0, MAX_GUESTS);
    while (clean.length && JSON.stringify(clean).length > STRIPE_METADATA_VALUE_MAX) {
        clean = clean.slice(0, -1);
    }
    return clean.length ? JSON.stringify(clean) : '';
}

/** Reads the `eg` metadata key back; anything unexpected gives an empty list. */
export function unpackExtraGuests(value: string | null | undefined): string[] {
    if (!value) return [];
    try {
        const parsed: unknown = JSON.parse(value);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter((n): n is string => typeof n === 'string')
            .map((n) => n.trim())
            .filter(Boolean)
            .slice(0, MAX_GUESTS);
    } catch {
        return [];
    }
}
