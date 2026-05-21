-- Create faqs table
create table if not exists public.faqs (
    id uuid primary key default gen_random_uuid(),
    question text not null,
    answer text not null,
    locale text not null, -- 'en', 'pt', 'he'
    display_order int default 0,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.faqs enable row level security;

-- Policies for public access (select)
create policy "Public can view faqs"
    on public.faqs
    for select
    to public
    using (true);

-- Policies for admin access (all)
create policy "Admins can manage faqs"
    on public.faqs
    for all
    to authenticated
    using (
        exists (
            select 1 from public.profiles
            where id = auth.uid()
            and (role = 'admin' or role = 'super_admin' or role = 'editor')
        )
    );

-- Seed initial FAQs for EN and PT
insert into public.faqs (question, answer, locale, display_order)
values
    -- English (en)
    ('How does the booking and payment process work?', 'It''s very simple. You can book directly on our website securely. We offer the convenience of secure online payments via Stripe or manual payments via bank transfer.', 'en', 1),
    ('What is included in your Concierge services?', 'We want you to worry about nothing. We handle private transfers, in-home chefs, reservations at exclusive restaurants, Douro river boat tours, and even having the fridge stocked when you arrive. Just ask.', 'en', 2),
    ('Which areas does Lovely Memories operate in?', 'Currently, our main focus for luxury management is in Greater Porto, Vila Nova de Gaia, and the Douro region. We are also expanding to the Algarve and, in the future, Lisbon, as we continuously add new exclusive retreats to our portfolio.', 'en', 3),
    ('I''m a property owner. How can I work with you?', 'We love meeting new partners. The first step is to fill out the form in our ''Owner'' area or send us an email. We''ll do a quick analysis of your property and present you with a no-obligation revenue plan.', 'en', 4),
    
    -- Portuguese (pt)
    ('Como funciona o processo de reserva e pagamento?', 'É muito simples. Podes reservar diretamente no nosso site de forma segura. Oferecemos a comodidade de pagamentos seguros online via Stripe ou pagamentos manuais por transferência bancária.', 'pt', 1),
    ('O que está incluído nos vossos serviços de Concierge?', 'Queremos que não te preocupes com nada. Tratamos de transfers privados, chefs ao domicílio, marcações em restaurantes exclusivos, passeios de barco no Douro e até de ter o frigorífico cheio quando chegares. Basta pedires.', 'pt', 2),
    ('Em que zonas é que a Lovely Memories gere propriedades?', 'Atualmente, o nosso foco principal de gestão de luxo é no Grande Porto, Vila Nova de Gaia e na região do Douro. Estamos também em expansão para o Algarve e, no futuro, Lisboa, à medida que continuamos a adicionar novos refúgios exclusivos ao nosso portefólio.', 'pt', 3),
    ('Sou proprietário. Como posso trabalhar convosco?', 'Adoramos conhecer novos parceiros. O primeiro passo é preencheres o formulário na nossa área de "Owner" ou enviares-nos um email. Fazemos uma análise rápida da tua propriedade e apresentamos-te um plano de rendimentos sem compromisso.', 'pt', 4)
on conflict (id) do nothing;
