-- Migration to create CMS tables for Blog and Social Wall

-- 1. Create instagram_posts table
create table if not exists public.instagram_posts (
    id uuid primary key default gen_random_uuid(),
    image_url text not null,
    permalink text,
    display_order int unique not null check (display_order >= 1 and display_order <= 4),
    updated_at timestamp with time zone default now()
);

-- 2. Create blog_posts table
create table if not exists public.blog_posts (
    id uuid primary key default gen_random_uuid(),
    slug text unique not null,
    title text not null,
    excerpt text,
    content text, -- HTML string from rich text editor
    image_url text,
    locale text not null, -- 'en', 'pt', 'he'
    is_published boolean default false,
    published_at timestamp with time zone,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- 3. Enable RLS
alter table public.instagram_posts enable row level security;
alter table public.blog_posts enable row level security;

-- 4. RLS Policies for instagram_posts
create policy "Public can view instagram posts"
    on public.instagram_posts
    for select
    to public
    using (true);

create policy "Admins can manage instagram posts"
    on public.instagram_posts
    for all
    to authenticated
    using (
        exists (
            select 1 from public.profiles
            where id = auth.uid()
            and (role = 'admin' or role = 'super_admin' or role = 'editor')
        )
    );

-- 5. RLS Policies for blog_posts
create policy "Public can view published blog posts"
    on public.blog_posts
    for select
    to public
    using (is_published = true);

create policy "Admins can manage all blog posts"
    on public.blog_posts
    for all
    to authenticated
    using (
        exists (
            select 1 from public.profiles
            where id = auth.uid()
            and (role = 'admin' or role = 'super_admin' or role = 'editor')
        )
    );

-- 6. Seed initial Instagram slots
insert into public.instagram_posts (display_order, image_url)
values 
    (1, ''),
    (2, ''),
    (3, ''),
    (4, '')
on conflict (display_order) do nothing;
