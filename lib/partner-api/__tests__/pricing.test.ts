import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStayPrice, type PricingRulesRow, type CustomPricingRow } from '../pricing';

const rules: PricingRulesRow = {
    property_id: 'p1', base_price_per_night: '150.00', cleaning_fee: '85.00', min_nights: 2,
    weekly_discount_percent: '5.00', monthly_discount_percent: '15.00', city_tax_per_night: '2.00',
};

test('short stay: base + cleaning + tax, no discount', () => {
    const r = computeStayPrice({ rules, customPrices: [], checkIn: '2026-10-10', checkOut: '2026-10-14', guests: 4 });
    assert.ok(!('error' in r));
    // base 4*150=600; tax 2*4*4=32; total 600+85+32=717
    assert.deepEqual(r, {
        nights: 4, basePrice: 600, discountPercent: 0, discountAmount: 0,
        cleaningFee: 85, cityTaxTotal: 32, totalPrice: 717, nightlyAverage: 150,
    });
});

test('7+ nights: weekly discount, tax capped at 7 nights', () => {
    const r = computeStayPrice({ rules, customPrices: [], checkIn: '2026-10-01', checkOut: '2026-10-11', guests: 2 });
    assert.ok(!('error' in r));
    // base 10*150=1500; disc 5% = 75; after 1425; tax 2*2*7=28; total 1425+85+28=1538
    assert.equal(r.discountPercent, 5);
    assert.equal(r.discountAmount, 75);
    assert.equal(r.cityTaxTotal, 28);
    assert.equal(r.totalPrice, 1538);
    assert.equal(r.nightlyAverage, 142.5);
});

test('28+ nights: monthly discount', () => {
    const r = computeStayPrice({ rules, customPrices: [], checkIn: '2026-10-01', checkOut: '2026-10-29', guests: 1 });
    assert.ok(!('error' in r));
    // base 28*150=4200; disc 15% = 630; after 3570; tax 2*1*7=14; total 3570+85+14=3669
    assert.equal(r.discountPercent, 15);
    assert.equal(r.totalPrice, 3669);
});

test('custom pricing applies per night, end_date exclusive', () => {
    const custom: CustomPricingRow[] = [
        { property_id: 'p1', start_date: '2026-10-11', end_date: '2026-10-13', price_per_night: '200.00' },
    ];
    const r = computeStayPrice({ rules, customPrices: custom, checkIn: '2026-10-10', checkOut: '2026-10-14', guests: 2 });
    assert.ok(!('error' in r));
    // nights 10,11,12,13 → 150 + 200 + 200 + 150 = 700; tax 2*2*4=16; total 700+85+16=801
    assert.equal(r.basePrice, 700);
    assert.equal(r.totalPrice, 801);
});

test('overlapping custom periods: first in array wins (same as original find())', () => {
    const custom: CustomPricingRow[] = [
        { property_id: 'p1', start_date: '2026-10-10', end_date: '2026-10-12', price_per_night: '300.00' },
        { property_id: 'p1', start_date: '2026-10-10', end_date: '2026-10-12', price_per_night: '100.00' },
    ];
    const r = computeStayPrice({ rules, customPrices: custom, checkIn: '2026-10-10', checkOut: '2026-10-12', guests: 1 });
    assert.ok(!('error' in r));
    assert.equal(r.basePrice, 600);
});

test('null city tax falls back to 2.00; null discounts become 0', () => {
    const r = computeStayPrice({
        rules: { ...rules, city_tax_per_night: null, weekly_discount_percent: null },
        customPrices: [], checkIn: '2026-10-01', checkOut: '2026-10-08', guests: 1,
    });
    assert.ok(!('error' in r));
    // base 7*150=1050; weekly null → 0; tax 2*1*7=14; total 1050+85+14=1149
    assert.equal(r.discountPercent, 0);
    assert.equal(r.cityTaxTotal, 14);
    assert.equal(r.totalPrice, 1149);
});

test('below min_nights returns errorMinNights', () => {
    const r = computeStayPrice({ rules: { ...rules, min_nights: 3 }, customPrices: [], checkIn: '2026-10-10', checkOut: '2026-10-12', guests: 1 });
    assert.deepEqual(r, { error: 'errorMinNights' });
});

test('checkout not after checkin returns errorCheckoutAfterCheckin', () => {
    const r = computeStayPrice({ rules, customPrices: [], checkIn: '2026-10-10', checkOut: '2026-10-10', guests: 1 });
    assert.deepEqual(r, { error: 'errorCheckoutAfterCheckin' });
});

test('totals are rounded to cents', () => {
    const r = computeStayPrice({
        rules: { ...rules, base_price_per_night: '99.99', weekly_discount_percent: '7.50' },
        customPrices: [], checkIn: '2026-10-01', checkOut: '2026-10-08', guests: 3,
    });
    assert.ok(!('error' in r));
    // base 7*99.99=699.93; disc 7.5% = 52.49475; after 647.43525; tax 2*3*7=42; total 774.43525 → 774.44
    assert.equal(r.totalPrice, 774.44);
    assert.equal(r.nightlyAverage, 92.49);
});
