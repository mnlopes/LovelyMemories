import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { PROPERTIES } from '@/lib/data';

const BASE_URL = 'https://www.lovelymemories.pt';
const { locales, defaultLocale } = routing;

// Public, indexable routes (path relative to /{locale}). Keep in sync with the
// real marketing pages under app/[locale]/(main). Auth/admin/booking are excluded.
const STATIC_PATHS = [
  '',
  'about-us',
  'concierge',
  'properties',
  'buildings',
  'contact',
  'blog',
  'join',
  'privacy-policy',
  'terms-conditions',
];

function urlFor(locale: string, path: string) {
  return `${BASE_URL}/${locale}${path ? `/${path}` : ''}`;
}

// hreflang alternates so Google serves the right language per visitor.
function languagesFor(path: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of locales) languages[locale] = urlFor(locale, path);
  languages['x-default'] = urlFor(defaultLocale, path);
  return languages;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const path of STATIC_PATHS) {
    entries.push({
      url: urlFor(defaultLocale, path),
      lastModified: now,
      changeFrequency: path === '' ? 'daily' : 'weekly',
      priority: path === '' ? 1 : path === 'properties' ? 0.9 : 0.7,
      alternates: { languages: languagesFor(path) },
    });
  }

  for (const property of PROPERTIES) {
    const path = `properties/${property.slug}`;
    entries.push({
      url: urlFor(defaultLocale, path),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
      alternates: { languages: languagesFor(path) },
    });
  }

  return entries;
}
