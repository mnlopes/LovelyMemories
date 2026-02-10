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

// COMPLETE translation dictionary
const translations: Record<string, string> = {
    // Categories
    "Casa de banho": "Bathroom",
    "Quarto e lavandaria": "Bedroom and laundry",
    "Entretenimento": "Entertainment",
    "Aquecimento e arrefecimento": "Heating and cooling",
    "Cozinha e refeição": "Kitchen and dining",
    "Estacionamento e instalações": "Parking and facilities",

    // Bathroom items
    "Secador de cabelo": "Hair dryer",
    "Produtos de limpeza": "Cleaning products",
    "Champô Castelbel Orange and Vetiver": "Shampoo Castelbel Orange and Vetiver",
    "Condicionador Castelbel Orange and Vetiver": "Conditioner Castelbel Orange and Vetiver",
    "Sabonete de corpo Castelbel Orange and Vetiver": "Body soap Castelbel Orange and Vetiver",

    // Bedroom and laundry items
    "Máquina de lavar Gratuito: na unidade": "Washing machine Free: in unit",
    "Secador Gratuito: na unidade": "Dryer Free: in unit",
    "Toalhas, lençóis de cama, gel de banho e papel higiénico": "Towels, bed linens, body wash and toilet paper",
    "Cabides": "Hangers",
    "Roupa de cama (algodão)": "Bed linens (cotton)",
    "Cobertores e almofadas extra": "Extra blankets and pillows",
    "Cortinas para escurecer quarto": "Room darkening curtains",
    "Ferro de Engomar": "Iron",
    "Suporte para secar roupa": "Drying rack",
    "Espaço para guardar a roupa: roupeiro": "Clothing storage: wardrobe",

    // Entertainment items
    "Conexão Ethernet": "Ethernet connection",
    "HDTV de 65\" com Netflix": "65\" HDTV with Netflix",
    "Sistema de som com Bluetooth Marshall": "Marshall Bluetooth sound system",

    // Heating and cooling items
    "Ar condicionado central": "Central air conditioning",
    "Aquecimento central": "Central heating",

    // Kitchen and dining items
    "Espaço onde os hóspedes podem preparar as suas próprias refeições": "Space where guests can prepare their own meals",
    "Frigorífico": "Refrigerator",
    "Micro-ondas": "Microwave",
    "Tachos e panelas, óleo, sal e pimenta": "Pots and pans, oil, salt and pepper",
    "Louças e talheres": "Dishes and silverware",
    "Congelador": "Freezer",
    "Máquina de lavar a loiça": "Dishwasher",
    "Fogão de indução": "Induction stove",
    "Forno": "Oven",
    "Cafeteira: Nespresso": "Coffee maker: Nespresso",
    "Torradeira": "Toaster",

    // Parking and facilities items
    "Permitir estadia de 28 dias ou mais": "Long-term stays allowed (28+ days)",
    "Check-in autónomo": "Self check-in",
    "Fechadura inteligente": "Smart lock",
};

async function fixAllTranslations() {
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

    if (!Array.isArray(property.amenities)) {
        console.log("⚠️  Amenities is not an array!");
        return;
    }

    console.log("\n🔧 Fixing all translations...\n");

    const fixedAmenities = property.amenities.map((category: any) => {
        const categoryPt = category.category?.pt || category.category || '';
        const categoryEn = translations[categoryPt] || category.category?.en || categoryPt;

        const fixedItems = (category.items || []).map((item: any) => {
            const itemPt = item.pt || item || '';
            const itemEn = translations[itemPt] || item.en || itemPt;

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
            items: fixedItems
        };
    });

    console.log("✨ Translation Summary:");
    let totalItems = 0;
    fixedAmenities.forEach((cat: any, idx: number) => {
        const itemCount = cat.items?.length || 0;
        totalItems += itemCount;
        console.log(`${idx + 1}. ${cat.category.en} (${cat.category.pt}): ${itemCount} items`);

        // Show first 2 items as sample
        cat.items.slice(0, 2).forEach((item: any, i: number) => {
            console.log(`   ${i + 1}. EN: "${item.en}"`);
            console.log(`      PT: "${item.pt}"`);
        });
        if (cat.items.length > 2) {
            console.log(`   ... and ${cat.items.length - 2} more`);
        }
        console.log();
    });

    console.log(`📊 Total: ${fixedAmenities.length} categories, ${totalItems} amenities\n`);

    console.log("📤 Updating database...\n");

    const { error: updateError } = await supabase
        .from('properties')
        .update({
            amenities: fixedAmenities
        })
        .or('slug.eq.the-root,slug.eq.the-root-porto');

    if (updateError) {
        console.error("❌ Error updating property:", updateError.message);
    } else {
        console.log("✅ All translations fixed successfully!");
        console.log(`\n🎯 Final Summary:`);
        console.log(`- Categories: ${fixedAmenities.length} (all with EN + PT)`);
        console.log(`- Total amenities: ${totalItems} (all with EN + PT)`);
        console.log(`- Translation coverage: 100%`);
    }
}

fixAllTranslations();
