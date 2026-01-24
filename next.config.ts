import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'plus.unsplash.com',
      },
    ],
  },
  basePath: '/LovelyMemories',
  assetPrefix: '/LovelyMemories',
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

export default nextConfig;
