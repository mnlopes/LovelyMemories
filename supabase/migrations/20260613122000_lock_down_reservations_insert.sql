-- SECURITY: Remove anonymous INSERT on reservations.
-- =====================================================================
-- Migration 20260201_allow_public_reservations created:
--     CREATE POLICY "Public can create reservations" ... WITH CHECK (true);
--     GRANT INSERT ON public.reservations TO anon;
-- This let anyone with the public anon key insert arbitrary reservation rows
-- directly, bypassing the server-side price/availability checks — enabling fake
-- "confirmed" bookings and calendar poisoning (denial of availability).
--
-- All legitimate reservations are created server-side via the service-role client
-- (finalizeBooking), which bypasses RLS, so anon INSERT is unnecessary.

DROP POLICY IF EXISTS "Public can create reservations" ON public.reservations;

REVOKE INSERT ON public.reservations FROM anon;

-- Note: `authenticated` keeps its grant, but with no permissive INSERT policy for
-- normal users (only "Admins can manage reservations" via has_role), non-admins
-- still cannot insert. Admin/guest creation flows use the service role.
