-- SECURITY: Enable RLS on properties (and locations) + least-privilege policies.
-- =====================================================================
-- Migration 20260528 granted INSERT/UPDATE/DELETE on ALL public tables to the
-- `authenticated` role. RLS is therefore the only thing preventing any logged-in
-- user from modifying/deleting rows directly via the public REST API + anon key.
-- `properties` and `locations` had NO RLS enabled and NO policies, meaning any
-- authenticated user could reassign owner_id, change prices, or delete listings.
--
-- Public listings must stay readable by everyone (the site reads them with the
-- anon key). All writes go through admin server actions that use the service-role
-- client, which BYPASSES RLS — so the write policies below are defence-in-depth.
-- We use ENABLE (not FORCE) so the service role keeps full access.

-- ---------- properties ----------
DO $$
BEGIN
    IF to_regclass('public.properties') IS NOT NULL THEN
        ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Public can read properties" ON public.properties;
        CREATE POLICY "Public can read properties" ON public.properties
            FOR SELECT USING (true);

        DROP POLICY IF EXISTS "Admins can manage properties" ON public.properties;
        CREATE POLICY "Admins can manage properties" ON public.properties
            FOR ALL
            USING (
                public.has_role('super_admin')
                OR public.has_role('admin')
                OR public.has_role('editor')
            )
            WITH CHECK (
                public.has_role('super_admin')
                OR public.has_role('admin')
                OR public.has_role('editor')
            );
    END IF;
END $$;

-- ---------- locations ----------
DO $$
BEGIN
    IF to_regclass('public.locations') IS NOT NULL THEN
        ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Public can read locations" ON public.locations;
        CREATE POLICY "Public can read locations" ON public.locations
            FOR SELECT USING (true);

        DROP POLICY IF EXISTS "Admins can manage locations" ON public.locations;
        CREATE POLICY "Admins can manage locations" ON public.locations
            FOR ALL
            USING (
                public.has_role('super_admin')
                OR public.has_role('admin')
                OR public.has_role('editor')
            )
            WITH CHECK (
                public.has_role('super_admin')
                OR public.has_role('admin')
                OR public.has_role('editor')
            );
    END IF;
END $$;
