-- About Us hero media control.
-- media_type: explicit choice of which media the hero shows ('image' | 'video').
--   When null, the public hero infers from whether a video_url is present (back-compat).
alter table public.cms_page_sections
    add column if not exists media_type text;
