'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { BlogPostCard } from './BlogPostCard';

const BLOG_POSTS = [
    {
        id: 1,
        title: "Last Post",
        date: "10 / 04 / 2024",
        image: "/legacy/blog/images/blog-img-1-450x253.png",
        slug: "last-post"
    },
    {
        id: 2,
        title: "Lorem ipsum dolor sit amet, consect tur adipiscing elit dignissim pulvisimi color mala papa",
        date: "10 / 04 / 2024",
        image: "/legacy/blog/images/blog-img-3-450x253.png",
        slug: "lorem-ipsum-1"
    },
    {
        id: 3,
        title: "Uncovering the hidden gems of Porto's Ribeira district",
        date: "05 / 04 / 2024",
        image: "/legacy/blog/images/blog-img-2-315x253.png",
        slug: "porto-hidden-gems"
    },
    {
        id: 4,
        title: "The best luxury retreats for your summer vacation in Portugal",
        date: "28 / 03 / 2024",
        image: "/legacy/blog/images/blog-img-3-450x253.png",
        slug: "luxury-retreats"
    },
    {
        id: 5,
        title: "Sustainable travel: How we are making a difference in Porto",
        date: "15 / 03 / 2024",
        image: "/legacy/blog/images/blog-img-1-450x253.png",
        slug: "sustainable-travel"
    },
    {
        id: 6,
        title: "A food lover's guide to the best restaurants in the city",
        date: "02 / 03 / 2024",
        image: "/legacy/blog/images/blog-img-2-1-315x253.png",
        slug: "food-lovers-guide"
    }
];

export const BlogContent = () => {
    const t = useTranslations('Blog');

    return (
        <div className="bg-white min-h-screen">
            {/* HERO SECTION */}
            <section className="relative h-[60vh] flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <img
                        src="/legacy/blog/images/Blog-background.png"
                        alt="Blog Hero"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40" />
                </div>

                <div className="relative z-10 container mx-auto px-4 text-center">
                    <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 max-w-4xl mx-auto leading-tight">
                        {t('heroTitle')}
                    </h1>
                    <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto font-light">
                        {t('heroSubtitle')}
                    </p>
                </div>
            </section>

            {/* BLOG GRID */}
            <section className="py-20 md:py-32 bg-white">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
                        {BLOG_POSTS.map((post, index) => (
                            <BlogPostCard
                                key={post.id}
                                index={index}
                                {...post}
                            />
                        ))}
                    </div>

                    {/* PAGINATION (Placeholder) */}
                    <div className="mt-20 flex justify-center items-center gap-4">
                        <button className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center text-gray-900 font-medium hover:bg-gray-50 transition-colors">
                            01
                        </button>
                        <button className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 font-medium hover:bg-gray-50 hover:text-gray-900 transition-colors">
                            02
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
};
