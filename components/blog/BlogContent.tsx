'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { BlogPostCard } from './BlogPostCard';

interface BlogContentProps {
    initialPosts: any[];
    locale: string;
}

export const BlogContent = ({ initialPosts, locale }: BlogContentProps) => {
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
            <section className="py-20 md:py-32 bg-gray-50/50">
                <div className="container mx-auto px-4">
                    {initialPosts.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
                            {initialPosts.map((post, index) => (
                                <BlogPostCard
                                    key={post.id}
                                    index={index}
                                    title={post.title}
                                    excerpt={post.excerpt}
                                    date={new Intl.DateTimeFormat(locale, {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric'
                                    }).format(new Date(post.created_at || new Date()))}
                                    image={post.image_url || "/legacy/blog/images/blog-img-1-450x253.png"}
                                    slug={post.slug}
                                    authorName={post.author_name}
                                    authorImage={post.author_image_url}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 text-gray-500">
                            <p className="text-xl italic">{t('noPosts') || 'No stories found yet. Come back soon!'}</p>
                        </div>
                    )}

                    {/* PAGINATION - Optional for future */}
                    {initialPosts.length > 9 && (
                        <div className="mt-20 flex justify-center items-center gap-4">
                            <button className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center text-gray-900 font-medium hover:bg-gray-50 transition-colors">
                                01
                            </button>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};
