import { createClient } from "@supabase/supabase-js";
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseServiceKey || !supabaseUrl) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL in environment");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixRootComplete() {
    console.log(`Fetching 'The Root' property data...`);

    const { data: property, error: fetchError } = await supabase
        .from('properties')
        .select('*')
        .or('slug.eq.the-root,slug.eq.the-root-porto')
        .single();

    if (fetchError || !property) {
        console.error("Error fetching property:", fetchError?.message);
        return;
    }

    console.log(`\nFound property: ${property.title?.pt || property.title}\n`);

    // Amenities with English translations
    const amenities = [
        {
            "icon": "/icons/wifi_navy.png",
            "category": {
                "en": "Essentials",
                "pt": "Essenciais"
            },
            "items": [
                { "en": "Wi-Fi", "pt": "Wi-Fi", "he": "" },
                { "en": "Towels", "pt": "Toalhas", "he": "" },
                { "en": "Bed linens", "pt": "Lençóis", "he": "" },
                { "en": "Soap", "pt": "Sabonete", "he": "" },
                { "en": "Toilet paper", "pt": "Papel higiénico", "he": "" },
                { "en": "Hangers", "pt": "Cabides", "he": "" }
            ]
        },
        {
            "icon": "/icons/kitchen_navy.png",
            "category": {
                "en": "Kitchen and dining",
                "pt": "Cozinha e sala de jantar"
            },
            "items": [
                { "en": "Kitchen", "pt": "Cozinha", "he": "" },
                { "en": "Refrigerator", "pt": "Frigorífico", "he": "" },
                { "en": "Microwave", "pt": "Micro-ondas", "he": "" },
                { "en": "Cooking basics", "pt": "Utensílios de cozinha", "he": "" },
                { "en": "Dishes and silverware", "pt": "Pratos e talheres", "he": "" },
                { "en": "Coffee maker", "pt": "Máquina de café", "he": "" },
                { "en": "Toaster", "pt": "Torradeira", "he": "" },
                { "en": "Stove", "pt": "Fogão", "he": "" }
            ]
        },
        {
            "icon": "/icons/bathroom_navy.png",
            "category": {
                "en": "Bathroom",
                "pt": "Casa de banho"
            },
            "items": [
                { "en": "Hair dryer", "pt": "Secador de cabelo", "he": "" },
                { "en": "Shampoo", "pt": "Champô", "he": "" },
                { "en": "Body wash", "pt": "Gel de banho", "he": "" }
            ]
        },
        {
            "icon": "/icons/bedroom_navy.png",
            "category": {
                "en": "Bedroom and laundry",
                "pt": "Quarto e lavandaria"
            },
            "items": [
                { "en": "Bed linens", "pt": "Roupa de cama", "he": "" },
                { "en": "Extra pillows and blankets", "pt": "Almofadas e mantas extra", "he": "" },
                { "en": "Washing machine", "pt": "Máquina de lavar roupa", "he": "" },
                { "en": "Iron", "pt": "Ferro de engomar", "he": "" },
                { "en": "Ironing board", "pt": "Tábua de engomar", "he": "" }
            ]
        },
        {
            "icon": "/icons/entertainment_navy.png",
            "category": {
                "en": "Family",
                "pt": "Família"
            },
            "items": [
                { "en": "Portable crib", "pt": "Berço portátil", "he": "" },
                { "en": "Window guards", "pt": "Rede/grade de proteção nas janelas", "he": "" },
                { "en": "Board games", "pt": "Jogos de tabuleiro", "he": "" }
            ]
        },
        {
            "icon": "/icons/heating_navy.png",
            "category": {
                "en": "Heating and cooling",
                "pt": "Aquecimento e arrefecimento"
            },
            "items": [
                { "en": "Central air conditioning", "pt": "Ar condicionado central", "he": "" },
                { "en": "Central heating", "pt": "Aquecimento central", "he": "" }
            ]
        }
    ];

    // Good to Know - ARRAY OF STRINGS (not objects with icon/text)
    const goodToKnow = {
        "en": [
            "Guest access: Access to travelers is done entirely through entry codes and is not done in a more simple way. After booking your stay, you will automatically receive all basic information. On the day of arrival, we will share the entry codes with you.",
            "Other things to keep in mind: We ask our guests not to use bath towels or bathrobes to clean the machine and shoes.",
            "Extra towels or cleaning during your stay has the value of a full cleaning fee."
        ],
        "pt": [
            "Acesso dos viajantes O acesso é feito inteiramente por códigos de entrada e não é feito de forma mais simples. Depois de reservar sua estadia, você receberá automaticamente todas as informações básicas. No dia da chegada, compartilharemos os códigos de entrada com você.",
            "Outras coisas a ter em conta Pedimos aos nossos hóspedes que não usem as toalhas de banho ou roupões de banho para limpar a maquinagem e os sapatos.",
            "Toalhas extras ou limpeza durante a sua estadia têm o valor de uma taxa de limpeza completa."
        ]
    };

    console.log("\n📤 Updating ALL property data (amenities, good_to_know, price)...\n");

    const { error: updateError } = await supabase
        .from('properties')
        .update({
            amenities: amenities,
            good_to_know: goodToKnow,
            price_per_night: 150  // PRESERVE THE PRICE!
        })
        .eq('id', property.id);

    if (updateError) {
        console.error("❌ Error updating property:", updateError.message);
    } else {
        console.log("✅ Property updated successfully!");
        console.log("\n📊 Summary:");
        console.log("- Amenities: ✅ 6 categories with English translations");
        console.log("- Good to Know: ✅ 3 items (EN + PT) as string arrays");
        console.log("- Price: ✅ Set to 150€ per night");
    }
}

fixRootComplete();
