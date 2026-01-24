"use client";

import Image from "next/image";
import { Star } from "lucide-react";
import { SpotlightCard } from "./ui/SpotlightCard";

const SCORES = [
    { label: "Cleanliness", score: "4.9" },
    { label: "Accuracy", score: "5.0" },
    { label: "Check-in", score: "5.0" },
    { label: "Communication", score: "5.0" }
];

const REVIEWS = [
    {
        name: "Andrew K.",
        location: "Zwolle, Netherlands",
        date: "Aug 28, 2025",
        rating: 5.0,
        text: "Felt like a true home away from home! The apartment was spotless, beautifully decorated, and just steps from Central Park. The host was super responsive – I'd definitely stay again.",
        avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=3387&auto=format&fit=crop"
    },
    {
        name: "Patrick T.",
        location: "Warsaw, Poland",
        date: "Jul 03, 2025",
        rating: 5.0,
        text: "Amazing location on 5th Avenue! Central Park is a short walk away, and the apartment was safe, clean, and welcoming. The stylish design made it a perfect base to explore the city – truly a gem!",
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=2960&auto=format&fit=crop"
    },
    {
        name: "Inessa J.",
        location: "Vienna, Austria",
        date: "Apr 10, 2025",
        rating: 5.0,
        text: "Great value for the location. Comfortable beds, modern decor, and the subway is so close by. Ideal choice for a weekend in the city. The amenities were top notch.",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=3387&auto=format&fit=crop"
    },
    {
        name: "Lina S.",
        location: "Berlin, Germany",
        date: "Aug 13, 2025",
        rating: 5.0,
        text: "Perfect spot for exploring lively New York! Central Park is minutes away, the subway close, and the apartment was cozy and stylish. Love it!",
        avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=3461&auto=format&fit=crop"
    },
    {
        name: "Sofia W.",
        location: "Rome, Italy",
        date: "Jun 08, 2025",
        rating: 5.0,
        text: "Such a comfortable stay! The beds were great, the apartment was quiet, and the host made check-in super easy. With a 100% response rate, communication was smooth and stress-free.",
        avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?q=80&w=2960&auto=format&fit=crop"
    },
    {
        name: "Michael B.",
        location: "Porto, Portugal",
        date: "Mar 17, 2025",
        rating: 5.0,
        text: "Superhost service all the way. The place was beautiful, communication was instant, and I felt right at home from the start. The atmosphere was so welcoming. Five stars without a doubt!",
        avatar: "https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=2960&auto=format&fit=crop"
    }
];

// Laurel Icon Component
const Laurel = ({ className }: { className?: string }) => (
    <svg
        viewBox="0 0 100 100"
        fill="currentColor"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
    >
        {/* Main stem curve */}
        <path d="M50 85 C50 85 25 80 15 35" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />

        {/* Leaves - Left Side */}
        <path d="M44 78 Q 38 75 35 68 Q 42 70 44 78" fill="currentColor" stroke="none" />
        <path d="M38 70 Q 30 65 28 58 Q 36 60 38 70" fill="currentColor" stroke="none" />
        <path d="M32 60 Q 24 55 22 48 Q 30 50 32 60" fill="currentColor" stroke="none" />
        <path d="M26 50 Q 18 45 18 38 Q 25 40 26 50" fill="currentColor" stroke="none" />
        <path d="M22 40 Q 15 35 16 30 Q 22 34 22 40" fill="currentColor" stroke="none" />

        {/* Leaves - Right Side (Inside curve) */}
        <path d="M46 76 Q 40 70 42 62 Q 48 68 46 76" fill="currentColor" stroke="none" />
        <path d="M40 66 Q 34 60 36 52 Q 42 58 40 66" fill="currentColor" stroke="none" />
        <path d="M34 56 Q 28 50 30 42 Q 36 48 34 56" fill="currentColor" stroke="none" />
        <path d="M28 46 Q 24 40 25 35 Q 30 40 28 46" fill="currentColor" stroke="none" />
    </svg>
);

import { urlFor } from "@/sanity/lib/image";

// Keep mock data as fallback or removed if preferred.
// ... (keep usage of REVIEWS for fallback if data is empty, or better, show nothing/message)

export const ReviewsSection = ({ agent, reviews }: { agent: any, reviews?: any[] }) => {
    // Use passed reviews or fallback to empty array (or keep mocks if you want defaults)
    const displayReviews = reviews && reviews.length > 0 ? reviews : [];

    if (displayReviews.length === 0) return null; // Or return mock data

    return (
        <section className="py-24 border-y border-white/5 bg-navy-950/50">
            <div className="container mx-auto px-6">

                {/* Header Section */}
                <div className="text-center mb-16">
                    <span className="text-gold-400 text-sm font-medium tracking-widest uppercase mb-4 block">Reviews</span>

                    <div className="flex items-center justify-center gap-8 mb-6 relative">
                        {/* Left Star */}
                        <Star className="w-12 h-12 text-gold-400 fill-gold-400 opacity-80" />

                        <span className="text-7xl md:text-8xl font-playfair text-white font-bold leading-none px-2 flex items-baseline">
                            4.9<span className="translate-y-3">8</span>
                        </span>

                        {/* Right Star */}
                        <Star className="w-12 h-12 text-gold-400 fill-gold-400 opacity-80" />
                    </div>

                    <p className="text-white/60 text-lg max-w-md mx-auto mb-12">
                        We're proud to deliver a stay that guests consistently love.
                    </p>

                    {/* Scores Row */}
                    <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-6">
                        {SCORES.map((item, i) => (
                            <div key={i} className="flex flex-col items-center">
                                <span className="text-xl font-bold text-white mb-1">{item.score}</span>
                                <span className="text-xs text-gold-400 uppercase tracking-widest">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Reviews Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayReviews.map((review: any, i: number) => {
                        const avatarUrl = review.avatar ? urlFor(review.avatar).url() : "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=100&auto=format&fit=crop"; // Fallback
                        return (
                            <SpotlightCard key={i} className="p-8">
                                {/* User User */}
                                <div className="flex items-start justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="relative w-12 h-12 rounded-full overflow-hidden bg-white/10">
                                            <Image
                                                src={avatarUrl}
                                                alt={review.name || "Guest"}
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                        <div>
                                            <h4 className="text-white font-medium leading-tight">{review.name}</h4>
                                            <p className="text-white/40 text-xs">{review.location}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="text-white font-bold text-sm">{review.rating}</span>
                                        <Star className="w-3 h-3 text-gold-400 fill-gold-400" />
                                    </div>
                                </div>

                                {/* Content */}
                                <p className="text-white/70 text-sm leading-relaxed mb-6 font-light">
                                    " {review.text} "
                                </p>

                                <span className="text-white/30 text-xs font-medium">{review.date}</span>
                            </SpotlightCard>
                        )
                    })}
                </div>

            </div>
        </section>
    );
};
