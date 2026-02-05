-- Create Audit Logs Table
create table if not exists "public"."audit_logs" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "actor_id" uuid references "public"."profiles"("id") on delete set null,
    "action_type" text not null,
    "resource_type" text not null,
    "resource_id" text,
    "details" jsonb,
    "severity" text default 'INFO'::text,
    primary key ("id")
);

-- Enable RLS
alter table "public"."audit_logs" enable row level security;

-- Policy: Super Admin can view ALL logs
create policy "Super Admin can view all logs"
on "public"."audit_logs"
for select
to authenticated
using (
    exists (
        select 1 from "public"."profiles"
        where "profiles"."id" = auth.uid()
        and "profiles"."role" = 'super_admin'
    )
);

-- Policy: Admins can view logs EXCEPT those by Super Admins
create policy "Admin can view logs of non-super-admins"
on "public"."audit_logs"
for select
to authenticated
using (
    -- 1. User must be an Admin
    exists (
        select 1 from "public"."profiles"
        where "profiles"."id" = auth.uid()
        and "profiles"."role" = 'admin'
    )
    and
    -- 2. The Actor (who caused the log) must NOT be a Super Admin
    (
        audit_logs.actor_id is null 
        or
        not exists (
            select 1 from "public"."profiles" as "actor"
            where "actor"."id" = "audit_logs"."actor_id"
            and "actor"."role" = 'super_admin'
        )
    )
);
