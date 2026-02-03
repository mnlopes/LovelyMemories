
-- ENHANCED CONCIERGE SCHEMA
-- This script prepares the concierge_services table for full backoffice control,
-- distinguishing between bookable (interactive) and VIP (informational) services.

-- Step 1: Add all necessary columns
ALTER TABLE public.concierge_services 
ADD COLUMN IF NOT EXISTS slug TEXT,
ADD COLUMN IF NOT EXISTS description_en TEXT,
ADD COLUMN IF NOT EXISTS description_pt TEXT,
ADD COLUMN IF NOT EXISTS image TEXT,
ADD COLUMN IF NOT EXISTS icon TEXT,           -- Lucide icon name (e.g., 'utensils', 'car', 'sparkles')
ADD COLUMN IF NOT EXISTS price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS price_type TEXT,     -- 'per_guest_night', 'one_way', 'fixed', etc.
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general'; -- 'bookable', 'vip', 'general'

-- Step 1.1: Ensure price and price_type columns are nullable (fixes error 23502)
ALTER TABLE public.concierge_services ALTER COLUMN price DROP NOT NULL;
ALTER TABLE public.concierge_services ALTER COLUMN price_type DROP NOT NULL;

-- 2. Clean up and insert data to match the UI requirements
TRUNCATE public.concierge_services;

INSERT INTO public.concierge_services (slug, name_en, name_pt, description_en, description_pt, image, icon, price, price_type, category, is_active)
VALUES 
-- Bookable Services (Slider + Selection Card)
('breakfast', 'Breakfast', 'Pequeno-almoço', 'Start your day with a freshly prepared breakfast served in your villa.', 'Comece o dia com um pequeno-almoço fresco servido na sua villa.', '/legacy/home/images/services-image-2.png', 'utensils', 15.00, 'per_guest_night', 'bookable', true),
('transfer', 'Airport Transfer', 'Transfer Aeroporto', 'Premium chauffeur service from/to the airport for up to 4 guests.', 'Serviço de transfer premium de/para o aeroporto até 4 pessoas.', '/legacy/home/images/services-image-1.png', 'car', 55.00, 'one_way', 'bookable', true),

-- VIP / Informational Services (Slider + Icon List)
('chef', 'Private Chef', 'Chef em Casa', 'Exquisite dining experienced in your own space.', 'Jantares requintados no seu próprio espaço.', 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=2070&auto=format&fit=crop', 'utensils', NULL, NULL, 'vip', true),
('chauffeur', 'Chauffeur Service', 'Serviço de Motorista', 'Professional personal drivers at your disposal.', 'Motoristas profissionais à sua disposição.', 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=2070&auto=format&fit=crop', 'car', NULL, NULL, 'vip', true),
('spa', 'Spa & Massage', 'Massagens e Spa', 'Relaxing wellness treatments delivered to your door.', 'Tratamentos de bem-estar relaxantes no conforto da sua villa.', 'https://images.unsplash.com/photo-1544161515-4af6b1d4640b?q=80&w=2070&auto=format&fit=crop', 'sparkles', NULL, NULL, 'vip', true),
('tours', 'Tours & Experiences', 'Passeios e Experiências', 'Unforgettable local adventures and tours.', 'Aventuras locais inesquecíveis e passeios personalizados.', 'https://images.unsplash.com/photo-1533105079780-92b9be482077?q=80&w=2034&auto=format&fit=crop', 'ticket', NULL, NULL, 'vip', true),
('security', '24/7 Security', 'Segurança 24/7', 'Continuous professional security for total peace of mind.', 'Segurança profissional contínua para total tranquilidade.', 'https://images.unsplash.com/photo-1580674271209-40e4ed11efe7?q=80&w=2070&auto=format&fit=crop', 'shield-check', NULL, NULL, 'vip', true);

-- Note: 'category' field will be used to place them in the correct UI sections.
