-- Create cms_page_sections table
create table if not exists public.cms_page_sections (
    id uuid primary key default gen_random_uuid(),
    page_slug text not null, -- 'terms-conditions' or 'privacy-policy'
    title text not null,
    content text not null,
    icon text not null, -- e.g. 'Shield', 'Cookie', 'UserCheck', 'Mail', 'FileText', 'Calendar', 'CreditCard', 'AlertCircle'
    display_order int default 0,
    locale text not null, -- 'en', 'pt', 'he'
    list_items jsonb default '[]'::jsonb, -- array of {label: string, desc: string}
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.cms_page_sections enable row level security;

-- Policies for public access (select)
create policy "Public can view cms_page_sections"
    on public.cms_page_sections
    for select
    to public
    using (true);

-- Policies for admin access (all)
create policy "Admins can manage cms_page_sections"
    on public.cms_page_sections
    for all
    to authenticated
    using (
        exists (
            select 1 from public.profiles
            where id = auth.uid()
            and (role = 'admin' or role = 'super_admin' or role = 'editor')
        )
    );

-- Seed initial Terms & Conditions
insert into public.cms_page_sections (page_slug, title, content, icon, display_order, locale, list_items)
values
    -- English Terms & Conditions
    (
        'terms-conditions', 
        '1. Acceptance of Terms', 
        'By accessing and using the services of Lovely Memories, you agree to be bound by these terms and conditions. These terms apply to all visitors, users, and others who access or use our luxury property management services.', 
        'FileText', 
        1, 
        'en', 
        '[]'::jsonb
    ),
    (
        'terms-conditions', 
        '2. Bookings & Reservations', 
        'All bookings are subject to availability and confirmation. We reserve the right to refuse any booking request at our discretion. Specific property rules and check-in procedures will be provided upon confirmation.', 
        'Calendar', 
        2, 
        'en', 
        '[{"label": "Check-in", "desc": "Standard check-in is from 15:00 onwards."}, {"label": "Check-out", "desc": "Standard check-out is before 11:00."}, {"label": "Occupancy", "desc": "The number of guests must not exceed the property limit."}]'::jsonb
    ),
    (
        'terms-conditions', 
        '3. Payments & Cancellations', 
        'Payment terms vary depending on the property and booking type. Generally, a deposit is required to secure a reservation. Cancellation policies are strictly enforced and depend on the notice period provided.', 
        'CreditCard', 
        3, 
        'en', 
        '[{"label": "Refunds", "desc": "Subject to the specific cancellation policy of the property."}, {"label": "Security Deposit", "desc": "May be required for damages or incidental charges."}]'::jsonb
    ),
    (
        'terms-conditions', 
        '4. Liability & Responsibilities', 
        'Lovely Memories acts as an intermediary or manager for high-end properties. While we ensure the highest standards, guests are responsible for maintaining the property and following local regulations during their stay.', 
        'AlertCircle', 
        4, 
        'en', 
        '[]'::jsonb
    ),

    -- Portuguese Terms & Conditions
    (
        'terms-conditions', 
        '1. Aceitação dos Termos', 
        'Ao aceder e utilizar os serviços da Lovely Memories, concorda em ficar vinculado a estes termos e condições. Estes termos aplicam-se a todos os visitantes, utilizadores e outros que acedam ou utilizem os nossos serviços de gestão de propriedades de luxo.', 
        'FileText', 
        1, 
        'pt', 
        '[]'::jsonb
    ),
    (
        'terms-conditions', 
        '2. Reservas & Marcações', 
        'Todas as reservas estão sujeitas a disponibilidade e confirmação. Reservamos o direito de recusar qualquer pedido de reserva ao nosso critério. As regras específicas da propriedade e os procedimentos de check-in serão fornecidos após a confirmação.', 
        'Calendar', 
        2, 
        'pt', 
        '[{"label": "Check-in", "desc": "O check-in padrão é a partir das 15:00."}, {"label": "Check-out", "desc": "O check-out padrão é antes das 11:00."}, {"label": "Ocupação", "desc": "O número de hóspedes não deve exceder o limite da propriedade."}]'::jsonb
    ),
    (
        'terms-conditions', 
        '3. Pagamentos & Cancelamentos', 
        'Os termos de pagamento variam dependendo da propriedade e do tipo de reserva. Geralmente, é necessário um depósito para garantir a reserva. As políticas de cancelamento são rigorosamente aplicadas e dependem do período de aviso prévio fornecido.', 
        'CreditCard', 
        3, 
        'pt', 
        '[{"label": "Reembolsos", "desc": "Sujeito à política de cancelamento específica da propriedade."}, {"label": "Depósito de Segurança", "desc": "Pode ser exigido para cobrir danos ou encargos imprevistos."}]'::jsonb
    ),
    (
        'terms-conditions', 
        '4. Responsabilidade & Obrigações', 
        'A Lovely Memories atua como intermediária ou gestora de propriedades de alto padrão. Embora garantamos os mais elevados padrões, os hóspedes são responsáveis pela manutenção da propriedade e por seguir os regulamentos locais durante a sua estadia.', 
        'AlertCircle', 
        4, 
        'pt', 
        '[]'::jsonb
    ),

    -- English Privacy Policy
    (
        'privacy-policy', 
        '1. Introduction', 
        'Welcome to Lovely Memories. We value your privacy and are committed to protecting your personal data. This policy explains how we collect, use, and safeguard your information when you visit our website.', 
        'Shield', 
        1, 
        'en', 
        '[]'::jsonb
    ),
    (
        'privacy-policy', 
        '2. Cookies We Use', 
        'We use cookies to enhance your experience. Cookies are small text files stored on your device that help us provide a better service.', 
        'Cookie', 
        2, 
        'en', 
        '[{"label": "Necessary Cookies", "desc": "Essential for the website to function securely and correctly."}, {"label": "Analytics Cookies", "desc": "Help us understand visitor behavior to improve our services."}, {"label": "Marketing Cookies", "desc": "Used to deliver relevant advertisements and track performance."}]'::jsonb
    ),
    (
        'privacy-policy', 
        '3. Your Rights', 
        'Under GDPR, you have the right to access, rectify, or delete your personal data. You can also withdraw your consent for cookies at any time using the cookie preferences panel below.', 
        'UserCheck', 
        3, 
        'en', 
        '[]'::jsonb
    ),
    (
        'privacy-policy', 
        '4. Contact Us', 
        'If you have any questions about this policy or our data practices, please don''t hesitate to reach out to our team at info@lovelymemories.pt.', 
        'Mail', 
        4, 
        'en', 
        '[]'::jsonb
    ),

    -- Portuguese Privacy Policy
    (
        'privacy-policy', 
        '1. Introdução', 
        'Bem-vindo à Lovely Memories. Valorizamos a sua privacidade e estamos empenhados em proteger os seus dados pessoais. Esta política explica como recolhemos, utilizamos e salvaguardamos as suas informações quando visita o nosso website.', 
        'Shield', 
        1, 
        'pt', 
        '[]'::jsonb
    ),
    (
        'privacy-policy', 
        '2. Cookies que Utilizámos', 
        'Utilizámos cookies para melhorar a sua experiência. Os cookies são pequenos ficheiros de texto guardados no seu dispositivo que nos ajudam a prestar um melhor serviço.', 
        'Cookie', 
        2, 
        'pt', 
        '[{"label": "Cookies Necessários", "desc": "Essenciais para o funcionamento seguro e correto do website."}, {"label": "Cookies de Análise", "desc": "Ajudam-nos a compreender o comportamento dos visitantes para melhorar os nossos serviços."}, {"label": "Cookies de Marketing", "desc": "Utilizados para apresentar anúncios relevantes e acompanhar o desempenho."}]'::jsonb
    ),
    (
        'privacy-policy', 
        '3. Os Seus Direitos', 
        'Ao abrigo do RGPD, tem o direito de aceder, retificar ou eliminar os seus dados pessoais. Pode também retirar o seu consentimento para cookies a qualquer momento utilizando o painel de preferências de cookies abaixo.', 
        'UserCheck', 
        3, 
        'pt', 
        '[]'::jsonb
    ),
    (
        'privacy-policy', 
        '4. Contacte-nos', 
        'Se tiver alguma dúvida sobre esta política ou sobre as nossas práticas de tratamento de dados, não hesite em contactar a nossa equipa através do email info@lovelymemories.pt.', 
        'Mail', 
        4, 
        'pt', 
        '[]'::jsonb
    )
on conflict (id) do nothing;
