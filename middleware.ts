import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

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

    return createMiddleware(routing)(request);
}

export const config = {
    // Match only internationalized pathnames
    matcher: ['/', '/(en|pt)/:path*']
};
