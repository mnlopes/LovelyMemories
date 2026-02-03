-- CLEANUP: Remove legacy translation columns
-- This is necessary to fix the "null value in column title_en violates not-null constraint" error,
-- as we have migrated to using JSONB for all translations.

ALTER TABLE public.properties 
DROP COLUMN IF EXISTS title_en,
DROP COLUMN IF EXISTS title_pt,
DROP COLUMN IF EXISTS subtitle_en,
DROP COLUMN IF EXISTS subtitle_pt,
DROP COLUMN IF EXISTS description_en,
DROP COLUMN IF EXISTS description_pt;
