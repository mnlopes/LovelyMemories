/**
 * Search-friendly wording for property and building pages: page titles, meta
 * descriptions and photo alt texts, built from each listing's own data.
 *
 * Why generated instead of the backoffice subtitle: subtitles were written as
 * Airbnb listing names ("Luxe, Central 1 BDR"). They rarely name the city and use
 * abbreviations nobody types into Google. The helpers here always say what the
 * place is and where ("1-Bedroom Apartment in Porto" / "Apartamento T1 no Porto").
 *
 * Pure functions, no I/O: used by server metadata and by client components (alts).
 * The wording lives here rather than in messages/*.json because it is grammar per
 * city and per kind (T1, "no Porto" / "em Gaia"), not interface copy.
 */
import { getLocalizedStr } from '@/lib/data-utils';

type Locale = 'en' | 'pt';
type Kind = 'apartment' | 'studio' | 'duplex' | 'loft' | 'penthouse' | 'house' | 'home' | 'hut';

/** The fields of a transformed property (lib/services.ts) these helpers read. */
export type SeoProperty = {
    title?: unknown;
    subtitle?: unknown;
    bedrooms?: unknown;
    guests?: unknown;
    location?: { city?: string; address?: string } | null;
    is_multi_unit?: unknown;
    parent_id?: unknown;
};

const asLocale = (locale: string): Locale => (locale === 'pt' ? 'pt' : 'en');


/** Removes a leading or trailing "Lovely Memories |" that some names carry. */
export function stripBrand(text: string): string {
    return text
        .replace(/^\s*lovely memories\s*[|—–-]\s*/i, '')
        .replace(/\s*[|—–-]\s*lovely memories\s*$/i, '')
        .trim();
}

export function propertyName(p: SeoProperty, locale: string): string {
    return stripBrand(getLocalizedStr(p.title, asLocale(locale)));
}

// Order matters: "Two bedroom Duplex home" is a duplex, "One Bedroom Home + Garden Hut" a home.
const KIND_PATTERNS: [Kind, RegExp][] = [
    ['penthouse', /penthouse/i],
    ['duplex', /duplex/i],
    ['loft', /\bloft\b/i],
    ['studio', /\bstudio\b/i],
    ['house', /\bhouse\b/i],
    ['home', /\bhome\b/i],
    ['hut', /\bhut\b/i],
];

function detectKind(p: SeoProperty): Kind {
    // English text is the most complete and consistent across listings.
    const subtitle = getLocalizedStr(p.subtitle, 'en');
    const name = getLocalizedStr(p.title, 'en');
    for (const text of [subtitle, name]) {
        for (const [kind, re] of KIND_PATTERNS) if (re.test(text)) return kind;
    }
    return 'apartment';
}

const NUMBER_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5 };

/**
 * Bedroom count. The subtitle wins over the bedrooms column: a few listings say
 * "Two bedroom" / "2-bedroom" there while the column still holds 1.
 */
