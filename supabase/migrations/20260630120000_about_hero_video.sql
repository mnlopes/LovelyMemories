-- Optional looping background video for the About Us hero.
-- When set, the public hero plays this video on loop with image_url as poster/fallback.
alter table public.cms_page_sections
    add column if not exists video_url text;
