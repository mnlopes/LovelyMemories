import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateAvailabilityRequest, lisbonToday } from '../validate';

const TODAY = '2026-09-24';
const ok = { check_in: '2026-10-10', check_out: '2026-10-14', guests: 4, destination: 'Porto' };

function codeOf(body: unknown) {
    const r = validateAvailabilityRequest(body, TODAY);
    return r.ok ? 'OK' : r.code;
}

test('valid request is normalized', () => {
    const r = validateAvailabilityRequest({ ...ok, destination: ' oporto ', extra: 'ignored' }, TODAY);
    assert.ok(r.ok);
    assert.deepEqual(r.value, {
        checkIn: '2026-10-10', checkOut: '2026-10-14', guests: 4,
        destination: 'Porto', cities: ['Porto', 'Gaia'], nights: 4,
    });
});

test('INVALID_BODY: not an object or wrong field types', () => {
    assert.equal(codeOf(undefined), 'INVALID_BODY');
    assert.equal(codeOf(null), 'INVALID_BODY');
    assert.equal(codeOf([ok]), 'INVALID_BODY');
    assert.equal(codeOf({ ...ok, check_in: undefined }), 'INVALID_BODY');
    assert.equal(codeOf({ ...ok, guests: '4' }), 'INVALID_BODY');
    assert.equal(codeOf({ ...ok, destination: 5 }), 'INVALID_BODY');
    assert.equal(codeOf({ ...ok, destination: '   ' }), 'INVALID_BODY');
});

test('INVALID_DATES: format, impossible dates, order', () => {
    assert.equal(codeOf({ ...ok, check_in: '10-10-2026' }), 'INVALID_DATES');
    assert.equal(codeOf({ ...ok, check_in: '2026-02-30' }), 'INVALID_DATES');
    assert.equal(codeOf({ ...ok, check_out: '2026-10-10' }), 'INVALID_DATES');
    assert.equal(codeOf({ ...ok, check_out: '2026-10-09' }), 'INVALID_DATES');
});

test('CHECK_IN_TOO_SOON: today or past', () => {
    assert.equal(codeOf({ ...ok, check_in: TODAY, check_out: '2026-09-26' }), 'CHECK_IN_TOO_SOON');
    assert.equal(codeOf({ ...ok, check_in: '2026-09-01', check_out: '2026-09-05' }), 'CHECK_IN_TOO_SOON');
    assert.equal(codeOf({ ...ok, check_in: '2026-09-25', check_out: '2026-09-27' }), 'OK');
});

test('DATES_TOO_FAR: more than 18 months ahead', () => {
    assert.equal(codeOf({ ...ok, check_in: '2028-03-24', check_out: '2028-03-26' }), 'OK');
    assert.equal(codeOf({ ...ok, check_in: '2028-03-25', check_out: '2028-03-27' }), 'DATES_TOO_FAR');
});

test('STAY_TOO_LONG: more than 30 nights', () => {
    assert.equal(codeOf({ ...ok, check_in: '2026-10-01', check_out: '2026-10-31' }), 'OK');
    assert.equal(codeOf({ ...ok, check_in: '2026-10-01', check_out: '2026-11-01' }), 'STAY_TOO_LONG');
});

test('INVALID_GUESTS: non-integer or out of range', () => {
    assert.equal(codeOf({ ...ok, guests: 0 }), 'INVALID_GUESTS');
    assert.equal(codeOf({ ...ok, guests: 17 }), 'INVALID_GUESTS');
    assert.equal(codeOf({ ...ok, guests: 2.5 }), 'INVALID_GUESTS');
    assert.equal(codeOf({ ...ok, guests: 16 }), 'OK');
});

test('UNKNOWN_DESTINATION lists valid destinations', () => {
    const r = validateAvailabilityRequest({ ...ok, destination: 'Lisbon' }, TODAY);
    assert.equal(r.ok, false);
    if (!r.ok) {
        assert.equal(r.code, 'UNKNOWN_DESTINATION');
        assert.match(r.message, /Porto, Gaia, Algarve, Mykonos/);
    }
});

test('lisbonToday uses Europe/Lisbon, not UTC', () => {
    // 2026-09-24 23:30 UTC = 2026-09-25 00:30 in Lisbon (WEST, UTC+1)
    assert.equal(lisbonToday(new Date('2026-09-24T23:30:00Z')), '2026-09-25');
    // 2026-01-15 23:30 UTC = 2026-01-15 23:30 in Lisbon (WET, UTC+0)
    assert.equal(lisbonToday(new Date('2026-01-15T23:30:00Z')), '2026-01-15');
});
