import 'server-only';
import { createHash, randomBytes } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * Invite tokens — used for EVERY invite (owners and team members alike), despite the historical
 * "owner" naming of the table and helpers. Nothing here depends on the invitee's role.
 *
 * These are OUR tokens (stored hashed in `owner_invites`), not Supabase tokens.
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
    // S-7: only the newest link works. An older email still in someone's inbox (or forwarded)
    // must not keep logging people in.
    await revokeInvites({ userId: params.userId, email: params.email });
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
 * S-7 (audit 2026-11-13): end every live invite of this person.
 *
 * Redeeming an invite logs its holder in WITHOUT a password, and the link is reusable for its
 * whole 30 days (so a double-click or a closed tab never locks an owner out). That is only
 * acceptable while the account has no password yet. So invites are ended when:
 *   - a password is set (set-password page, self-service change, or an admin setting it);
 *   - a newer invite is sent to the same person (createOwnerInvite).
 * Until then nothing changes: 30 days, unlimited retries.
 *
 * Ended by moving expires_at to now (redeemInviteToken only accepts expires_at > now), not by
 * deleting, so the audit trail (created_by, used_at) stays. Never throws: a failure here must
 * not block a password change; it is logged instead.
 */
export async function revokeInvites(target: { userId?: string | null; email?: string | null }): Promise<void> {
    if (!target.userId && !target.email) return;
    try {
        const adminSupabase = await getSupabaseAdmin();
        const now = new Date().toISOString();
        const end = () => adminSupabase.from('owner_invites').update({ expires_at: now }).gt('expires_at', now);
        const results = await Promise.all([
            target.userId ? end().eq('user_id', target.userId) : null,
            // Case-insensitive exact match: escape LIKE wildcards (an email may contain "_").
            target.email ? end().ilike('email', target.email.trim().replace(/[\\%_]/g, (c) => `\\${c}`)) : null,
        ]);
        for (const r of results) if (r?.error) console.error('revokeInvites failed:', r.error.message);
    } catch (err) {
        console.error('revokeInvites failed:', err);
    }
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
