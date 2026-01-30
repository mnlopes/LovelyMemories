"use client";

import Link from "next/link";

const PROPERTIES = [
    {
        title: "Paraíso 331",
        description: "Garden Huts & Eco Homes",
        image: "/legacy/properties/images/Paraiso-331.png",
        link: "/properties/paraiso-331-garden-huts-eco-homes"
    },
    {
        title: "Paraíso 332",
        description: "Garden Huts & Eco Homes",
        image: "/legacy/properties/images/Paraiso-331.png",
        link: "/properties/paraiso-331-garden-huts-eco-homes"
    },
    {
        title: "Praça dos Poveiros",
        description: "Studio Loft",
        image: "/legacy/properties/images/praca-dos-poveiros.png",
        link: "/properties/praca-dos-poveiros-studio-loft"
    },
    {
        title: "RDM II",
        description: "Premium Apartments",
        image: "/legacy/properties/images/RDM-II.png",
        link: "/properties/rdm-ii-premium-apartments"
    },
    {
        title: "The Flower Power",
        description: "Two Bedroom Home",
        image: "/legacy/properties/images/the-flower-power.png",
        link: "/properties/the-flower-power-two-bedroom-home"
    }
];

export const ListingGrid = () => {
    return (
        <section className="py-24 bg-white">
            <div className="container mx-auto px-6">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
                    <div className="space-y-4">
                        <h3 className="text-[11px] font-extrabold text-[#AD9C7E] uppercase tracking-[0.4em]">Our Collection</h3>
                        <h2 className="text-4xl md:text-5xl font-playfair font-bold text-navy-950">Unique Homes & Resorts</h2>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8">
                    {PROPERTIES.map((property, index) => (
                        <Link key={index} href={property.link} className="group">
                            <div className="relative aspect-[4/5] rounded-[32px] overflow-hidden mb-6 shadow-sm group-hover:shadow-2xl transition-all duration-700">
                                <img
                                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                                    src={property.image}
                                    alt={property.title}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-lg font-bold text-navy-950 group-hover:text-[#AD9C7E] transition-colors">{property.title}</h4>
                                {property.description && (
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{property.description}</p>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
};
