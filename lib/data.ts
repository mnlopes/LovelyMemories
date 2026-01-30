export interface PropertyType {
    icon: string;
    count: number;
    label: string;
}

export interface Property {
    id: string;
    slug: string;
    title: string;
    subtitle: string;
    description: string[]; // Changed to string array for paragraphs
    image: string;
    images: string[];
    location: {
        country: string;
        region: string;
        city: string;
        address: string;
        coordinates?: [number, number]; // [lat, lng]
    };
    region: 'Porto' | 'Lisboa' | 'Algarve' | 'All';
    types: PropertyType[];
    isComingSoon?: boolean;
    guests: number;
    area: number; // m2
    bedrooms: number;
    beds: number;
    bathrooms: number;
    amenities: {
        category: string;
        items: string[];
    }[];
    highlights: {
        image: string;
        text: string;
    }[];
    homeTruths: string[];
    nearbyPlaces: {
        category: string;
        items: {
            name: string;
            subtitle?: string;
            time: string;
            icon: "car" | "walk";
            coordinates?: [number, number];
        }[];
    }[];
    price: {
        perNight: number;
        originalPrice?: number;
        discount?: number;
    };
    servicesPrice?: {
        breakfast?: number;
        transfer?: number;
    };
    policies?: {
        houseRules: {
            childrenAllowed: boolean;
            infantsAllowed: boolean;
            petsAllowed: boolean;
            partiesAllowed: boolean;
            smokingAllowed: boolean;
        };
        checkIn: {
            arrivalStart: string;
            departureEnd: string;
        };
        cancellation: {
            text: string;
            refundText: string;
            deadline: string;
        };
    };
    concierge?: {
        chef: boolean;
        chauffeur: boolean;
        spa: boolean;
        tours: boolean;
        security: boolean;
        events: boolean;
    };
    sleepingArrangements?: {
        title: string;
        subtitle: string;
        bedCount?: number;
    }[];
    bathroomDetails?: {
        title: string;
        subtitle: string;
    }[];
    rooms?: {
        name: string;
        type: "bedroom" | "bathroom" | "communal" | "other";
        image: string;
        details: string;
        beds?: string;
        bedCount?: number;
        bedType?: "double" | "single" | "sofa";
        isEnsuite?: boolean;
        amenities?: string[];
    }[];
}

