
import { createClient } from "@supabase/supabase-js";
import * as dotenv from 'dotenv';

// Use manual translations provided by Antigravity
const TRANSLATED_PROPERTIES = [
    {
        "id": "f2a14bb6-c726-4a1c-9bf4-8fe40dd3b0c0",
        "title": { "en": "Praça dos Poveiros", "pt": "Praça dos Poveiros", "he": "כיכר פוביירוס" },
        "subtitle": { "en": "Studio Loft in Porto", "pt": "Estúdio Loft no Porto", "he": "סטודיו לופט בפורטו" },
        "description": { "en": "Located in the heart of Porto, this modern studio offers a perfect blend of comfort and style. Ideal for couples exploring the city.", "pt": "Localizado no coração do Porto, este estúdio moderno oferece uma combinação perfeita de conforto e estilo. Ideal para casais que exploram a cidade.", "he": "ממוקם בלב פורטו, סטודיו מודרני זה מציע שילוב מושלם של נוחות וסגנון. אידיאלי לזוגות המטיילים בעיר." },
        "cancellation": {
            "text": { "en": "Moderate", "pt": "Moderada", "he": "בינונית" },
            "deadline": { "en": "7 days", "pt": "7 dias", "he": "7 ימים" },
            "refundText": { "en": "50% refund", "pt": "reembolso de 50%", "he": "50% החזר כספי" }
        }
    },
    {
        "id": "b02e8c52-3808-455d-80e9-83c6a5975197",
        "title": { "en": "Sunset Villa", "pt": "Sunset Villa", "he": "וילת השקיעה" },
        "subtitle": { "en": "Beachfront Luxury Home", "pt": "Casa de Luxo em Frente à Praia", "he": "בית יוקרה מול הים" },
        "description": { "en": "Experience breathtaking sunsets from this stunning beachfront villa. Features spacious terraces and premium finishes.", "pt": "Experimente pores do sol deslumbrantes desta villa deslumbrante em frente à praia. Dispõe de terraços espaçosos e acabamentos premium.", "he": "חוו שקיעות עוצרות נשימה מהווילה המדהימה הזו מול הים. כוללת טרסות מרווחות וגימורים יוקרתיים." },
        "cancellation": {
            "text": { "en": "Strict", "pt": "Rigorosa", "he": "קפדנית" },
            "deadline": { "en": "14 days", "pt": "14 dias", "he": "14 ימים" },
            "refundText": { "en": "Non-refundable", "pt": "Não reembolsável", "he": "ללא החזר כספי" }
        }
    },
    {
        "id": "ba30e40e-bc96-430c-bd8f-50fdbd4b7224",
        "title": { "en": "Chiado Loft", "pt": "Chiado Loft", "he": "לופט שיאדו" },
        "subtitle": { "en": "Classic Studio in Lisbon", "pt": "Estúdio Clássico em Lisboa", "he": "סטודיו קלאסי בליסבון" },
        "description": { "en": "A beautiful classic studio in the historic Chiado district. Steps away from the best cafes and shops in Lisbon.", "pt": "Um belo estúdio clássico no bairro histórico do Chiado. A poucos passos dos melhores cafés e lojas de Lisboa.", "he": "סטודיו קלאסי יפהפה ברובע שיאדו ההיסטורי. במרחק צעדים ספורים מבתי הקפה והחנויות הטובים ביותר בליסבון." },
        "cancellation": {
            "text": { "en": "Moderate", "pt": "Moderada", "he": "בינונית" },
            "deadline": { "en": "7 days", "pt": "7 dias", "he": "7 ימים" },
            "refundText": { "en": "50% refund", "pt": "reembolso de 50%", "he": "50% החזר כספי" }
        }
    },
    {
        "id": "14c2bb29-46ad-4afc-bf4a-c36b1d925f70",
        "title": { "en": "Ocean Breeze", "pt": "Brisa do Oceano", "he": "בריזת אוקיינוס" },
        "subtitle": { "en": "Modern Apartment with Sea Views", "pt": "Apartamento Moderno com Vista Mar", "he": "דירה מודרנית עם נוף לים" },
        "description": { "en": "Enjoy the sea breeze in this freshly renovated modern apartment. Features a private balcony overlooking the Atlantic.", "pt": "Aproveite a brisa do mar neste apartamento moderno recém-renovado. Possui uma varanda privada com vista para o Atlântico.", "he": "תהנו מבריזת הים בדירה מודרנית ומשופצת זו. כוללת מרפסת פרטית המשקיפה על האוקיינוס האטלנטי." },
        "cancellation": {
            "text": { "en": "Flexible", "pt": "Flexível", "he": "גמישה" },
            "deadline": { "en": "24 hours", "pt": "24 horas", "he": "24 שעות" },
            "refundText": { "en": "Full refund", "pt": "Reembolso total", "he": "החזר מלא" }
        }
    },
    {
        "id": "7c56829d-4fc4-4c47-b5cb-d0b414da94b5",
        "title": { "en": "The Flower Power", "pt": "The Flower Power", "he": "כוח הפרחים" },
        "subtitle": { "en": "Two Bedroom Garden Home", "pt": "Casa de Dois Quartos com Jardim", "he": "בית שני חדרי שינה עם גינה" },
        "description": { "en": "A vibrant and cozy garden home perfect for families. Surrounded by nature yet close to city amenities.", "pt": "Uma casa de jardim vibrante e acolhedora perfeita para famílias. Cercada pela natureza, mas perto das comodidades da cidade.", "he": "בית גינה תוסס ונעים המושלם למשפחות. מוקף בטבע אך קרוב לשירותי העיר." },
        "cancellation": {
            "text": { "en": "Moderate", "pt": "Moderada", "he": "בינונית" },
            "deadline": { "en": "7 days", "pt": "7 dias", "he": "7 ימים" },
            "refundText": { "en": "50% refund", "pt": "reembolso de 50%", "he": "50% החזר כספי" }
        }
    },
    {
        "id": "1dacc337-7d80-4554-bab2-2d6d4b52d3b7",
        "title": { "en": "Praças dos Poveiros", "pt": "Praças dos Poveiros", "he": "כיכרות פוביירוס" },
        "subtitle": { "en": "Premium Building in Porto", "pt": "Edifício Premium no Porto", "he": "בניין פרימיום בפורטו" },
        "description": { "en": "An iconic building offering multiple luxury units. Located in dynamic Porto with excellent connectivity.", "pt": "Um edifício icónico que oferece várias unidades de luxo. Localizado no dinâmico Porto com excelente conectividade.", "he": "בניין אייקוני המציע מספר יחידות יוקרה. ממוקם בפורטו הדינמית עם קישוריות מצוינת." },
        "cancellation": {
            "text": { "en": "Moderate", "pt": "Moderada", "he": "בינונית" },
            "deadline": { "en": "7 days", "pt": "7 dias", "he": "7 ימים" },
            "refundText": { "en": "50% refund", "pt": "reembolso de 50%", "he": "50% החזר כספי" }
        }
    },
    {
        "id": "ab33b601-d072-41c7-8144-904132258def",
        "title": { "en": "Avenida Luxury", "pt": "Avenida Luxury", "he": "יוקרה בשדרה" },
        "subtitle": { "en": "Penthouse with Panoramic Views", "pt": "Penthouse com Vistas Panorâmicas", "he": "פנטהאוז עם נוף פנורמי" },
        "description": { "en": "Stunning penthouse apartment on the prestigious Avenida. Modern design with floor-to-ceiling windows.", "pt": "Impressionante apartamento penthouse na prestigiada Avenida. Design moderno com janelas do chão ao teto.", "he": "דירת פנטהאוז מדהימה בשדרה היוקרתית. עיצוב מודרני עם חלונות מהרצפה עד התקרה." },
        "cancellation": {
            "text": { "en": "Moderate", "pt": "Moderada", "he": "בינונית" },
            "deadline": { "en": "9 days", "pt": "9 dias", "he": "9 ימים" },
            "refundText": { "en": "80% refund", "pt": "80% de reembolso", "he": "80% החזר כספי" }
        }
    },
    {
        "id": "bc2a64ba-391f-475a-adea-7cf3a87744e5",
        "title": { "en": "Paraíso 331", "pt": "Paraíso 331", "he": "גן עדן 331" },
        "subtitle": { "en": "Garden Huts Eco-Homes", "pt": "Eco-Casas com Cabanas de Jardim", "he": "בתי גן אקולוגיים" },
        "description": { "en": "Unique eco-friendly homes designed for sustainable living. Enjoy shared garden spaces and high-end interiors.", "pt": "Casas ecológicas únicas projetadas para uma vida sustentável. Desfrute de espaços de jardim partilhados e interiores de alta qualidade.", "he": "בתים אקולוגיים ייחודיים שתוכננו לחיים ברי קיימא. תיהנו מחללי גינה משותפים ועיצוב פנים יוקרתי." },
        "cancellation": {
            "text": { "en": "Moderate", "pt": "Moderada", "he": "בינונית" },
            "deadline": { "en": "7 days", "pt": "7 dias", "he": "7 ימים" },
            "refundText": { "en": "50% refund", "pt": "reembolso de 50%", "he": "50% החזר כספי" }
        }
    },
    {
        "id": "195628a1-7ef7-4d70-be9f-8cd3d47c92ec",
        "title": { "en": "RDM II Premium Apartments", "pt": "RDM II Premium Apartments", "he": "דירות פרימיום RDM II" },
        "subtitle": { "en": "Premium Stay in Porto", "pt": "Estadia Premium no Porto", "he": "שהיית פרימיום בפורטו" },
        "description": { "en": "Sophisticated apartments for the modern traveler. Premium amenities and central location.", "pt": "Apartamentos sofisticados para o viajante moderno. Comodidades premium e localização central.", "he": "דירות מתוחכמות למטייל המודרני. שירותי פרימיום ומיקום מרכזי." },
        "cancellation": {
            "text": { "en": "Moderate", "pt": "Moderada", "he": "בינונית" },
            "deadline": { "en": "7 days", "pt": "7 dias", "he": "7 ימים" },
            "refundText": { "en": "50% refund", "pt": "reembolso de 50%", "he": "50% החזר כספי" }
        }
    }
];

// Note: Run with --env-file=.env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseServiceKey || !supabaseUrl) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL in environment");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateProperties() {
    console.log(`Starting update for ${TRANSLATED_PROPERTIES.length} properties...`);

    for (const prop of TRANSLATED_PROPERTIES) {
        process.stdout.write(`Updating ${prop.id}... `);

        const { error } = await supabase
            .from('properties')
            .update({
                title: prop.title,
                subtitle: prop.subtitle,
                description: prop.description,
                cancellation: prop.cancellation
            })
            .eq('id', prop.id);

        if (error) {
            console.log(`❌ Error: ${error.message}`);
        } else {
            console.log(`✅ Success`);
        }
    }

    console.log("All updates completed.");
}

updateProperties();
