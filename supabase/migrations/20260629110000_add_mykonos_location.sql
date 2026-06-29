-- Migration to add Mykonos (Greece) as a destination.
-- Mykonos is our first non-Portugal location, so we also introduce a `country`
-- column on locations (defaulting existing rows to Portugal) and expose it so the
-- UI can stop hardcoding "Portugal" under every destination.
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS name_he TEXT;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'Portugal';

-- Use a block to handle the insert safely without needing a unique constraint for ON CONFLICT.
-- Kept is_active = true so Mykonos shows in the destination picker, but it stays a
-- "Coming Soon" entry (the picker's availability allow-list still excludes it).
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.locations WHERE name_en = 'Mykonos') THEN
        UPDATE public.locations
        SET name_pt = 'Mykonos',
            name_he = 'מיקונוס',
            slug = 'mykonos',
            country = 'Greece',
            is_active = true
        WHERE name_en = 'Mykonos';
    ELSE
        INSERT INTO public.locations (name_en, name_pt, name_he, slug, country, is_active)
        VALUES ('Mykonos', 'Mykonos', 'מיקונוס', 'mykonos', 'Greece', true);
    END IF;
END $$;
