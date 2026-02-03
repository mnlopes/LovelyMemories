
-- FINAL SQL to add more concierge services
-- IMPORTANT: Copy ALL the lines below and run them together in your Supabase SQL Editor

INSERT INTO public.concierge_services (name_en, name_pt, description_en, description_pt, image, is_active)
VALUES 
('Private Chef', 'Chef em Casa', 'Exquisite dining in your own space.', 'Jantares requintados no seu próprio espaço.', 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=2070&auto=format&fit=crop', true),
('Tailored Experiences', 'Experiências', 'Unforgettable local adventures.', 'Aventuras locais inesquecíveis.', 'https://images.unsplash.com/photo-1533105079780-92b9be482077?q=80&w=2034&auto=format&fit=crop', true),
('Personalized Logistics', 'Logística Personalizada', 'Tailored services for your needs.', 'Serviços personalizados para as suas necessidades.', 'https://images.unsplash.com/photo-1580674271209-40e4ed11efe7?q=80&w=2070&auto=format&fit=crop', true);
