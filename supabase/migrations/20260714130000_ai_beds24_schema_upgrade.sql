-- Upgrade do schema ai_* live (era Hospitable) para o schema Beds24 consolidado.
-- A BD tem as tabelas antigas do branch feat/ai-guest-messaging; a consolidada
-- (20260714090000) usou "create table if not exists" e não as alterou.
-- Idempotente. APLICAR MANUALMENTE no dashboard Supabase.

-- 1. ai_conversation: hospitable_property_id -> external_property_id
do $$ begin
    if exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = 'ai_conversation'
                 and column_name = 'hospitable_property_id') then
        alter table public.ai_conversation rename column hospitable_property_id to external_property_id;
    end if;
end $$;

-- 2. ai_message_log: renames hospitable_* -> external_*
do $$ begin
    if exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = 'ai_message_log'
                 and column_name = 'hospitable_message_id') then
        alter table public.ai_message_log rename column hospitable_message_id to external_message_id;
    end if;
    if exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = 'ai_message_log'
                 and column_name = 'hospitable_event_id') then
        alter table public.ai_message_log rename column hospitable_event_id to external_event_id;
    end if;
end $$;

-- 3. ai_message_log: colunas novas do motor de decisão
alter table public.ai_message_log add column if not exists decision text
    check (decision in ('auto_sent', 'needs_human', 'hard_rule', 'bot_off'));
alter table public.ai_message_log add column if not exists knowledge_citation text;
alter table public.ai_message_log add column if not exists auto_sent_at timestamptz;

-- 4. Índices únicos parciais nas colunas renomeadas (só se ainda não houver
--    nenhum índice a cobri-las — o rename preserva índices antigos).
do $$ begin
    if not exists (select 1 from pg_indexes where schemaname = 'public'
                   and tablename = 'ai_message_log' and indexdef like '%external_message_id%') then
        create unique index ai_message_log_message_id_uidx
            on public.ai_message_log (external_message_id) where external_message_id is not null;
    end if;
    if not exists (select 1 from pg_indexes where schemaname = 'public'
                   and tablename = 'ai_message_log' and indexdef like '%external_event_id%') then
        create unique index ai_message_log_event_id_uidx
            on public.ai_message_log (external_event_id) where external_event_id is not null;
    end if;
end $$;
