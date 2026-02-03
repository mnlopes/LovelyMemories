
-- Enable RLS on reservations
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Allow admins to view all reservations
CREATE POLICY "Admins can view all reservations" ON public.reservations
    FOR SELECT USING (
        public.has_role('super_admin') OR 
        public.has_role('admin') OR
        public.has_role('editor')
    );

-- Allow admins to insert/update reservations
CREATE POLICY "Admins can manage reservations" ON public.reservations
    FOR ALL USING (
        public.has_role('super_admin') OR 
        public.has_role('admin') OR
        public.has_role('editor')
    );
