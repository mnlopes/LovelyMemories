-- Allow everyone to read the maintenance_mode setting specifically
-- This helps the middleware check the status without needing complex auth/service role
CREATE POLICY "Public can read maintenance mode status"
ON public.system_settings
FOR SELECT
TO anon
USING (key = 'maintenance_mode');
