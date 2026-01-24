"use client";

import Image from "next/image";
import { Star, Quote, ArrowUpRight } from "lucide-react";
import { SpotlightCard } from "./ui/SpotlightCard";

export const BentoGrid = () => {
    return (
        <section className="py-32 bg-navy-950 relative z-10">
            <div className="container mx-auto px-6">

                <div className="mb-16">
                    <h2 className="text-5xl md:text-7xl font-playfair text-white leading-tight">
                        More than just <br />
                        <span className="text-white/50 italic">a place to stay.</span>
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px] cursor-none">

                    {/* Col 1 - Row 1: Ratings */}
                    <SpotlightCard className="p-8 flex flex-col justify-between group">
                        <div className="flex -space-x-3">
                            {[
                                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=100&auto=format&fit=crop",
                                "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=100&auto=format&fit=crop",
                                "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=100&auto=format&fit=crop",
                                "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100&auto=format&fit=crop"
                            ].map((img, i) => (
                                <div key={i} className="w-10 h-10 rounded-full border-2 border-navy-950 relative overflow-hidden">
                                    <Image
                                        src={img}
                                        alt="User"
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                            ))}
                            <div className="w-10 h-10 rounded-full border-2 border-navy-950 bg-gold-400 flex items-center justify-center text-navy-950 font-bold text-xs">
                                2k+
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-5xl font-playfair text-white font-bold">4.98</span>
                                <div className="flex text-gold-400">
                                    <Star className="w-5 h-5 fill-current" />
                                    <Star className="w-5 h-5 fill-current" />
                                    <Star className="w-5 h-5 fill-current" />
                                    <Star className="w-5 h-5 fill-current" />
                                    <Star className="w-5 h-5 fill-current" />
                                </div>
                            </div>
                            <p className="text-white/60 text-sm">Average rating from verified guests across our properties.</p>
                        </div>
                    </SpotlightCard>

                    {/* Col 2 - Row 1: Featured Image (Architecture) */}
                    <SpotlightCard className="relative group md:col-span-2">
                        <Image
                            src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=2053&auto=format&fit=crop"
                            alt="Architecture"
                            fill
                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 to-transparent p-8 flex flex-col justify-end">
                            <span className="text-gold-400 text-xs uppercase tracking-widest mb-2">Architecture</span>
                            <h3 className="text-2xl text-white font-playfair">Award-winning Design</h3>
                        </div>

                        {/* Hover Button */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                            <div className="bg-[#EAE8E4] px-6 py-2 rounded-full flex items-center gap-3 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 shadow-xl">
                                <span className="text-navy-950 font-medium">View Now</span>
                                <div className="w-8 h-8 rounded-full bg-navy-950 flex items-center justify-center">
                                    <ArrowUpRight className="w-4 h-4 text-white" />
                                </div>
                            </div>
                        </div>
                    </SpotlightCard>

                    {/* Col 1 - Row 2: Tall Image (Interior) */}
                    <SpotlightCard className="relative group md:row-span-2">
                        <Image
                            src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?q=80&w=1974&auto=format&fit=crop"
                            alt="Interior"
                            fill
                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute bottom-6 left-6 right-6">
                            <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10">
                                <p className="text-white text-sm font-medium">"The interior details are simply breathtaking."</p>
                            </div>
                        </div>

                        {/* Hover Button */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                            <div className="bg-[#EAE8E4] px-6 py-2 rounded-full flex items-center gap-3 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 shadow-xl">
                                <span className="text-navy-950 font-medium">View Now</span>
                                <div className="w-8 h-8 rounded-full bg-navy-950 flex items-center justify-center">
                                    <ArrowUpRight className="w-4 h-4 text-white" />
                                </div>
                            </div>
                        </div>
                    </SpotlightCard>

                    {/* Col 2 - Row 2: Services / Tags */}
                    <SpotlightCard className="p-8 flex flex-col justify-center gap-4 bg-gold-900/10">
                        <h3 className="text-white text-xl font-playfair mb-2">Concierge Services</h3>
                        <div className="flex flex-wrap gap-2">
                            {["Private Chef", "Chauffeur", "Spa Treatments", "Event Planning", "Yacht Charter", "Security"].map((tag, i) => (
                                <span key={i} className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/80 text-xs hover:bg-gold-400 hover:text-navy-950 transition-colors cursor-default">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </SpotlightCard>

                    {/* Col 3 - Row 2: Dark Quote */}
                    <SpotlightCard className="p-8 bg-navy-900 flex flex-col justify-between">
                        <Quote className="w-8 h-8 text-gold-400/50" />
                        <p className="text-white/80 font-playfair text-xl leading-relaxed">
                            "Lovely Memories transformed our vacation into an unforgettable experience. The service is unmatched."
                        </p>
                        <div className="flex items-center gap-3 mt-4">
                            <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden relative">
                                <Image src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100&auto=format&fit=crop" alt="User" fill className="object-cover" />
                            </div>
                            <div>
                                <p className="text-white text-sm font-bold">James R.</p>
                                <p className="text-white/40 text-xs">London, UK</p>
                            </div>
                        </div>
                    </SpotlightCard>

                    {/* Col 2/3 - Row 3: Wide Stat/CTA */}
                    <SpotlightCard className="md:col-span-2 p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                        <div>
                            <h3 className="text-6xl md:text-8xl font-playfair text-white font-bold opacity-20">98%</h3>
                            <p className="text-white text-lg">Of our guests return for another stay.</p>
                        </div>
                        <div className="w-full md:w-auto">
                            <button className="group flex items-center gap-4 px-8 py-4 bg-gold-400 text-navy-950 rounded-full font-medium hover:bg-white transition-colors w-full justify-center">
                                Book Your Experience
                                <ArrowUpRight className="w-4 h-4 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />
                            </button>
                        </div>
                    </SpotlightCard>

                </div>
            </div>
        </section>
    );
};
