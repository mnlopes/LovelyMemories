'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface BlogPostCardProps {
    title: string;
    date: string;
    image: string;
    slug: string;
    index: number;
}

export const BlogPostCard = ({ title, date, image, slug, index }: BlogPostCardProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="group relative"
        >
            <Link href={`/blog/${slug}`} className="block">
                <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-gray-100 mb-6">
                    <Image
                        src={image}
                        alt={title}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10" />
                </div>

                <div className="space-y-3">
                    <p className="text-sm tracking-wider text-gray-400 uppercase font-medium">
                        {date}
                    </p>
                    <h3 className="text-xl md:text-2xl font-semibold text-gray-900 leading-tight group-hover:text-primary transition-colors duration-300 line-clamp-2">
                        {title}
                    </h3>
                    <div className="pt-2">
                        <span className="inline-flex items-center text-sm font-semibold text-gray-900 group-hover:gap-2 transition-all duration-300">
                            Read more
                            <svg
                                className="ml-2 w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                        </span>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
};
