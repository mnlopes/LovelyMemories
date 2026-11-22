/**
 * Search wording for sale listings: titles, meta descriptions, photo alts and
 * JSON-LD, in English and European Portuguese. The place grammar ("in Porto" /
 * "no Porto") is shared with the rental pages through `placePhrase`.
 * Pure functions, no I/O.
 */
import { placePhrase } from '@/lib/property-seo';
import { clampDescription } from '@/lib/seo';
import { formatEuro, localized } from './format';
import type { SaleListing } from './types';

type Locale = 'en' | 'pt';

/** The fields the headline and the photo alt read (a whole listing or a catalogue card). */
type HeadlineFields = Pick<SaleListing, 'type' | 'typology' | 'city' | 'title'>;

const asLocale = (locale: string): Locale => (locale === 'pt' ? 'pt' : 'en');

/** Bedroom count from a typology label: "T2" -> 2, "T5+" -> 5, "T0" -> 0. */
function typologyBedrooms(typology: string | null): number | null {
    const m = (typology || '').match(/^T(\d+)/i);
    return m ? parseInt(m[1], 10) : null;
}

/** "Moradia T1" / "1-Bedroom House" (title case in English), without place or "for sale". */
function kindLabel(l: HeadlineFields, locale: Locale): string {
    const beds = l.type === 'apartment' || l.type === 'house' ? typologyBedrooms(l.typology) : null;
    if (locale === 'pt') {
        switch (l.type) {
            case 'building': return 'Prédio';
            case 'land': return 'Terreno';
            case 'house': return beds === null ? 'Moradia' : `Moradia ${l.typology!.toUpperCase()}`;
            default:
                if (beds === 0) return 'Estúdio';
                return beds === null ? 'Apartamento' : `Apartamento ${l.typology!.toUpperCase()}`;
        }
    }
    switch (l.type) {
        case 'building': return 'Building';
        case 'land': return 'Plot of Land';
        case 'house': return beds === null ? 'House' : `${beds}-Bedroom House`;
        default:
            if (beds === 0) return 'Studio';
            return beds === null ? 'Apartment' : `${beds}-Bedroom Apartment`;
    }
}

function headlineParts(l: HeadlineFields, locale: string) {
    const loc = asLocale(locale);
    const label = kindLabel(l, loc);
    const forSale = loc === 'pt' ? 'à venda' : 'for Sale';
    const place = placePhrase(l.city, loc);
    return { loc, label, forSale, place };
}

/** "Moradia T1 à venda no Porto" / "1-Bedroom House for Sale in Porto". */
export function saleHeadline(l: HeadlineFields, locale: string): string {
    const { label, forSale, place } = headlineParts(l, locale);
    return [label, forSale, place].filter(Boolean).join(' ');
}

/** Page title without the brand: "Casa do Jardim — Moradia T1 à venda no Porto". */
export function saleSeoTitle(l: SaleListing, locale: string): string {
    const name = localized(l.title, locale).trim();
    const headline = saleHeadline(l, locale);
    return name ? `${name} — ${headline}` : headline;
}

/** Meta description: headline, area, energy class and price, at most 160 characters. */
export function saleSeoDescription(l: SaleListing, locale: string): string {
    const loc = asLocale(locale);
    const parts: string[] = [];
    if (l.gross_area && l.gross_area > 0) parts.push(`${l.gross_area} m²`);
    if (l.energy_class) {
        if (l.energy_class === 'exempt') parts.push(loc === 'pt' ? 'isento de certificado energético' : 'energy certificate exempt');
        else parts.push(loc === 'pt' ? `classe energética ${l.energy_class}` : `energy class ${l.energy_class}`);
    }
    if (l.status === 'sold') parts.push(loc === 'pt' ? 'vendido' : 'sold');
    else if (l.price_on_request || l.price == null) parts.push(loc === 'pt' ? 'preço sob consulta' : 'price on request');
    else parts.push(formatEuro(l.price, loc));
    const head = `${saleHeadline(l, loc)}.`;
    const tail = parts.join(', ');
    // The pieces are written for the middle of the sentence; the first one starts the sentence.
    return clampDescription([head, tail.charAt(0).toUpperCase() + tail.slice(1) + '.'].join(' '), 160);
}

/** Photo alt text: "Casa do Jardim — moradia T1 à venda no Porto", " (n)" from the 2nd photo. */
export function saleImageAlt(l: HeadlineFields, locale: string, index: number): string {
    const { loc, label, forSale, place } = headlineParts(l, locale);
    const lowerLabel = loc === 'en' ? label.toLowerCase() : label.charAt(0).toLowerCase() + label.slice(1);
    const lowerForSale = forSale.toLowerCase();
    const headline = [lowerLabel, lowerForSale, place].filter(Boolean).join(' ');
    const name = localized(l.title, locale).trim();
    const base = name ? `${name} — ${headline}` : headline;
    return index > 0 ? `${base} (${index + 1})` : base;
}

/** schema.org RealEstateListing; the page serialises it. */
export function saleJsonLd(l: SaleListing, locale: string, url: string): Record<string, unknown> {
    const offers: Record<string, unknown> = {
        '@type': 'Offer',
        priceCurrency: 'EUR',
        availability: l.status === 'sold' ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
    };
    if (!l.price_on_request && l.price != null && l.status !== 'sold') offers.price = l.price;

    const ld: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'RealEstateListing',
        name: saleSeoTitle(l, locale),
        description: saleSeoDescription(l, locale),
        url,
    };
    if (l.images.length > 0) ld.image = l.images.map((i) => i.url);
    if (l.published_at) ld.datePosted = l.published_at;
    ld.offers = offers;
    return ld;
}
