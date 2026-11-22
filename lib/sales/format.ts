import type { Localized, SaleListing } from './types';

export function localized(v: Localized | undefined, locale: string): string {
    if (!v) return '';
    const primary = locale === 'pt' ? v.pt : v.en;
    const other = locale === 'pt' ? v.en : v.pt;
    return primary || other || '';
}

export function formatEuro(n: number, locale: string): string {
    return new Intl.NumberFormat(locale === 'pt' ? 'pt-PT' : 'en-GB', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
    }).format(n);
}

export function pricePerM2(l: Pick<SaleListing, 'price' | 'price_on_request' | 'gross_area'>): number | null {
    if (l.price_on_request || !l.price || !l.gross_area || l.gross_area <= 0) return null;
    return Math.round(l.price / l.gross_area);
}

/** Whole days since a calendar date; both inputs use only their YYYY-MM-DD part. */
function dayNumber(iso: string): number {
    const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
    return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

export function daysListed(publishedAt: string | null, today: string): number | null {
    if (!publishedAt) return null;
    return dayNumber(today) - dayNumber(publishedAt);
}

export function isNewListing(publishedAt: string | null, today: string): boolean {
    const days = daysListed(publishedAt, today);
    return days !== null && days >= 0 && days < 30;
}

export function slugify(text: string): string {
    return text
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/** Rounds a public coordinate to 3 decimals (~110 m). */
export function approxCoord(n: number | null): number | null {
    return n === null ? null : Math.round(n * 1000) / 1000;
}
