// What an owner actually earns from a stay (audit 2026-11-13, L-6; definition chosen on 15/11).
//
// The owner portal used to show total_price, the amount the guest paid. For Airbnb imports that
// includes Airbnb's own fee (about 18%, money the owner never sees), and for site bookings it
// includes the tourist tax (passed on to the municipality) and the extras (breakfast/transfer).
//
//   - Airbnb imports: net_amount, the payout after Airbnb's fee.
//   - Site bookings (net_amount is 0): total_price minus tourist tax and extras.

export type RevenueFields = {
    total_price?: number | string | null;
    net_amount?: number | string | null;
    city_tax_total?: number | string | null;
    breakfast_total?: number | string | null;
    transfer_total?: number | string | null;
};

export function ownerRevenue(r: RevenueFields): number {
    const net = Number(r.net_amount) || 0;
    if (net > 0) return net;
    const gross = Number(r.total_price) || 0;
    const passedOn = (Number(r.city_tax_total) || 0) + (Number(r.breakfast_total) || 0) + (Number(r.transfer_total) || 0);
    return Math.max(0, gross - passedOn);
}

/** Statuses of stays that happened or will happen (no cancelled, no unresolved conflicts). */
export const OWNER_REPORT_STATUSES = ['confirmed', 'completed', 'checked-in', 'checked-out'] as const;
