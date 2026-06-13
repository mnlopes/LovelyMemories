'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Share2, Check } from 'lucide-react';
import { useLocale } from 'next-intl';

interface BlogPostCardProps {
    title: string;
    date: string;
    excerpt?: string;
    image: string;
    slug: string;
    index: number;
    authorName?: string;
    authorImage?: string;
}

export const BlogPostCard = ({ title, date, excerpt, image, slug, index, authorName, authorImage }: BlogPostCardProps) => {
    const locale = useLocale();
    const [copied, setCopied] = React.useState(false);

    const handleShare = async (e: React.SyntheticEvent) => {
        // The whole card is a <Link>; prevent navigation when copying.
        e.preventDefault();
        e.stopPropagation();
        const url = `${window.location.origin}/${locale}/blog/${slug}`;
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Clipboard unavailable — silently ignore (no toast, just no check).
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="group h-full"
        >
            <Link href={`/blog/${slug}`} className="block h-full">
                <div className="flex flex-col h-full bg-white rounded-2xl overflow-hidden border border-gray-100 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] hover:-translate-y-2">
                    {/* IMAGE CONTAINER */}
                    <div className="relative aspect-[16/10] overflow-hidden">
                        <Image
                            src={image}
                            alt={title}
                            fill
                            className="object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    </div>

                    {/* CONTENT AREA */}
                    <div className="flex flex-col flex-grow p-6 md:p-8">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between gap-4">
                                <p className="text-[10px] md:text-xs tracking-[0.2em] text-gray-400 uppercase font-bold">
                                    {date}
                                </p>
                                
                                {authorName && (
                                    <div className="flex items-center gap-2">
                                        <div className="h-px w-4 bg-gray-200" />
                                        <span className="text-[10px] text-gray-500 font-bold tracking-[0.1em] uppercase">
                                            {authorName}
                                        </span>
                                    </div>
                                )}
                            </div>
                            
                            <h3 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight group-hover:text-primary transition-colors duration-300 line-clamp-2">
                                {title}
                            </h3>

                            {excerpt && (
                                <p className="text-gray-500 text-sm md:text-base leading-relaxed line-clamp-3 font-light">
                                    {excerpt}
                                </p>
                            )}
                        </div>

                        <div className="mt-auto pt-8 flex items-center justify-between gap-4">
                            <span className="inline-flex items-center text-sm font-bold text-gray-900 group/link">
                                <span className="relative">
                                    Read more
                                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gray-900 transition-all duration-300 group-hover:w-full" />
                                </span>
                                <svg
                                    className="ml-2 w-4 h-4 transition-transform duration-300 group-hover:translate-x-2"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                </svg>
                            </span>

                            <span
                                role="button"
                                tabIndex={0}
                                aria-label={copied ? (locale === 'en' ? 'Link copied' : 'Link copiado') : (locale === 'en' ? 'Copy link' : 'Copiar link')}
                                onClick={handleShare}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleShare(e); }}
                                className={`inline-flex items-center justify-center w-9 h-9 rounded-full border transition-colors shrink-0 ${copied ? 'border-green-500 text-green-600' : 'border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-900'}`}
                            >
                                {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                            </span>
                        </div>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
};
