-- Migration to add Gaia as a destination
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS name_he TEXT;

-- Use a block to handle the insert safely without needing a unique constraint for ON CONFLICT
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.locations WHERE name_en = 'Gaia') THEN
        UPDATE public.locations 
        SET name_pt = 'Gaia', 
            name_he = 'גאיה', 
            slug = 'gaia',
            is_active = true
        WHERE name_en = 'Gaia';
    ELSE
        INSERT INTO public.locations (name_en, name_pt, name_he, slug, is_active)
        VALUES ('Gaia', 'Gaia', 'גאיה', 'gaia', true);
    END IF;
END $$;
