import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    serializeProperty, buildSuccessResponse, plainText, collectImages, collectAmenities,
    buildBookingUrl, toNumber, type PropertyRow,
} from '../serialize';
import type { AvailabilityRequest } from '../types';
import type { StayPrice } from '../pricing';

const req: AvailabilityRequest = {
    checkIn: '2026-10-10', checkOut: '2026-10-14', guests: 4,
    destination: 'Porto', cities: ['Porto', 'Gaia'], nights: 4,
};
const price: StayPrice = {
    nights: 4, basePrice: 600, discountPercent: 0, discountAmount: 0,
    cleaningFee: 85, cityTaxTotal: 32, totalPrice: 717, nightlyAverage: 150,
};
const row: PropertyRow & Record<string, unknown> = {
    id: 'uuid-1', slug: 'bonfim-apartment',
    title: { en: 'Bonfim Apartment', pt: 'Apartamento Bonfim' },
    description: { en: '<p>Modern **two-bedroom** apartment.</p>\n\nClose to the metro.' },
    city: 'Porto', area: '75', max_guests: { en: '4' }, bedrooms: 2, bathrooms: '1.5',
    images: [{ url: 'https://cdn.example/1.jpg' }, 'https://cdn.example/2.jpg', 'http://insecure/3.jpg', 'https://cdn.example/1.jpg'],
    amenities: [
        { category: 'Bathroom', items: [{ en: 'Hair dryer' }, { en: ' Wi-Fi ' }, { en: '' }] },
        { category: 'Internet', items: [{ en: 'wi-fi' }, { en: 'Kitchen', pt: 'Cozinha' }] },
    ],
    parent_id: null, is_multi_unit: false, property_images: [],
    // Internal columns that must NEVER leak even if a row carries them:
    owner_id: 'owner-uuid', address: 'Rua Secreta 1', ical_import_urls: ['https://airbnb/x.ics'],
};

test('serializeProperty maps exactly the contract fields', () => {
    const p = serializeProperty(row, price, req, 'kitsiva');
    assert.deepEqual(Object.keys(p).sort(), [
        'amenities', 'area_m2', 'bathrooms', 'bedrooms', 'booking_url', 'city', 'currency', 'description',
        'id', 'images', 'main_image', 'max_guests', 'name', 'nightly_price_average', 'total_price',
    ]);
    assert.equal(p.id, 'uuid-1');
    assert.equal(p.name, 'Bonfim Apartment');
    assert.equal(p.description, 'Modern two-bedroom apartment. Close to the metro.');
    assert.equal(p.city, 'Porto');
    assert.equal(p.area_m2, 75);
    assert.equal(p.max_guests, 4);
    assert.equal(p.bedrooms, 2);
    assert.equal(p.bathrooms, 1.5);
    assert.equal(p.total_price, 717);
    assert.equal(p.nightly_price_average, 150);
    assert.equal(p.currency, 'EUR');
    assert.equal(p.main_image, 'https://cdn.example/1.jpg');
    assert.deepEqual(p.images, ['https://cdn.example/1.jpg', 'https://cdn.example/2.jpg']);
    assert.deepEqual(p.amenities, ['Hair dryer', 'Wi-Fi', 'Kitchen']);
    assert.equal(p.booking_url,
        'https://www.lovelymemories.pt/en/properties/bonfim-apartment?from=2026-10-10&to=2026-10-14&adults=4&ref=kitsiva');
    const json = JSON.stringify(p);
    assert.ok(!json.includes('owner') && !json.includes('Secreta') && !json.includes('.ics'));
});

test('name falls back to pt, then slug', () => {
    assert.equal(serializeProperty({ ...row, title: { pt: 'Casa' } }, price, req, 'k').name, 'Casa');
    assert.equal(serializeProperty({ ...row, title: null }, price, req, 'k').name, 'bonfim-apartment');
});

test('no images → main_image null, images [] (never a placeholder)', () => {
    const p = serializeProperty({ ...row, images: [], property_images: [] }, price, req, 'k');
    assert.equal(p.main_image, null);
    assert.deepEqual(p.images, []);
});

test('collectImages falls back to property_images and caps at 10', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ url: `https://cdn.example/${i}.jpg` }));
    assert.equal(collectImages({ ...row, images: [], property_images: many }).length, 10);
});

test('area_m2 is null when missing or zero', () => {
    assert.equal(serializeProperty({ ...row, area: null }, price, req, 'k').area_m2, null);
    assert.equal(serializeProperty({ ...row, area: '0' }, price, req, 'k').area_m2, null);
});

test('plainText strips markup and cuts at a word boundary', () => {
    assert.equal(plainText('# Title\n\n*bold* `code` <b>x</b>'), 'Title bold code x');
    const long = 'word '.repeat(100);
    const cut = plainText(long, 20);
    assert.ok(cut.length <= 21);
    assert.ok(cut.endsWith('…'));
    assert.ok(!cut.includes('wor…'));
});

test('collectAmenities dedupes case-insensitively and caps at 30', () => {
    const items = Array.from({ length: 40 }, (_, i) => ({ en: `Item ${i}` }));
    assert.equal(collectAmenities([{ items }]).length, 30);
    assert.deepEqual(collectAmenities('not-an-array'), []);
});

test('toNumber handles localized objects and strings', () => {
    assert.equal(toNumber({ en: '3' }), 3);
    assert.equal(toNumber('2.5'), 2.5);
    assert.equal(toNumber(null), 0);
});

test('buildBookingUrl encodes the slug', () => {
    assert.equal(buildBookingUrl('casa ç', req, 'k'),
        'https://www.lovelymemories.pt/en/properties/casa%20%C3%A7?from=2026-10-10&to=2026-10-14&adults=4&ref=k');
});

test('buildSuccessResponse echoes the normalized search', () => {
    assert.deepEqual(buildSuccessResponse(req, []), {
        status: 'SUCCESS',
        search: { check_in: '2026-10-10', check_out: '2026-10-14', guests: 4, destination: 'Porto' },
        currency: 'EUR',
        properties: [],
    });
});
