-- Owner-portal invite tokens — long-lived invite links (reusable until they expire).
-- =====================================================================
-- Supabase caps the email OTP / link expiry at 24h, which is far too short for an invite
-- email that owners open days later. This table decouples the invite link's lifetime from
-- Supabase: the email carries OUR token (default 30-day validity, controlled in
-- lib/invite-tokens.ts), and a fresh Supabase recovery token is only minted AND consumed
-- server-side at the instant the owner clicks (see redeemInviteToken). The owner-facing link
-- therefore never depends on Supabase's OTP clock.
--
-- SECURITY: migration 20260528 grants SELECT to anon/authenticated and full DML to
-- `authenticated` on every public table — including future ones, via ALTER DEFAULT PRIVILEGES.
-- For a token table that is unacceptable, so we lock it down two ways:
--   (a) ENABLE RLS with NO policies — anon/authenticated get zero access, while the
--       service-role client used by our server actions BYPASSES RLS; and
--   (b) REVOKE the auto-granted privileges as defence-in-depth.
-- Only the hash of each token is stored, so even a DB leak cannot reconstruct a usable link.

CREATE TABLE IF NOT EXISTS public.owner_invites (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    email       text NOT NULL,
    token_hash  text NOT NULL UNIQUE,   -- SHA-256 (hex) of the raw token; raw token lives only in the email
    expires_at  timestamptz NOT NULL,
    used_at     timestamptz,            -- last successful redemption (audit only; link stays reusable until expiry)
    created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- token_hash already has a unique index from the constraint above; add one for email lookups
-- (admin "pending invites" views / cleanup).
CREATE INDEX IF NOT EXISTS owner_invites_email_idx ON public.owner_invites (email);

-- Lock the table down. ENABLE (not FORCE) so the service role keeps full access.
ALTER TABLE public.owner_invites ENABLE ROW LEVEL SECURITY;
-- Intentionally NO policies: anon/authenticated can do nothing; service_role bypasses RLS.

REVOKE ALL ON public.owner_invites FROM anon, authenticated;
