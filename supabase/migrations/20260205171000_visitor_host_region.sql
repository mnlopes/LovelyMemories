-- Add host and region information for deeper analytics
alter table public.visitor_logs 
add column if not exists host text,
add column if not exists region text,
add column if not exists device_type text;
