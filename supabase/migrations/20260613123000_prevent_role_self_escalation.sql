-- SECURITY: Prevent users from changing their own (or anyone's) role unless they
-- are the service role or an existing admin/super_admin.
-- =====================================================================
-- Because `authenticated` has an UPDATE grant on all tables, if any permissive
-- UPDATE policy exists on `profiles` (e.g. a self-update policy), a user could set
-- their own `role` column to 'super_admin' via the REST API. This trigger blocks
-- any role change that does not come from the service role or an existing admin,
-- regardless of which RLS policies are in place.

CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        -- Trusted server actions use the service role; admins manage roles via those actions.
        IF auth.role() = 'service_role'
           OR public.has_role('admin')
           OR public.has_role('super_admin') THEN
            RETURN NEW;
        END IF;
        RAISE EXCEPTION 'Changing role is not allowed';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS prevent_role_self_escalation_trg ON public.profiles;
CREATE TRIGGER prevent_role_self_escalation_trg
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.prevent_role_self_escalation();
