import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sendEmail } from '@/lib/email';
import { getSalesLeadsEmail } from '@/lib/sales/repo';
import { SITE_URL } from '@/lib/seo';
import { getSupabaseAdmin } from '@/lib/supabase';
import { hitRateLimit } from '@/lib/rate-limit';
import { saleInquirySchema } from '@/lib/sales/validation';
import { saleInquiryBuyerEmail, saleInquiryTeamEmail, type InquiryEmailData } from '@/lib/sales/emails';
import { localized } from '@/lib/sales/format';
import type { Localized } from '@/lib/sales/types';

/** Per-browser limit, one cookie per listing: a buyer can ask about several homes. `id` is a validated uuid. */
function inquiryCookie(id: string): string {
    return `sale-inquiry-${id.toLowerCase()}`;
}

function clientIp(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    return forwarded || request.headers.get('x-real-ip')?.trim() || 'unknown';
}

const ALLOWED_HOSTS = ['www.lovelymemories.pt', 'lovelymemories.pt', 'localhost'];

function sameSiteRequest(request: Request): boolean {
    const fetchSite = request.headers.get('sec-fetch-site');
    if (fetchSite && !['same-origin', 'same-site', 'none'].includes(fetchSite)) return false;
    const origin = request.headers.get('origin');
    if (origin) {
        let host: string;
        try {
            host = new URL(origin).host;
        } catch {
            return false;
        }
        const requestHost = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '';
        const hostname = host.split(':')[0];
        if (host !== requestHost && !ALLOWED_HOSTS.includes(hostname)) return false;
    }
    return true;
}

// Logs carry the listing reference and the outcome only: never a name, email, phone, message or IP.
export async function POST(request: Request) {
    let reference = '-';
    try {
        // Cross-site and non-JSON posts are refused before the body is read.
        const contentType = request.headers.get('content-type') ?? '';
        if (!contentType.toLowerCase().startsWith('application/json')) {
            return NextResponse.json({ error: 'invalid' }, { status: 415 });
        }
        if (!sameSiteRequest(request)) {
            return NextResponse.json({ error: 'forbidden' }, { status: 403 });
        }

        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'invalid' }, { status: 400 });
        }

        // 1. Validation
        const parsed = saleInquirySchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'invalid' }, { status: 400 });
        }
        const input = parsed.data;

        // 2. Honeypot: pretend it worked, send nothing.
        if (input.website && input.website.length > 0) {
            console.warn('sale-inquiry honeypot');
            return NextResponse.json({ ok: true }, { status: 200 });
        }

        // 3. Per-browser limit for this listing (cookie)
        const cookieStore = await cookies();
        if (cookieStore.get(inquiryCookie(input.listingId))) {
            console.warn('sale-inquiry blocked:cookie');
            return NextResponse.json({ error: 'too_many' }, { status: 429 });
        }

        // 4. Per-IP and per-email limits (server side, hashed)
        const ip = clientIp(request);
        if (!(await hitRateLimit('sale-ip', ip, 3600, 5))) {
            console.warn('sale-inquiry blocked:ip');
            return NextResponse.json({ error: 'too_many' }, { status: 429 });
        }
        if (!(await hitRateLimit('sale-email', input.email, 86400, 3))) {
            console.warn('sale-inquiry blocked:email');
            return NextResponse.json({ error: 'too_many' }, { status: 429 });
        }

        // 5. The listing comes from the database; its title, reference and URL are never taken from the request.
        const supabase = await getSupabaseAdmin();
        const { data: listing, error: listingError } = await supabase
            .from('sale_listings')
            .select('id,reference,slug,title')
            .eq('id', input.listingId)
            .eq('published', true)
            .maybeSingle();
        if (listingError) {
            console.error('sale-inquiry listing lookup failed:', listingError.code);
            return NextResponse.json({ error: 'send_failed' }, { status: 500 });
        }
        if (!listing) {
            console.warn('sale-inquiry not_found');
            return NextResponse.json({ error: 'not_found' }, { status: 404 });
        }
        reference = String(listing.reference);
        const title = listing.title as Localized;

        const common = {
            kind: input.kind,
            name: input.name,
            email: input.email,
            phone: input.phone?.trim() || undefined,
            purpose: input.purpose,
            message: input.message,
            visitTimes: input.kind === 'visit' ? input.visitTimes?.trim() || undefined : undefined,
            reference,
        };
        const teamData: InquiryEmailData = {
            ...common,
            listingTitle: localized(title, 'pt') || reference,
            listingUrl: `${SITE_URL}/pt/for-sale/${listing.slug}`,
        };

        // 6. Email to the team: its failure is the request's failure.
        const team = saleInquiryTeamEmail(teamData);
        const sent = await sendEmail({
            to: await getSalesLeadsEmail(),
            subject: team.subject,
            html: team.html,
            replyTo: input.email,
        });
        if (!sent.success) {
            console.error(`sale-inquiry ${reference} failed:send`);
            return NextResponse.json({ error: 'send_failed' }, { status: 500 });
        }

        // 7. Confirmation to the buyer, at most one per hour per address (the form must not mail third parties).
        // Fails closed: if the counter is down, no confirmation goes out (the team email already did).
        let confirmed = false;
        if (await hitRateLimit('sale-confirm', input.email, 3600, 1, { failOpen: false })) {
            const buyerData: InquiryEmailData = {
                ...common,
                listingTitle: localized(title, input.locale) || reference,
                listingUrl: `${SITE_URL}/${input.locale}/for-sale/${listing.slug}`,
            };
            const buyer = saleInquiryBuyerEmail(buyerData, input.locale);
            const confirmation = await sendEmail({
                to: input.email,
                subject: buyer.subject,
                html: buyer.html,
            });
            confirmed = confirmation.success;
            if (!confirmed) console.error(`sale-inquiry ${reference} confirmation failed`);
        }

        console.log(`sale-inquiry ${reference} sent${confirmed ? '' : ' (no confirmation)'}`);

        // 8. Per-browser cookie for this listing
        const response = NextResponse.json({ ok: true }, { status: 200 });
        response.cookies.set(inquiryCookie(String(listing.id)), 'true', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 10,
            path: '/',
        });
        return response;
    } catch (e) {
        console.error(`sale-inquiry ${reference} failed:exception`, e instanceof Error ? e.name : 'unknown');
        return NextResponse.json({ error: 'send_failed' }, { status: 500 });
    }
}
