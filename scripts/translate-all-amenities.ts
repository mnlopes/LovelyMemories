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

// Translation dictionary for amenities
const amenityTranslations: Record<string, string> = {
    // Essentials / Essenciais
    "Wi-Fi": "Wi-Fi",
    "Toalhas": "Towels",
    "Lençóis": "Bed linens",
    "Sabonete": "Soap",
    "Papel higiénico": "Toilet paper",
    "Cabides": "Hangers",

    // Kitchen / Cozinha
    "Cozinha": "Kitchen",
    "Frigorífico": "Refrigerator",
    "Micro-ondas": "Microwave",
    "Utensílios de cozinha": "Cooking basics",
    "Pratos e talheres": "Dishes and silverware",
    "Máquina de café": "Coffee maker",
    "Torradeira": "Toaster",
    "Fogão": "Stove",
    "Forno": "Oven",
    "Chaleira": "Kettle",
    "Liquidificador": "Blender",
    "Tábua de cortar": "Cutting board",

    // Bathroom / Casa de banho
    "Secador de cabelo": "Hair dryer",
    "Champô": "Shampoo",
    "Gel de banho": "Body wash",
    "Condicionador": "Conditioner",
    "Produtos de limpeza": "Cleaning products",

    // Bedroom / Quarto
    "Roupa de cama": "Bed linens",
    "Almofadas e mantas extra": "Extra pillows and blankets",
    "Máquina de lavar roupa": "Washing machine",
    "Ferro de engomar": "Iron",
    "Tábua de engomar": "Ironing board",
    "Roupeiro": "Wardrobe",
    "Espelho": "Mirror",

    // Family / Família
    "Berço portátil": "Portable crib",
    "Rede/grade de proteção nas janelas": "Window guards",
    "Jogos de tabuleiro": "Board games",
    "Cadeira alta": "High chair",
    "Brinquedos": "Toys",

    // Heating & Cooling / Aquecimento e arrefecimento
    "Ar condicionado central": "Central air conditioning",
    "Aquecimento central": "Central heating",
    "Ventilador": "Fan",
    "Aquecedor": "Heater",

    // Entertainment / Entretenimento
    "TV": "TV",
    "Netflix": "Netflix",
    "Sistema de som": "Sound system",
    "Livros": "Books",

    // Safety / Segurança
    "Extintor": "Fire extinguisher",
    "Detetor de fumo": "Smoke detector",
    "Detetor de monóxido de carbono": "Carbon monoxide detector",
    "Caixa de primeiros socorros": "First aid kit",

    // Outdoor / Exterior
    "Varanda": "Balcony",
    "Terraço": "Terrace",
    "Jardim": "Garden",
    "Churrasqueira": "BBQ grill",

    // Other common amenities
    "Toalhas, lençóis de cama, gel de banho e papel higiénico": "Towels, bed linens, body wash and toilet paper",
    "Máquina de lavar Gratuito: na unidade": "Washing machine Free: in unit",
    "Secador Gratuito: na unidade": "Dryer Free: in unit",
    "Condicionador Castelbel Orange and Vetiver": "Conditioner Castelbel Orange and Vetiver",
    "Champô Castelbel Orange and Vetiver": "Shampoo Castelbel Orange and Vetiver",
    "Sabonete de corpo Castelbel Orange and Vetiver": "Body soap Castelbel Orange and Vetiver",
};

// Category translations
const categoryTranslations: Record<string, string> = {
    "Essenciais": "Essentials",
    "Cozinha": "Kitchen",
    "Cozinha e sala de jantar": "Kitchen and dining",
    "Casa de banho": "Bathroom",
    "Quarto": "Bedroom",
    "Quarto e lavandaria": "Bedroom and laundry",
    "Família": "Family",
    "Aquecimento e arrefecimento": "Heating and cooling",
    "Entretenimento": "Entertainment",
    "Segurança": "Safety",
    "Exterior": "Outdoor",
    "Comodidades": "Amenities",
};

async function translateAllAmenities() {
    console.log(`Fetching 'The Root' property amenities...`);

    const { data: property, error: fetchError } = await supabase
        .from('properties')
        .select('amenities')
        .or('slug.eq.the-root,slug.eq.the-root-porto')
        .single();

    if (fetchError || !property) {
        console.error("Error fetching property:", fetchError?.message);
        return;
    }

    console.log("\n📋 Current amenities structure:");
    console.log(JSON.stringify(property.amenities, null, 2));

    if (!Array.isArray(property.amenities) || property.amenities.length === 0) {
        console.log("\n⚠️  No amenities found or amenities is not an array!");
        return;
    }

    // Translate amenities
    const translatedAmenities = property.amenities.map((category: any) => {
        const categoryPt = category.category?.pt || category.category || '';
        const categoryEn = categoryTranslations[categoryPt] || categoryPt;

        const translatedItems = (category.items || []).map((item: any) => {
            const itemPt = item.pt || item;
            const itemEn = amenityTranslations[itemPt] || itemPt;

            return {
                en: itemEn,
                pt: itemPt,
                he: item.he || ""
            };
        });

        return {
            icon: category.icon || "/icons/default_navy.png",
            category: {
                en: categoryEn,
                pt: categoryPt
            },
            items: translatedItems
        };
    });

    console.log("\n✨ Translated amenities:");
    console.log(`Total categories: ${translatedAmenities.length}`);

    let totalItems = 0;
    translatedAmenities.forEach((cat: any, idx: number) => {
        const itemCount = cat.items?.length || 0;
        totalItems += itemCount;
        console.log(`${idx + 1}. ${cat.category.en} (${cat.category.pt}): ${itemCount} items`);
    });

    console.log(`\n📊 Total amenities: ${totalItems}`);

    console.log("\n📤 Updating property with translated amenities...\n");

    const { error: updateError } = await supabase
        .from('properties')
        .update({
            amenities: translatedAmenities
        })
        .or('slug.eq.the-root,slug.eq.the-root-porto');

    if (updateError) {
        console.error("❌ Error updating property:", updateError.message);
    } else {
        console.log("✅ Amenities translated successfully!");
        console.log(`\n🎯 Summary:`);
        console.log(`- Categories: ${translatedAmenities.length}`);
        console.log(`- Total amenities: ${totalItems}`);
        console.log(`- Languages: EN + PT (Hebrew placeholder included)`);
    }
}

translateAllAmenities();
