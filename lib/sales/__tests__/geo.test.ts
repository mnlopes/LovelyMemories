import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseGoogleMapsCoords } from '../geo';

test('@lat,lng in a place URL', () => {
    assert.deepEqual(
        parseGoogleMapsCoords('https://www.google.com/maps/place/Porto/@41.1579438,-8.6291053,17z/data=!3m1'),
        { lat: 41.157944, lng: -8.629105 },
    );
});

test('!3d!4d pair (pin of a place)', () => {
    assert.deepEqual(
        parseGoogleMapsCoords('https://www.google.com/maps/place/X/data=!4m6!3m5!1s0x0:0x1!8m2!3d38.7223!4d-9.1393'),
        { lat: 38.7223, lng: -9.1393 },
    );
});

test('q= and &q= with coordinates', () => {
    assert.deepEqual(parseGoogleMapsCoords('https://maps.google.com/?q=41.15,-8.61'), { lat: 41.15, lng: -8.61 });
    assert.deepEqual(parseGoogleMapsCoords('https://www.google.com/maps?hl=pt&q=41.15,-8.61'), { lat: 41.15, lng: -8.61 });
    assert.deepEqual(parseGoogleMapsCoords('https://maps.google.com/?q=41.15%2C-8.61'), { lat: 41.15, lng: -8.61 });
});

test('ll= and query=', () => {
    assert.deepEqual(parseGoogleMapsCoords('https://maps.google.com/?ll=37.0194,-7.9304&z=14'), { lat: 37.0194, lng: -7.9304 });
    assert.deepEqual(
        parseGoogleMapsCoords('https://www.google.com/maps/search/?api=1&query=37.0194,-7.9304'),
        { lat: 37.0194, lng: -7.9304 },
    );
});

test('negative latitude and positive longitude', () => {
    assert.deepEqual(parseGoogleMapsCoords('https://www.google.com/maps/@-33.8688,151.2093,12z'), { lat: -33.8688, lng: 151.2093 });
});

test('rounds to 6 decimals', () => {
    assert.deepEqual(parseGoogleMapsCoords('https://x/@41.12345678,-8.98765432,15z'), { lat: 41.123457, lng: -8.987654 });
});

test('out of range coordinates are rejected', () => {
    assert.equal(parseGoogleMapsCoords('https://www.google.com/maps/@91.5,-8.6,15z'), null);
    assert.equal(parseGoogleMapsCoords('https://www.google.com/maps/@41.1,-181.2,15z'), null);
    assert.equal(parseGoogleMapsCoords('https://maps.google.com/?q=200,300'), null);
});

test('short links and unrelated text give null', () => {
    assert.equal(parseGoogleMapsCoords('https://maps.app.goo.gl/AbCdEf123'), null);
    assert.equal(parseGoogleMapsCoords('https://goo.gl/maps/AbCdEf123'), null);
    assert.equal(parseGoogleMapsCoords('Rua de Cedofeita 12, Porto'), null);
    assert.equal(parseGoogleMapsCoords(''), null);
});

test('isShortMapsLink recognises the short hosts', async () => {
    const { isShortMapsLink } = await import('../geo');
    assert.equal(isShortMapsLink('https://maps.app.goo.gl/AbCdEf123'), true);
    assert.equal(isShortMapsLink('https://goo.gl/maps/AbCdEf123'), true);
    assert.equal(isShortMapsLink('https://www.google.com/maps/@41,-8,15z'), false);
});

test('parseCoordInput accepts dot or comma and a leading minus', async () => {
    const { parseCoordInput } = await import('../geo');
    assert.deepEqual(parseCoordInput('-8.6109', 180), { ok: true, value: -8.6109 });
    assert.deepEqual(parseCoordInput('-8,6109', 180), { ok: true, value: -8.6109 });
    assert.deepEqual(parseCoordInput('41.', 90), { ok: true, value: 41 });
    assert.deepEqual(parseCoordInput('', 90), { ok: true, value: null });
});

test('parseCoordInput rejects partial, out-of-range and non-numeric text', async () => {
    const { parseCoordInput } = await import('../geo');
    assert.deepEqual(parseCoordInput('-', 180), { ok: false });
    assert.deepEqual(parseCoordInput('91', 90), { ok: false });
    assert.deepEqual(parseCoordInput('-181', 180), { ok: false });
    assert.deepEqual(parseCoordInput('4e1', 90), { ok: false });
    assert.deepEqual(parseCoordInput('abc', 90), { ok: false });
});
