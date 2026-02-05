-- Function to clean up old audit logs
-- Default retention is 6 months (180 days)
create or replace function cleanup_old_audit_logs(retention_days int default 180)
returns void
language plpgsql
security definer -- Run as owner to bypass RLS and ensure deletion happens
as $$
begin
  delete from public.audit_logs
  where created_at < (now() - (retention_days || ' days')::interval);
end;
$$;

-- Grant execute permission to authenticated users (so it can be called via RPC if needed by admins)
-- OR restrict it to service_role only if we want to be strict.
-- Given 'security definer', let's restrict to service_role or admin.
revoke execute on function cleanup_old_audit_logs(int) from public;
grant execute on function cleanup_old_audit_logs(int) to service_role;
grant execute on function cleanup_old_audit_logs(int) to postgres;

-- Attempt to schedule via pg_cron if encryption/extension is available
-- Note: This block might fail if pg_cron is not enabled. 
-- The user can manually enable pg_cron in Supabase Dashboard -> Database -> Extensions.
-- Then run: select cron.schedule('0 0 * * *', $$select cleanup_old_audit_logs(180)$$);

comment on function cleanup_old_audit_logs is 'Deletes audit logs older than N days (default 180). Schedule this with pg_cron.';
