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

// Highlights translations
const highlightTranslations: Record<string, string> = {
    "Sistema de som Marshall": "Marshall sound system",
    "Os eletrodomésticos são da Smeg": "Smeg appliances",
    "Luxo da Castelbel Orange": "Castelbel Orange luxury",
};

async function translateHighlights() {
    console.log(`Fetching 'The Root' property highlights...`);

    const { data: property, error: fetchError } = await supabase
        .from('properties')
        .select('highlights')
        .or('slug.eq.the-root,slug.eq.the-root-porto')
        .single();

    if (fetchError || !property) {
        console.error("Error fetching property:", fetchError?.message);
        return;
    }

    if (!Array.isArray(property.highlights)) {
        console.log("⚠️  Highlights is not an array!");
        return;
    }

    console.log("\n🔧 Translating highlights...\n");

    const translatedHighlights = property.highlights.map((highlight: any) => {
        const textPt = highlight.text?.pt || highlight.text || '';
        const textEn = highlightTranslations[textPt] || highlight.text?.en || textPt;

        console.log(`✨ "${textPt}" → "${textEn}"`);

        return {
            image: highlight.image,
            text: {
                en: textEn,
                pt: textPt,
                he: highlight.text?.he || ""
            }
        };
    });

    console.log(`\n📊 Total highlights: ${translatedHighlights.length}\n`);

    console.log("📤 Updating database...\n");

    const { error: updateError } = await supabase
        .from('properties')
        .update({
            highlights: translatedHighlights
        })
        .or('slug.eq.the-root,slug.eq.the-root-porto');

    if (updateError) {
        console.error("❌ Error updating property:", updateError.message);
    } else {
        console.log("✅ Highlights translated successfully!");
        console.log(`\n🎯 Summary:`);
        console.log(`- Total highlights: ${translatedHighlights.length}`);
        console.log(`- All with EN + PT translations`);
        console.log(`\nHighlights:`);
        translatedHighlights.forEach((h: any, i: number) => {
            console.log(`${i + 1}. EN: "${h.text.en}"`);
            console.log(`   PT: "${h.text.pt}"`);
        });
    }
}

translateHighlights();
