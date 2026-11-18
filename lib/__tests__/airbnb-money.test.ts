import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMoney, parseAirbnbRows } from '../airbnb-import/parse';

test('European decimal comma (L-13: "120,50" was 12050)', () => {
    assert.equal(parseMoney('120,50'), 120.5);
    assert.equal(parseMoney('120,5'), 120.5);
    assert.equal(parseMoney('€ 89,99'), 89.99);
    assert.equal(parseMoney('-15,30'), -15.3);
});

test('US format keeps working', () => {
    assert.equal(parseMoney('120.50'), 120.5);
    assert.equal(parseMoney('1,234.56'), 1234.56);
    assert.equal(parseMoney('€ 120.00'), 120);
    assert.equal(parseMoney('1,234'), 1234);
    assert.equal(parseMoney('1,234,567'), 1234567);
    assert.equal(parseMoney('-42.10'), -42.1);
});

test('European thousands', () => {
    assert.equal(parseMoney('1.234,56'), 1234.56);
    assert.equal(parseMoney('1.234.567'), 1234567);
    assert.equal(parseMoney('12.345,6'), 12345.6);
});

test('empty is 0, junk is null', () => {
    assert.equal(parseMoney(''), 0);
    assert.equal(parseMoney(undefined), 0);
    assert.equal(parseMoney('€'), null);
    assert.equal(parseMoney('abc'), null);
    assert.equal(parseMoney('1-2'), null);
});

test('a European row imports the right amount', () => {
    const { stays, errors } = parseAirbnbRows([{
        Type: 'Reservation', 'Confirmation code': 'HMABC123', 'Start date': '07/14/2026', Nights: '3',
        Guest: 'Test', Amount: '412,35', 'Service fee': '61,85', 'Cleaning fee': '60,00', Currency: 'EUR', Date: '07/15/2026',
    }]);
    assert.deepEqual(errors, []);
    assert.equal(stays[0].amount, 412.35);
    assert.equal(stays[0].serviceFee, 61.85);
    assert.equal(stays[0].cleaningFee, 60);
});
