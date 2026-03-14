import { z } from "zod";

// Helper to coerce strings to numbers or null safely
const coerceNumberOrNull = z.preprocess((val) => {
    if (val === "" || val === null || val === undefined) return null;
    let normalized = val;
    if (typeof val === "string") {
        // Replace comma with dot for European/Portuguese format
        normalized = val.replace(',', '.');
    }
    const parsed = typeof normalized === "string" ? parseFloat(normalized) : Number(normalized);
    if (isNaN(parsed as any)) return null;
    return parsed;
}, z.number().nullable()).optional();

export const propertySchema = z.object({
    id: z.string().optional(),
    owner_id: z.string().optional().nullable(),
    title: z.record(z.string(), z.string()).default({ en: "", pt: "", he: "" }),
    subtitle: z.record(z.string(), z.string()).default({ en: "", pt: "", he: "" }),
    description: z.record(z.string(), z.string()).default({ en: "", pt: "", he: "" }),
    highlights_intro: z.record(z.string(), z.string()).default({ en: "", pt: "", he: "" }),
    slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),

    // Hierarchy
    parent_id: z.string().optional().nullable(),
    is_multi_unit: z.boolean().default(false),

    // Location
    address: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    lat: coerceNumberOrNull,
    lng: coerceNumberOrNull,
    nearby_places: z.array(z.object({
        category: z.string().optional().nullable(),
        items: z.array(z.object({
            name: z.record(z.string(), z.string()).default({ en: "", pt: "", he: "" }),
            subtitle: z.record(z.string(), z.string()).default({ en: "", pt: "", he: "" }),
            time: z.string().optional().nullable(),
            amenities: z.array(z.record(z.string(), z.string())).default([]),
            highlights: z.array(z.object({
                image: z.string().optional().nullable(),
                text: z.record(z.string(), z.string()).default({ en: "", pt: "", he: "" }),
            })).default([]),
            vip_services: z.array(z.object({
                title: z.record(z.string(), z.string()).default({ en: "", pt: "", he: "" }),
                icon: z.string().optional().nullable(),
            })).default([]),
            home_truths: z.array(z.record(z.string(), z.string())).default([]),
            icon: z.string().optional().nullable(), // More permissive than enum for legacy data
            coordinates: z.array(coerceNumberOrNull).optional().nullable(),
        })).optional().nullable()
    })).optional().nullable(),
    images: z.array(z.object({
        url: z.string(),
        alt: z.record(z.string(), z.string()).default({ en: "", pt: "", he: "" }),
        is_main: z.boolean().default(false),
        order: z.number().default(0),
    })).default([]).nullable(),
    highlights: z.array(z.object({
        image: z.string().optional().nullable(),
        text: z.record(z.string(), z.string()).default({ en: "", pt: "", he: "" }),
    })).default([]).nullable(),
    rooms: z.array(z.object({
        name: z.record(z.string(), z.string()).default({ en: "", pt: "", he: "" }),
        type: z.string().optional().nullable(), // More permissive than enum
        image: z.string().optional().nullable(),
        details: z.record(z.string(), z.string()).default({ en: "", pt: "", he: "" }),
        beds: z.record(z.string(), z.string()).default({ en: "", pt: "", he: "" }),
        bedCount: z.coerce.number().optional().nullable(),
        bedType: z.string().optional().nullable(),
        isEnsuite: z.boolean().default(false),
    })).default([]).nullable(),
    bed_sizes: z.object({
        single: z.string().default("90 x 190 cm"),
        double: z.string().default("140 x 190 cm"),
        king: z.string().default("160 x 200 cm"),
        superKing: z.string().default("180 x 200 cm"),
    }).default({
        single: "90 x 190 cm",
        double: "140 x 190 cm",
        king: "160 x 200 cm",
        superKing: "180 x 200 cm",
    }),
    baby_equipment: z.object({
        available: z.boolean().default(false),
        text: z.record(z.string(), z.string()).default({
            en: "Baby cot and high chair are available on request at no extra cost.",
            pt: "Berço e cadeira alta estão disponíveis mediante pedido, sem custo extra.",
            he: "מיטת תינוק וכיסא אוכל זמינים לפי בקשה ללא עלות נוספת.",
        }),
    }).default({
        available: false,
        text: {
            en: "Baby cot and high chair are available on request at no extra cost.",
            pt: "Berço e cadeira alta estão disponíveis mediante pedido, sem custo extra.",
            he: "מיטת תינוק וכיסא אוכל זמינים לפי בקשה ללא עלות nova.",
        },
    }),
    floor_plan_url: z.string().optional().nullable(),

    // Details
    max_guests: z.coerce.number().min(0).default(0),
    bedrooms: z.coerce.number().min(0).default(0),
    beds: z.coerce.number().min(0).default(0),
    bathrooms: z.coerce.number().min(0).default(0),
    area: z.coerce.number().optional().nullable(),

    // Pricing Rules (Relational table pricing_rules)
    price_per_night: z.coerce.number().min(0).default(0),
    original_price: z.coerce.number().optional().nullable(),
    min_nights: z.coerce.number().min(1).default(2),
    cleaning_fee: z.coerce.number().min(0).default(85),
    weekly_discount_percent: z.coerce.number().min(0).max(100).default(5),
    monthly_discount_percent: z.coerce.number().min(0).max(100).default(15),
    city_tax_per_night: z.coerce.number().min(0).optional().nullable(),

    // Flags
    status: z.enum(['active', 'coming_soon', 'hidden']).default('active'),
    is_active: z.boolean().default(true),
    type: z.enum(['apartment', 'villa', 'studio']).default('apartment').catch('apartment'),

    // Amenities
    amenities: z.array(z.object({
        category: z.string(),
        icon: z.string().optional(),
        items: z.array(z.record(z.string(), z.string()))
    })).default([]).catch([]),

    // Policies & Home Truths
    home_truths: z.array(z.record(z.string(), z.string())).default([]).catch([]),
    house_rules: z.object({
        childrenAllowed: z.boolean().default(true),
        infantsAllowed: z.boolean().default(true),
        petsAllowed: z.boolean().default(false),
        partiesAllowed: z.boolean().default(false),
        smokingAllowed: z.boolean().default(false),
        custom: z.array(z.object({
            label: z.record(z.string(), z.string()),
            allowed: z.boolean().default(true)
        })).default([]),
        removed_rules: z.array(z.string()).default([]),
    }).default({
        childrenAllowed: true,
        infantsAllowed: true,
        petsAllowed: false,
        partiesAllowed: false,
        smokingAllowed: false,
        custom: [],
        removed_rules: [],
    }).catch({
        childrenAllowed: true,
        infantsAllowed: true,
        petsAllowed: false,
        partiesAllowed: false,
        smokingAllowed: false,
        custom: [],
        removed_rules: [],
    }),
    check_in: z.object({
        arrivalStart: z.string().default("15:00"),
        departureEnd: z.string().default("11:00"),
    }).default({
        arrivalStart: "15:00",
        departureEnd: "11:00",
    }).catch({
        arrivalStart: "15:00",
        departureEnd: "11:00",
    }),
    cancellation: z.object({
        text: z.record(z.string(), z.string()).default({ en: "Moderate", pt: "Moderada", he: "מתון" }),
        refundText: z.record(z.string(), z.string()).default({ en: "50% refund", pt: "50% de reembolso", he: "החזר של 50%" }),
        deadline: z.record(z.string(), z.string()).default({ en: "7 days", pt: "7 dias", he: "7 ימים" }),
    }).default({
        text: { en: "Moderate", pt: "Moderada", he: "מתון" },
        refundText: { en: "50% refund", pt: "50% de reembolso", he: "החזר של 50%" },
        deadline: { en: "7 days", pt: "7 dias", he: "7 ימים" },
    }).catch({
        text: { en: "Moderate", pt: "Moderada", he: "מתון" },
        refundText: { en: "50% refund", pt: "50% de reembolso", he: "החזר של 50%" },
        deadline: { en: "7 days", pt: "7 dias", he: "7 ימים" },
    }),
    vip_services: z.array(z.object({
        title: z.record(z.string(), z.string()).default({ en: "", pt: "", he: "" }),
        icon: z.string().optional().nullable(),
    })).default([]).catch([]),
});

export type PropertyFormData = z.infer<typeof propertySchema>;
