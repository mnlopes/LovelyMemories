import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    saleHeadline,
    saleSeoTitle,
    saleSeoDescription,
    saleImageAlt,
    saleJsonLd,
} from '../seo';
import type { SaleListing } from '../types';

type Ld = Record<string, unknown> & { offers: Record<string, unknown>; image?: string[] };

function make(over: Partial<SaleListing> = {}): SaleListing {
    return {
        id: 'id1',
        reference: 'LM-S-0001',
        slug: 'casa',
        property_id: null,
        published: true,
        published_at: '2026-11-01T10:00:00Z',
        status: 'available',
        price: 350000,
        price_on_request: false,
        negotiable: false,
        title: { en: 'Garden House', pt: 'Casa do Jardim' },
        subtitle: {},
        description: {},
        features: [],
        type: 'house',
        typology: 'T1',
        bedrooms: 1,
        bathrooms: 1,
        condition: null,
        gross_area: 68,
        useful_area: null,
        plot_area: null,
        year_renovated: null,
        furnished: null,
        city: 'Porto',
        area_label: 'Paranhos',
        street: null,
        lat: null,
        lng: null,
        nearby: [],
        energy_class: 'C',
        floor_plan_url: null,
        images: [],
        show_performance: false,
        al_license: null,
        created_at: '2026-11-01T10:00:00Z',
        updated_at: '2026-11-01T10:00:00Z',
        ...over,
    };
}

test('headline: house T1 in Porto', () => {
    assert.equal(saleHeadline(make(), 'pt'), 'Moradia T1 à venda no Porto');
    assert.equal(saleHeadline(make(), 'en'), '1-Bedroom House for Sale in Porto');
});

test('headline: T0 apartment is a studio', () => {
    const l = make({ type: 'apartment', typology: 'T0' });
    assert.equal(saleHeadline(l, 'pt'), 'Estúdio à venda no Porto');
    assert.equal(saleHeadline(l, 'en'), 'Studio for Sale in Porto');
});

test('headline: building and land have no typology', () => {
    assert.equal(saleHeadline(make({ type: 'building', typology: 'T3' }), 'pt'), 'Prédio à venda no Porto');
    assert.equal(saleHeadline(make({ type: 'building', typology: 'T3' }), 'en'), 'Building for Sale in Porto');
    assert.equal(saleHeadline(make({ type: 'land', typology: null }), 'pt'), 'Terreno à venda no Porto');
    assert.equal(saleHeadline(make({ type: 'land', typology: null }), 'en'), 'Plot of Land for Sale in Porto');
});

test('headline: no typology and no city', () => {
    const l = make({ type: 'apartment', typology: null, city: '' });
    assert.equal(saleHeadline(l, 'pt'), 'Apartamento à venda');
    assert.equal(saleHeadline(l, 'en'), 'Apartment for Sale');
    assert.equal(saleHeadline(make({ type: 'apartment', typology: null }), 'pt'), 'Apartamento à venda no Porto');
});

test('headline: T5+ and other cities', () => {
    const l = make({ type: 'apartment', typology: 'T5+', city: 'Gaia' });
    assert.equal(saleHeadline(l, 'pt'), 'Apartamento T5+ à venda em Vila Nova de Gaia');
    assert.equal(saleHeadline(l, 'en'), '5-Bedroom Apartment for Sale in Vila Nova de Gaia');
});

test('seo title uses the title with language fallback', () => {
    assert.equal(saleSeoTitle(make(), 'pt'), 'Casa do Jardim — Moradia T1 à venda no Porto');
    const onlyPt = make({ title: { pt: 'Casa do Jardim' } });
    assert.equal(saleSeoTitle(onlyPt, 'en'), 'Casa do Jardim — 1-Bedroom House for Sale in Porto');
    assert.equal(saleSeoTitle(make({ title: {} }), 'en'), '1-Bedroom House for Sale in Porto');
});

test('description has headline, area, energy class and price', () => {
    const pt = saleSeoDescription(make(), 'pt');
    assert.ok(pt.startsWith('Moradia T1 à venda no Porto'));
    assert.ok(pt.includes('68 m²'));
    assert.ok(pt.includes('classe energética C'));
    assert.ok(/350/.test(pt) && pt.includes('€'));
    const en = saleSeoDescription(make(), 'en');
    assert.ok(en.includes('energy class C'));
});

