
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Manually parse .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars: Record<string, string> = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envVars[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
    }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const RDM_II_NEARBY_PLACES = [
    {
        category: "localAttractions",
        items: [
            { name: "Crystal Palace Gardens", time: "2 min", icon: "walk", coordinates: [41.1485, -8.6254] },
            { name: "Clérigos Tower", time: "10 min", icon: "walk", coordinates: [41.1458, -8.6139] },
            { name: "Ribeira District", time: "15 min", icon: "walk", coordinates: [41.1408, -8.6130] }
        ]
    },
    {
        category: "essentials",
        items: [
            { name: "Continente Supermarket", time: "5 min", icon: "walk", coordinates: [41.1495, -8.6235] },
            { name: "Porto Hospital", time: "8 min", icon: "car", coordinates: [41.1550, -8.6270] }
        ]
    }
];

async function fixNearbyPlaces() {
    console.log('Updating nearby_places for rdm-ii-premium-apartments...');

    const { data, error } = await supabase
        .from('properties')
        .update({ nearby_places: RDM_II_NEARBY_PLACES })
        .eq('slug', 'rdm-ii-premium-apartments')
        .select();

    if (error) {
        console.error('Error updating nearby_places:', error);
    } else {
        if (data && data.length > 0) {
            console.log('Successfully updated nearby_places for:', data[0].title_en);
        } else {
            console.log('No property found with slug: rdm-ii-premium-apartments');
        }
    }
}

fixNearbyPlaces();
