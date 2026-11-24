import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getPublicSaleDocumentPath } from '@/lib/sales/repo';
import { ENERGY_CERT_DOC_ID } from '@/lib/sales/types';
import { getCurrentUserRole } from '@/app/actions/user';
import { PROPERTY_EDITORS } from '@/lib/auth/require-role';

/**
 * Opens a document of a sale listing that is marked public (energy certificate or extra document).
 * The files live in a private bucket: this checks on every request that the listing is published
 * (drafts only for the team, as on the preview page) and the document still public, then redirects
 * to a 2-minute signed link. Switching a document off in the backoffice cuts access at once.
 */
const params = z.object({
    listingId: z.string().uuid(),
    docId: z.union([z.string().uuid(), z.literal(ENERGY_CERT_DOC_ID)]),
});

const notFound = () =>
    new NextResponse('Not found', { status: 404, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });

export async function GET(_req: Request, ctx: { params: Promise<{ listingId: string; docId: string }> }) {
    const parsed = params.safeParse(await ctx.params);
    if (!parsed.success) return notFound();
    const { listingId, docId } = parsed.data;

    let doc = await getPublicSaleDocumentPath(listingId, docId);
    if (!doc) {
        const role = await getCurrentUserRole();
        if (role && (PROPERTY_EDITORS as readonly string[]).includes(role)) {
            doc = await getPublicSaleDocumentPath(listingId, docId, { includeDrafts: true });
        }
    }
    if (!doc) return notFound();

    const supabase = await getSupabaseAdmin();
    const { data, error } = await supabase.storage.from('sale-listings-private').createSignedUrl(doc.path, 120);
    if (error || !data) {
        console.error('sale-doc sign failed:', error?.name ?? 'no_data');
        return notFound();
    }
    return NextResponse.redirect(data.signedUrl, {
        status: 302,
        headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
    });
}
