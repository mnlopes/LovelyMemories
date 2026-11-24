"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

/** Staff, owner and sign-in pages are not counted (they are not the public site). */
const PRIVATE = /^\/(?:(?:en|pt)\/)?(?:admin|owner|login|confirm|set-password|auth-error|auth)(?:\/|$)/;

/**
 * Vercel Web Analytics (cookieless, no personal data). Query strings are dropped before sending,
 * because some of the site's links carry one-time codes or tokens in them.
 */
function beforeSend(event: BeforeSendEvent): BeforeSendEvent | null {
    const url = new URL(event.url);
    if (PRIVATE.test(url.pathname)) return null;
    url.search = "";
    return { ...event, url: url.toString() };
}

export function VercelAnalytics() {
    return <Analytics beforeSend={beforeSend} />;
}
