-- supabase/migrations/20260716120000_cohost_card_meta.sql
-- Meta dos cartões do decision feed (título/resumo/porquê, gerados por LLM pós-decisão;
-- fallback heurístico no server quando null).
alter table public.ai_message_log add column if not exists card_title text;
alter table public.ai_message_log add column if not exists card_summary text;
alter table public.ai_message_log add column if not exists card_why text;
