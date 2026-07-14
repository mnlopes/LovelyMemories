-- ── Supabase Realtime no Guest Inbox ──────────────────────────────────────────
-- O InboxShell subscreve postgres_changes em beds24_messages / ai_message_log /
-- ai_conversation para refresh instantâneo (aprovado 2026-07-14).
-- As 3 tabelas têm RLS service-role-only, por isso o cliente browser não recebe
-- eventos sem uma policy de SELECT para staff (opção (a) do handoff).
-- NOTA: além desta migração, confirmar no dashboard que o Realtime está ativo
-- (Database → Replication → supabase_realtime inclui as 3 tabelas).

-- Policies de SELECT para staff autenticado (o inbox é só super_admin hoje;
-- admin incluído para o alargamento pós-E2E já previsto)
drop policy if exists "Staff read beds24_messages" on public.beds24_messages;
create policy "Staff read beds24_messages"
    on public.beds24_messages for select to authenticated
    using (exists (
        select 1 from public.profiles
        where id = auth.uid() and role in ('admin', 'super_admin')
    ));

drop policy if exists "Staff read ai_conversation" on public.ai_conversation;
create policy "Staff read ai_conversation"
    on public.ai_conversation for select to authenticated
    using (exists (
        select 1 from public.profiles
        where id = auth.uid() and role in ('admin', 'super_admin')
    ));

drop policy if exists "Staff read ai_message_log" on public.ai_message_log;
create policy "Staff read ai_message_log"
    on public.ai_message_log for select to authenticated
    using (exists (
        select 1 from public.profiles
        where id = auth.uid() and role in ('admin', 'super_admin')
    ));

-- Adicionar as tabelas à publication do Realtime (idempotente)
do $$
begin
    if not exists (select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'beds24_messages') then
        alter publication supabase_realtime add table public.beds24_messages;
    end if;
    if not exists (select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ai_conversation') then
        alter publication supabase_realtime add table public.ai_conversation;
    end if;
    if not exists (select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ai_message_log') then
        alter publication supabase_realtime add table public.ai_message_log;
    end if;
end $$;
