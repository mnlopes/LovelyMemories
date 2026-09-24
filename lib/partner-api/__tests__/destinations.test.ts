import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeText, resolveDestination, cityMatches, effectiveCity, VALID_DESTINATION_NAMES } from '../destinations';

test('normalizeText strips accents, case and extra spaces', () => {
    assert.equal(normalizeText('  Vila  Nova de GAIA '), 'vila nova de gaia');
    assert.equal(normalizeText('Mýkonos'), 'mykonos');
});

test('Porto resolves to Porto + Gaia', () => {
    const d = resolveDestination('porto');
    assert.ok(d);
    assert.equal(d.name, 'Porto');
    assert.deepEqual(d.cities, ['Porto', 'Gaia']);
});

test('aliases resolve', () => {
    assert.equal(resolveDestination('Oporto')?.name, 'Porto');
    assert.equal(resolveDestination('Vila Nova de Gaia')?.name, 'Gaia');
    assert.equal(resolveDestination('VN Gaia')?.name, 'Gaia');
    assert.equal(resolveDestination('ALGARVE')?.name, 'Algarve');
    assert.equal(resolveDestination('Mikonos')?.name, 'Mykonos');
});

test('unknown destination returns null', () => {
    assert.equal(resolveDestination('Lisbon'), null);
    assert.equal(resolveDestination(''), null);
});

test('cityMatches compares normalized city names', () => {
    assert.equal(cityMatches('Porto', ['Porto', 'Gaia']), true);
    assert.equal(cityMatches(' gaia ', ['Porto', 'Gaia']), true);
    assert.equal(cityMatches('Algarve', ['Porto', 'Gaia']), false);
    assert.equal(cityMatches(null, ['Porto']), false);
    assert.equal(cityMatches({ en: 'Porto' }, ['Porto']), true);
});

test('VALID_DESTINATION_NAMES lists the canonical names', () => {
    assert.deepEqual(VALID_DESTINATION_NAMES, ['Porto', 'Gaia', 'Algarve', 'Mykonos']);
});

test('effectiveCity: own city wins when present', () => {
    assert.equal(effectiveCity('Porto', 'Gaia'), 'Porto');
    assert.equal(effectiveCity('  Porto  ', 'Gaia'), 'Porto');
});

test('effectiveCity: falls back to parent when own city is null, empty or whitespace', () => {
    assert.equal(effectiveCity(null, 'Porto'), 'Porto');
    assert.equal(effectiveCity('', 'Porto'), 'Porto');
    assert.equal(effectiveCity('   ', 'Porto'), 'Porto');
    assert.equal(effectiveCity(undefined, 'Porto'), 'Porto');
});

test('effectiveCity: handles localized {en,pt,he} objects on either side', () => {
    assert.equal(effectiveCity({ en: 'Porto', pt: 'Porto' }, 'Gaia'), 'Porto');
    assert.equal(effectiveCity(null, { en: 'Porto', pt: 'Porto' }), 'Porto');
    assert.equal(effectiveCity({ en: '', pt: '' }, { en: 'Porto' }), 'Porto');
});

test('effectiveCity: both empty returns empty string', () => {
    assert.equal(effectiveCity(null, null), '');
    assert.equal(effectiveCity('', ''), '');
    assert.equal(effectiveCity(undefined, undefined), '');
});
