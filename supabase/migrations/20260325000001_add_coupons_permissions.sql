-- Add Coupons module permissions
INSERT INTO public.role_permissions (role_name, module_name, can_view, can_edit) VALUES
    ('admin', 'coupons', true, true),
    ('editor', 'coupons', true, true),
    ('owner', 'coupons', false, false)
ON CONFLICT (role_name, module_name) DO UPDATE SET
    can_view = EXCLUDED.can_view,
    can_edit = EXCLUDED.can_edit;
