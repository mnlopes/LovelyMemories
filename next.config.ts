import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
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
        hostname: 'lovely-memories.pt',
      },
      {
        protocol: 'https',
        hostname: '*.muscache.com',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/pages/:slug.html',
        destination: '/properties/:slug',
        permanent: true,
      },
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
