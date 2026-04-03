-- MIGRATION: Allow owners to view reservations for their own properties
-- Date: 2026-04-03
-- Purpose: Fix €0 revenue issue for owners in the dashboard

-- 1. Ensure RLS is enabled (it already should be)
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- 2. Add policy for Owners to read reservations through their linked properties
CREATE POLICY "Owners can view their own property's reservations" ON public.reservations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.properties
            WHERE properties.id = reservations.property_id
            AND properties.owner_id = auth.uid()
        )
    );

-- Log success (optional depending on system)
-- SELECT 'Policy for owner reservations created successfully' as status;
