import { NextRequest, NextResponse, after } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { extractBearer } from '@/lib/partner-api/keys';
import { findActiveKey, isRateLimited, recordRequest } from '@/lib/partner-api/auth';
import { lisbonToday, validateAvailabilityRequest } from '@/lib/partner-api/validate';
import { searchAvailableProperties } from '@/lib/partner-api/search';
import { buildSuccessResponse } from '@/lib/partner-api/serialize';
import type { ErrorResponse, ResponseStatus } from '@/lib/partner-api/types';

/**
 * Partner availability API — read-only, server-to-server, Bearer-authenticated.
 * Spec: docs/superpowers/specs/2026-09-24-partner-availability-api-design.md
 *
 * No CORS headers on purpose: browsers must not be able to call this.
 */

export const dynamic = 'force-dynamic';

// Explicit charset: some clients (e.g. Windows PowerShell 5.1) fall back to Latin-1
// without it and mangle accents and curly quotes in names and descriptions.
const BASE_HEADERS = { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' };

function json(body: unknown, status: number, extraHeaders: Record<string, string> = {}) {
    return NextResponse.json(body, { status, headers: { ...BASE_HEADERS, ...extraHeaders } });
}

function errorBody(status: Exclude<ResponseStatus, 'SUCCESS'>, code: string, message: string): ErrorResponse {
    return { status, error: { code, message } };
}

const unauthorized = () =>
    json(errorBody('UNAUTHORIZED', 'UNAUTHORIZED', 'Invalid or missing API token'), 401);

const serviceError = () =>
    json(errorBody('ERROR', 'AVAILABILITY_UNAVAILABLE', 'Availability could not be retrieved at this time'), 503);

/** Anon client, no session: sees exactly what the public site sees. */
function createAnonClient() {
    return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
}

export async function POST(request: NextRequest) {
    const startedAt = Date.now();

    // Kill-switch first: no DB access at all when disabled.
    if (process.env.PARTNER_API_ENABLED !== 'true') {
        return json(errorBody('ERROR', 'SERVICE_DISABLED', 'The API is temporarily disabled'), 503);
    }

    const token = extractBearer(request.headers.get('authorization'));
    if (!token) return unauthorized();

    let key;
    try {
        key = await findActiveKey(token);
    } catch (err) {
        console.error('[partner-api] key lookup failed:', err);
        return serviceError();
    }
    if (!key) return unauthorized();

    const keyId = key.id;
    const respond = (
        res: NextResponse,
        status: Exclude<ResponseStatus, 'UNAUTHORIZED' | 'METHOD_NOT_ALLOWED'>,
        errorCode?: string,
        resultCount?: number,
    ) => {
        const durationMs = Date.now() - startedAt;
        after(() => recordRequest({ keyId, httpStatus: res.status, status, errorCode, resultCount, durationMs }));
        return res;
    };

    try {
        if (await isRateLimited(keyId)) {
            return respond(
                json(errorBody('RATE_LIMITED', 'RATE_LIMITED', 'Too many requests. Retry in 60 seconds.'), 429, { 'Retry-After': '60' }),
                'RATE_LIMITED',
                'RATE_LIMITED',
            );
        }
    } catch (err) {
        console.error('[partner-api] rate limit check failed:', err);
        return respond(serviceError(), 'ERROR', 'AVAILABILITY_UNAVAILABLE');
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        body = undefined;
    }

    const validation = validateAvailabilityRequest(body, lisbonToday());
    if (!validation.ok) {
        return respond(
            json(errorBody('INVALID_REQUEST', validation.code, validation.message), 400),
            'INVALID_REQUEST',
            validation.code,
        );
    }

    try {
        const properties = await searchAvailableProperties(createAnonClient(), validation.value, key.refSlug);
        return respond(json(buildSuccessResponse(validation.value, properties), 200), 'SUCCESS', undefined, properties.length);
    } catch (err) {
        console.error('[partner-api] search failed:', err);
        return respond(serviceError(), 'ERROR', 'AVAILABILITY_UNAVAILABLE');
    }
}

function methodNotAllowed() {
    return json(errorBody('METHOD_NOT_ALLOWED', 'METHOD_NOT_ALLOWED', 'Use POST'), 405, { Allow: 'POST' });
}

export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
