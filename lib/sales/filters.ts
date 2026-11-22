import { SALE_TYPES, type SaleListing, type SaleType } from './types';

export type CatalogueSort = 'newest' | 'price_asc' | 'price_desc';

export type CatalogueFilters = {
    type?: SaleType;
    city?: string;
    minBedrooms?: number;
    maxPrice?: number;
    sort: CatalogueSort;
};

const SORTS: readonly CatalogueSort[] = ['newest', 'price_asc', 'price_desc'];

function first(v: string | string[] | undefined): string | undefined {
    return Array.isArray(v) ? v[0] : v;
}

function positiveNumber(v: string | undefined): number | undefined {
    if (v === undefined || v.trim() === '') return undefined;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : undefined;
}

export function parseFilters(sp: Record<string, string | string[] | undefined>): CatalogueFilters {
    const out: CatalogueFilters = { sort: 'newest' };
    const type = first(sp.type);
    if (type && (SALE_TYPES as readonly string[]).includes(type)) out.type = type as SaleType;
    const city = first(sp.city)?.trim();
    if (city) out.city = city;
    const minBedrooms = positiveNumber(first(sp.minBedrooms));
    if (minBedrooms !== undefined) out.minBedrooms = Math.floor(minBedrooms);
    const maxPrice = positiveNumber(first(sp.maxPrice));
    if (maxPrice !== undefined) out.maxPrice = maxPrice;
    const sort = first(sp.sort);
    if (sort && (SORTS as readonly string[]).includes(sort)) out.sort = sort as CatalogueSort;
    return out;
}

export function filtersToQuery(f: CatalogueFilters): string {
    const q = new URLSearchParams();
    if (f.type) q.set('type', f.type);
    if (f.city) q.set('city', f.city);
    if (f.minBedrooms) q.set('minBedrooms', String(f.minBedrooms));
    if (f.maxPrice) q.set('maxPrice', String(f.maxPrice));
    if (f.sort !== 'newest') q.set('sort', f.sort);
    return q.toString();
}

/** The fields the filters and the sort read (a whole listing or a catalogue card). */
export type FilterableListing = Pick<
    SaleListing,
    'published' | 'published_at' | 'status' | 'type' | 'city' | 'bedrooms' | 'price' | 'price_on_request'
>;

/** Lower rank goes first: priced, then price on request, then sold. */
function rank(l: FilterableListing, sort: CatalogueSort): number {
    if (l.status === 'sold') return 2;
    if (sort !== 'newest' && (l.price_on_request || l.price === null)) return 1;
    return 0;
}

export function applyFilters<T extends FilterableListing>(list: T[], f: CatalogueFilters): T[] {
    const kept = list.filter((l) => {
        if (!l.published) return false;
        if (f.type && l.type !== f.type) return false;
        if (f.city && l.city !== f.city) return false;
        if (f.minBedrooms && (l.bedrooms ?? 0) < f.minBedrooms) return false;
        if (f.maxPrice && (l.price_on_request || l.price === null || l.price > f.maxPrice)) return false;
        return true;
    });

    return kept.sort((a, b) => {
        const r = rank(a, f.sort) - rank(b, f.sort);
        if (r !== 0) return r;
        if (f.sort === 'price_asc') return (a.price ?? 0) - (b.price ?? 0);
        if (f.sort === 'price_desc') return (b.price ?? 0) - (a.price ?? 0);
        if (!a.published_at && !b.published_at) return 0;
        if (!a.published_at) return 1;
        if (!b.published_at) return -1;
        return a.published_at < b.published_at ? 1 : a.published_at > b.published_at ? -1 : 0;
    });
}
