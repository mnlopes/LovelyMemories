import { getLocalizedStr } from '@/lib/data-utils';

/**
 * Destinations the partner API understands. Adding a destination = adding a row.
 * `cities` must match `properties.city` values (compared normalized).
 * "Porto" deliberately includes Gaia — it's across the bridge, and a traveller
 * asking for Porto expects to see it.
 */
export interface Destination {
    name: string;
    cities: string[];
    aliases: string[];
}

const DESTINATIONS: Destination[] = [
    { name: 'Porto', cities: ['Porto', 'Gaia'], aliases: ['porto', 'oporto'] },
    { name: 'Gaia', cities: ['Gaia'], aliases: ['gaia', 'vila nova de gaia', 'vn gaia'] },
    { name: 'Algarve', cities: ['Algarve'], aliases: ['algarve'] },
    { name: 'Mykonos', cities: ['Mykonos'], aliases: ['mykonos', 'mikonos'] },
];

export const VALID_DESTINATION_NAMES = DESTINATIONS.map(d => d.name);

/** Lowercase, strip diacritics, collapse whitespace. */
export function normalizeText(input: string): string {
    return input
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}

export function resolveDestination(input: string): Destination | null {
    const key = normalizeText(input);
    if (!key) return null;
    return DESTINATIONS.find(d => d.aliases.includes(key)) ?? null;
}

/** `propertyCity` may be a plain string or a localized {en,pt,he} object. */
export function cityMatches(propertyCity: unknown, cities: string[]): boolean {
    const city = normalizeText(getLocalizedStr(propertyCity, 'en'));
    if (!city) return false;
    return cities.some(c => normalizeText(c) === city);
}
