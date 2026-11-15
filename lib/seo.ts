import type { Metadata } from 'next';
import { routing } from '@/i18n/routing';

export const SITE_URL = 'https://www.lovelymemories.pt';

// Reference list of the search terms we target (Porto, Vila Nova de Gaia, Douro and
// the Algarve). NOT emitted as a <meta name="keywords">: Google has ignored that tag
// since 2009 and it only shows competitors our strategy. The terms belong in titles,
// headings, body text and alt texts, where they count.
export const SITE_KEYWORDS = [
  'alojamento local Porto',
  'luxury apartments Porto',
  'luxury stays Porto',
  'Vila Nova de Gaia accommodation',
  'alojamento local Gaia',
  'Douro valley villa',
  'Algarve luxury rental',
  'alojamento local Algarve',
  'gestão de alojamento local',
  'property management Portugal',
  'concierge Porto',
  'short-stay rentals Portugal',
];

const OG_LOCALES: Record<string, string> = { en: 'en_US', pt: 'pt_PT' };

const BRAND_SUFFIX = ' | Lovely Memories';
const TITLE_MAX = 60; // Google cuts titles around 60 characters

/**
 * The root layout appends "| Lovely Memories" to every title. When that would push
 * a title past what Google shows, drop the brand instead of the keywords (Google
 * already shows the site name above each result).
 */
export function brandedTitle(title: string): Metadata['title'] {
  return title.length + BRAND_SUFFIX.length > TITLE_MAX ? { absolute: title } : title;
}

/** Cuts a meta description at a word boundary, ~155 characters (what Google shows). */
export function clampDescription(text: string, max = 155): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const atWord = cut.slice(0, cut.lastIndexOf(' ')).replace(/[\s.,;:–—-]+$/, '');
  return `${atWord || cut}…`;
}

/**
 * Build complete, SEO-correct metadata for a marketing page.
 * - `title` must NOT include the brand — the root layout template adds "| Lovely Memories"
 *   (or, for long titles, `brandedTitle` leaves it out).
 * - A page-level openGraph fully replaces the layout's, so this returns a complete one
 *   (including the social image), otherwise the share preview breaks.
 */
export function buildPageMetadata({
  locale,
  path,
  title,
  description,
}: {
  locale: string;
  path: string; // relative to /{locale}, e.g. 'about-us' ('' for the homepage)
  title: string;
  description: string;
}): Metadata {
  const rel = path ? `/${path}` : '';
  const languages: Record<string, string> = {};
  for (const l of routing.locales) languages[l] = `${SITE_URL}/${l}${rel}`;
  languages['x-default'] = `${SITE_URL}/${routing.defaultLocale}${rel}`;
  const url = `${SITE_URL}/${locale}${rel}`;

  return {
    title: brandedTitle(title),
    description,
    alternates: { canonical: url, languages },
    openGraph: {
      type: 'website',
      siteName: 'Lovely Memories',
      locale: OG_LOCALES[locale] ?? 'en_US',
      title: `Lovely Memories — ${title}`,
      description,
      url,
      images: ['/opengraph-image.png'],
    },
  };
}
