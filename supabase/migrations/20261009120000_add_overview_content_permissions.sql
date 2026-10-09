-- Overview e Content passam a ser geridos na matriz Roles & Permissions (2026-10-09).
-- Defaults iguais ao acesso que o código dava antes: admin sim, editor/owner não.
-- Opcional: sem estas linhas o código aplica os mesmos defaults (lib/permission-defaults.ts)
-- e o primeiro clique num toggle cria a linha. DO NOTHING para não pisar escolhas já feitas.
INSERT INTO public.role_permissions (role_name, module_name, can_view, can_edit) VALUES
    ('admin', 'overview', true, true),
    ('editor', 'overview', false, false),
    ('owner', 'overview', false, false),
    ('admin', 'content', true, true),
    ('editor', 'content', false, false),
    ('owner', 'content', false, false)
ON CONFLICT (role_name, module_name) DO NOTHING;
