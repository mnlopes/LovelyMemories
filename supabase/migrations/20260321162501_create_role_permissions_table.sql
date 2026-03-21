-- Create role_permissions table
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    role_name TEXT NOT NULL,
    module_name TEXT NOT NULL,
    can_view BOOLEAN DEFAULT false,
    can_edit BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(role_name, module_name)
);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies
-- Allow read access to authenticated users
CREATE POLICY "Allow authenticated users to read role_permissions" ON public.role_permissions
    FOR SELECT TO authenticated USING (true);

-- Allow admins to manage/modify permissions
CREATE POLICY "Allow admins to manage role_permissions" ON public.role_permissions
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role IN ('super_admin', 'admin')
        )
    );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_role_permissions_updated_at
BEFORE UPDATE ON public.role_permissions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Insert default permissions
INSERT INTO public.role_permissions (role_name, module_name, can_view, can_edit) VALUES
    ('admin', 'properties', true, true),
    ('admin', 'bookings', true, true),
    ('admin', 'owners', true, true),
    ('admin', 'concierge', true, true),
    ('admin', 'team', true, true),
    ('editor', 'properties', true, true),
    ('editor', 'bookings', true, true),
    ('editor', 'owners', true, false),
    ('editor', 'concierge', true, true),
    ('editor', 'team', false, false),
    ('owner', 'properties', false, false),
    ('owner', 'bookings', false, false),
    ('owner', 'owners', true, false),
    ('owner', 'concierge', false, false),
    ('owner', 'team', false, false);
