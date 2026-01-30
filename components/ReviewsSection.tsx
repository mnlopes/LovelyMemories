"use client";

import React from "react";
import { motion } from "framer-motion";
import { Star, MessageSquareQuote } from "lucide-react";
import { urlFor } from "@/sanity/lib/image";

interface Review {
    name: string;
    location: string;
    date: string;
    rating: number;
    text: string;
    avatar?: any;
}

interface Agent {
    name?: string;
    role?: string;
    image?: any;
    email?: string;
    phone?: string;
}

interface ReviewsSectionProps {
    agent: Agent;
    reviews: Review[];
}

export function ReviewsSection({ agent, reviews }: ReviewsSectionProps) {
    // If no reviews, we can show a placeholder or nothing
    if (!reviews || reviews.length === 0) return null;

    // Calculate average rating
    const averageRating = reviews.reduce((acc, rev) => acc + rev.rating, 0) / reviews.length;

    return (
        <section className="py-32 bg-[#FBFBFA] border-y border-gray-100 overflow-hidden">
            <div className="container mx-auto px-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-20">
                    <div className="space-y-4">
                        <h3 className="text-[11px] font-extrabold text-[#AD9C7E] uppercase tracking-[0.4em]">Guest Experiences</h3>
                        <h2 className="text-4xl md:text-6xl font-playfair font-bold text-navy-950">Reviews from our guests</h2>
                    </div>

                    <div className="flex items-center gap-6 bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm self-start">
                        <div className="flex flex-col">
                            <span className="text-3xl font-bold text-navy-950">{averageRating.toFixed(1)}</span>
                            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Average Rating</span>
                        </div>
                        <div className="flex gap-1 text-[#AD9C7E]">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} size={16} fill={i < Math.floor(averageRating) ? "currentColor" : "none"} />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Reviews Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {reviews.map((review, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: i * 0.1 }}
                            className="bg-white p-10 rounded-[40px] border border-gray-50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500 flex flex-col h-full"
                        >
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 shrink-0 border border-gray-100">
                                    {review.avatar ? (
                                        <img
                                            src={urlFor(review.avatar).width(100).height(100).url()}
                                            alt={review.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-navy-950 font-bold text-sm">
                                            {review.name.charAt(0)}
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col">
                                    <h5 className="font-bold text-navy-950 text-sm">{review.name}</h5>
                                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">{review.location}</p>
                                </div>
                            </div>

                            <div className="flex gap-1 text-[#AD9C7E] mb-6">
                                {[...Array(5)].map((_, starIdx) => (
                                    <Star key={starIdx} size={12} fill={starIdx < review.rating ? "currentColor" : "none"} />
                                ))}
                            </div>

                            <div className="relative flex-1">
                                <MessageSquareQuote className="absolute -top-4 -left-4 w-8 h-8 text-gray-100 -z-1" />
                                <p className="text-navy-950/70 text-base leading-relaxed font-medium italic relative z-10">
                                    "{review.text}"
                                </p>
                            </div>

                            <div className="mt-8 pt-6 border-t border-gray-50 flex justify-between items-center">
                                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                                    {new Date(review.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Agent Badge (Optional footer for section) */}
                {agent && (
                    <div className="mt-20 pt-10 border-t border-gray-100 flex flex-col items-center justify-center text-center">
                        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-[0.3em] mb-6">Verified by your concierge</p>
                        <div className="flex items-center gap-4 bg-white py-3 px-6 rounded-full border border-gray-100 shadow-sm">
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 shrink-0">
                                {agent.image && (
                                    <img
                                        src={urlFor(agent.image).width(64).height(64).url()}
                                        alt={agent.name}
                                        className="w-full h-full object-cover"
                                    />
                                )}
                            </div>
                            <span className="text-sm font-bold text-navy-950">{agent.name}</span>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
