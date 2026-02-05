-- Create visitor_logs table for traffic analytics
create table if not exists public.visitor_logs (
    id uuid default gen_random_uuid() primary key,
    path text not null,
    locale text,
    user_id uuid references auth.users(id),
    country text default 'Unknown',
    city text default 'Unknown',
    user_agent text,
    ip_address text, -- Note: We might store hash/masked for privacy
    created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.visitor_logs enable row level security;

-- Only authenticated admins can read logs
create policy "Admins can read visitor logs"
    on public.visitor_logs
    for select
    to authenticated
    using (
        exists (
            select 1 from public.profiles
            where id = auth.uid()
            and (role = 'admin' or role = 'super_admin')
        )
    );

-- Anyone can insert logs (via middleware/server action)
-- Note: In production we use service role or public insert if needed
create policy "Anyone can insert visitor logs"
    on public.visitor_logs
    for insert
    to public
    with check (true);

-- Index for performance (recent visits)
create index if not exists visitor_logs_created_at_idx on public.visitor_logs (created_at desc);
create index if not exists visitor_logs_path_idx on public.visitor_logs (path);
