// Example content for the "homes for sale" proposals shown to the client.
// Nothing here is real inventory: prices, figures and leads are illustrative.

export const IMG = {
    logo: '/legacy/home/images/logo.svg',
    hero: '/legacy/home/images/hero-image.png',
    cottage: '/legacy/home/images/e7de979846a74b7dd3407aec0a0f3e9294605259.jpg',
    facade: '/legacy/properties/images/RDM-II.png',
    living: '/legacy/properties/images/praca-dos-poveiros.png',
    bedroom: '/legacy/owner/images/portfolio-ph.jpg',
    livingGarden: '/legacy/properties/images/banner.jpg',
    garden: '/legacy/properties/images/Paraiso-331.png',
    neon: '/legacy/owner/images/owners-exp.jpg',
};

export type SaleType = 'apartment' | 'house' | 'building';
export type SaleStatus = 'new' | 'available' | 'reserved' | 'sold';

export type SaleHome = {
    id: string;
    type: SaleType;
    status: SaleStatus;
    title: string;
    subtitle: string;
    city: string;
    street: string;
    price: number;
    area: number;
    typology: string;
    beds: string;
    baths: string;
    energy: string;
    img: string;
    /** Gross rental revenue over the last 12 months, when we already manage it. */
    earned: number | null;
    /** Pin position on the stylised map, in % of its width/height. */
    map: { x: number; y: number };
};

export const HOMES: SaleHome[] = [
    { id: 'ribeira', type: 'apartment', status: 'new', title: 'Ribeira View Apartment', subtitle: 'T2 · River views', city: 'Porto', street: 'Rua dos Mercadores', price: 425000, area: 92, typology: 'T2 apartment', beds: '2 bedrooms', baths: '2 bathrooms', energy: 'B', img: IMG.living, earned: 34100, map: { x: 54, y: 56 } },
    { id: 'foz', type: 'apartment', status: 'new', title: 'Foz Garden Apartment', subtitle: 'T3 · 5 min from the beach', city: 'Porto', street: 'Foz do Douro', price: 690000, area: 140, typology: 'T3 apartment', beds: '3 bedrooms', baths: '2 bathrooms', energy: 'A+', img: IMG.livingGarden, earned: null, map: { x: 18, y: 42 } },
    { id: 'paranhos', type: 'house', status: 'available', title: 'Garden House Paranhos', subtitle: 'T1 house · Private garden', city: 'Porto', street: 'Rua de Costa Cabral', price: 310000, area: 68, typology: 'T1 house', beds: '1 bedroom', baths: '1 bathroom', energy: 'C', img: IMG.cottage, earned: 26900, map: { x: 66, y: 18 } },
    { id: 'almada', type: 'building', status: 'available', title: 'Almada Townhouse', subtitle: 'Restored building · 4 units', city: 'Porto', street: 'Rua do Almada', price: 1250000, area: 310, typology: 'Building', beds: '6 bedrooms', baths: '5 bathrooms', energy: 'B', img: IMG.facade, earned: null, map: { x: 48, y: 32 } },
    { id: 'gaia', type: 'apartment', status: 'reserved', title: 'Gaia Riverside Studio', subtitle: 'T0 · Steps from the river', city: 'Gaia', street: 'Av. de Diogo Leite', price: 195000, area: 38, typology: 'T0 studio', beds: 'Studio', baths: '1 bathroom', energy: 'A', img: IMG.bedroom, earned: 21400, map: { x: 62, y: 80 } },
    { id: 'cedofeita', type: 'apartment', status: 'sold', title: 'Cedofeita Design Loft', subtitle: 'T1 · City centre', city: 'Porto', street: 'Rua de Cedofeita', price: 265000, area: 52, typology: 'T1 apartment', beds: '1 bedroom', baths: '1 bathroom', energy: 'B', img: IMG.neon, earned: null, map: { x: 36, y: 26 } },
];

export const FEATURED = HOMES.find((h) => h.id === 'paranhos')!;

export const eur = (n: number) => '€' + Math.round(n).toLocaleString('en-US');

export const eurShort = (n: number) =>
    n >= 1_000_000 ? `€${(n / 1_000_000).toFixed(2).replace(/0$/, '')}M` : `€${Math.round(n / 1000)}k`;

export const perM2 = (h: SaleHome) => `${eur(h.price / h.area)} / m²`;
