import { test } from 'node:test';
import assert from 'node:assert/strict';
import { amenityGroup } from '../amenity-groups';

test('amenityGroup sorts the Airbnb list into buyer groups', () => {
    const cases: [string, string][] = [
        ['City skyline view', 'outdoor'],
        ['Private patio or balcony', 'outdoor'],
        ['Outdoor furniture', 'outdoor'],
        ['Central heating', 'comfort'],
        ['AC - split type ductless system', 'comfort'],
        ['Room-darkening shades', 'comfort'],
        ['Clothing storage: closet', 'comfort'],
        ['Ethernet connection', 'comfort'],
        ['Fully equipped kitchen', 'kitchen'],
        ['SMEG induction stove', 'kitchen'],
        ['Bosch stainless steel oven', 'kitchen'],
        ['Bosch refrigerator', 'kitchen'],
        ['Dishwasher', 'kitchen'],
        ['Dining table', 'kitchen'],
        ['Elevator', 'building'],
        ['Free washer – In building', 'building'],
        ['Free dryer – In building', 'building'],
        ['Paid parking lot off premises', 'building'],
        ['Keypad', 'building'],
        ['Hair dryer', 'other'],
        ['Castelbel Orange and Verbena shampoo', 'other'],
        ['Hot water kettle', 'other'],
        ['Coffee maker: Nespresso', 'other'],
        ['Wine glasses', 'other'],
        ['55 inch HDTV with Netflix, premium cable', 'other'],
        ['Fire extinguisher', 'other'],
        ['Fast wifi – 502 Mbps', 'other'],
        ['Long term stays allowed', 'other'],
        ['Self check-in', 'other'],
        ['Something unknown', 'other'],
    ];
    for (const [en, group] of cases) assert.equal(amenityGroup({ en }), group, en);
    assert.equal(amenityGroup({ pt: 'Armário' }), 'other');
    assert.equal(amenityGroup({ pt: 'Vista rio' }), 'outdoor');
    assert.equal(amenityGroup({}), 'other');
});
