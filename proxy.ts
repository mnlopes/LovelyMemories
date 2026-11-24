import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextFetchEvent, NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Every Supabase request is a log line (Free plan: 1 GB of log ingestion a month), and this
// proxy runs on every page request. So: prefetches skip Supabase entirely, visitors without a
// session skip the auth lookup, the maintenance flag is cached for a minute per instance, and
// bots / local development are not written to visitor_logs.

/** Maintenance flag, cached per server instance. Turning maintenance on applies within ~1 minute. */
let maintenanceCache: { value: boolean; at: number } | null = null;
const MAINTENANCE_TTL_MS = 60_000;

/** Crawlers, link previewers, uptime monitors and scripts — not visitors. */
const BOT_UA = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|quora link preview|whatsapp|telegrambot|discordbot|preview|monitor|uptime|pingdom|lighthouse|headless|curl|wget|python-requests|python-urllib|axios|node-fetch|go-http-client|okhttp|java\//i;

async function isMaintenanceOn(supabaseUrl: string, serviceKey: string): Promise<boolean> {
    const now = Date.now();
    if (maintenanceCache && now - maintenanceCache.at < MAINTENANCE_TTL_MS) return maintenanceCache.value;
    const res = await fetch(`${supabaseUrl}/rest/v1/system_settings?key=eq.maintenance_mode&select=value`, {
        headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` },
        cache: 'no-store'
    }).catch(() => null);
    if (!res?.ok) return maintenanceCache?.value ?? false; // keep the last known value on a blip
    const data = await res.json().catch(() => null);
    maintenanceCache = { value: data?.[0]?.value === true, at: now };
    return maintenanceCache.value;
}

export default async function proxy(request: NextRequest, event: NextFetchEvent) {
    const { pathname } = request.nextUrl;

    // 1. Skip assets/API early
    const isAsset = pathname.includes('.') || pathname.startsWith('/_next');
    const isApi = pathname.startsWith('/api');

    if (isAsset || isApi) {
        return NextResponse.next();
    }

    // Client-side RSC fetches — next/link prefetches AND in-app navigations — carry `next-url`.
    // Next strips the prefetch markers (`Next-Router-Prefetch`, `RSC`, `?_rsc`) before this proxy
    // runs, so the two cannot be told apart here (verified 2026-11-14). One homepage view fired
    // 14 of these prefetches, and each was logged as a "visit" plus 1–2 Supabase requests.
    // Browser-level prefetches (<link rel=prefetch>, speculation rules) say so in Sec-Purpose.
    // Neither is a page view: they still go through next-intl (it sets the locale header the
    // server components read) and keep the session fresh, but skip the role lookup, the
    // maintenance check and visitor_logs. visitor_logs therefore counts full page loads.
    const isClientFetch = request.headers.has('next-url');
    const isBrowserPrefetch = request.headers.get('purpose') === 'prefetch'
        || (request.headers.get('sec-purpose') || '').includes('prefetch');
    const isPageView = !isClientFetch && !isBrowserPrefetch;

    // 2. Setup Response with next-intl (Early creation to attach cookies)
    let response = createMiddleware(routing)(request);
    response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');

    // 3. Setup Auth & Sync Cookies
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    let userRole = 'visitor';
    let userId: string | undefined = undefined;

    // Supabase keeps the session in `sb-<ref>-auth-token` cookies (possibly chunked .0/.1).
    // No such cookie = anonymous visitor: nothing to refresh, no auth request to make.
    const hasSessionCookie = request.cookies.getAll().some(c => c.name.startsWith('sb-') && c.name.includes('-auth-token'));

    try {
        if (supabaseUrl && supabaseAnonKey && hasSessionCookie) {
            const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
                cookies: {
                    getAll() { return request.cookies.getAll() },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
                    },
                },
            });

            if (!isPageView) {
                // Only keep the session cookie fresh (no network call unless the access token
                // expired). Server components can't write cookies, so the refresh must happen
                // here or a long client-side session would reuse a spent refresh token.
                await supabase.auth.getSession();
                return response;
            }

            // This refreshed the token if necessary
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                userId = user.id;
                // Use the client instead of raw fetch for better reliability/caching
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                userRole = profile?.role || 'authenticated';
            }
        }
    } catch (authErr) {
        console.error("[Proxy] Auth Error:", authErr);
    }

    // Prefetches and in-app navigations: no maintenance check, no visitor log (see above).
    if (!isPageView) {
        return response;
    }

    // 4. Maintenance Check & Logging
    const isAdminPath = pathname.includes('/admin') || pathname.includes('/owner') || pathname.includes('/login') || pathname.includes('/set-password');

    if (supabaseUrl && serviceKey) {
        // Visitor Log logic...
        const country = request.headers.get('x-vercel-ip-country') || 'Unknown';
        const rawCity = request.headers.get('x-vercel-ip-city') || 'Unknown';
        const city = decodeURIComponent(rawCity);
        const ip = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
        const userAgent = request.headers.get('user-agent') || 'Unknown';
        const referer = request.headers.get('referer') || 'Direct';
        const host = request.headers.get('host') || 'localhost';
        const requestId = request.headers.get('x-vercel-id') || crypto.randomUUID();
        const region = (request.headers.get('x-vercel-id') || '').split(':')[0] || 'Local';
        const deviceType = userAgent.includes('Mobi') ? 'Mobile' : 'Desktop';

        const pathParts = pathname.split('/');
        const localeContext = routing.locales.includes(pathParts[1] as any) ? pathParts[1] : routing.defaultLocale;

        // Not visitors: crawlers/monitors/scripts, and local development (which made up ~22%
        // of visitor_logs, mixed into the real analytics).
        const isLocalHost = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(host);
        const shouldLog = !BOT_UA.test(userAgent) && !isLocalHost;

        // Logging PROMISE (WaitUntil)
        const logPromise = !shouldLog ? Promise.resolve() : fetch(`${supabaseUrl}/rest/v1/visitor_logs`, {
            method: 'POST',
            headers: {
                'apikey': serviceKey,
                'Authorization': `Bearer ${serviceKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
                path: pathname, locale: localeContext, country, city,
                ip_address: ip,
                user_agent: userAgent, user_id: userId,
                user_role: userRole,
                is_admin_view: isAdminPath,
                referer,
                request_id: requestId,
                method: request.method,
                host,
                region,
                device_type: deviceType
            })
        }).catch(() => { });

        // Maintenance Mode Check
        const isMaintenancePage = pathname.includes('/maintenance');
        if (!isMaintenancePage && !isAdminPath) {
            if (await isMaintenanceOn(supabaseUrl, serviceKey) && !(userRole === 'admin' || userRole === 'super_admin')) {
                response = NextResponse.redirect(new URL(`/${localeContext}/maintenance`, request.url), 307);
                response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
            }
        }

        // Persist the visitor log to our OWN database in the background.
        // (Removed the external nexe-control-room telemetry call: no IP / geolocation /
        // user role was to be sent to a third-party endpoint — GDPR + trust reasons.)
        if (typeof event?.waitUntil === 'function') {
            event.waitUntil(logPromise);
        }
    }

    return response;
}

export const config = {
    // _vercel: Vercel Web Analytics posts page views to /_vercel/insights/*; without the exclusion
    // next-intl would redirect them to /en/_vercel/... and no visit would be counted.
    matcher: ['/((?!_next/static|_next/image|_vercel|favicon.ico|.*\\.).*)'],
};
