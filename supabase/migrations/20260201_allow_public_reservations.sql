
-- Allow public users (guests) to create reservations
CREATE POLICY "Public can create reservations" ON public.reservations
    FOR INSERT 
    WITH CHECK (true);

-- Ensure the public role has permission to insert into the table
GRANT INSERT ON public.reservations TO anon;
GRANT INSERT ON public.reservations TO authenticated;
