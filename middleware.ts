import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// --- DEMO MODE CONFIGURATION ---
// Set to true to restrict access to only Home, Owner, and About Us pages for client demo.
// Set to false to enable all pages.
const DEMO_MODE = false;
const DEMO_ALLOWED_PATHS = ['/', '/owner', '/about-us'];
// -------------------------------

export default async function middleware(request: NextRequest) {
    if (DEMO_MODE) {
        const { pathname } = request.nextUrl;

        // Skip assets/api check (redundant with matcher but safe)
        if (pathname.startsWith('/api') || pathname.includes('.')) {
            return createMiddleware(routing)(request);
        }

        // Normalize path by removing locale
        const locales = routing.locales.join('|');
        const localeRegex = new RegExp(`^/(${locales})(/|$)`);

        let normalizedPath = pathname.replace(localeRegex, '/');
        if (normalizedPath.length > 1 && normalizedPath.endsWith('/')) {
            normalizedPath = normalizedPath.slice(0, -1);
        }

        // Allow allowed paths
        const isAllowed = DEMO_ALLOWED_PATHS.some(allowed =>
            normalizedPath === allowed || normalizedPath.startsWith(allowed + '/')
        );

        if (!isAllowed) {
            // Redirect to home
            return NextResponse.redirect(new URL('/', request.url));
        }
    }

    // 1. Handle Locale Middleware
    const response = createMiddleware(routing)(request);

    // 2. Handle Supabase Session Refresh (Safe Mode)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        // If keys are missing (e.g. during Vercel initial setup), skip auth refresh to avoid crash.
        // This means auth won't work, but the site won't 500.
        return response;
    }

    const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value;
                },
                set(name: string, value: string, options: any) {
                    request.cookies.set({ name, value, ...options });
                    response.cookies.set({ name, value, ...options });
                },
                remove(name: string, options: any) {
                    request.cookies.set({ name, value: '', ...options });
                    response.cookies.set({ name, value: '', ...options });
                },
            },
        }
    );

    // This refreshes the session if needed
    await supabase.auth.getUser();

    return response;
}

export const config = {
    // Match only internationalized pathnames
    matcher: ['/', '/(en|pt|he)/:path*']
};
