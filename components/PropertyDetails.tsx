"use client";

import React from 'react';
import Image from 'next/image';
import { Link } from "@/i18n/routing";
import { ArrowLeft } from 'lucide-react';
import { PROPERTIES, Property } from '@/lib/data';
import { notFound } from 'next/navigation';

interface PropertyDetailsProps {
    slug: string;
}

export const PropertyDetails: React.FC<PropertyDetailsProps> = ({ slug }) => {
    // Find the current property
    const property = PROPERTIES.find(p => p.slug === slug);

    if (!property) {
        notFound();
    }

    // Filter related properties (exclude current)
    const relatedProperties = PROPERTIES.filter(p => p.slug !== slug).slice(0, 4);

    return (
        <div className="bg-white">
            {/* Hero Section */}
            <section className="relative h-[70vh] min-h-[500px]">
                <div className="absolute inset-0">
                    <Image
                        src={property.image}
                        alt={property.title}
                        fill
                        className="object-cover"
                        priority
                    />
                    <div className="absolute inset-0 bg-black/40"></div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="container mx-auto px-4 text-center text-white">
                        <h1 className="text-4xl md:text-6xl font-playfair font-bold mb-4">
                            {property.title}
                        </h1>
                        <p className="text-xl md:text-2xl font-light uppercase tracking-widest mb-8 opacity-90">
                            {property.subtitle}
                        </p>

                        <div className="flex flex-wrap justify-center gap-6 md:gap-12 mt-8">
                            {property.location && (
                                <div className="flex items-center gap-2">
                                    <i className="icon-destination text-3xl text-[#b09e80]"></i>
                                    <span className="text-lg">{property.location}</span>
                                </div>
                            )}
                            {property.types.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <i className={`${property.types[0].icon} text-3xl text-[#b09e80]`}></i>
                                    <span className="text-lg">
                                        <b>{property.types[0].count}</b> {property.types[0].label}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Description & Details Section */}
            <section className="py-20">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div className="space-y-6">
                            <h2 className="text-3xl font-playfair font-bold text-[#192537]">About this Property</h2>
                            <p className="text-gray-600 leading-relaxed text-lg">
                                {property.description || "Experience the perfect blend of comfort and luxury. This unique property offers a serene escape with modern amenities and distinct character, perfect for your next stay."}
                            </p>
                            <Link
                                href="/contact"
                                className="inline-block mt-4 px-8 py-3 bg-[#192537] text-white font-bold uppercase tracking-widest hover:bg-[#b09e80] transition-colors"
                            >
                                Book Now
                            </Link>
                        </div>

                        {/* Property Stats Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-6 bg-gray-50 border border-gray-100 rounded-xl text-center">
                                <i className="icon-people text-4xl text-[#192537] mb-3 block"></i>
                                <span className="block text-2xl font-bold text-[#b09e80]">{property.guests || 2}</span>
                                <span className="text-sm font-bold uppercase text-gray-500">Guests</span>
                            </div>
                            <div className="p-6 bg-gray-50 border border-gray-100 rounded-xl text-center">
                                <i className="icon-owner text-4xl text-[#192537] mb-3 block"></i>
                                <span className="block text-2xl font-bold text-[#b09e80]">{property.area || 50}</span>
                                <span className="text-sm font-bold uppercase text-gray-500">m²</span>
                            </div>
                            <div className="p-6 bg-gray-50 border border-gray-100 rounded-xl text-center">
                                <i className="icon-bedroom text-4xl text-[#192537] mb-3 block"></i>
                                <span className="block text-2xl font-bold text-[#b09e80]">{property.bedrooms || 1}</span>
                                <span className="text-sm font-bold uppercase text-gray-500">Bedrooms</span>
                            </div>
                            <div className="p-6 bg-gray-50 border border-gray-100 rounded-xl text-center">
                                <i className="icon-bathroom text-4xl text-[#192537] mb-3 block"></i>
                                <span className="block text-2xl font-bold text-[#b09e80]">{property.bathrooms || 1}</span>
                                <span className="text-sm font-bold uppercase text-gray-500">Bathrooms</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Related Properties / Units Section */}
            <section className="py-20 bg-[#f8f9fa]">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <h3 className="text-2xl font-playfair font-bold text-[#192537] mb-4">Other Available Units</h3>
                        <div className="h-px w-20 bg-[#b09e80] mx-auto"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {relatedProperties.map((p, idx) => (
                            <div key={idx} className="bg-white group rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300">
                                <div className="relative h-64 overflow-hidden">
                                    <Image
                                        src={p.image}
                                        alt={p.title}
                                        fill
                                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                </div>
                                <div className="p-6">
                                    <h4 className="font-bold text-lg text-[#192537] mb-1">{p.title}</h4>
                                    <p className="text-sm text-[#b09e80] font-bold uppercase tracking-wider mb-4">{p.subtitle}</p>

                                    <ul className="flex flex-wrap gap-4 text-sm text-gray-500 mb-6">
                                        <li className="flex items-center gap-2">
                                            <i className="icon-people"></i>
                                            <span><b>{p.guests || 2}</b> Guests</span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <i className="icon-owner"></i>
                                            <span><b>{p.area || 50}</b> m²</span>
                                        </li>
                                    </ul>

                                    <Link
                                        href={`/properties/${p.slug}`}
                                        className="block w-full py-3 text-center border border-[#192537] text-[#192537] font-bold uppercase text-xs tracking-widest hover:bg-[#192537] hover:text-white transition-colors"
                                    >
                                        View Details
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
};
