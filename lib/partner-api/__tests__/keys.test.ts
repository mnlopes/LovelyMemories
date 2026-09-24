import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateApiKey, hashApiKey, displayPrefix, extractBearer, API_KEY_PATTERN } from '../keys';

test('generateApiKey has the right format and is unique', () => {
    const a = generateApiKey();
    const b = generateApiKey();
    assert.match(a, API_KEY_PATTERN);
    assert.equal(a.length, 'lm_live_'.length + 32);
    assert.notEqual(a, b);
});

test('hashApiKey is sha256 hex and deterministic', () => {
    const h = hashApiKey('lm_live_abc');
    assert.match(h, /^[0-9a-f]{64}$/);
    assert.equal(h, hashApiKey('lm_live_abc'));
    assert.notEqual(h, hashApiKey('lm_live_abd'));
});

test('displayPrefix shows lm_live_ + 4 chars', () => {
    assert.equal(displayPrefix('lm_live_ab12Xk9qP4mZr7Tw2Lc8Vn5Hy3Ds6Fb1'), 'lm_live_ab12');
});

test('extractBearer accepts only well-formed keys', () => {
    const key = generateApiKey();
    assert.equal(extractBearer(`Bearer ${key}`), key);
    assert.equal(extractBearer(`bearer   ${key}`), key);
    assert.equal(extractBearer(null), null);
    assert.equal(extractBearer(''), null);
    assert.equal(extractBearer(key), null);
    assert.equal(extractBearer('Bearer lm_live_short'), null);
    assert.equal(extractBearer(`Basic ${key}`), null);
    assert.equal(extractBearer(`Bearer ${key} extra`), null);
});
