-- Fecha a tabela public.profiles (auditoria de 2026-11-13, achado S-1).
--
-- PROBLEMA
-- A política "Service role has full access" (20260201_fix_rbac_recursion.sql) foi criada
-- sem `TO service_role`, por isso aplica-se a TODOS os papéis, incluindo visitantes sem
-- login (anon). Resultado, confirmado com a chave pública a 2026-11-13:
--   * qualquer pessoa lê as 34 contas (email, telefone, nome, função);
--   * qualquer pessoa tem permissão para alterar e apagar perfis (testado com um filtro
--     que não apanha nenhuma linha, por isso nada foi alterado);
--   * quem tenha conta pode apagar o próprio perfil e recriá-lo como super_admin
--     (o trigger anti-escalada só cobre UPDATE).
-- A service role não precisa desta política: ignora a RLS por definição.
--
-- DEPOIS DESTA MIGRAÇÃO
--   visitante (anon)         -> sem acesso nenhum à tabela
--   utilizador autenticado   -> lê e altera só o próprio perfil (a função continua
--                               protegida pelo trigger prevent_role_self_escalation)
--   editor                   -> lê todos os perfis (o admin mostra nomes de proprietários)
--   admin / super_admin      -> lê e altera todos os perfis
--   criar / apagar perfis    -> só o servidor (service role) e o trigger de registo
--
-- Aplicar à mão no SQL Editor da Supabase (as migrações deste projeto não são aplicadas
-- automaticamente). Corre tudo numa transação: ou entra tudo, ou nada.

BEGIN;

-- 1. A política que abria a tabela a toda a gente
DROP POLICY IF EXISTS "Service role has full access" ON public.profiles;

-- 2. Leitura
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Super Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins and Super Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Staff can view all profiles" ON public.profiles;
-- has_role() é SECURITY DEFINER: evita a recursão que motivou 20260201_fix_rbac_recursion.sql
CREATE POLICY "Staff can view all profiles" ON public.profiles
    FOR SELECT TO authenticated
    USING (
        public.has_role('super_admin')
        OR public.has_role('admin')
        OR public.has_role('editor')
    );

-- 3. Alteração
-- O próprio utilizador (ex.: markNotificationsAsRead em app/actions/notifications.ts).
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Admins (ex.: sincronizar o email em updateUserProfile, app/actions/user.ts:164).
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles
    FOR UPDATE TO authenticated
    USING (public.has_role('super_admin') OR public.has_role('admin'))
    WITH CHECK (public.has_role('super_admin') OR public.has_role('admin'));

-- 4. Sem políticas de INSERT/DELETE para utilizadores: os perfis são criados pelo trigger
--    de registo (SECURITY DEFINER) e geridos pelo servidor com a service role.

-- 5. Permissões de base (defesa em profundidade, para além da RLS)
REVOKE ALL ON public.profiles FROM anon;
REVOKE INSERT, DELETE ON public.profiles FROM authenticated;

COMMIT;

-- 6. Verificação: o resultado deve mostrar exatamente estas 4 políticas, todas com o papel
--    {authenticated}. Se aparecer outra, avisar antes de continuar.
SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles'
ORDER BY cmd, policyname;
