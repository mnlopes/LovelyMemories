import { resolveDestination, VALID_DESTINATION_NAMES } from './destinations';
import type { AvailabilityRequest, PartnerApiErrorCode } from './types';

export const MAX_NIGHTS = 30;
export const MAX_MONTHS_AHEAD = 18;
export const MAX_GUESTS = 16;

const DAY_MS = 86_400_000;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export type ValidationResult =
    | { ok: true; value: AvailabilityRequest }
    | { ok: false; code: PartnerApiErrorCode; message: string };

/** Today's date (YYYY-MM-DD) in Europe/Lisbon — mirrors the checkout's midnight rule. */
export function lisbonToday(now: Date = new Date()): string {
    // en-CA formats as YYYY-MM-DD
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(now);
}

/** UTC midnight epoch ms for a YYYY-MM-DD string, or null if not a real calendar date. */
function parseDate(value: string): number | null {
    const m = DATE_RE.exec(value);
    if (!m) return null;
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const ms = Date.UTC(y, mo - 1, d);
    const back = new Date(ms);
    if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) return null;
    return ms;
}

function addMonthsUtc(ms: number, months: number): number {
    const d = new Date(ms);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, d.getUTCDate());
}

const fail = (code: PartnerApiErrorCode, message: string): ValidationResult => ({ ok: false, code, message });

/**
 * Validates the raw JSON body. Checks run in the spec's order (5.2) and the
 * first failure is returned. Unknown fields are ignored.
 */
export function validateAvailabilityRequest(body: unknown, today: string): ValidationResult {
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
        return fail('INVALID_BODY', 'Request body must be a JSON object');
    }
    const b = body as Record<string, unknown>;
    if (typeof b.check_in !== 'string' || typeof b.check_out !== 'string'
        || typeof b.guests !== 'number' || typeof b.destination !== 'string' || !b.destination.trim()) {
        return fail('INVALID_BODY', 'Required fields: check_in (string), check_out (string), guests (number), destination (string)');
    }

    const checkInMs = parseDate(b.check_in);
    const checkOutMs = parseDate(b.check_out);
    if (checkInMs === null || checkOutMs === null) {
        return fail('INVALID_DATES', 'Dates must be valid calendar dates in YYYY-MM-DD format');
    }
    if (checkOutMs <= checkInMs) {
        return fail('INVALID_DATES', 'check_out must be after check_in');
    }

    const todayMs = parseDate(today)!;
    if (checkInMs <= todayMs) {
        return fail('CHECK_IN_TOO_SOON', 'check_in must be tomorrow or later');
    }
    if (checkInMs > addMonthsUtc(todayMs, MAX_MONTHS_AHEAD)) {
        return fail('DATES_TOO_FAR', `check_in must be within ${MAX_MONTHS_AHEAD} months from today`);
    }

    const nights = Math.round((checkOutMs - checkInMs) / DAY_MS);
    if (nights > MAX_NIGHTS) {
        return fail('STAY_TOO_LONG', `Maximum stay is ${MAX_NIGHTS} nights`);
    }

    if (!Number.isInteger(b.guests) || b.guests < 1 || b.guests > MAX_GUESTS) {
        return fail('INVALID_GUESTS', `guests must be an integer between 1 and ${MAX_GUESTS}`);
    }

    const destination = resolveDestination(b.destination);
    if (!destination) {
        return fail('UNKNOWN_DESTINATION', `Unknown destination. Valid destinations: ${VALID_DESTINATION_NAMES.join(', ')}`);
    }

    return {
        ok: true,
        value: {
            checkIn: b.check_in,
            checkOut: b.check_out,
            guests: b.guests,
            destination: destination.name,
            cities: destination.cities,
            nights,
        },
    };
}
