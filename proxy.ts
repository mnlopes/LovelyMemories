import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextFetchEvent, NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export default async function proxy(request: NextRequest, event: NextFetchEvent) {
    const startTime = Date.now();
    const { pathname } = request.nextUrl;

    // 1. Skip assets/API early
    const isAsset = pathname.includes('.') || pathname.startsWith('/_next');
    const isApi = pathname.startsWith('/api');
    const isPrefetch = request.headers.get('purpose') === 'prefetch' || request.headers.get('x-middleware-prefetch') === '1';

    if (isAsset || isApi || isPrefetch) {
        return NextResponse.next();
    }

    // 2. Setup Response with next-intl (Early creation to attach cookies)
    let response = createMiddleware(routing)(request);
    response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');

    // 3. Setup Auth & Sync Cookies
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    let userRole = 'visitor';
    let userId: string | undefined = undefined;

    try {
        if (supabaseUrl && supabaseAnonKey) {
            const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
                cookies: {
                    getAll() { return request.cookies.getAll() },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
                    },
                },
            });

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

        // Logging PROMISE (WaitUntil)
        const logPromise = fetch(`${supabaseUrl}/rest/v1/visitor_logs`, {
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
            const mtnRes = await fetch(`${supabaseUrl}/rest/v1/system_settings?key=eq.maintenance_mode&select=value`, {
                headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` },
                cache: 'no-store'
            }).catch(() => null);

            if (mtnRes?.ok) {
                const mtnData = await mtnRes.json();
                if (mtnData?.[0]?.value === true && !(userRole === 'admin' || userRole === 'super_admin')) {
                    response = NextResponse.redirect(new URL(`/${localeContext}/maintenance`, request.url), 307);
                    response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
                }
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
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.).*)'],
};
