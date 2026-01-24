import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';
const repoName = '/LovelyMemories';

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
  basePath: isProd ? repoName : '',
  assetPrefix: isProd ? repoName : '',
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
