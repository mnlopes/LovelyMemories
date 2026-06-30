import type { Metadata } from 'next';
import { routing } from '@/i18n/routing';

export const SITE_URL = 'https://www.lovelymemories.pt';

// Target keywords across our operating + expansion areas (Porto, Vila Nova de
// Gaia, Douro and the Algarve). Google mostly ignores the keywords meta, but we
// surface the same terms in titles/descriptions/content where they actually count.
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

const OG_LOCALES: Record<string, string> = { en: 'en_US', pt: 'pt_PT', he: 'he_IL' };

/**
 * Build complete, SEO-correct metadata for a marketing page.
 * - `title` must NOT include the brand — the root layout template adds "| Lovely Memories".
 * - A page-level openGraph fully replaces the layout's, so this returns a complete one
 *   (including the social image), otherwise the share preview breaks.
 */
export function buildPageMetadata({
  locale,
  path,
  title,
  description,
  keywords = SITE_KEYWORDS,
}: {
  locale: string;
  path: string; // relative to /{locale}, e.g. 'about-us' ('' for the homepage)
  title: string;
  description: string;
  keywords?: string[];
}): Metadata {
  const rel = path ? `/${path}` : '';
  const languages: Record<string, string> = {};
  for (const l of routing.locales) languages[l] = `${SITE_URL}/${l}${rel}`;
  languages['x-default'] = `${SITE_URL}/${routing.defaultLocale}${rel}`;
  const url = `${SITE_URL}/${locale}${rel}`;

  return {
    title,
    description,
    keywords,
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
