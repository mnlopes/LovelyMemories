-- Extend cms_page_sections to support the About Us page (hero / intro / timeline)
alter table public.cms_page_sections
    add column if not exists section_type text, -- 'hero' | 'intro' | 'timeline' (null for terms/privacy)
    add column if not exists subtitle text,     -- used for the timeline "year" badge
    add column if not exists image_url text;     -- hero background & timeline entry image

-- Seed About Us content (mirrors the current hardcoded i18n + images) for EN / PT / HE.
-- Convention: hero = display_order 0, intro = display_order 1, timeline = display_order 10+.
insert into public.cms_page_sections
    (page_slug, section_type, title, subtitle, content, image_url, icon, display_order, locale, list_items)
values
    -- ===== English =====
    ('about-us', 'hero', 'From Porto to the World', null, '', '/legacy/about-us/images/about-feature.png', '', 0, 'en', '[]'::jsonb),
    ('about-us', 'intro', '', null,
        'The core of our business is to excel in what we do and strive to keep our position as the leading boutique property management company in Porto, where we currently focus all of our operations. We are passionate about the city and proud to be the starting point of every of our guests journey in this captivating and stunningly beautiful city.

We handpick and decorate our properties to the highest standards just so you feel truly welcome and taken care of, and that goes far beyond the aesthetic of the property you are staying in. Our unparalleled service is the key to our success.',
        null, '', 1, 'en', '[]'::jsonb),
    ('about-us', 'timeline', 'The Beginning', '2020', 'We opened our office and Welcome Center in Porto''s downtown, marking the start of our journey in this stunningly beautiful city.', '/legacy/about-us/images/about-feature.png', '', 10, 'en', '[]'::jsonb),
    ('about-us', 'timeline', 'Growth & Resilience', '2021', 'Despite the global challenges, we handpicked more properties and refined our unparalleled service to ensure our guests felt truly welcome.', '/legacy/about-us/images/services-image-2-1.png', '', 11, 'en', '[]'::jsonb),
    ('about-us', 'timeline', 'Expanding Horizons', '2022', 'Our boutique property management company became a reference in Porto, expanding our portfolio with curated, high-standard homes.', '/legacy/about-us/images/blog-img-3.png', '', 12, 'en', '[]'::jsonb),
    ('about-us', 'timeline', 'Design & Excellence', '2023', 'We integrated deeper interior design expertise to elevate the aesthetic of our properties, merging comfort with luxury.', '/legacy/about-us/images/owner-section-image-2.png', '', 13, 'en', '[]'::jsonb),
    ('about-us', 'timeline', 'Innovative Connections', '2024', 'Launching new digital experiences to bridge the gap between our local expertise and our guests'' global expectations.', '/legacy/about-us/images/the-flower-power.png', '', 14, 'en', '[]'::jsonb),
    ('about-us', 'timeline', 'The Future of Hospitality', '2025', 'Striving to keep our position as the leading boutique company, constantly evolving our operations for better guest experiences.', '/legacy/about-us/images/services-image-2-1.png', '', 15, 'en', '[]'::jsonb),
    ('about-us', 'timeline', 'Global Reach', '2026', 'From Porto to the World - our mission remains firm: to provide the best local memories through global standards of excellence.', '/legacy/about-us/images/the-flower-power.png', '', 16, 'en', '[]'::jsonb),

    -- ===== Portuguese =====
    ('about-us', 'hero', 'Do Porto para o Mundo', null, '', '/legacy/about-us/images/about-feature.png', '', 0, 'pt', '[]'::jsonb),
    ('about-us', 'intro', '', null,
        'O núcleo do nosso negócio é a excelência no que fazemos e a procura constante de manter a nossa posição como a principal empresa de gestão de propriedades boutique no Porto, onde atualmente focamos todas as nossas operações. Somos apaixonados pela cidade e orgulhamo-nos de ser o ponto de partida da viagem de cada um dos nossos hóspedes nesta cidade cativante e deslumbrantemente bela.

Selecionamos e decoramos as nossas propriedades com os mais altos padrões apenas para que se sinta verdadeiramente bem-vindo e cuidado, e isso vai muito além da estética da propriedade onde está hospedado. O nosso serviço inigualável é a chave para o nosso sucesso.',
        null, '', 1, 'pt', '[]'::jsonb),
    ('about-us', 'timeline', 'O Início', '2020', 'Abrimos o nosso escritório e Welcome Center na baixa do Porto, marcando o início da nossa jornada nesta cidade deslumbrante.', '/legacy/about-us/images/about-feature.png', '', 10, 'pt', '[]'::jsonb),
    ('about-us', 'timeline', 'Crescimento e Resiliência', '2021', 'Apesar dos desafios globais, selecionámos mais propriedades e refinámos o nosso serviço inigualável para garantir que os nossos hóspedes se sentissem verdadeiramente bem-vindos.', '/legacy/about-us/images/services-image-2-1.png', '', 11, 'pt', '[]'::jsonb),
    ('about-us', 'timeline', 'Expandindo Horizontes', '2022', 'A nossa empresa de gestão de propriedades tornou-se uma referência no Porto, expandindo o nosso portfólio com casas curadas e de alto padrão.', '/legacy/about-us/images/blog-img-3.png', '', 12, 'pt', '[]'::jsonb),
    ('about-us', 'timeline', 'Design e Excelência', '2023', 'Integrámos uma maior experiência em design de interiores para elevar a estética das nossas propriedades, fundindo conforto com luxo.', '/legacy/about-us/images/owner-section-image-2.png', '', 13, 'pt', '[]'::jsonb),
    ('about-us', 'timeline', 'Conexões Inovadoras', '2024', 'Lançamento de novas experiências digitais para colmatar a lacuna entre a nossa experiência local e as expectativas globais dos nossos hóspedes.', '/legacy/about-us/images/the-flower-power.png', '', 14, 'pt', '[]'::jsonb),
    ('about-us', 'timeline', 'O Futuro da Hospitalidade', '2025', 'Lutando para manter a nossa posição como a principal empresa boutique, evoluindo constantemente as nossas operações para melhores experiências dos hóspedes.', '/legacy/about-us/images/services-image-2-1.png', '', 15, 'pt', '[]'::jsonb),
    ('about-us', 'timeline', 'Alcance Global', '2026', 'Do Porto para o Mundo - a nossa missão permanece firme: fornecer as melhores memórias locais através de padrões globais de excelência.', '/legacy/about-us/images/the-flower-power.png', '', 16, 'pt', '[]'::jsonb),

    -- ===== Hebrew =====
    ('about-us', 'hero', 'מפורטו לעולם', null, '', '/legacy/about-us/images/about-feature.png', '', 0, 'he', '[]'::jsonb),
    ('about-us', 'intro', '', null,
        'לב העסק שלנו הוא להצטיין במה שאנחנו עושים ולשאוף לשמור על מעמדנו כחברת ניהול נכסי בוטיק המובילה בפורטו, שם אנו מרכזים כיום את כל הפעילות שלנו. אנו נלהבים מהעיר וגאים להיות נקודת ההתחלה של המסע של כל אחד מהאורחים שלנו בעיר שובת הלב והיפהפייה הזו.

אנו בוחרים ומעצבים את הנכס שלנו בסטנדרטים הגבוהים ביותר רק כדי שתמיד תרגישו רצויים ומטופלים, וזה הרבה מעבר לאסתטיקה של הנכס בו אתם שוהים. השירות הבלתי מתפשר שלנו הוא המפתח להצלחה שלנו.',
        null, '', 1, 'he', '[]'::jsonb),
    ('about-us', 'timeline', 'ההתחלה', '2020', 'פתחנו את המשרד ומרכז קבלת הפנים שלנו במרכז העיר פורטו, וסימנו את תחילת המסע שלנו בעיר היפהפייה הזו.', '/legacy/about-us/images/about-feature.png', '', 10, 'he', '[]'::jsonb),
    ('about-us', 'timeline', 'צמיחה וחוסן', '2021', 'למרות האתגרים העולמיים, בחרנו בקפידה נכסים נוספים ושיפרנו את השירות הבלתי מתפשר שלנו כדי להבטיח שהאורחים שלנו ירגישו רצויים באמת.', '/legacy/about-us/images/services-image-2-1.png', '', 11, 'he', '[]'::jsonb),
    ('about-us', 'timeline', 'הרחבת אופקים', '2022', 'חברת ניהול נכסי הבוטיק שלנו הפכה לרפרנס בפורטו, והרחיבה את הפורטפוליו שלנו עם בתים אוצרים בסטנדרט גבוה.', '/legacy/about-us/images/blog-img-3.png', '', 12, 'he', '[]'::jsonb),
    ('about-us', 'timeline', 'עיצוב ומצוינות', '2023', 'שילבנו מומחיות עיצוב פנים עמוקה יותר כדי להעלות את האסתטיקה של הנכסים שלנו, תוך מיזוג נוחות עם יוקרה.', '/legacy/about-us/images/owner-section-image-2.png', '', 13, 'he', '[]'::jsonb),
    ('about-us', 'timeline', 'חיבורים חדשניים', '2024', 'השקת חוויות דיגיטליות חדשות לגישור הפער בין המומחיות המקומית שלנו לציפיות הגלובליות של האורחים שלנו.', '/legacy/about-us/images/the-flower-power.png', '', 14, 'he', '[]'::jsonb),
    ('about-us', 'timeline', 'עתיד האירוח', '2025', 'שואפים לשמור על מעמדנו כחברת הבוטיק המובילה, ומפתחים כל הזמן את הפעילות שלנו לחוויות אורח טובות יותר.', '/legacy/about-us/images/services-image-2-1.png', '', 15, 'he', '[]'::jsonb),
    ('about-us', 'timeline', 'תפוצה גלובלית', '2026', 'מפורטו לעולם - המשימה שלנו נותרת איתנה: לספק את הזיכרונות המקומיים הטובים ביותר באמצעות סטנדרטים גלובליים של מצוינות.', '/legacy/about-us/images/the-flower-power.png', '', 16, 'he', '[]'::jsonb)
on conflict (id) do nothing;
