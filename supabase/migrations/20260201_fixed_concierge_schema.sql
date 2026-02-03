
-- COMPREHENSIVE FIX for concierge_services table
-- 1. Add missing columns for descriptions and images
-- 2. Insert more services to populate the homepage slider

-- Step 1: Add columns if they don't exist
ALTER TABLE public.concierge_services 
ADD COLUMN IF NOT EXISTS description_en TEXT,
ADD COLUMN IF NOT EXISTS description_pt TEXT,
ADD COLUMN IF NOT EXISTS image TEXT;

-- Step 2: Update existing rows with placeholder data if needed
UPDATE public.concierge_services SET 
image = '/legacy/home/images/services-image-1.png'
WHERE image IS NULL AND name_en = 'Airport Transfer';

UPDATE public.concierge_services SET 
image = '/legacy/home/images/services-image-2.png'
WHERE image IS NULL AND name_en = 'Breakfast';

-- Step 3: Insert new services with all fields
INSERT INTO public.concierge_services (name_en, name_pt, description_en, description_pt, image, is_active)
VALUES 
('Private Chef', 'Chef em Casa', 'Exquisite dining in your own space.', 'Jantares requintados no seu próprio espaço.', 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=2070&auto=format&fit=crop', true),
('Tailored Experiences', 'Experiências', 'Unforgettable local adventures.', 'Aventuras locais inesquecíveis.', 'https://images.unsplash.com/photo-1533105079780-92b9be482077?q=80&w=2034&auto=format&fit=crop', true),
('Personalized Logistics', 'Logística Personalizada', 'Tailored services for your needs.', 'Serviços personalizados para as suas necessidades.', 'https://images.unsplash.com/photo-1580674271209-40e4ed11efe7?q=80&w=2070&auto=format&fit=crop', true);

-- Verify columns
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'concierge_services';
