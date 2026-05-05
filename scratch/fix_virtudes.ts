import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixVirtudesImages() {
    const { data: properties, error } = await supabase
        .from('properties')
        .select('id, images')
        .ilike('slug', '%virtudes-1%')
        .limit(1);

    if (error || !properties || properties.length === 0) {
        console.error('Error fetching property:', error);
        return;
    }

    const p = properties[0];
    const images = p.images;

    if (Array.isArray(images) && images.length > 1) {
        console.log('Swapping images for Virtudes 1...');
        // Move the first image to the end and make the second one main
        const [brokenImage, ...rest] = images;
        
        // Update the broken image to not be main
        if (typeof brokenImage === 'object') brokenImage.is_main = false;
        
        // Update the new first image to be main
        if (typeof rest[0] === 'object') rest[0].is_main = true;
        
        const newImages = [...rest, brokenImage];

        const { error: updateError } = await supabase
            .from('properties')
            .update({ images: newImages })
            .eq('id', p.id);

        if (updateError) {
            console.error('Error updating property:', updateError);
        } else {
            console.log('Successfully swapped images!');
        }
    } else {
        console.log('Not enough images to swap.');
    }
}

fixVirtudesImages();
