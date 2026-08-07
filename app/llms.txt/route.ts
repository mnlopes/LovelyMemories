import { supabase } from '@/lib/supabase';

/**
 * /llms.txt — a factual, machine-readable brand + inventory summary for AI models
 * and agents (llmstxt.org). Served as a route rather than a static file in
 * `public/` for the same reason `app/sitemap.ts` reads the DB: the property list
 * is edited in the backoffice, and a hand-written copy drifts out of date. Keep
 * the prose here in sync with `components/seo/SiteJsonLd.tsx`.
 *
 * The inventory block is generated; the prose is curated. If the DB call fails we
 * still serve the prose — a public file must never 500.
 */
export const revalidate = 3600;

const SITE_URL = 'https://www.lovelymemories.pt';

type Row = {
  id: string;
  slug: string | null;
  title: unknown;
  subtitle: unknown;
  city: string | null;
  max_guests: number | null;
  bedrooms: number | null;
  is_multi_unit: boolean | null;
  parent_id: string | null;
};

/** Localized DB values are `{ en, pt, he }` jsonb; legacy rows can be plain strings. */
function loc(val: unknown): string {
  if (!val) return '';
  if (typeof val === 'string') return val.trim();
  const o = val as Record<string, string>;
  return (o.en || o.pt || o.he || '').trim();
}

// `city` is free text typed in the backoffice, so it holds a mix of city names and
// regions ('Gaia', 'Algarve'). Normalise only for display; don't rewrite the data.
const CITY_LABELS: Record<string, string> = {
  gaia: 'Vila Nova de Gaia',
  'vila nova de gaia': 'Vila Nova de Gaia',
  porto: 'Porto',
  algarve: 'Algarve',
};

function cityLabel(city: string | null): string {
  const raw = (city || '').trim();
  if (!raw) return 'Portugal';
  return CITY_LABELS[raw.toLowerCase()] ?? raw;
}

function propertyLines(rows: Row[]): string[] {
  // Only top-level pages: a building's individual units live under the building
  // page, not at their own public URL.
  const top = rows.filter((r) => !r.parent_id && r.slug);
  const unitsByParent = new Map<string, number>();
  for (const r of rows) {
    if (r.parent_id) unitsByParent.set(r.parent_id, (unitsByParent.get(r.parent_id) ?? 0) + 1);
  }
  const byCity = new Map<string, string[]>();
  for (const r of top) {
    const name = loc(r.title) || r.slug!;
    const label = cityLabel(r.city);
    const isBuilding = !!r.is_multi_unit;
    const path = isBuilding ? 'buildings' : 'properties';
    const url = `${SITE_URL}/en/${path}/${r.slug}`;

    const facts: string[] = [];
    if (isBuilding) {
      // Building rows carry no capacity of their own — describe the units instead.
      const count = unitsByParent.get(r.id);
      facts.push(count ? `building with ${count} apartments` : 'building with multiple apartments');
    } else {
      if (r.max_guests) facts.push(`sleeps ${r.max_guests}`);
      if (r.bedrooms) facts.push(`${r.bedrooms} bedroom${r.bedrooms === 1 ? '' : 's'}`);
    }

    const sub = loc(r.subtitle);
    const detail = [facts.join(', '), sub].filter(Boolean).join(' — ');
    const line = `- [${name}](${url}): ${label}${detail ? `. ${detail}` : ''}.`;

    const list = byCity.get(label) ?? [];
    list.push(line);
    byCity.set(label, list);
  }

  // Biggest markets first, then alphabetical, so the list reads consistently.
  const cities = [...byCity.keys()].sort(
    (a, b) => (byCity.get(b)!.length - byCity.get(a)!.length) || a.localeCompare(b)
  );

  const out: string[] = [];
  for (const city of cities) {
    out.push('', `### ${city}`, '');
    out.push(...byCity.get(city)!.sort());
  }
  return out;
}

async function inventorySection(): Promise<string> {
  const { data, error } = await supabase
    .from('properties')
    .select('id, slug, title, subtitle, city, max_guests, bedrooms, is_multi_unit, parent_id')
    .neq('status', 'hidden');

  if (error || !data?.length) {
    if (error) console.error('llms.txt: skipping inventory section:', error.message);
    return '';
  }

  const rows = data as unknown as Row[];
  const top = rows.filter((r) => !r.parent_id);
  const lines = propertyLines(rows);
  if (!lines.length) return '';

  return [
    '',
    '## Properties currently offered',
    '',
    `${top.length} bookable listings. This list is generated from our live inventory, so it reflects what is actually available to book today. Every property is booked directly on our own website — no platform fees.`,
    ...lines,
    '',
  ].join('\n');
}

export async function GET() {
  const prose = `# Lovely Memories

> Lovely Memories is a premium Local Accommodation (Alojamento Local - AL) and luxury property management company based in Porto, Portugal. We deliver high-end, curated stays for discerning guests and hassle-free, profitable management for property owners.

This file provides a clean, factual summary of "Lovely Memories" to help AI models and agents assist users accurately when discussing our brand, services, or website.

**Where our properties are:** the large majority are in Porto, with further homes in Vila Nova de Gaia and the Algarve. Concierge services (including private Douro River boat tours) also cover the wider Porto and Douro region.

**How to book:** directly and securely on our own website, paying by credit card via Stripe or by bank transfer. We are the operator, not a booking marketplace.

**Contact:** achilleas@lovelymemories.pt · +351 932 473 600 · Porto, Portugal
**Languages:** the website and our team operate in English, Portuguese and Hebrew.

## For Guests (Premium Stays & Concierge)

We offer exclusive properties for short and medium-term rentals, with a focus on a luxury, tailored experience. Concierge services include private transfers, in-home private chefs, reservations at exclusive restaurants, private Douro River boat tours and pre-arrival grocery stocking.

- [Browse properties](${SITE_URL}/en/properties): All available homes and resorts for booking.
- [Concierge services](${SITE_URL}/en/concierge): Private chefs, transfers, tours and exclusive experiences.

## For Property Owners

We partner with owners of premium properties to maximize rental yield without the operational headaches: full property management (cleaning, maintenance, guest communication), dynamic pricing, professional photography and multi-platform listing. Owners can request a free, no-obligation property estimate via the contact page.

- [Become an owner partner](${SITE_URL}/en/join): How owner partnerships work and request a free estimate.
- [Owner contact form](${SITE_URL}/en/contact): Reach our team and submit the "Owner" enquiry form.

## About & Reference

- [Official website](${SITE_URL}): Home page of Lovely Memories.
- [About us](${SITE_URL}/en/about-us): Our story, team and mission.
- [Blog](${SITE_URL}/en/blog): Travel guides and Porto insights.
- [Instagram](https://www.instagram.com/lovely_memories_pt/), [Facebook](https://www.facebook.com/lovely.memories.pt), [LinkedIn](https://www.linkedin.com/company/lovely-memories-lda/): Official profiles.
`;

  const optional = `
## Optional

- [Privacy policy](${SITE_URL}/en/privacy-policy): How we handle personal data.
- [Terms & conditions](${SITE_URL}/en/terms-conditions): Booking and usage terms.
`;

  const body = prose + (await inventorySection()) + optional;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
