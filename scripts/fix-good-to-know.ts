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

async function fixGoodToKnow() {
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
    console.log("Current good_to_know structure:");
    console.log(JSON.stringify(property.good_to_know, null, 2));

    // The HomeTruthsSection expects an array of strings or localized objects
    // So we need to convert the structure to match
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

    console.log("\n📤 Updating good_to_know with correct structure...\n");

    const { error: updateError } = await supabase
        .from('properties')
        .update({
            good_to_know: goodToKnow
        })
        .eq('id', property.id);

    if (updateError) {
        console.error("❌ Error updating property:", updateError.message);
    } else {
        console.log("✅ Property updated successfully!");
        console.log("\n📊 New structure:");
        console.log(JSON.stringify(goodToKnow, null, 2));
    }
}

fixGoodToKnow();
