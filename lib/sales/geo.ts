export type Coords = { lat: number; lng: number };

const NUM = String.raw`(-?\d{1,3}(?:\.\d+)?)`;
const PAIR = String.raw`${NUM}\s*,\s*${NUM}`;

// Order matters: the pin of a place (!3d!4d) is more exact than the map centre (@).
const PATTERNS: RegExp[] = [
    new RegExp(String.raw`!3d${NUM}!4d${NUM}`),
    new RegExp(String.raw`@${PAIR}`),
    new RegExp(String.raw`[?&](?:q|ll|query|center|destination)=${PAIR}`),
];

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

/** True for the shortened links (maps.app.goo.gl, goo.gl/maps) that carry no coordinates. */
export function isShortMapsLink(url: string): boolean {
    return /(?:^|\/\/)(?:maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(url.trim());
}

/** Coordinates of a full Google Maps URL, rounded to 6 decimals; null when none (or out of range). */
export function parseGoogleMapsCoords(url: string): Coords | null {
    let text = url.trim();
    if (!text) return null;
    try {
        text = decodeURIComponent(text);
    } catch {
        // keep the raw text
    }
    for (const re of PATTERNS) {
        const m = re.exec(text);
        if (!m) continue;
        const lat = Number(m[1]);
        const lng = Number(m[2]);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
        return { lat: round6(lat), lng: round6(lng) };
    }
    return null;
}

/**
 * Reads a coordinate typed by hand (comma or dot as decimal separator, optional leading minus).
 * Empty text is a valid "no value"; text that is not a number, or is outside +-limit, is not ok.
 */
export function parseCoordInput(text: string, limit: number): { ok: true; value: number | null } | { ok: false } {
    const raw = text.trim();
    if (raw === '') return { ok: true, value: null };
    if (!/^-?(\d+([.,]\d*)?|[.,]\d+)$/.test(raw)) return { ok: false };
    const n = Number(raw.replace(',', '.'));
    if (!Number.isFinite(n) || Math.abs(n) > limit) return { ok: false };
    return { ok: true, value: n };
}
