import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeText, resolveDestination, cityMatches, VALID_DESTINATION_NAMES } from '../destinations';

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
