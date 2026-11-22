// Investment snapshot of a sale listing linked to a managed rental home
// (spec "Rendimento (resumo do investimento)"). Pure: no I/O, no time zones.
//
// Revenue and occupancy come from the same source: reservations with a value (site bookings and
// Airbnb stays imported from the earnings CSV). iCal blocks never count.

import { ownerRevenue, OWNER_REPORT_STATUSES } from '../owner-revenue';

export type PerfReservation = {
    check_in: string;
    check_out: string; // exclusive
    status: string;
    platform: string | null;
    import_batch_id: string | null;
    net_amount: number | null;
    total_price: number | null;
    city_tax_total: number | null;
    breakfast_total: number | null;
    transfer_total: number | null;
};

export type PerformanceSnapshot = {
    windowStart: string;
    windowEnd: string; // exclusive
    days: number;
    revenue: number;
    occupancy: number; // 0..1
    grossYield: number | null;
    fullYear: boolean;
    eligible: boolean; // days >= 90
    staleDays: number;
};

const YEAR_DAYS = 365;
const MIN_ELIGIBLE_DAYS = 90;

/** Day number of a YYYY-MM-DD string (calendar days since the epoch, no time zone involved). */
function dayNumber(iso: string): number {
    const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
    return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}

function dayToIso(n: number): string {
    return new Date(n * 86400000).toISOString().slice(0, 10);
}

export type PerformanceOptions = {
    today: string;
    price: number | null;
    priceOnRequest: boolean;
    /**
     * The home's first counted check-in (YYYY-MM-DD), looked up over its whole history. When the
     * caller only loads the rows of the last year, this keeps the window from starting at the
     * first loaded row. Omitted: derived from `rows`.
     */
    firstCheckIn?: string | null;
    /**
     * The last check-out of the home's imported Airbnb stays (YYYY-MM-DD), looked up over its
     * whole history; null = the home has no imported stays. Omitted: derived from `rows`.
     */
    lastImportedCheckOut?: string | null;
};

export function computePerformance(rows: PerfReservation[], opts: PerformanceOptions): PerformanceSnapshot | null {
    const counted = rows.filter((r) => (OWNER_REPORT_STATUSES as readonly string[]).includes(r.status));
    if (counted.length === 0) return null;

    const today = dayNumber(opts.today);

    // Data date: the oldest of today and the last imported Airbnb check-out. The value looked up by
    // the caller wins; the rows can only push it later (they are a subset of the same history).
    let lastImported: number | null = opts.lastImportedCheckOut ? dayNumber(opts.lastImportedCheckOut) : null;
    for (const r of counted) {
        if (r.platform === 'airbnb' && r.import_batch_id) {
            const out = dayNumber(r.check_out);
            if (lastImported === null || out > lastImported) lastImported = out;
        }
    }
    const windowEnd = lastImported !== null ? Math.min(today, lastImported) : today;

    // First stay: the caller's whole-history value, or the earliest loaded row if that is older.
    let earliest = opts.firstCheckIn ? dayNumber(opts.firstCheckIn) : Infinity;
    for (const r of counted) earliest = Math.min(earliest, dayNumber(r.check_in));

    const windowStart = Math.max(windowEnd - YEAR_DAYS, earliest);
    const days = windowEnd - windowStart;
    if (days <= 0) return null;

    let revenue = 0;
    const nights = new Set<number>();
    for (const r of counted) {
        const cin = dayNumber(r.check_in);
        const cout = dayNumber(r.check_out);
        if (cin >= windowStart && cin < windowEnd) revenue += ownerRevenue(r);
        const from = Math.max(cin, windowStart);
        const to = Math.min(cout, windowEnd);
        for (let n = from; n < to; n++) nights.add(n);
    }

    const fullYear = days >= YEAR_DAYS;
    const price = opts.price;
    const grossYield = fullYear && price != null && price > 0 && !opts.priceOnRequest ? revenue / price : null;

    return {
        windowStart: dayToIso(windowStart),
        windowEnd: dayToIso(windowEnd),
        days,
        revenue,
        occupancy: nights.size / days,
        grossYield,
        fullYear,
        eligible: days >= MIN_ELIGIBLE_DAYS,
        staleDays: today - windowEnd,
    };
}
