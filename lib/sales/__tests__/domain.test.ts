import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    approxCoord,
    daysListed,
    formatEuro,
    isNewListing,
    localized,
    pricePerM2,
    slugify,
} from '../format';
import { publishProblems, saleInquirySchema } from '../validation';
import { applyFilters, filtersToQuery, parseFilters } from '../filters';
import { copyFromProperty } from '../copy-from-property';
import { PUBLIC_SALE_COLUMNS, toSaleCard, type SaleListing } from '../types';

const plain = (s: string) => s.replace(/[\s  ]/g, ' ');

function listing(over: Partial<SaleListing>): SaleListing {
    return {
        id: 'x',
        reference: 'LM-S-001',
        slug: 'x',
        property_id: null,
        published: true,
        published_at: '2026-11-01T10:00:00Z',
        status: 'available',
        price: 250000,
        price_on_request: false,
        negotiable: false,
        title: { en: 'X' },
        subtitle: {},
        description: {},
        features: [],
        type: 'apartment',
        typology: 'T2',
        bedrooms: 2,
        bathrooms: 1,
        condition: null,
        gross_area: 70,
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
        energy_class: null,
        floor_plan_url: null,
        images: [],
        show_performance: false,
        al_license: null,
        created_at: '2026-11-01T10:00:00Z',
        updated_at: '2026-11-01T10:00:00Z',
        ...over,
    };
}

test('localized falls back to the other language, then empty', () => {
    assert.equal(localized({ pt: 'Casa' }, 'en'), 'Casa');
    assert.equal(localized({ en: 'House', pt: 'Casa' }, 'pt'), 'Casa');
    assert.equal(localized({}, 'pt'), '');
    assert.equal(localized(undefined, 'en'), '');
});

test('formatEuro has no decimals', () => {
    assert.equal(plain(formatEuro(310000, 'en')), '€310,000');
    assert.equal(plain(formatEuro(310000, 'pt')), '310 000 €');
});

test('publishProblems', () => {
    const empty = publishProblems({
        title: {},
        images: [],
        type: undefined as never,
        price: null,
        price_on_request: false,
        energy_class: null,
        city: '',
    });
    assert.deepEqual([...empty].sort(), ['city', 'energy_class', 'photo', 'price', 'title', 'type']);

    const ok = publishProblems({
        title: { pt: 'Casa' },
        images: [{ url: 'u', alt: {}, order: 0, is_main: true }],
        type: 'house',
        price: null,
        price_on_request: true,
        energy_class: 'exempt',
        city: 'Porto',
    });
    assert.deepEqual(ok, []);
});

test('pricePerM2', () => {
    assert.equal(pricePerM2({ price: 310000, price_on_request: false, gross_area: 68 }), 4559);
    assert.equal(pricePerM2({ price: 310000, price_on_request: true, gross_area: 68 }), null);
    assert.equal(pricePerM2({ price: 310000, price_on_request: false, gross_area: 0 }), null);
    assert.equal(pricePerM2({ price: null, price_on_request: false, gross_area: 68 }), null);
});

test('isNewListing and daysListed', () => {
    assert.equal(isNewListing('2026-11-01', '2026-11-20'), true);
    assert.equal(isNewListing('2026-11-01T23:59:00Z', '2026-11-20'), true);
    assert.equal(isNewListing('2026-10-01', '2026-11-20'), false);
    assert.equal(isNewListing(null, '2026-11-20'), false);
    assert.equal(daysListed('2026-11-01T10:00:00Z', '2026-11-20'), 19);
    assert.equal(daysListed(null, '2026-11-20'), null);
});

test('slugify', () => {
    assert.equal(slugify('Garden House Paranhos — T1!'), 'garden-house-paranhos-t1');
    assert.equal(slugify('Casa da Ribeira, Gaia'), 'casa-da-ribeira-gaia');
    assert.equal(slugify('Açoteia São João'), 'acoteia-sao-joao');
});

test('approxCoord', () => {
    assert.equal(approxCoord(41.14961234), 41.15);
    assert.equal(approxCoord(-8.61099), -8.611);
    assert.equal(approxCoord(null), null);
});

test('PUBLIC_SALE_COLUMNS lists public columns only', () => {
    const cols = PUBLIC_SALE_COLUMNS.split(',').map((c) => c.trim());
    assert.ok(cols.includes('id') && cols.includes('images') && cols.includes('al_license'));
    for (const secret of ['address_private', 'energy_cert_number', 'energy_cert_path', 'created_by']) {
        assert.ok(!cols.includes(secret));
    }
    assert.equal(new Set(cols).size, cols.length);
    assert.equal(cols.length, Object.keys(listing({})).length);
    for (const k of Object.keys(listing({}))) assert.ok(cols.includes(k), k);
});

test('parseFilters', () => {
    assert.deepEqual(parseFilters({ type: 'house', minBedrooms: '2', maxPrice: 'abc', sort: 'zzz' }), {
        type: 'house',
        minBedrooms: 2,
        sort: 'newest',
    });
    assert.deepEqual(parseFilters({ type: 'castle', city: ' Porto ', sort: 'price_desc' }), {
        city: 'Porto',
        sort: 'price_desc',
    });
});

test('filtersToQuery round-trips', () => {
    assert.equal(filtersToQuery({ sort: 'newest' }), '');
    const q = filtersToQuery({ type: 'house', city: 'Vila Nova de Gaia', maxPrice: 300000, sort: 'price_asc' });
    const sp = Object.fromEntries(new URLSearchParams(q));
    assert.deepEqual(parseFilters(sp), {
        type: 'house',
        city: 'Vila Nova de Gaia',
        maxPrice: 300000,
        sort: 'price_asc',
    });
});

