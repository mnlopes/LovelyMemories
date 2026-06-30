/**
 * Site-wide structured data (JSON-LD) — strengthens both Google rich results and
 * how LLMs describe the brand. Rendered once in the root layout. Keep facts in
 * sync with /public/llms.txt.
 */
const SITE_URL = 'https://www.lovelymemories.pt';

export function SiteJsonLd() {
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: 'Lovely Memories',
        url: SITE_URL,
        logo: `${SITE_URL}/icon-512.png`,
        image: `${SITE_URL}/opengraph-image.png`,
        email: 'achilleas@lovelymemories.pt',
        telephone: '+351932473600',
        sameAs: ['https://www.instagram.com/lovely_memories_pt/'],
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: 'Lovely Memories',
        publisher: { '@id': `${SITE_URL}/#organization` },
        inLanguage: ['en', 'pt', 'he'],
      },
      {
        '@type': 'LodgingBusiness',
        '@id': `${SITE_URL}/#lodging`,
        name: 'Lovely Memories',
        description:
          'Premium Local Accommodation (Alojamento Local) and luxury property management offering curated short-stay homes with concierge service in Porto, Vila Nova de Gaia and the Douro.',
        url: SITE_URL,
        image: `${SITE_URL}/opengraph-image.png`,
        telephone: '+351932473600',
        priceRange: '€€€',
        parentOrganization: { '@id': `${SITE_URL}/#organization` },
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Porto',
          addressRegion: 'Porto',
          addressCountry: 'PT',
        },
        areaServed: [
          { '@type': 'City', name: 'Porto' },
          { '@type': 'City', name: 'Vila Nova de Gaia' },
          { '@type': 'AdministrativeArea', name: 'Douro' },
        ],
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // JSON.stringify already escapes quotes; escape `<` to be safe against XSS.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph).replace(/</g, '\\u003c') }}
    />
  );
}
