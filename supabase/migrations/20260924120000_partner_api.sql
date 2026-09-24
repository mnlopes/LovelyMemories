-- PARTNER API (Kitsiva / Kileas)
-- =====================================================================
-- Read-only availability API for server-to-server partners.
-- Spec: docs/superpowers/specs/2026-09-24-partner-availability-api-design.md
--
-- 1. properties.partner_api_enabled — per-property allow-list, OFF by default.
-- 2. partner_api_keys — one row per issued key. Only the SHA-256 hash is
--    stored; the full key is shown once at creation and never again.
-- 3. partner_api_requests — one row per authenticated request (audit + rate
--    limit). The request body (dates/destination) is NOT stored.
--
-- Both tables have RLS enabled and NO policies: only the service role can
-- read or write them.

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS partner_api_enabled boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.partner_api_keys (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_name  text NOT NULL,
  ref_slug      text NOT NULL CHECK (ref_slug ~ '^[a-z0-9-]{2,32}$'),
  key_prefix    text NOT NULL,
  key_hash      text NOT NULL UNIQUE,
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_used_at  timestamptz,
  revoked_at    timestamptz
);

CREATE TABLE IF NOT EXISTS public.partner_api_requests (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  key_id        uuid NOT NULL REFERENCES public.partner_api_keys(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  http_status   smallint NOT NULL,
  status        text NOT NULL,
  error_code    text,
  result_count  smallint,
  duration_ms   integer
);

CREATE INDEX IF NOT EXISTS partner_api_requests_key_time
  ON public.partner_api_requests (key_id, created_at DESC);

ALTER TABLE public.partner_api_keys     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_api_requests ENABLE ROW LEVEL SECURITY;
