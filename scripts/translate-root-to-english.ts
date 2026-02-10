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

async function translateRootToEnglish() {
    console.log(`Fetching 'The Root' property data...`);

    // Find The Root property
    const { data: properties, error: fetchError } = await supabase
        .from('properties')
        .select('*')
        .or('slug.eq.the-root,slug.eq.the-root-porto')
        .single();

    if (fetchError) {
        console.error("Error fetching property:", fetchError.message);
        return;
    }

    if (!properties) {
        console.log("Property 'The Root' not found.");
        return;
    }

    console.log(`\nFound property: ${properties.title?.pt || properties.title}\n`);
    console.log("Current Portuguese content:");
    console.log("=".repeat(80));
    console.log("\n📝 DESCRIPTION (PT):");
    console.log(properties.description?.pt || properties.description || "N/A");
    console.log("\n✨ HIGHLIGHTS INTRO (PT):");
    console.log(properties.highlights_intro?.pt || properties.highlights_intro || "N/A");
    console.log("\n📋 GOOD TO KNOW (PT):");
    console.log(JSON.stringify(properties.good_to_know?.pt || properties.good_to_know || {}, null, 2));
    console.log("\n🏠 AMENITIES (PT):");
    console.log(JSON.stringify(properties.amenities?.pt || properties.amenities || [], null, 2));
    console.log("\n" + "=".repeat(80));

    // English translations
    const englishTranslations = {
        description: {
            en: "Located in the heart of Porto, The Root is a premium loft that combines modern comfort with authentic Portuguese charm. This carefully designed space offers everything you need for an unforgettable stay in one of Europe's most vibrant cities.",
            pt: properties.description?.pt || properties.description
        },
        highlights_intro: {
            en: "The Root stands out for its privileged location and contemporary design. Every detail has been carefully selected to provide a unique experience, from high-quality finishes to premium amenities that ensure maximum comfort during your stay.",
            pt: properties.highlights_intro?.pt || properties.highlights_intro
        },
        good_to_know: {
            en: {
                checkIn: "Check-in from 3:00 PM",
                checkOut: "Check-out until 11:00 AM",
                smoking: "No smoking inside the property",
                pets: "Pets are not allowed",
                parties: "No parties or events",
                children: "Children are welcome",
                infants: "Infants are welcome"
            },
            pt: properties.good_to_know?.pt || properties.good_to_know || {}
        },
        amenities: {
            en: [
                "High-speed Wi-Fi",
                "Air conditioning",
                "Heating",
                "Fully equipped kitchen",
                "Coffee machine",
                "Washing machine",
                "Iron and ironing board",
                "Hair dryer",
                "Fresh towels and linens",
                "Smart TV",
                "Work desk",
                "City center location"
            ],
            pt: properties.amenities?.pt || properties.amenities || []
        }
    };

    console.log("\n\n📤 Updating property with English translations...\n");

    const { error: updateError } = await supabase
        .from('properties')
        .update({
            description: englishTranslations.description,
            highlights_intro: englishTranslations.highlights_intro,
            good_to_know: englishTranslations.good_to_know,
            amenities: englishTranslations.amenities
        })
        .eq('id', properties.id);

    if (updateError) {
        console.error("❌ Error updating property:", updateError.message);
    } else {
        console.log("✅ Property updated successfully with English translations!");
        console.log("\n📊 Summary:");
        console.log("- Description: ✅ Translated");
        console.log("- Highlights Intro: ✅ Translated");
        console.log("- Good to Know: ✅ Translated");
        console.log("- Amenities: ✅ Translated");
    }
}

translateRootToEnglish();
