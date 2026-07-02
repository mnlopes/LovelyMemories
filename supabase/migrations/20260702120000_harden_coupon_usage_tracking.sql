-- INTEGRITY: coupon usage tracking (used_count / max_uses).
-- =====================================================================
-- Migration 20260325000000 created tr_track_coupon_usage, which increments
-- coupons.used_count on every reservations INSERT with a non-null coupon_code.
-- Two problems:
--   1) The app used to store the CLIENT-SENT coupon code even when server-side
--      validation failed (Stripe metadata `cc`), so invalid/expired codes could
--      still bump used_count. Fixed app-side (only validated, applied codes are
--      stored); this trigger now also requires an actually-applied discount > 0
--      so a stored-but-not-applied code can never burn a use.
--   2) The function ran with invoker rights. A reservation inserted by an admin
--      through the REST API would attempt the coupons UPDATE under that user's
--      RLS and could silently update 0 rows. SECURITY DEFINER makes the
--      increment reliable regardless of who inserts.
-- Idempotent: safe to run whether or not the original trigger exists.

CREATE OR REPLACE FUNCTION public.handle_coupon_usage()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.coupon_code IS NOT NULL
       AND NEW.coupon_code <> ''
       AND COALESCE(NEW.coupon_discount_amount, 0) > 0 THEN
        UPDATE public.coupons
        SET used_count = COALESCE(used_count, 0) + 1,
            updated_at = NOW()
        WHERE code = NEW.coupon_code;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_track_coupon_usage ON public.reservations;
CREATE TRIGGER tr_track_coupon_usage
    AFTER INSERT ON public.reservations
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_coupon_usage();
