export type Localized = { en?: string; pt?: string };

export const SALE_STATUSES = ['available', 'reserved', 'under_offer', 'sold'] as const;
export const SALE_TYPES = ['apartment', 'house', 'building', 'land'] as const;
export const SALE_CONDITIONS = ['new', 'renovated', 'good', 'to_renovate'] as const;
export const ENERGY_CLASSES = ['A+', 'A', 'B', 'B-', 'C', 'D', 'E', 'F', 'exempt'] as const;
export const TYPOLOGIES = ['T0', 'T1', 'T2', 'T3', 'T4', 'T5+'] as const;

export type SaleStatus = (typeof SALE_STATUSES)[number];
export type SaleType = (typeof SALE_TYPES)[number];
export type SaleCondition = (typeof SALE_CONDITIONS)[number];
export type EnergyClass = (typeof ENERGY_CLASSES)[number];

export type SaleImage = { url: string; alt: Localized; order: number; is_main: boolean };

/** Extra document of a listing (land registry record, licence...). The file is always in the private bucket. */
export type SaleDocument = { id: string; name: Localized; path: string; public: boolean; size: number | null };
/** What the public page gets of a document marked public: never the storage path. */
export type SalePublicDocument = { id: string; name: Localized };
/** Id used in /api/sale-doc/<listing>/<doc> for the energy certificate. */
export const ENERGY_CERT_DOC_ID = 'energy-certificate';
export const MAX_SALE_DOCUMENTS = 10;

/** Public columns of a sale listing (safe to send to the browser). */
export type SaleListing = {
    id: string;
    reference: string;
    slug: string;
    property_id: string | null;
    published: boolean;
    published_at: string | null;
    status: SaleStatus;
    price: number | null;
    price_on_request: boolean;
    negotiable: boolean;
    title: Localized;
    subtitle: Localized;
    description: Localized;
    features: Localized[];
    type: SaleType;
    typology: string | null;
    bedrooms: number | null;
    bathrooms: number | null;
    condition: SaleCondition | null;
    gross_area: number | null;
    useful_area: number | null;
    plot_area: number | null;
    year_renovated: number | null;
    furnished: boolean | null;
    city: string;
    area_label: string;
    street: string | null;
    lat: number | null;
    lng: number | null;
    nearby: { name: Localized; distance: Localized }[];
    energy_class: EnergyClass | null;
    floor_plan_url: string | null;
    images: SaleImage[];
    show_performance: boolean;
    al_license: string | null;
    created_at: string;
    updated_at: string;
    /** Listing page only (computed on the server from private columns): documents marked public. */
    public_documents?: SalePublicDocument[];
    /** Listing page only: the energy certificate PDF exists and is marked public. */
    energy_cert_downloadable?: boolean;
};

/**
 * What a catalogue card renders, and nothing more: the catalogue is a client component, so every
 * field here ends up in the page source. No `property_id` (opens the managed home's row), no
 * `al_license` (leads to the exact address), no long texts.
 */
export type SaleCardListing = Pick<
    SaleListing,
    | 'id'
    | 'slug'
    | 'published'
    | 'published_at'
    | 'status'
    | 'price'
    | 'price_on_request'
    | 'title'
    | 'subtitle'
    | 'type'
    | 'typology'
    | 'bedrooms'
    | 'bathrooms'
    | 'gross_area'
    | 'city'
    | 'area_label'
    | 'street'
    | 'energy_class'
> & {
    /** URL of the main photo (the card shows only that one). */
    mainImage: string | null;
    /** "Generates income" badge: performance shown, a linked home, and not sold. */
    incomeBadge: boolean;
};

/** Server-side mapping of a listing to its card. */
export function toSaleCard(l: SaleListing): SaleCardListing {
    return {
        id: l.id,
        slug: l.slug,
        published: l.published,
        published_at: l.published_at,
        status: l.status,
        price: l.price,
        price_on_request: l.price_on_request,
        title: l.title,
        subtitle: l.subtitle,
        type: l.type,
        typology: l.typology,
        bedrooms: l.bedrooms,
        bathrooms: l.bathrooms,
        gross_area: l.gross_area,
        city: l.city,
        area_label: l.area_label,
        street: l.street,
        energy_class: l.energy_class,
        mainImage: (l.images.find((i) => i.is_main) ?? l.images[0])?.url ?? null,
        incomeBadge: l.show_performance && l.property_id != null && l.status !== 'sold',
    };
}

/** Includes columns that must never reach the browser. */
export type SaleListingPrivate = Omit<SaleListing, 'public_documents' | 'energy_cert_downloadable'> & {
    address_private: string | null;
    energy_cert_number: string | null;
    energy_cert_path: string | null;
    energy_cert_public: boolean;
    documents: SaleDocument[];
    created_by: string | null;
};

export const PUBLIC_SALE_COLUMNS = [
    'id',
    'reference',
    'slug',
    'property_id',
    'published',
    'published_at',
    'status',
    'price',
    'price_on_request',
    'negotiable',
    'title',
    'subtitle',
    'description',
    'features',
    'type',
    'typology',
    'bedrooms',
    'bathrooms',
    'condition',
    'gross_area',
    'useful_area',
    'plot_area',
    'year_renovated',
    'furnished',
    'city',
    'area_label',
    'street',
    'lat',
    'lng',
    'nearby',
    'energy_class',
    'floor_plan_url',
    'images',
    'show_performance',
    'al_license',
    'created_at',
    'updated_at',
].join(',');
