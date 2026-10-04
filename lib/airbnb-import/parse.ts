// Pure parsing/validation for the Airbnb earnings CSV import (no I/O, so it can be
// exercised from a tsx script with sample files). Used by app/actions/airbnb-import.ts.

export interface ParsedStay {
    code: string;
    guest: string;
    checkIn: string;  // YYYY-MM-DD
    checkOut: string; // YYYY-MM-DD
    amount: number;
    serviceFee: number;
    cleaningFee: number;
    payoutDate: string | null;
    currency: string;
    mergedRows: number; // >1 when the CSV had the same code on several lines
}

export interface ParseResult {
    stays: ParsedStay[];
    errors: string[];
    warnings: string[];
}

export interface ExistingStay {
    code: string | null;
    checkIn: string;
    checkOut: string;
    label: string; // human description used in error messages
}

const pad = (n: number) => String(n).padStart(2, '0');

function isValidYmd(y: number, m: number, d: number): boolean {
    if (!y || m < 1 || m > 12 || d < 1) return false;
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Airbnb exports MM/DD/YYYY; also accept YYYY-MM-DD. Returns YYYY-MM-DD or null. Timezone-free. */
export function parseAirbnbDate(raw: string | undefined): string | null {
    const s = (raw || '').trim();
    let m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (m) {
        const [mo, d, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
        return isValidYmd(y, mo, d) ? `${y}-${pad(mo)}-${pad(d)}` : null;
    }
    m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) {
        const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
        return isValidYmd(y, mo, d) ? `${y}-${pad(mo)}-${pad(d)}` : null;
    }
    return null;
}

export function addDays(ymd: string, days: number): string {
    const [y, m, d] = ymd.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + days));
    return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/** "1,234.56" / "€ 120.00" / "" → number; null when the cell has something unparseable. */
function parseMoney(raw: string | undefined): number | null {
    const s = (raw || '').trim();
    if (!s) return 0;
    const n = parseFloat(s.replace(/[^\d.-]/g, ''));
    return isNaN(n) ? null : n;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Turns raw Papa.parse rows into one stay per confirmation code.
 * Rows with the same code (split payouts) are merged by summing the money columns.
 * Every bad row produces an error naming the CSV line and the code.
 */
export function parseAirbnbRows(rawRows: Record<string, string>[]): ParseResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const byCode = new Map<string, ParsedStay>();

    rawRows.forEach((row, idx) => {
        if (row.Type !== 'Reservation' || !row['Confirmation code']) return;
        const line = idx + 2; // +1 header, +1 one-based
        const code = row['Confirmation code'].trim();
        const where = `Linha ${line} (${code})`;

        const checkIn = parseAirbnbDate(row['Start date']);
        const nights = Number((row['Nights'] || '').trim());
        const amount = parseMoney(row['Amount']);
        const serviceFee = parseMoney(row['Service fee']);
        const cleaningFee = parseMoney(row['Cleaning fee']);

        // Codes go into a PostgREST filter downstream, so only plain alphanumerics are accepted.
        if (!/^[A-Za-z0-9]+$/.test(code)) { errors.push(`${where}: código de confirmação inválido`); return; }
        if (!checkIn) { errors.push(`${where}: data de início inválida "${row['Start date'] ?? ''}"`); return; }
        if (!Number.isInteger(nights) || nights <= 0) { errors.push(`${where}: número de noites inválido "${row['Nights'] ?? ''}"`); return; }
        if (amount === null || serviceFee === null || cleaningFee === null) { errors.push(`${where}: valor monetário inválido`); return; }

        const checkOut = addDays(checkIn, nights);
        const payoutDate = parseAirbnbDate(row['Date']);
        const existing = byCode.get(code);

        if (!existing) {
            byCode.set(code, {
                code, guest: row['Guest'] || '', checkIn, checkOut,
                amount, serviceFee, cleaningFee, payoutDate,
                currency: row['Currency'] || 'EUR', mergedRows: 1,
            });
            return;
        }
        existing.amount = round2(existing.amount + amount);
        existing.serviceFee = round2(existing.serviceFee + serviceFee);
        existing.cleaningFee = round2(existing.cleaningFee + cleaningFee);
        if (checkIn < existing.checkIn) existing.checkIn = checkIn;
        if (checkOut > existing.checkOut) existing.checkOut = checkOut;
        if (payoutDate && (!existing.payoutDate || payoutDate < existing.payoutDate)) existing.payoutDate = payoutDate;
        existing.mergedRows++;
    });

    const stays = [...byCode.values()];
    for (const s of stays) {
        if (s.mergedRows > 1) warnings.push(`${s.code}: ${s.mergedRows} linhas no ficheiro foram juntadas numa só reserva (valores somados).`);
    }

    const sorted = [...stays].sort((a, b) => a.checkIn.localeCompare(b.checkIn));
    for (let i = 0; i < sorted.length; i++) {
        for (let j = i + 1; j < sorted.length && sorted[j].checkIn < sorted[i].checkOut; j++) {
            warnings.push(`${sorted[i].code} (${sorted[i].checkIn}→${sorted[i].checkOut}) e ${sorted[j].code} (${sorted[j].checkIn}→${sorted[j].checkOut}) sobrepõem-se dentro do próprio ficheiro.`);
        }
    }

    return { stays, errors, warnings };
}

/**
 * Stays in the file that overlap reservations already stored for the same property
 * (other codes). Same code = re-import of the same reservation, which is fine.
 */
export function findOverlaps(stays: ParsedStay[], existing: ExistingStay[]): string[] {
    const out: string[] = [];
    for (const s of stays) {
        for (const e of existing) {
            if (e.code && e.code === s.code) continue;
            if (s.checkIn < e.checkOut && e.checkIn < s.checkOut) {
                out.push(`${s.code} (${s.checkIn}→${s.checkOut}) sobrepõe-se a ${e.label} (${e.checkIn}→${e.checkOut}).`);
            }
        }
    }
    return out;
}
