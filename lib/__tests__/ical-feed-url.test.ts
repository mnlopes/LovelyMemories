import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    feedHost,
    feedLabel,
    maskFeedUrl,
    messageForOutcome,
    outcomeForStatus,
    validateFeedUrl,
} from '../ical-feed-url';

const AIRBNB = 'https://www.airbnb.com/calendar/ical/123456.ics?s=SECRETTOKEN123&locale=en';

test('maskFeedUrl hides every query value and keeps host and path', () => {
    const masked = maskFeedUrl(AIRBNB);
    assert.equal(masked, 'airbnb.com/calendar/ical/123456.ics?s=••••••&locale=••••••');
    assert.ok(!masked.includes('SECRETTOKEN123'));
});

test('maskFeedUrl never echoes an unparsable value', () => {
    assert.equal(maskFeedUrl('not a url SECRET'), '••••••');
});

test('feedLabel names the feed without the link', () => {
    const label = feedLabel(AIRBNB, 0);
    assert.equal(label, 'Feed 1 (airbnb.com)');
    assert.ok(!label.includes('SECRET'));
    assert.equal(feedHost('nonsense'), 'invalid link');
});

test('validateFeedUrl accepts an https calendar link and trims it', () => {
    assert.deepEqual(validateFeedUrl(`  ${AIRBNB}  `), { ok: true, url: AIRBNB });
});

test('validateFeedUrl rejects empty, invalid, http and listing-page links', () => {
    assert.equal(validateFeedUrl('').ok, false);
    assert.equal(validateFeedUrl('hello').ok, false);
    assert.equal(validateFeedUrl('http://www.airbnb.com/calendar/ical/1.ics?s=x').ok, false);
    const listing = validateFeedUrl('https://www.airbnb.pt/rooms/123456');
    assert.equal(listing.ok, false);
    assert.match((listing as { error: string }).error, /listing page/);
});

test('outcomeForStatus treats a removed or regenerated link as refused', () => {
    for (const s of [401, 403, 404, 410]) assert.equal(outcomeForStatus(s), 'refused');
    for (const s of [429, 500, 502, 503]) assert.equal(outcomeForStatus(s), 'unreachable');
});

test('messageForOutcome is link-free and capped at 300 characters', () => {
    const msg = messageForOutcome(feedLabel(AIRBNB, 1), 'error', 'x'.repeat(500));
    assert.ok(msg.startsWith('Feed 2 (airbnb.com) failed'));
    assert.ok(msg.length <= 300);
    assert.ok(!msg.includes('SECRET'));
});
