-- 1) Partner link on concierge service cards (external companies providing the service)
alter table public.concierge_services
    add column if not exists link_url text;

-- 2) Seed Concierge page content into cms_page_sections (mirrors current hardcoded i18n + images).
-- Convention: hero = display_order 0, intro = display_order 1, services-header = display_order 2.
-- list_items on the intro section holds the two highlight blocks: [{ "label": ..., "desc": ... }]
-- EN / PT only — the client is not using Hebrew for now (public site falls back he -> en).
insert into public.cms_page_sections
    (page_slug, section_type, title, subtitle, content, image_url, icon, display_order, locale, list_items)
values
    -- ===== English =====
    ('concierge', 'hero', 'Concierge', 'Excellence in every detail', '', '/images/concierge-hero-no-person.png', '', 0, 'en', '[]'::jsonb),
    ('concierge', 'intro', 'Don''t worry, we get it done for you...', 'Personalized Service',
        'Experience the pinnacle of luxury with our bespoke concierge services. We handle the details so you can focus on creating lasting memories. From private transfers to exclusive reservations, excellence is our standard.',
        '/legacy/concierge/images/concierge-image.png', '', 1, 'en',
        '[{"label": "24/7 Support", "desc": "Dedicated assistance at any time, anywhere."}, {"label": "Local Expertise", "desc": "Curated experiences and hidden local access."}]'::jsonb),
    ('concierge', 'services-header', 'Customise your trip with one of our preferred partner services', 'Exclusive Services',
        '', null, '', 2, 'en', '[]'::jsonb),
    ('concierge', 'cta', 'Tell us what you need', 'Contact our concierge',
        'From private chefs to seamless transfers — tell us what you have in mind and our team takes care of the rest.',
        null, '', 3, 'en', '[]'::jsonb),

    -- ===== Portuguese =====
    ('concierge', 'hero', 'Concierge', 'Excelência em cada detalhe', '', '/images/concierge-hero-no-person.png', '', 0, 'pt', '[]'::jsonb),
    ('concierge', 'intro', 'Não se preocupe, nós tratamos de tudo...', 'Serviço Personalizado',
        'Experimente o auge do luxo com os nossos serviços de concierge personalizados. Tratamos dos detalhes para que se possa concentrar em criar memórias duradouras. Desde transfers privados a reservas exclusivas, a excelência é o nosso padrão.',
        '/legacy/concierge/images/concierge-image.png', '', 1, 'pt',
        '[{"label": "Suporte 24/7", "desc": "Assistência dedicada a qualquer hora, em qualquer lugar."}, {"label": "Experiência Local", "desc": "Experiências curadas e acesso local exclusivo."}]'::jsonb),
    ('concierge', 'services-header', 'Personalize a sua viagem com um dos nossos serviços de parceiros preferenciais', 'Serviços Exclusivos',
        '', null, '', 2, 'pt', '[]'::jsonb),
    ('concierge', 'cta', 'Diga-nos o que precisa', 'Fale com o nosso concierge',
        'De chefs privados a transfers sem complicações — diga-nos o que tem em mente e a nossa equipa trata do resto.',
        null, '', 3, 'pt', '[]'::jsonb)
on conflict (id) do nothing;
