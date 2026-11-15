import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // S-13: don't advertise the framework (X-Powered-By: Next.js) to scanners.
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'plus.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'onujtyzpvaejrvhjmlwn.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '*.muscache.com',
      },
    ],
  },
  async redirects() {
    // Host canonicalization (apex -> www) is handled by Vercel's domain config,
    // so it is intentionally NOT done here (a www -> apex redirect here would
    // collide with Vercel's apex -> www 308 and create an infinite loop).
    return [
      {
        source: '/pages/:slug.html',
        destination: '/properties/:slug',
        permanent: true,
      },
      // Hebrew was dropped (i18n/routing.ts): send old /he URLs, possibly indexed, to English.
      { source: '/he', destination: '/en', permanent: true },
      { source: '/he/:path*', destination: '/en/:path*', permanent: true },
      // SEO-6: the old property route /property/:slug answered 500. The page lives at
      // /properties/:slug; the route was removed.
      { source: '/:locale(en|pt)/property/:slug', destination: '/:locale/properties/:slug', permanent: true },
      { source: '/property/:slug', destination: '/en/properties/:slug', permanent: true },
    ]
  },
  async headers() {
    // Baseline security headers applied to every route. A strict Content-Security-Policy
    // is intentionally NOT set here yet (it needs careful allow-listing of Stripe, GA,
    // Supabase, fonts, etc.) — that's a follow-up. These are the safe, high-value ones.
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=()' },
        ],
      },
    ]
  },
};

export default withNextIntl(nextConfig);
