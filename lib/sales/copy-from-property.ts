import type { Localized, SaleImage, SaleListingPrivate } from './types';

export type CopySourceProperty = {
    images: { url: string; alt?: Localized; is_main?: boolean; order?: number }[];
    bedrooms: number | null;
    bathrooms: number | null;
    area: number | null;
    description: Localized | null;
    city: string | null;
    lat: number | null;
    lng: number | null;
    address: string | null;
    amenities: { items?: Localized[] }[] | null;
};

function copyImages(src: CopySourceProperty['images']): SaleImage[] {
    const sorted = src
        .map((img, i) => ({ img, i }))
        .sort((a, b) => (a.img.order ?? a.i) - (b.img.order ?? b.i) || a.i - b.i)
        .map(({ img }) => img);
    const mainIndex = Math.max(
        0,
        sorted.findIndex((img) => img.is_main),
    );
    return sorted.map((img, i) => ({
        url: img.url,
        alt: img.alt ?? {},
        order: i,
        is_main: i === mainIndex,
    }));
}

export function copyFromProperty(p: CopySourceProperty): {
    draft: Partial<SaleListingPrivate>;
    amenitySuggestions: Localized[];
} {
    const draft: Partial<SaleListingPrivate> = {
        images: copyImages(p.images),
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        gross_area: p.area,
        description: p.description ?? {},
        lat: p.lat,
        lng: p.lng,
        address_private: p.address,
    };
    if (p.city) draft.city = p.city;

    const seen = new Set<string>();
    const amenitySuggestions: Localized[] = [];
    for (const group of p.amenities ?? []) {
        for (const item of group.items ?? []) {
            const key = (item.en ?? item.pt ?? '').trim().toLowerCase();
            if (!key || seen.has(key)) continue;
            seen.add(key);
            amenitySuggestions.push(item);
        }
    }
    return { draft, amenitySuggestions };
}
