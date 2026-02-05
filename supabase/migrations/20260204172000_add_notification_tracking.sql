alter table public.profiles
add column last_read_notifications_at timestamptz default now();

comment on column public.profiles.last_read_notifications_at is 'Timestamp when the user last opened or cleared their notifications.';
