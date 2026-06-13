-- SECURITY: Harden new-user role assignment (privilege escalation fix)
-- =====================================================================
-- Previously handle_new_user() set the profile role from
-- raw_user_meta_data->>'initial_role', which is fully controlled by the
-- client in supabase.auth.signUp({ options: { data: {...} } }). With the
-- public anon key, anyone could self-register as 'super_admin' if public
-- sign-ups are enabled on the project.
--
-- This migration makes the trigger ALWAYS create new profiles as 'user'.
-- Legitimate elevated roles are assigned server-side by inviteUser() using
-- the service-role client, AFTER verifying the caller is an admin.
--
-- NOTE: This is defence-in-depth. You MUST ALSO disable public sign-ups in
-- the Supabase dashboard (Authentication -> Providers/Settings ->
-- "Allow new users to sign up" = OFF), since all users are invite-only.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role)
    VALUES (
        NEW.id,
        NEW.email,
        'user'::public.app_role   -- never trust client-supplied initial_role
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
