
-- FIX FOR INFINITE RECURSION IN PROFILES TABLE
-- The previous policy used an EXISTS check on the same table, which caused recursion.
-- We now use the SECURITY DEFINER function public.has_role() which bypasses RLS for its internal query.

DROP POLICY IF EXISTS "Super Admins can view all profiles" ON public.profiles;

CREATE POLICY "Admins and Super Admins can view all profiles" ON public.profiles
    FOR SELECT USING (
        (SELECT (auth.jwt() ->> 'role')) = 'service_role' OR 
        public.has_role('super_admin') OR 
        public.has_role('admin')
    );

-- Also ensure the service role can do anything (usually redundant but good for clarity)
CREATE POLICY "Service role has full access" ON public.profiles
    FOR ALL USING (true)
    WITH CHECK (true);
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY; -- Just to be sure
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY; -- Temp disable to avoid loop while applying if needed
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
