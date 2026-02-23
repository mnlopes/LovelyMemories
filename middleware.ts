import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextFetchEvent, NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export default async function middleware(request: NextRequest, event: NextFetchEvent) {
    const startTime = Date.now();
    const { pathname } = request.nextUrl;

    // 1. Skip assets/API early
    const isAsset = pathname.includes('.') || pathname.startsWith('/_next');
    const isApi = pathname.startsWith('/api');
    const isPrefetch = request.headers.get('purpose') === 'prefetch' || request.headers.get('x-middleware-prefetch') === '1';

    // Capture main hits: Initial Page Loads (HTML) + Navigations (RSC)
    // We skip assets, APIs and background prefetches
    if (isAsset || isApi || isPrefetch) {
        return NextResponse.next();
    }

    // 2. Setup Auth & Get User Info
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    let userRole = 'visitor';
    let userId: string | undefined = undefined;

    try {
        if (supabaseUrl && supabaseAnonKey && serviceKey) {
            const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
                cookies: {
                    getAll() { return request.cookies.getAll() },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    },
                },
            });

            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                userId = user.id;
                const roleRes = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${user.id}&select=role`, {
                    headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` },
                    cache: 'no-store',
                    signal: AbortSignal.timeout(2000) // Don't hang for more than 2s
                });
                if (roleRes.ok) {
                    const roleData = await roleRes.json();
                    userRole = roleData?.[0]?.role || 'authenticated';
                }
            }
        }
    } catch (authErr) {
        console.error("[Visitor Log] Auth Check Error (skipping):", authErr);
    }

    // 3. Visitor Logging (Enhanced with IP and Navigation tracking)
    const isAdminPath = pathname.includes('/admin') || pathname.includes('/owner') || pathname.includes('/login') || pathname.includes('/set-password');
    if (supabaseUrl && serviceKey) {
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
        const locale = routing.locales.includes(pathParts[1] as any) ? pathParts[1] : routing.defaultLocale;

        // Use event.waitUntil to ensure the log is sent even after the response is delivered
        const logPromise = fetch(`${supabaseUrl}/rest/v1/visitor_logs`, {
            method: 'POST',
            headers: {
                'apikey': serviceKey,
                'Authorization': `Bearer ${serviceKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
                path: pathname, locale, country, city,
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
        }).catch(err => console.error("[Visitor Log] Error:", err));

        event.waitUntil(logPromise);
    }

    // 4. Maintenance Check
    const isMaintenancePage = pathname.includes('/maintenance');
    if (!isMaintenancePage && !isAdminPath && supabaseUrl && serviceKey) {
        const res = await fetch(`${supabaseUrl}/rest/v1/system_settings?key=eq.maintenance_mode&select=value`, {
            headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}`, 'X-Timestamp': Date.now().toString() },
            cache: 'no-store'
        });
        const data = await res.json();
        if (data?.[0]?.value === true && !(userRole === 'admin' || userRole === 'super_admin')) {
            const pathParts = pathname.split('/');
            const locale = routing.locales.includes(pathParts[1] as any) ? pathParts[1] : routing.defaultLocale;
            const response = NextResponse.redirect(new URL(`/${locale}/maintenance`, request.url), 307);
            response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
            return response;
        }
    }

    // 5. Final Response
    const response = createMiddleware(routing)(request);
    response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');

    // --- NEXE CONTROL ROOM TRACKER ---
    // 1. Filtragem Máxima (Prefetch + Bots Automáticos)
    const uaRaw = (request.headers.get("user-agent") || "").toLowerCase();
    const isBot = uaRaw.includes("bot") || uaRaw.includes("vercel") || uaRaw.includes("screenshot") || uaRaw.includes("favicon") || uaRaw.includes("spider");
    const isPrefetchTracker =
        request.headers.get('purpose') === 'prefetch' ||
        request.headers.get('x-middleware-prefetch') === '1' ||
        request.headers.get('next-router-prefetch') === '1';

    // Só avança se for uma pessoa verdadeira e não for um prefetch
    if (!isPrefetchTracker && !isBot) {

        // 2. Extrair a Cidade (Usando rigorosamente a mesma lógica do Visitor Logger)
        const rawCityParams = request.headers.get('x-vercel-ip-city') || 'Unknown';
        const finalCity = decodeURIComponent(rawCityParams);

        // 3. Detetar Browser Manualmente (100% Funcional e Simples)
        const ua = request.headers.get("user-agent") || "";
        let browserName = null;
        if (ua.includes("Firefox") && !ua.includes("Seamonkey")) browserName = "Firefox";
        else if (ua.includes("Edg")) browserName = "Edge";
        else if (ua.includes("Chrome") || ua.includes("CriOS")) browserName = "Chrome";
        else if (ua.includes("Safari") && !ua.includes("Chrome")) browserName = "Safari";
        else if (ua.includes("Opera") || ua.includes("OPR")) browserName = "Opera";

        // Calcular locale para o Tracker
        const pathParts = pathname.split('/');
        const locale = routing.locales.includes(pathParts[1] as any) ? pathParts[1] : routing.defaultLocale;

        // 4. Disparar para a Nexe (Silencioso)
        const nexePromise = fetch("https://nexe-control-room.vercel.app/api/logs/ingest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                url: "lovelymemories.pt",
                method: request.method,
                path: request.nextUrl.pathname,
                status: response.status || 200,
                response_time: Date.now() - startTime,
                ip: request.headers.get("x-forwarded-for")?.split(',')[0] || request.headers.get("x-real-ip") || "Unknown",
                country: request.headers.get("x-vercel-ip-country") || "Unknown",
                country_code: request.headers.get("x-vercel-ip-country") || "??",
                city: finalCity,
                browser: browserName,
                user_agent: ua,
                device: ua.includes("Mobile") || ua.includes("Android") || ua.includes("iPhone") ? "Mobile" : "Desktop",
                user_role: (userRole || "VISITOR").toUpperCase(),
                is_admin_view: isAdminPath,
                locale: locale
            })
        }).catch(err => console.log("Nexe Error:", err));

        // Previne que a Vercel mate a execução antes do envio
        if (typeof event?.waitUntil === 'function') {
            event.waitUntil(nexePromise);
        }
    }
    // ---------------------------------

    return response;
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.).*)'],
};
