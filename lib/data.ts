export interface PropertyType {
    icon: string;
    count: number;
    label: string;
}

export interface Property {
    id: string; // derived from slug or explicit
    slug: string;
    title: string;
    subtitle: string;
    description?: string;
    image: string;
    location: string;
    region: 'Porto' | 'Lisboa' | 'Algarve' | 'All';
    types: PropertyType[];
    isComingSoon?: boolean;
    // Extended details for Detail Page
    guests?: number;
    area?: number; // m2
    bedrooms?: number;
    bathrooms?: number;
    amenities?: string[];
}

export const PROPERTIES: Property[] = [
    {
        id: "rdm-ii",
        slug: "rdm-ii-premium-apartments",
        title: "RDM II",
        subtitle: "Premium Apartments",
        image: "/legacy/properties/images/RDM-II.png",
        location: "Lorem ipsum dolor sit amet",
        region: "Porto",
        types: [{ icon: "icon-owner", count: 1, label: "Apartment" }],
        guests: 4,
        area: 80,
        bedrooms: 2,
        bathrooms: 1,
        description: "Experience luxury living in the heart of Porto. RDM II offers premium apartments designed for comfort and style."
    },
    {
        id: "paraiso-331",
        slug: "paraiso-331-garden-huts-eco-homes",
        title: "Paraíso 331",
        subtitle: "Garden Huts & Eco Homes",
        image: "/legacy/properties/images/Paraiso-331.png",
        location: "Lorem ipsum dolor sit amet",
        region: "Porto",
        types: [
            { icon: "icon-owner", count: 2, label: "Apartments" },
            { icon: "icon-owner", count: 2, label: "Rooms" }
        ],
        guests: 4,
        area: 60,
        bedrooms: 2,
        bathrooms: 1,
        description: "Continually conceptualize seamless functionalities whereas covalent platforms. Enthusiastically parallel task parallel internal or 'organic' sources rather than vertical users."
    },
    {
        id: "praca-dos-poveiros",
        slug: "praca-dos-poveiros-studio-loft",
        title: "Praça dos Poveiros",
        subtitle: "Studio Loft",
        image: "/legacy/properties/images/praca-dos-poveiros.png",
        location: "Lorem ipsum dolor sit amet",
        region: "Porto",
        types: [],
        isComingSoon: true,
        guests: 2,
        area: 50,
        bedrooms: 1,
        bathrooms: 1
    },
    {
        id: "the-flower-power",
        slug: "the-flower-power-two-bedroom-home",
        title: "The Flower Power",
        subtitle: "Two Bedroom Home",
        image: "/legacy/properties/images/the-flower-power.png",
        location: "Lorem ipsum dolor sit amet",
        region: "Porto",
        types: [{ icon: "icon-owner", count: 1, label: "Room" }],
        guests: 4,
        area: 75,
        bedrooms: 2,
        bathrooms: 1
    },
    {
        id: "avenida-luxury",
        slug: "avenida-luxury-penthouse", // Guessed slug
        title: "Avenida Luxury",
        subtitle: "Penthouse",
        image: "/legacy/properties/images/Paraiso-331.png",
        location: "Avenida da Liberdade",
        region: "Lisboa",
        types: [{ icon: "icon-owner", count: 1, label: "Penthouse" }],
        guests: 6,
        area: 120,
        bedrooms: 3,
        bathrooms: 2
    },
    {
        id: "sunset-villa",
        slug: "sunset-villa-beachfront-home", // Guessed slug
        title: "Sunset Villa",
        subtitle: "Beachfront Home",
        image: "/legacy/properties/images/RDM-II.png",
        location: "Quinta do Lago",
        region: "Algarve",
        types: [{ icon: "icon-owner", count: 4, label: "Suites" }],
        guests: 8,
        area: 200,
        bedrooms: 4,
        bathrooms: 4
    },
    {
        id: "chiado-loft",
        slug: "chiado-loft-classic-studio", // Guessed slug
        title: "Chiado Loft",
        subtitle: "Classic Studio",
        image: "/legacy/properties/images/praca-dos-poveiros.png",
        location: "Baixa Chiado",
        region: "Lisboa",
        types: [{ icon: "icon-owner", count: 1, label: "Loft" }],
        guests: 2,
        area: 45,
        bedrooms: 1,
        bathrooms: 1
    },
    {
        id: "ocean-breeze",
        slug: "ocean-breeze-modern-apartment", // Guessed slug
        title: "Ocean Breeze",
        subtitle: "Modern Apartment",
        image: "/legacy/properties/images/the-flower-power.png",
        location: "Vilamoura Marina",
        region: "Algarve",
        types: [{ icon: "icon-owner", count: 2, label: "Rooms" }],
        guests: 4,
        area: 90,
        bedrooms: 2,
        bathrooms: 2
    }
];
