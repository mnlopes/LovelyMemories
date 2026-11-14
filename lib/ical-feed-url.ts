/**
 * Pure helpers for iCal import links (Airbnb/Booking "export calendar" URLs).
 *
 * These links are secrets: the query string (`?s=…` / `?t=…`) is the credential that
 * opens the channel's calendar, reservation codes and guest phone digits included. So:
 *   - `maskFeedUrl` is the only form of a saved link that may reach the browser;
 *   - `feedLabel` is the only form that may appear in logs and error messages.
 *
 * No I/O here, so it is unit-tested without a database (lib/__tests__/ical-feed-url.test.ts).
 * The data access lives in lib/ical-feeds.ts (server-only).
 */

export type FeedOutcome = 'ok' | 'not_a_calendar' | 'unreachable' | 'refused' | 'error';

/** Hostname without "www.", e.g. "airbnb.com". Never throws. */
export function feedHost(url: string): string {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return 'invalid link';
    }
}

/** Safe for logs and error messages: "Feed 1 (airbnb.com)". Never contains the URL. */
export function feedLabel(url: string, index: number): string {
    return `Feed ${index + 1} (${feedHost(url)})`;
}

/**
 * Safe to show in the backoffice: host and path, with every query value hidden.
 * "https://www.airbnb.com/calendar/ical/123.ics?s=abc" → "airbnb.com/calendar/ical/123.ics?s=••••••"
 */
export function maskFeedUrl(url: string): string {
    try {
        const u = new URL(url);
        const keys = Array.from(u.searchParams.keys());
        const query = keys.length ? `?${keys.map((k) => `${k}=••••••`).join('&')}` : '';
        return `${u.hostname.replace(/^www\./, '')}${u.pathname}${query}`;
    } catch {
        return '••••••';
    }
}

export type FeedUrlCheck = { ok: true; url: string } | { ok: false; error: string };

/** Validates a link typed in the backoffice before it is stored. */
export function validateFeedUrl(raw: string): FeedUrlCheck {
    const url = (raw || '').trim();
    if (!url) return { ok: false, error: 'Paste the calendar link first.' };
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        return { ok: false, error: 'This is not a valid link.' };
    }
    if (parsed.protocol !== 'https:') return { ok: false, error: 'The link must start with https://' };
    if (/airbnb\.[a-z.]+$/i.test(parsed.hostname) && /\/rooms\//i.test(parsed.pathname)) {
        return {
            ok: false,
            error: 'This is the Airbnb listing page, not its calendar. In Airbnb: Calendar → Availability → Connect to another website → copy the .ics link.',
        };
    }
    if (url.length > 2000) return { ok: false, error: 'This link is too long.' };
    return { ok: true, url };
}

/** Classifies an HTTP status from the channel. 401/403/404/410 mean the link was regenerated or deleted. */
export function outcomeForStatus(status: number): FeedOutcome {
    return [401, 403, 404, 410].includes(status) ? 'refused' : 'unreachable';
}

/** A short, link-free message for the admin, per outcome. */
export function messageForOutcome(label: string, outcome: FeedOutcome, detail?: string): string {
    const text: Record<FeedOutcome, string> = {
        ok: 'read OK',
        not_a_calendar: 'did not return a calendar (.ics). Check that it is the calendar export link, not the listing page.',
        unreachable: `could not be reached${detail ? ` (${detail})` : ''}.`,
        refused: `was refused by the channel${detail ? ` (${detail})` : ''}: the link was probably regenerated or deleted.`,
        error: `failed${detail ? `: ${detail}` : ''}.`,
    };
    return `${label} ${text[outcome]}`.slice(0, 300);
}
