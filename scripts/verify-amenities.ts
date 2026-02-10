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

async function verifyAmenities() {
    const { data: property, error: fetchError } = await supabase
        .from('properties')
        .select('amenities')
        .or('slug.eq.the-root,slug.eq.the-root-porto')
        .single();

    if (fetchError || !property) {
        console.error("Error fetching property:", fetchError?.message);
        return;
    }

    console.log("\n📊 Amenities Verification Report\n");
    console.log("=".repeat(60));

    if (!Array.isArray(property.amenities)) {
        console.log("❌ Amenities is not an array!");
        return;
    }

    let totalItems = 0;
    let missingEnTranslations = 0;

    property.amenities.forEach((category: any, idx: number) => {
        const catPt = category.category?.pt || category.category || 'Unknown';
        const catEn = category.category?.en || '';

        console.log(`\n${idx + 1}. Category: ${catEn || '⚠️  MISSING'} (PT: ${catPt})`);
        console.log(`   Icon: ${category.icon || 'N/A'}`);
        console.log(`   Items: ${category.items?.length || 0}`);

        if (!catEn) {
            console.log(`   ⚠️  Missing English translation for category!`);
        }

        (category.items || []).forEach((item: any, itemIdx: number) => {
            totalItems++;
            const itemPt = item.pt || item || '';
            const itemEn = item.en || '';

            if (!itemEn) {
                missingEnTranslations++;
                console.log(`   ${itemIdx + 1}. ⚠️  "${itemPt}" - MISSING ENGLISH`);
            } else {
                console.log(`   ${itemIdx + 1}. ✅ "${itemEn}" (PT: "${itemPt}")`);
            }
        });
    });

    console.log("\n" + "=".repeat(60));
    console.log(`\n📈 Summary:`);
    console.log(`- Total categories: ${property.amenities.length}`);
    console.log(`- Total amenities: ${totalItems}`);
    console.log(`- Missing English translations: ${missingEnTranslations}`);
    console.log(`- Translation coverage: ${((totalItems - missingEnTranslations) / totalItems * 100).toFixed(1)}%`);
}

verifyAmenities();
