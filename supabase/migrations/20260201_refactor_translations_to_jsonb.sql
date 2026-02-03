-- Refactor properties table to use JSONB for translations
-- This supports English, Portuguese, Hebrew, and future languages dynamically.

BEGIN;

-- 1. Add new JSONB columns if they don't exist
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS title JSONB DEFAULT '{"en": "", "pt": ""}',
ADD COLUMN IF NOT EXISTS subtitle JSONB DEFAULT '{"en": "", "pt": ""}',
ADD COLUMN IF NOT EXISTS description JSONB DEFAULT '{"en": "", "pt": ""}';

-- 2. Safely migrate existing data only if the old columns exist
DO $$ 
BEGIN 
    -- Migrate Title
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='title_en') THEN
        UPDATE public.properties SET 
            title = jsonb_build_object('en', COALESCE(title_en, ''), 'pt', COALESCE(title_pt, ''));
    END IF;

    -- Migrate Subtitle
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='subtitle_en') THEN
        UPDATE public.properties SET 
            subtitle = jsonb_build_object('en', COALESCE(subtitle_en, ''), 'pt', COALESCE(subtitle_pt, ''));
    END IF;

    -- Migrate Description
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='description_en') THEN
        UPDATE public.properties SET 
            description = jsonb_build_object('en', COALESCE(description_en, ''), 'pt', COALESCE(description_pt, ''));
    END IF;
END $$;

-- 3. Drop old columns (Optional, but recommended for clean schema)
-- UNCOMMENT THESE LINES ONLY AFTER VERIFYING DATA MIGRATION
-- ALTER TABLE public.properties DROP COLUMN title_en;
-- ALTER TABLE public.properties DROP COLUMN title_pt;
-- ALTER TABLE public.properties DROP COLUMN subtitle_en;
-- ALTER TABLE public.properties DROP COLUMN subtitle_pt;
-- ALTER TABLE public.properties DROP COLUMN description_en;
-- ALTER TABLE public.properties DROP COLUMN description_pt;

COMMIT;
