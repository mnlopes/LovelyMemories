-- Add information to distinguish between public and admin views
alter table public.visitor_logs 
add column if not exists is_admin_view boolean default false,
add column if not exists user_role text default 'visitor';

-- Update index for role-based queries
create index if not exists visitor_logs_user_role_idx on public.visitor_logs (user_role);
