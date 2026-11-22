import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stableStringify } from '../stable-json';

test('key order does not matter', () => {
    assert.equal(stableStringify({ a: 1, b: { x: 1, y: 2 } }), stableStringify({ b: { y: 2, x: 1 }, a: 1 }));
});

test('empty strings and undefined are ignored, other differences are not', () => {
    assert.equal(stableStringify({ title: { en: '', pt: 'x' } }), stableStringify({ title: { pt: 'x' } }));
    assert.notEqual(stableStringify({ price: 1 }), stableStringify({ price: null }));
    assert.notEqual(stableStringify({ l: [1, 2] }), stableStringify({ l: [2, 1] }));
});
