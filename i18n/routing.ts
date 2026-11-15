import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
    // A list of all locales that are supported. Hebrew ('he') was planned early on and then
    // dropped: /he/* redirects permanently to /en/* (next.config.ts).
    locales: ['en', 'pt'],

    // Used when no locale matches
    defaultLocale: 'en',

    // SEO-3: no hreflang `Link:` header from next-intl. It announced x-default as "/" while the
    // HTML and the sitemap say /en, and it listed language versions of posts that don't exist.
    // The hreflang alternates come only from page metadata (lib/seo.ts) and the sitemap.
    alternateLinks: false
});

// Lightweight wrappers around Next.js' navigation APIs
// that will consider the routing configuration
export const { Link, redirect, usePathname, useRouter } =
    createNavigation(routing);
