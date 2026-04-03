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
};

export default withNextIntl(nextConfig);