export const PROPERTIES: Property[] = [
    {
        id: "rdm-ii",
        slug: "rdm-ii-premium-apartments",
        title: "RDM II",
        subtitle: "Premium Apartments",
        image: "/legacy/properties/images/RDM-II.png",
        images: [
            "/legacy/properties/images/RDM-II.png",
            "/legacy/properties/images/Paraiso-331.png",
            "/legacy/properties/images/praca-dos-poveiros.png",
            "/legacy/properties/images/the-flower-power.png"
        ],
        location: {
            country: "Portugal",
            region: "Norte",
            city: "Porto",
            address: "Rua Dom Manuel II, 98",
            coordinates: [41.1478338, -8.6223906]
        },
        region: "Porto",
        types: [{ icon: "icon-owner", count: 1, label: "Apartment" }],
        guests: 4,
        area: 80,
        bedrooms: 2,
        beds: 3,
        bathrooms: 1,
        description: [
            "Experience luxury living in the heart of Porto. RDM II offers premium apartments designed for comfort and style.",
            "Located just steps away from the Crystal Palace gardens, this apartment merges contemporary design with classical Porto architecture.",
            "Perfect for families or business travelers seeking a sophisticated home away from home."
        ],
        highlights: [
            { image: "/legacy/properties/images/RDM-II.png", text: "Stunning views of the Douro River from the private balcony." },
            { image: "/legacy/properties/images/Paraiso-331.png", text: "Handpicked local artworks decorating every room." },
            { image: "/legacy/properties/images/praca-dos-poveiros.png", text: "Fully equipped gourmet kitchen for food lovers." }
        ],
        homeTruths: [
            "The apartment is on the third floor and there is no elevator.",
            "Construction work is happening nearby during weekdays.",
            "Pets are not allowed in this property."
        ],
        amenities: [
            {
                category: "Bedroom & Laundry",
                items: ["Washing machine", "Iron", "Hangers", "Bed linens", "Extra pillows and blankets", "Room-darkening shades"]
            },
            {
                category: "Entertainment",
                items: ["HDTV with Netflix, Standard cable", "Marshall Bluetooth sound system", "Books and reading material"]
            },
            {
                category: "Heating and Cooling",
                items: ["Air conditioning", "Central heating", "Portable fans"]
            },
            {
                category: "Internet and Office",
                items: ["High-speed WiFi (500 Mbps)", "Dedicated workspace", "Ergonomic chair"]
            },
            {
                category: "Kitchen and Dining",
                items: ["Fully equipped kitchen", "Nespresso machine", "Dishwasher", "Wine glasses", "Toaster", "Cooking basics"]
            },
            {
                category: "Bathroom",
                items: ["Hair dryer", "Premium toiletries", "Hot water", "Walk-in shower"]
            },
            {
                category: "Location Features",
                items: ["Private entrance", "River view", "Resort access"]
            }
        ],
        nearbyPlaces: [
            {
                category: "Local Attractions",
                items: [
                    { name: "Crystal Palace Gardens", time: "2 min", icon: "walk", coordinates: [41.1485, -8.6254] },
                    { name: "Clérigos Tower", time: "10 min", icon: "walk", coordinates: [41.1458, -8.6139] },
                    { name: "Ribeira District", time: "15 min", icon: "walk", coordinates: [41.1408, -8.6130] }
                ]
            },
            {
                category: "Essentials",
                items: [
                    { name: "Continente Supermarket", time: "5 min", icon: "walk", coordinates: [41.1495, -8.6235] },
                    { name: "Porto Hospital", time: "8 min", icon: "car", coordinates: [41.1550, -8.6270] }
                ]
            }
        ],
        price: {
            perNight: 150,
            originalPrice: 180,
            discount: 15
        },
        servicesPrice: {
            breakfast: 15,
            transfer: 55
        },
        policies: {
            houseRules: {
                childrenAllowed: true,
                infantsAllowed: true,
                petsAllowed: false,
                partiesAllowed: false,
                smokingAllowed: false
            },
            checkIn: {
                arrivalStart: "15:00",
                departureEnd: "11:00"
            },
            cancellation: {
                text: "Cancel before 4 Feb, 2026 for a 50% refund.",
                refundText: "Not eligible for a refund once your check-in date is under 7 days away.",
                deadline: "4 Feb"
            }
        },
        concierge: {
            chef: true,
            chauffeur: true,
            spa: true,
            tours: true,
            security: false,
            events: true
        },
        sleepingArrangements: [
            { title: "Bedroom 1", subtitle: "1 king bed", bedCount: 1 },
            { title: "Bedroom 2", subtitle: "2 single beds", bedCount: 2 },
            { title: "Living Room", subtitle: "1 sofa bed", bedCount: 1 }
        ],
        bathroomDetails: [
            { title: "Bathroom 1", subtitle: "Walk-in shower, Toilet" }
        ],
        rooms: [
            {
                name: "Master Suite",
                type: "bedroom",
                image: "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=1200&q=80",
                details: "Spacious master bedroom with premium linens and panoramic views.",
                beds: "1 king bed",
                bedCount: 1,
                bedType: "double"
            },
            {
                name: "En-suite Bathroom",
                type: "bathroom",
                image: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=1200&q=80",
                details: "Luxury walk-in rainfall shower, dual vanity, and premium toiletries.",
                isEnsuite: true,
                amenities: ["shower", "toilet"]
            },
            {
                name: "Second Bedroom",
                type: "bedroom",
                image: "https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=1200&q=80",
                details: "Comfortable twin room perfect for guests or children.",
                beds: "2 single beds",
                bedCount: 2,
                bedType: "single"
            },
            {
                name: "Social Area",
                type: "communal",
                image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80",
                details: "Cozy living space with a high-quality sofa bed.",
                beds: "1 sofa bed",
                bedCount: 1,
                bedType: "sofa"
            }
        ]
    },
    {
        id: "paraiso-331",
        slug: "paraiso-331-garden-huts-eco-homes",
        title: "Paraíso 331",
        subtitle: "Garden Huts & Eco Homes",
        image: "/legacy/properties/images/Paraiso-331.png",
        images: ["/legacy/properties/images/Paraiso-331.png"],
        location: {
            country: "Portugal",
            region: "Norte",
            city: "Porto",
            address: "Rua do Paraíso, 331",
            coordinates: [41.1579438, -8.6291053]
        },
        region: "Porto",
        types: [
            { icon: "icon-owner", count: 2, label: "Apartments" },
            { icon: "icon-owner", count: 2, label: "Rooms" }
        ],
        guests: 4,
        area: 60,
        bedrooms: 2,
        beds: 2,
        bathrooms: 1,
        description: ["Continually conceptualize seamless functionalities whereas covalent platforms. Enthusiastically parallel task parallel internal or 'organic' sources rather than vertical users."],
        highlights: [],
        homeTruths: [],
        amenities: [{ category: "General", items: ["WiFi", "Garden"] }],
        nearbyPlaces: [],
        price: { perNight: 120 },
        servicesPrice: {
            breakfast: 15,
            transfer: 55
        },
        policies: {
            houseRules: {
                childrenAllowed: true,
                infantsAllowed: true,
                petsAllowed: false,
                partiesAllowed: false,
                smokingAllowed: false
            },
            checkIn: {
                arrivalStart: "15:00",
                departureEnd: "11:00"
            },
            cancellation: {
                text: "Free cancellation up to 7 days before check-in.",
                refundText: "Full refund excluding service fee.",
                deadline: "7 days"
            }
        },
        concierge: {
            chef: true,
            chauffeur: false,
            spa: true,
            tours: true,
            security: false,
            events: false
        },
        sleepingArrangements: [
            { title: "Bedroom 1", subtitle: "1 queen bed", bedCount: 1 },
            { title: "Bedroom 2", subtitle: "1 bunk bed", bedCount: 2 }
        ],
        bathroomDetails: [
            { title: "Main Bathroom", subtitle: "Shower, Bathtub" }
        ]
    },
    {
        id: "praca-dos-poveiros",
        slug: "praca-dos-poveiros-studio-loft",
        title: "Praça dos Poveiros",
        subtitle: "Studio Loft",
        image: "/legacy/properties/images/praca-dos-poveiros.png",
        images: ["/legacy/properties/images/praca-dos-poveiros.png"],
        location: {
            country: "Portugal",
            region: "Norte",
            city: "Porto",
            address: "Praça dos Poveiros",
            coordinates: [41.1466, -8.6063]
        },
        region: "Porto",
        types: [],
        isComingSoon: true,
        guests: 2,
        area: 50,
        bedrooms: 1,
        beds: 1,
        bathrooms: 1,
        description: ["Stylish studio loft coming soon."],
        highlights: [],
        homeTruths: [],
        amenities: [],
        nearbyPlaces: [],
        price: { perNight: 0 },
        policies: {
            houseRules: {
                childrenAllowed: false,
                infantsAllowed: false,
                petsAllowed: true,
                partiesAllowed: false,
                smokingAllowed: true
            },
            checkIn: {
                arrivalStart: "16:00",
                departureEnd: "12:00"
            },
            cancellation: {
                text: "Non-refundable.",
                refundText: "No refund available.",
                deadline: "None"
            }
        }
    },
    {
        id: "the-flower-power",
        slug: "the-flower-power-two-bedroom-home",
        title: "The Flower Power",
        subtitle: "Two Bedroom Home",
        image: "/legacy/properties/images/the-flower-power.png",
        images: ["/legacy/properties/images/the-flower-power.png"],
        location: {
            country: "Portugal",
            region: "Norte",
            city: "Porto",
            address: "Rua de Serralves, 123",
            coordinates: [41.1598, -8.6599]
        },
        region: "Porto",
        types: [{ icon: "icon-owner", count: 1, label: "Room" }],
        guests: 4,
        area: 75,
        bedrooms: 2,
        beds: 2,
        bathrooms: 1,
        description: ["Cozy two bedroom home."],
        highlights: [],
        homeTruths: [],
        amenities: [{ category: "General", items: ["WiFi"] }],
        nearbyPlaces: [],
        price: { perNight: 90 }
    },
    {
        id: "avenida-luxury",
        slug: "avenida-luxury-penthouse", // Guessed slug
        title: "Avenida Luxury",
        subtitle: "Penthouse",
        image: "/legacy/properties/images/Paraiso-331.png",
        images: ["/legacy/properties/images/Paraiso-331.png"],
        location: {
            country: "Portugal",
            region: "Lisboa",
            city: "Lisboa",
            address: "Avenida da Liberdade",
            coordinates: [38.7196, -9.1456]
        },
        region: "Lisboa",
        types: [{ icon: "icon-owner", count: 1, label: "Penthouse" }],
        guests: 6,
        area: 120,
        bedrooms: 3,
        beds: 4,
        bathrooms: 2,
        description: ["Luxury penthouse in Lisbon."],
        highlights: [],
        homeTruths: [],
        amenities: [{ category: "General", items: ["WiFi", "Elevator"] }],
        nearbyPlaces: [],
        price: { perNight: 250 }
    },
    {
        id: "sunset-villa",
        slug: "sunset-villa-beachfront-home",
        title: "Sunset Villa",
        subtitle: "Beachfront Home",
        image: "/legacy/properties/images/RDM-II.png",
        images: ["/legacy/properties/images/RDM-II.png"],
        location: {
            country: "Portugal",
            region: "Algarve",
            city: "Quinta do Lago",
            address: "Quinta do Lago",
            coordinates: [37.0543, -8.0264]
        },
        region: "Algarve",
        types: [{ icon: "icon-owner", count: 4, label: "Suites" }],
        guests: 8,
        area: 200,
        bedrooms: 4,
        beds: 6,
        bathrooms: 4,
        description: ["Stunning beachfront villa."],
        highlights: [],
        homeTruths: [],
        amenities: [{ category: "General", items: ["WiFi", "Pool", "Beach Access"] }],
        nearbyPlaces: [],
        price: { perNight: 400 }
    },
    {
        id: "chiado-loft",
        slug: "chiado-loft-classic-studio",
        title: "Chiado Loft",
        subtitle: "Classic Studio",
        image: "/legacy/properties/images/praca-dos-poveiros.png",
        images: ["/legacy/properties/images/praca-dos-poveiros.png"],
        location: {
            country: "Portugal",
            region: "Lisboa",
            city: "Lisboa",
            address: "Baixa Chiado",
            coordinates: [38.7115, -9.1403]
        },
        region: "Lisboa",
        types: [{ icon: "icon-owner", count: 1, label: "Loft" }],
        guests: 2,
        area: 45,
        bedrooms: 1,
        beds: 1,
        bathrooms: 1,
        description: ["Classic studio in the heart of Chiado."],
        highlights: [],
        homeTruths: [],
        amenities: [{ category: "General", items: ["WiFi"] }],
        nearbyPlaces: [],
        price: { perNight: 100 }
    },
    {
        id: "ocean-breeze",
        slug: "ocean-breeze-modern-apartment", // Guessed slug
        title: "Ocean Breeze",
        subtitle: "Modern Apartment",
        image: "/legacy/properties/images/the-flower-power.png",
        images: ["/legacy/properties/images/the-flower-power.png"],
        location: {
            country: "Portugal",
            region: "Algarve",
            city: "Vilamoura",
            address: "Vilamoura Marina",
            coordinates: [37.0863, -8.1189]
        },
        region: "Algarve",
        types: [{ icon: "icon-owner", count: 2, label: "Rooms" }],
        guests: 4,
        area: 90,
        bedrooms: 2,
        beds: 2,
        bathrooms: 2,
        description: ["Modern apartment with ocean breeze."],
        highlights: [],
        homeTruths: [],
        amenities: [{ category: "General", items: ["WiFi", "Pool"] }],
        nearbyPlaces: [],
        price: { perNight: 150 },
        policies: {
            houseRules: {
                childrenAllowed: true,
                infantsAllowed: true,
                petsAllowed: false,
                partiesAllowed: false,
                smokingAllowed: false
            },
            checkIn: {
                arrivalStart: "15:00",
                departureEnd: "11:00"
            },
            cancellation: {
                text: "Cancel before check-in for partial refund.",
                refundText: "50% refund until 1 week prior.",
                deadline: "1 week"
            }
        }
    }
];

export interface ConciergeService {
    titleKey: string;
    image: string;
    descriptionKey: string;
}

export const CONCIERGE_SERVICES: ConciergeService[] = [
    {
        titleKey: "privateTransfers",
        image: "/legacy/home/images/services-image-1.png",
        descriptionKey: "privateTransfersDesc"
    },
    {
        titleKey: "breakfastAtHome",
        image: "/legacy/home/images/services-image-2.png",
        descriptionKey: "breakfastAtHomeDesc"
    },
    {
        titleKey: "chefAtHome",
        image: "/legacy/home/images/services-image-3.png",
        descriptionKey: "chefAtHomeDesc"
    },
    {
        titleKey: "anotherService",
        image: "/legacy/home/images/services-image-2-1.png",
        descriptionKey: "anotherServiceDesc"
    },
    {
        titleKey: "experiences",
        image: "/legacy/home/images/services-image-1.png",
        descriptionKey: "experiencesDesc"
    }
];