test('applyFilters', () => {
    const a = listing({ id: 'a', price: 200000, published_at: '2026-11-02T00:00:00Z' });
    const b = listing({ id: 'b', price: 310000, published_at: '2026-11-10T00:00:00Z' });
    const c = listing({ id: 'c', price: null, price_on_request: true, published_at: '2026-11-15T00:00:00Z' });
    const sold = listing({ id: 's', price: 100000, status: 'sold', published_at: '2026-11-18T00:00:00Z' });
    const t1 = listing({ id: 't1', bedrooms: 1, price: 150000, published_at: '2026-11-03T00:00:00Z' });
    const draft = listing({ id: 'd', published: false });
    const all = [a, sold, b, c, t1, draft];
    const ids = (l: SaleListing[]) => l.map((x) => x.id);

    assert.deepEqual(ids(applyFilters(all, { sort: 'newest' })), ['c', 'b', 't1', 'a', 's']);
    assert.deepEqual(ids(applyFilters(all, { sort: 'price_asc' })), ['t1', 'a', 'b', 'c', 's']);
    assert.deepEqual(ids(applyFilters(all, { sort: 'price_desc' })), ['b', 'a', 't1', 'c', 's']);
    assert.deepEqual(ids(applyFilters(all, { sort: 'price_asc', maxPrice: 300000 })), ['t1', 'a', 's']);
    assert.deepEqual(ids(applyFilters(all, { sort: 'newest', minBedrooms: 2 })), ['c', 'b', 'a', 's']);
    assert.deepEqual(ids(applyFilters(all, { sort: 'newest', type: 'house' })), []);
});

test('copyFromProperty', () => {
    const base = {
        images: [],
        bedrooms: 2,
        bathrooms: 1,
        area: 70,
        description: null,
        city: 'Porto',
        lat: 41.1,
        lng: -8.6,
        address: 'Rua A 1',
        amenities: null,
    };
    const r = copyFromProperty(base);
    assert.equal(r.draft.gross_area, 70);
    assert.equal(r.draft.address_private, 'Rua A 1');
    assert.equal(r.draft.bedrooms, 2);
    assert.equal(r.draft.city, 'Porto');
    assert.deepEqual(r.amenitySuggestions, []);

    const r2 = copyFromProperty({
        ...base,
        images: [
            { url: 'u1', order: 5 },
            { url: 'u2', order: 2 },
        ],
        amenities: [{ items: [{ en: 'Wifi', pt: 'Wifi' }] }, { items: [{ en: 'WiFi' }, { en: 'Pool' }] }],
    });
    assert.equal(r2.amenitySuggestions.length, 2);
    assert.deepEqual(
        r2.draft.images?.map((i) => [i.url, i.order, i.is_main]),
        [
            ['u2', 0, true],
            ['u1', 1, false],
        ],
    );

    const r3 = copyFromProperty({
        ...base,
        images: [
            { url: 'u1', order: 0 },
            { url: 'u2', order: 1, is_main: true },
        ],
    });
    assert.deepEqual(
        r3.draft.images?.map((i) => [i.url, i.is_main]),
        [
            ['u1', false],
            ['u2', true],
        ],
    );
});

const validInquiry = {
    listingId: '0b0f4b0e-3f3c-4b7e-9a57-2f7a3c1d9e11',
    kind: 'info',
    name: 'Ana',
    email: 'ana@example.com',
    purpose: 'live',
    message: 'Hello',
    consent: true,
    locale: 'pt',
};

test('saleInquirySchema', () => {
    assert.equal(saleInquirySchema.safeParse(validInquiry).success, true);
    assert.equal(saleInquirySchema.safeParse({ ...validInquiry, consent: false }).success, false);
    assert.equal(saleInquirySchema.safeParse({ ...validInquiry, email: 'nope' }).success, false);
    assert.equal(saleInquirySchema.safeParse({ ...validInquiry, kind: 'visit', visitTimes: 'Sat morning' }).success, true);
    assert.equal(saleInquirySchema.safeParse({ ...validInquiry, name: '' }).success, false);
});

test('toSaleCard keeps only the card fields and computes the income badge', () => {
    const full = listing({
        property_id: '11111111-1111-4111-8111-111111111111',
        show_performance: true,
        al_license: '12345/AL',
        description: { en: 'Long text' },
        features: [{ en: 'Garden' }],
        nearby: [{ name: { en: 'Metro' }, distance: { en: '5 min' } }],
        floor_plan_url: 'https://example.com/plan.pdf',
        images: [
            { url: 'u1', alt: {}, order: 0, is_main: false },
            { url: 'u2', alt: {}, order: 1, is_main: true },
        ],
    });
    const card = toSaleCard(full);
    for (const k of ['property_id', 'al_license', 'description', 'features', 'nearby', 'floor_plan_url', 'images', 'show_performance', 'lat', 'lng']) {
        assert.ok(!(k in card), k);
    }
    assert.equal(card.mainImage, 'u2');
    assert.equal(card.incomeBadge, true);
    assert.equal(toSaleCard({ ...full, property_id: null }).incomeBadge, false);
    assert.equal(toSaleCard({ ...full, status: 'sold' }).incomeBadge, false);
    assert.equal(toSaleCard({ ...full, show_performance: false }).incomeBadge, false);
    assert.equal(toSaleCard({ ...full, images: [] }).mainImage, null);
});
