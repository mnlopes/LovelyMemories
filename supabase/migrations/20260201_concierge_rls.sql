-- Enable RLS (this is safe to re-run, or add IF NOT EXISTS in logic)
ALTER TABLE public.concierge_services ENABLE ROW LEVEL SECURITY;

-- Allow PUBLIC read access (SELECT)
DROP POLICY IF EXISTS "Public can read concierge services" ON public.concierge_services;
CREATE POLICY "Public can read concierge services"
ON public.concierge_services
FOR SELECT
TO public
USING (true);

-- Allow AUTHENTICATED users to INSERT (Admins)
DROP POLICY IF EXISTS "Authenticated users can insert concierge services" ON public.concierge_services;
CREATE POLICY "Authenticated users can insert concierge services"
ON public.concierge_services
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow AUTHENTICATED users to UPDATE
DROP POLICY IF EXISTS "Authenticated users can update concierge services" ON public.concierge_services;
CREATE POLICY "Authenticated users can update concierge services"
ON public.concierge_services
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow AUTHENTICATED users to DELETE
DROP POLICY IF EXISTS "Authenticated users can delete concierge services" ON public.concierge_services;
CREATE POLICY "Authenticated users can delete concierge services"
ON public.concierge_services
FOR DELETE
TO authenticated
USING (true);