function bedroomCount(p: SeoProperty): number {
    const m = getLocalizedStr(p.subtitle, 'en').match(/\b(\d+|one|two|three|four|five)[\s-]*(?:bdr|bed(?:room)?s?)\b/i);
    if (m) {
        const n = NUMBER_WORDS[m[1].toLowerCase()] ?? parseInt(m[1], 10);
        if (n > 0) return n;
    }
    const n = Number(p.bedrooms);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

const PLACES: Record<string, { en: string; pt: string }> = {
    porto: { en: 'Porto', pt: 'no Porto' },
    gaia: { en: 'Vila Nova de Gaia', pt: 'em Vila Nova de Gaia' },
    'vila nova de gaia': { en: 'Vila Nova de Gaia', pt: 'em Vila Nova de Gaia' },
    algarve: { en: 'the Algarve', pt: 'no Algarve' },
    mykonos: { en: 'Mykonos', pt: 'em Mykonos' },
};

/** "in Porto" / "no Porto"; empty when the listing has no city. */
export function placePhrase(city: string | undefined, locale: Locale): string {
    const c = (city || '').trim();
    if (!c) return '';
    const known = PLACES[c.toLowerCase()];
    if (locale === 'pt') return known ? known.pt : `em ${c}`;
    return `in ${known ? known.en : c}`;
}

/** "1-Bedroom Apartment" / "Apartamento T1" (title case in English). */
function kindLabel(kind: Kind, bedrooms: number, locale: Locale): string {
    if (locale === 'pt') {
        const t = bedrooms > 0 ? ` T${bedrooms}` : '';
        switch (kind) {
            case 'studio': return 'Estúdio';
            case 'hut': return 'Cabana de jardim';
            case 'duplex': return `Duplex${t}`;
            case 'loft': return `Loft${t}`;
            case 'penthouse': return `Penthouse${t}`;
            case 'house': return `Moradia${t}`;
            case 'home': return `Casa${t}`;
            default: return `Apartamento${t}`;
        }
    }
    const b = bedrooms > 0 ? `${bedrooms}-Bedroom ` : '';
    switch (kind) {
        case 'studio': return 'Studio';
        case 'hut': return 'Garden Hut';
        case 'duplex': return `${b}Duplex`;
        case 'loft': return `${b}Loft`;
        case 'penthouse': return `${b}Penthouse`;
        case 'house': return `${b}House`;
        case 'home': return `${b}Home`;
        default: return `${b}Apartment`;
    }
}

/**
 * What and where, in search words: "1-Bedroom Apartment in Porto" /
 * "Apartamento T1 no Porto". Pass `lower` for mid-sentence use.
 */
export function propertyHeadline(p: SeoProperty, locale: string, lower = false): string {
    const l = asLocale(locale);
    let label = kindLabel(detectKind(p), bedroomCount(p), l);
    if (lower) label = l === 'en' ? label.toLowerCase() : label.charAt(0).toLowerCase() + label.slice(1);
    const place = placePhrase(p.location?.city, l);
    return place ? `${label} ${place}` : label;
}

/** Page title without the brand: "The Charming — 1-Bedroom Apartment in Porto". */
export function propertySeoTitle(p: SeoProperty, locale: string): string {
    const name = propertyName(p, locale);
    const headline = propertyHeadline(p, locale);
    return name ? `${name} — ${headline}` : headline;
}

const guestsPhrase = (n: number, l: Locale) =>
    l === 'pt' ? `para até ${n} ${n === 1 ? 'hóspede' : 'hóspedes'}` : `for up to ${n} ${n === 1 ? 'guest' : 'guests'}`;

// English subtitles still carry listing shorthand.
const expandShorthand = (s: string) =>
    s.replace(/\bBDR\b/gi, 'bedroom').replace(/\bLuxe\b/g, 'Luxury').replace(/\bluxe\b/g, 'luxury');

const sentence = (s: string) => {
    const t = s.trim().replace(/[\s.,;:–—-]+$/, '');
    return t ? `${t.charAt(0).toUpperCase()}${t.slice(1)}.` : '';
};

/**
 * Meta description body, without the closing call to action (the page appends the
 * translated "Book directly with Lovely Memories."):
 * "One Bedroom with Balcony overlooking Porto. 1-bedroom apartment in Porto for up to 2 guests."
 */
export function propertySeoDescription(p: SeoProperty, locale: string): string {
    const l = asLocale(locale);
    const subtitle = stripBrand(getLocalizedStr(p.subtitle, l));
    const lead = sentence(l === 'en' ? expandShorthand(subtitle) : subtitle);
    const guests = Number(p.guests);
    const fact = sentence(
        `${propertyHeadline(p, l, true)}${Number.isFinite(guests) && guests > 0 ? ` ${guestsPhrase(guests, l)}` : ''}`
    );
    return [lead, fact].filter(Boolean).join(' ');
}

/** Photo alt text: "The Charming — 1-bedroom apartment in Porto". */
export function propertyImageAlt(p: SeoProperty, locale: string): string {
    const name = propertyName(p, locale);
    const headline = propertyHeadline(p, locale, true);
    return name ? `${name} — ${headline}` : headline;
}

/** "Rua do Belomonte, 86 - 88" -> "Rua do Belomonte". */
function streetName(address: string | undefined): string {
    const first = (address || '').split(',')[0] || '';
    return first.replace(/\s+\d[\d\s\-–/]*$/, '').trim();
}

function onStreet(street: string, l: Locale): string {
    if (!street) return '';
    if (l === 'en') return ` on ${street}`;
    if (/^(rua|praça|avenida|av\.|travessa|calçada|estrada|alameda)\b/i.test(street)) return ` na ${street}`;
    if (/^(largo|passeio|beco|bairro|terreiro)\b/i.test(street)) return ` no ${street}`;
    return ` em ${street}`;
}

/** Buildings (multi-unit parents): title, description body and photo alt. */
export function buildingSeo(building: SeoProperty, units: SeoProperty[], locale: string) {
    const l = asLocale(locale);
    const name = propertyName(building, l);
    const n = units.length;
    const place = placePhrase(building.location?.city, l);
    const where = place ? ` ${place}` : '';

    // "3 luxury apartments" / "3 apartamentos de luxo"
    const count = l === 'pt'
        ? (n > 0 ? `${n} ${n === 1 ? 'apartamento' : 'apartamentos'} de luxo` : 'apartamentos de luxo')
        : (n > 0 ? `${n} luxury ${n === 1 ? 'apartment' : 'apartments'}` : 'luxury apartments');
    const titleCount = l === 'en'
        ? count.replace(/\b[a-z]/g, (c) => c.toUpperCase())
        : count.charAt(0).toUpperCase() + count.slice(1);

    const guests = units.map((u) => Number(u.guests)).filter((g) => Number.isFinite(g) && g > 0);
    const min = guests.length ? Math.min(...guests) : 0;
    const max = guests.length ? Math.max(...guests) : 0;
    const sleeps = !max ? '' : l === 'pt'
        ? (min === max ? `, para ${max} hóspedes` : `, para ${min} a ${max} hóspedes`)
        : (min === max ? `, each sleeping ${max} guests` : `, sleeping ${min} to ${max} guests`);
    const street = onStreet(streetName(building.location?.address), l);

    // en: "3 luxury apartments on Rua do Belomonte in Porto, sleeping 2 to 4 guests."
    // pt: "3 apartamentos de luxo na Rua do Belomonte, no Porto, para 2 a 4 hóspedes."
    const description = l === 'en'
        ? sentence(`${count}${street}${where}${sleeps}`)
        : sentence(`${count}${street}${place ? `, ${place}` : ''}${sleeps}`);

    const title = `${titleCount}${where}`;
    const alt = `${count}${where}`;
    return {
        title: name ? `${name} — ${title}` : title,
        description,
        imageAlt: name ? `${name} — ${alt}` : alt,
    };
}

/** Card photo alt for any listing in a grid: building or single property. */
export function listingImageAlt(p: SeoProperty, locale: string): string {
    return p.is_multi_unit && !p.parent_id ? buildingSeo(p, [], locale).imageAlt : propertyImageAlt(p, locale);
}
