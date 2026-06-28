import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Lovely Memories — Luxury Stays & Property Management',
    short_name: 'Lovely Memories',
    description:
      'Curated luxury homes with concierge service in Porto, Vila Nova de Gaia and the Douro, plus full property management for owners.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a1128',
    theme_color: '#0a1128',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