test('description: exempt, on request, missing pieces', () => {
    const l = make({ energy_class: 'exempt', price_on_request: true, price: null, gross_area: null });
    // Lower case mid-sentence, capital only when it starts the sentence.
    assert.ok(saleSeoDescription(make({ energy_class: 'exempt' }), 'pt').includes('68 m², isento de certificado energético'));
    assert.ok(saleSeoDescription(l, 'pt').includes('. Isento de certificado energético, preço sob consulta.'));
    assert.ok(saleSeoDescription(l, 'en').includes('. Energy certificate exempt, price on request.'));
    const onlyPrice = make({ energy_class: null, gross_area: null, price_on_request: true, price: null });
    assert.ok(saleSeoDescription(onlyPrice, 'pt').endsWith('. Preço sob consulta.'));
    assert.ok(saleSeoDescription(onlyPrice, 'en').endsWith('. Price on request.'));
    const bare = saleSeoDescription(make({ energy_class: null, gross_area: null, price: null }), 'en');
    assert.ok(!/undefined|null/.test(bare));
    assert.ok(!bare.includes('energy'));
});

test('description is at most 160 characters', () => {
    const l = make({ city: 'Santa Maria da Feira do Concelho de Aveiro e Arredores Muito Longos' });
    assert.ok(saleSeoDescription(l, 'pt').length <= 160);
    assert.ok(saleSeoDescription(l, 'en').length <= 160);
});

test('image alt: lower-case headline, index from the 2nd photo', () => {
    assert.equal(saleImageAlt(make(), 'pt', 0), 'Casa do Jardim — moradia T1 à venda no Porto');
    assert.equal(saleImageAlt(make(), 'en', 0), 'Garden House — 1-bedroom house for sale in porto'.replace('porto', 'Porto'));
    assert.equal(saleImageAlt(make(), 'pt', 1), 'Casa do Jardim — moradia T1 à venda no Porto (2)');
});

test('json-ld: available listing with price', () => {
    const l = make({ images: [{ url: 'https://x/a.jpg', alt: {}, order: 0, is_main: true }] });
    const j = saleJsonLd(l, 'en', 'https://www.lovelymemories.pt/en/for-sale/casa') as Ld;
    assert.equal(j['@type'], 'RealEstateListing');
    assert.equal(j.url, 'https://www.lovelymemories.pt/en/for-sale/casa');
    assert.deepEqual(j.image, ['https://x/a.jpg']);
    assert.equal(j.datePosted, '2026-11-01T10:00:00Z');
    assert.equal(j.offers['@type'], 'Offer');
    assert.equal(j.offers.priceCurrency, 'EUR');
    assert.equal(j.offers.price, 350000);
    assert.equal(j.offers.availability, 'https://schema.org/InStock');
});

test('json-ld: on request has no price, sold is SoldOut, no image/date when absent', () => {
    const j = saleJsonLd(
        make({ price_on_request: true, status: 'sold', published_at: null, images: [] }),
        'pt',
        'https://u'
    ) as Ld;
    assert.ok(!('price' in j.offers));
    assert.equal(j.offers.availability, 'https://schema.org/SoldOut');
    assert.ok(!('image' in j));
    assert.ok(!('datePosted' in j));
    const n = saleJsonLd(make({ price: null }), 'pt', 'https://u') as Ld;
    assert.ok(!('price' in n.offers));
});

test('sold listing: description and json-ld do not expose the price', () => {
    const l = make({ status: 'sold' });
    const pt = saleSeoDescription(l, 'pt');
    const en = saleSeoDescription(l, 'en');
    assert.ok(pt.includes(', vendido.') && !/350/.test(pt) && !pt.includes('€'));
    assert.ok(en.includes(', sold.') && !/350/.test(en) && !en.includes('€'));
    const j = saleJsonLd(l, 'en', 'https://u') as Ld;
    assert.ok(!('price' in j.offers));
    assert.ok(!/350/.test(String(j.description)));
});
