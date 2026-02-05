-- Add detailed log information
alter table public.visitor_logs 
add column if not exists referer text,
add column if not exists request_id text,
add column if not exists method text default 'GET',
add column if not exists status integer default 200;
