-- FIX ROLE ASSIGNMENT TRIGGER
-- Update handle_new_user() to respect initial_role from metadata

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role)
    VALUES (
        NEW.id, 
        NEW.email, 
        COALESCE(
            (NEW.raw_user_meta_data->>'initial_role')::public.app_role, 
            'user'::public.app_role
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
