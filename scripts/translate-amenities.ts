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

// Translation mappings for amenities
const amenityTranslations: Record<string, string> = {
    // Essentials
    "Wi-Fi": "Wi-Fi",
    "Toalhas": "Towels",
    "Lençóis": "Bed linens",
    "Sabonete": "Soap",
    "Papel higiénico": "Toilet paper",
    "Cabides": "Hangers",

    // Kitchen
    "Cozinha": "Kitchen",
    "Frigorífico": "Refrigerator",
    "Micro-ondas": "Microwave",
    "Utensílios de cozinha": "Cooking basics",
    "Pratos e talheres": "Dishes and silverware",
    "Máquina de café": "Coffee maker",
    "Torradeira": "Toaster",
    "Fogão": "Stove",

    // Bathroom
    "Secador de cabelo": "Hair dryer",
    "Champô": "Shampoo",
    "Gel de banho": "Body wash",

    // Bedroom & Laundry
    "Roupa de cama": "Bed linens",
    "Almofadas e mantas extra": "Extra pillows and blankets",
    "Máquina de lavar roupa": "Washing machine",
    "Ferro de engomar": "Iron",
    "Tábua de engomar": "Ironing board",

    // Entertainment
    "TV": "TV",
    "Berço portátil": "Portable crib",
    "Rede/grade de proteção nas janelas": "Window guards",
    "Jogos de tabuleiro": "Board games",

    // Heating & Cooling
    "Ar condicionado central": "Central air conditioning",
    "Aquecimento central": "Central heating",

    // Categories
    "Essenciais": "Essentials",
    "Cozinha e sala de jantar": "Kitchen and dining",
    "Casa de banho": "Bathroom",
    "Quarto e lavandaria": "Bedroom and laundry",
    "Família": "Family",
    "Aquecimento e arrefecimento": "Heating and cooling",
    "Entretenimento": "Entertainment"
};

async function translateAmenities() {
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

    // Translate amenities structure
    const amenities = property.amenities || [];
    const translatedAmenities = amenities.map((category: any) => {
        return {
            ...category,
            category: {
                en: amenityTranslations[category.category] || category.category,
                pt: category.category
            },
            items: category.items.map((item: any) => {
                const ptText = item.pt || item;
                return {
                    en: amenityTranslations[ptText] || ptText,
                    pt: ptText,
                    he: item.he || ""
                };
            })
        };
    });

    // Translate good_to_know
    const goodToKnow = {
        en: {
            checkIn: "Check-in from 3:00 PM",
            checkOut: "Check-out until 11:00 AM",
            smoking: "No smoking inside the property",
            pets: "Pets are not allowed",
            parties: "No parties or events",
            children: "Children are welcome",
            infants: "Infants are welcome"
        },
        pt: property.good_to_know?.pt || property.good_to_know || {}
    };

    console.log("\n📤 Updating property with English translations...\n");

    const { error: updateError } = await supabase
        .from('properties')
        .update({
            amenities: translatedAmenities,
            good_to_know: goodToKnow
        })
        .eq('id', property.id);

    if (updateError) {
        console.error("❌ Error updating property:", updateError.message);
    } else {
        console.log("✅ Property updated successfully!");
        console.log("\n📊 Translated amenities:");
        console.log(JSON.stringify(translatedAmenities, null, 2));
    }
}

translateAmenities();
