-- SEARCH AVAILABILITY FIX
-- =====================================================================
-- Problem: the public Search page checks availability client-side with the
-- anonymous key. `blocked_dates` and `locked_dates` are publicly readable, so
-- Airbnb/Booking blocks and owner manual blocks were detected — but
-- `reservations` is NOT publicly readable (RLS only allows admins/owners).
-- As a result, paid website bookings did NOT mark a property as "Reserved"
-- in search, showing already-booked properties as available.
--
-- Fix: a SECURITY DEFINER function that returns ONLY the property ids that are
-- unavailable for a given date range, merging all three sources. It exposes no
-- guest PII (just property ids) and runs with owner privileges so it can read
-- `reservations` past RLS. Granted to anon/authenticated for the public search.
--
-- Overlap semantics mirror verifyAvailability() in lib/pricing.ts:
--   blocked_dates:  end_date  > check_in AND start_date < check_out
--   reservations:   check_out > check_in AND check_in  < check_out (not cancelled)
--   locked_dates:   active lock AND check_out > check_in AND check_in < check_out

CREATE OR REPLACE FUNCTION public.get_unavailable_property_ids(
    p_check_in  date,
    p_check_out date
)
RETURNS TABLE (property_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT bd.property_id
    FROM public.blocked_dates bd
    WHERE bd.end_date   > p_check_in
      AND bd.start_date < p_check_out

    UNION

    SELECT r.property_id
    FROM public.reservations r
    WHERE (r.status IS NULL OR r.status <> 'cancelled')
      AND r.check_out::date > p_check_in
      AND r.check_in::date  < p_check_out

    UNION

    SELECT l.property_id
    FROM public.locked_dates l
    WHERE l.expires_at > now()
      AND l.check_out  > p_check_in
      AND l.check_in   < p_check_out;
$$;

GRANT EXECUTE ON FUNCTION public.get_unavailable_property_ids(date, date) TO anon, authenticated;
