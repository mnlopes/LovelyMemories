-- Create system_settings table to store global configurations
create table if not exists public.system_settings (
    key text primary key,
    value jsonb not null,
    description text,
    updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.system_settings enable row level security;

-- Only admins/super_admins can read settings
create policy "Admins can read system settings"
    on public.system_settings
    for select
    to authenticated
    using (
        exists (
            select 1 from public.profiles
            where id = auth.uid()
            and (role = 'admin' or role = 'super_admin')
        )
    );

-- Only super_admins can update system settings
create policy "Super Admins can update system settings"
    on public.system_settings
    for all
    to authenticated
    using (
        exists (
            select 1 from public.profiles
            where id = auth.uid()
            and role = 'super_admin'
        )
    );

-- Initial insertion for audit log retention
insert into public.system_settings (key, value, description)
values 
    ('audit_log_retention_days', '180'::jsonb, 'Number of days to keep audit logs before automatic deletion'),
    ('audit_log_cleanup_schedule', '"0 0 * * *"'::jsonb, 'Cron schedule for the cleanup function (default midnight)')
on conflict (key) do nothing;

-- Update the cleanup function to use the setting by default
create or replace function public.cleanup_old_audit_logs(retention_days int default null)
returns void
language plpgsql
security definer
as $$
declare
    actual_days int;
begin
    -- Use provided value or fetch from settings
    if retention_days is not null then
        actual_days := retention_days;
    else
        select (value::text)::int into actual_days
        from public.system_settings
        where key = 'audit_log_retention_days';
        
        -- Fallback if setting missing
        if actual_days is null then
            actual_days := 180;
        end if;
    end if;

    delete from public.audit_logs
    where created_at < (now() - (actual_days || ' days')::interval);
end;
$$;
