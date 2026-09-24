import { getLocalizedStr } from '@/lib/data-utils';
import type { AvailabilityRequest, PartnerProperty, SuccessResponse } from './types';
import type { StayPrice } from './pricing';

/**
 * The ONLY place that decides what a partner sees about a property.
 * Every output field is built explicitly from a named input — never spread a
 * DB row into the response. Anything not listed here does not leave the server.
 */

export const SITE_ORIGIN = 'https://www.lovelymemories.pt';

/** Exact columns search.ts reads from `properties`. Never select('*'). */
export const PROPERTY_COLUMNS =
    'id, slug, title, description, city, area, max_guests, bedrooms, bathrooms, images, amenities, parent_id, is_multi_unit, property_images(url)';

const MAX_IMAGES = 10;
const MAX_AMENITIES = 30;
const DESCRIPTION_MAX = 300;

export interface PropertyRow {
    id: string;
    slug: string;
    title: unknown;
    description: unknown;
    city: unknown;
    area: unknown;
    max_guests: unknown;
    bedrooms: unknown;
    bathrooms: unknown;
    images: unknown;
    amenities: unknown;
    parent_id: string | null;
    is_multi_unit: boolean | null;
    property_images?: { url: string | null }[] | null;
}

/** Numbers may be stored as numbers, strings or localized {en,pt,he} objects. */
export function toNumber(val: unknown): number {
    if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
    if (typeof val === 'string') return parseFloat(val) || 0;
    if (typeof val === 'object' && val !== null) {
        const o = val as Record<string, unknown>;
        return toNumber(o.en ?? o.pt ?? o.he ?? Object.values(o)[0]);
    }
    return 0;
}

/** Strip HTML/markdown, collapse whitespace, cut at a word boundary with an ellipsis. */
export function plainText(input: string, max = DESCRIPTION_MAX): string {
    const text = input
        .replace(/<[^>]*>/g, ' ')
        .replace(/[*_#`>~]+/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    if (text.length <= max) return text;
    const cut = text.slice(0, max);
    const lastSpace = cut.lastIndexOf(' ');
    return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…';
}

function localizedText(val: unknown): string {
    if (typeof val === 'object' && val !== null) {
        const o = val as Record<string, unknown>;
        const v = o.en || o.pt;
        return typeof v === 'string' ? v : '';
    }
    return typeof val === 'string' ? val : '';
}

export function collectImages(row: PropertyRow): string[] {
    const fromJson = Array.isArray(row.images)
        ? row.images.map(img => (typeof img === 'string' ? img : (img as { url?: unknown })?.url))
        : [];
    const fromTable = (row.property_images ?? []).map(img => img?.url);
    const source = fromJson.length > 0 ? fromJson : fromTable;

    const out: string[] = [];
    for (const url of source) {
        if (typeof url !== 'string' || !url.startsWith('https://') || out.includes(url)) continue;
        out.push(url);
        if (out.length === MAX_IMAGES) break;
    }
    return out;
}

export function collectAmenities(raw: unknown): string[] {
    if (!Array.isArray(raw)) return [];
    const out: string[] = [];
    const seen = new Set<string>();
    for (const cat of raw) {
        const items = (cat as { items?: unknown })?.items;
        if (!Array.isArray(items)) continue;
        for (const item of items) {
            const name = getLocalizedStr(item, 'en').trim();
            const key = name.toLowerCase();
            if (!name || seen.has(key)) continue;
            seen.add(key);
            out.push(name);
            if (out.length === MAX_AMENITIES) return out;
        }
    }
    return out;
}

export function buildBookingUrl(slug: string, req: AvailabilityRequest, refSlug: string): string {
    const params = new URLSearchParams({
        from: req.checkIn,
        to: req.checkOut,
        adults: String(req.guests),
        ref: refSlug,
    });
    return `${SITE_ORIGIN}/en/properties/${encodeURIComponent(slug)}?${params.toString()}`;
}

export function serializeProperty(
    row: PropertyRow,
    price: StayPrice,
    req: AvailabilityRequest,
    refSlug: string,
): PartnerProperty {
    const images = collectImages(row);
    const area = toNumber(row.area);
    return {
        id: row.id,
        name: localizedText(row.title).trim() || row.slug,
        description: plainText(localizedText(row.description)),
        city: getLocalizedStr(row.city, 'en').trim(),
        area_m2: area > 0 ? area : null,
        max_guests: toNumber(row.max_guests),
        bedrooms: toNumber(row.bedrooms),
        bathrooms: toNumber(row.bathrooms),
        total_price: price.totalPrice,
        nightly_price_average: price.nightlyAverage,
        currency: 'EUR',
        main_image: images[0] ?? null,
        images,
        amenities: collectAmenities(row.amenities),
        booking_url: buildBookingUrl(row.slug, req, refSlug),
    };
}

export function buildSuccessResponse(req: AvailabilityRequest, properties: PartnerProperty[]): SuccessResponse {
    return {
        status: 'SUCCESS',
        search: { check_in: req.checkIn, check_out: req.checkOut, guests: req.guests, destination: req.destination },
        currency: 'EUR',
        properties,
    };
}
