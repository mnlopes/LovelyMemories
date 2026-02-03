
-- RBAC SYSTEM SETUP
-- This script creates a profiles table and roles to manage multiple admins.

-- 1. Create the Roes Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'editor', 'user');
    END IF;
END $$;

-- 2. Create Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE,
    role public.app_role DEFAULT 'user',
    full_name TEXT,
    avatar_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Policies for Profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Super Admins can view all profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- 5. Helper Function to check roles
CREATE OR REPLACE FUNCTION public.has_role(target_role public.app_role)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = target_role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger: Create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role)
    VALUES (NEW.id, NEW.email, 'user');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. HOW TO ASSIGN SUPER ADMIN (Manual Step)
-- Run this in SQL Editor after you and your client sign up:
-- UPDATE public.profiles SET role = 'super_admin' WHERE email = 'teu-email@exemplo.com';
-- UPDATE public.profiles SET role = 'super_admin' WHERE email = 'cliente-email@exemplo.com';
