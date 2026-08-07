import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { supabase } from '@/lib/supabase';
import { PROPERTIES } from '@/lib/data';

const BASE_URL = 'https://www.lovelymemories.pt';
const { locales, defaultLocale } = routing;

// The sitemap reads live properties/blog posts from the DB, so backoffice changes
// show up without a redeploy. Re-generate at most once per hour.
export const revalidate = 3600;

// Public, indexable routes (path relative to /{locale}). Keep in sync with the
// real marketing pages under app/[locale]/(main). Auth/admin/booking are excluded.
// NOTE: no 'buildings' entry — only /buildings/[slug] exists, there is no listing
// page, so declaring it here served Google three 404s (one per locale). Individual
// building pages are still added by propertyEntries() below. Add it back if a
// listing page is ever created.
const STATIC_PATHS = [
  '',
  'about-us',
  'concierge',
  'properties',
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

function propertyEntry(path: string, lastModified: Date): MetadataRoute.Sitemap[number] {
  return {
    url: urlFor(defaultLocale, path),
    lastModified,
    changeFrequency: 'weekly',
    priority: 0.8,
    alternates: { languages: languagesFor(path) },
  };
}

/**
 * Property/building pages from the DB. The old static PROPERTIES list in lib/data.ts
 * drifts from reality: backoffice-created listings were missing from the sitemap and
 * never got indexed. Mirrors the site's own visibility rule (status !== 'hidden') and
 * URL rule (multi-unit parents live under /buildings, everything else under /properties).
 */
async function propertyEntries(now: Date): Promise<MetadataRoute.Sitemap> {
  const { data, error } = await supabase
    .from('properties')
    .select('slug, is_multi_unit, parent_id, created_at')
    .neq('status', 'hidden');

  if (error || !data || data.length === 0) {
    // Fail safe: never serve a property-less sitemap because of a transient DB error.
    if (error) console.error('sitemap: falling back to static property list:', error.message);
    return PROPERTIES.map((p) => propertyEntry(`properties/${p.slug}`, now));
  }

  return data
    .filter((p) => !!p.slug)
    .map((p) => {
      const path = p.is_multi_unit && !p.parent_id ? `buildings/${p.slug}` : `properties/${p.slug}`;
      return propertyEntry(path, p.created_at ? new Date(p.created_at) : now);
    });
}

/**
 * Published blog posts. Rows are per-locale (a translated post is a second row with the
 * same slug), so hreflang alternates are only claimed for locales where the post exists.
 */
async function blogEntries(now: Date): Promise<MetadataRoute.Sitemap> {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('slug, locale, updated_at')
    .eq('is_published', true);

  if (error || !data) {
    if (error) console.error('sitemap: skipping blog entries:', error.message);
    return [];
  }

  const bySlug = new Map<string, { locales: string[]; lastModified: Date }>();
  for (const post of data) {
    if (!post.slug || !post.locale) continue;
    const existing = bySlug.get(post.slug);
    const postDate = post.updated_at ? new Date(post.updated_at) : now;
    if (existing) {
      if (!existing.locales.includes(post.locale)) existing.locales.push(post.locale);
      if (postDate > existing.lastModified) existing.lastModified = postDate;
    } else {
      bySlug.set(post.slug, { locales: [post.locale], lastModified: postDate });
    }
  }

  return Array.from(bySlug, ([slug, info]) => {
    const path = `blog/${slug}`;
    const primary = info.locales.includes(defaultLocale) ? defaultLocale : info.locales[0];
    const languages: Record<string, string> = {};
    for (const l of info.locales) languages[l] = urlFor(l, path);
    return {
      url: urlFor(primary, path),
      lastModified: info.lastModified,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
      // A single-locale post has no translations to point hreflang at.
      alternates: info.locales.length > 1 ? { languages } : undefined,
    };
  });
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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

  const [properties, posts] = await Promise.all([propertyEntries(now), blogEntries(now)]);
  entries.push(...properties, ...posts);

  return entries;
}
