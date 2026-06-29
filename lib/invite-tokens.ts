import { createHash, randomBytes } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * Owner-portal invite tokens.
 *
 * These are OUR single-use tokens (stored hashed in `owner_invites`), not Supabase tokens.
 * They let the invite email stay valid for as long as we want — independent of Supabase's
 * 24h OTP cap — because the actual Supabase session is only minted at redemption time
 * (see redeemInviteToken in app/actions/auth.ts).
 */

/**
 * Validity window for an owner-portal invite link, in days.
 * One constant — change it freely, no migration needed.
 */
export const OWNER_INVITE_EXPIRY_DAYS = 30;

/** SHA-256 (hex) of a raw token. Only the hash is ever stored, so a DB leak can't be replayed. */
export function hashInviteToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
}

/** Generate a fresh, URL-safe raw token (for the email) plus its hash (for the DB). */
export function generateInviteToken(): { raw: string; hash: string } {
    const raw = randomBytes(32).toString('base64url');
    return { raw, hash: hashInviteToken(raw) };
}

/**
 * Create + persist a single-use owner invite and return the RAW token for the email link.
 * The raw token is never stored — only its hash. Throws if the row can't be written, so the
 * caller never emails a link that won't redeem.
 */
export async function createOwnerInvite(params: {
    email: string;
    userId?: string | null;
    createdBy?: string | null;
}): Promise<string> {
    const adminSupabase = await getSupabaseAdmin();
    const { raw, hash } = generateInviteToken();
    const expiresAt = new Date(Date.now() + OWNER_INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await adminSupabase.from('owner_invites').insert({
        email: params.email,
        user_id: params.userId ?? null,
        token_hash: hash,
        expires_at: expiresAt,
        created_by: params.createdBy ?? null,
    });
    if (error) throw new Error(`Failed to create owner invite: ${error.message}`);

    return raw;
}

/**
 * Build the scanner-safe interstitial URL that carries our invite token (not a Supabase token).
 * Mirrors the existing /confirm links: verification only happens on an explicit click (POST),
 * so email prefetchers (Gmail, Outlook Safe Links) can't redeem it.
 */
export function buildOwnerInviteLink(baseUrl: string, locale: string, rawToken: string, email: string): string {
    const loc = locale === 'en' ? 'en' : 'pt';
    const next = `/${loc}/set-password`;
    return `${baseUrl}/${loc}/confirm?invite=${rawToken}&next=${encodeURIComponent(next)}&email=${encodeURIComponent(email)}`;
}
