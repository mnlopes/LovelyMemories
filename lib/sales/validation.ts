import { z } from 'zod';
import {
    ENERGY_CLASSES,
    SALE_CONDITIONS,
    SALE_STATUSES,
    SALE_TYPES,
    MAX_SALE_DOCUMENTS,
    type SaleListing,
} from './types';

const localizedSchema = z.object({
    en: z.string().max(5000).optional(),
    pt: z.string().max(5000).optional(),
});

const imageSchema = z.object({
    url: z.string().min(1).max(1000),
    alt: localizedSchema,
    order: z.number().int().min(0),
    is_main: z.boolean(),
});

const nonNegative = z.number().min(0).nullable();

const documentSchema = z.object({
    id: z.string().uuid(),
    name: z.object({ en: z.string().max(120).optional(), pt: z.string().max(120).optional() }),
    path: z.string().min(1).max(500),
    public: z.boolean(),
    size: z.number().int().min(0).nullable(),
});

export const saleListingInputSchema = z.object({
    slug: z.string().min(1).max(160),
    property_id: z.string().uuid().nullable(),
    published: z.boolean(),
    status: z.enum(SALE_STATUSES),
    price: z.number().min(0).nullable(),
    price_on_request: z.boolean(),
    negotiable: z.boolean(),
    title: localizedSchema,
    subtitle: localizedSchema,
    description: localizedSchema,
    features: z.array(localizedSchema).max(60),
    type: z.enum(SALE_TYPES),
    typology: z.string().max(10).nullable(),
    bedrooms: z.number().int().min(0).max(50).nullable(),
    bathrooms: z.number().int().min(0).max(50).nullable(),
    condition: z.enum(SALE_CONDITIONS).nullable(),
    gross_area: nonNegative,
    useful_area: nonNegative,
    plot_area: nonNegative,
    year_renovated: z.number().int().min(1800).max(2100).nullable(),
    furnished: z.boolean().nullable(),
    city: z.string().max(120),
    area_label: z.string().max(120),
    street: z.string().max(200).nullable(),
    lat: z.number().min(-90).max(90).nullable(),
    lng: z.number().min(-180).max(180).nullable(),
    nearby: z.array(z.object({ name: localizedSchema, distance: localizedSchema })).max(30),
    energy_class: z.enum(ENERGY_CLASSES).nullable(),
    floor_plan_url: z.string().max(1000).nullable(),
    images: z.array(imageSchema).max(80),
    show_performance: z.boolean(),
    al_license: z.string().max(60).nullable(),
    address_private: z.string().max(300).nullable(),
    energy_cert_number: z.string().max(60).nullable(),
    energy_cert_path: z.string().max(500).nullable(),
    energy_cert_public: z.boolean(),
    documents: z.array(documentSchema).max(MAX_SALE_DOCUMENTS),
});

export type PublishProblem = 'title' | 'photo' | 'type' | 'price' | 'energy_class' | 'city';

export function publishProblems(
    l: Pick<SaleListing, 'title' | 'images' | 'type' | 'price' | 'price_on_request' | 'energy_class' | 'city'>,
): PublishProblem[] {
    const problems: PublishProblem[] = [];
    if (!l.title?.en?.trim() && !l.title?.pt?.trim()) problems.push('title');
    if (!l.images || l.images.length === 0) problems.push('photo');
    if (!l.type) problems.push('type');
    if (!l.price_on_request && !(l.price && l.price > 0)) problems.push('price');
    if (!l.energy_class) problems.push('energy_class');
    if (!l.city?.trim()) problems.push('city');
    return problems;
}

export const saleInquirySchema = z.object({
    listingId: z.string().uuid(),
    kind: z.enum(['info', 'visit']),
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(200),
    phone: z.string().max(40).optional(),
    purpose: z.enum(['live', 'invest', 'both']),
    message: z.string().max(2000),
    visitTimes: z.string().max(300).optional(),
    consent: z.literal(true),
    locale: z.enum(['en', 'pt']),
    website: z.string().optional(),
});
