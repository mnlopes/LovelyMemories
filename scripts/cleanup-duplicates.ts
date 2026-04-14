import 'dotenv/config';
import { getSupabaseAdmin } from '../lib/supabase';

// Since this is a script, we might need to manually set the env if it's not picked up by Next or if we're running with tsx
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });


async function cleanupDuplicates() {
    const supabase = await getSupabaseAdmin();
    console.log('Fetching duplicates...');
    
    // 1. Identify duplicates
    const { data: duplicates, error: fetchError } = await supabase
        .from('blocked_dates')
        .select('id, property_id, external_id, created_at, start_date')
        .not('external_id', 'is', null)
        .eq('source', 'airbnb_booking');

    if (fetchError) {
        console.error('Error fetching data:', fetchError);
        return;
    }

    if (!duplicates || duplicates.length === 0) {
        console.log('No records found.');
        return;
    }

    // Group by property_id and external_id
    const groups: Record<string, typeof duplicates> = {};
    duplicates.forEach(item => {
        const key = `${item.property_id}_${item.external_id}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
    });

    const idsToDelete: string[] = [];
    let totalGroups = 0;
    let duplicateGroups = 0;

    Object.entries(groups).forEach(([key, items]) => {
        totalGroups++;
        if (items.length > 1) {
            duplicateGroups++;
            // Sort by created_at ascending (keep the oldest)
            // Or sort by start_date ascending in case they represent the same block
            items.sort((a, b) => {
                const dateA = new Date(a.created_at || a.start_date).getTime();
                const dateB = new Date(b.created_at || b.start_date).getTime();
                return dateA - dateB;
            });

            // Keep the first, delete the rest
            const toKeep = items[0];
            const toDelete = items.slice(1).map(i => i.id);
            console.log(`Group ${key}: Keeping ${toKeep.id}, deleting ${toDelete.length} records`);
            idsToDelete.push(...toDelete);
        }
    });

    console.log(`Total groups: ${totalGroups}`);
    console.log(`Duplicate groups found: ${duplicateGroups}`);
    console.log(`Total records to delete: ${idsToDelete.length}`);

    if (idsToDelete.length > 0) {
        // Supabase allows deleting in batches
        const batchSize = 100;
        for (let i = 0; i < idsToDelete.length; i += batchSize) {
            const batch = idsToDelete.slice(i, i + batchSize);
            const { error: deleteError } = await supabase
                .from('blocked_dates')
                .delete()
                .in('id', batch);
            
            if (deleteError) {
                console.error(`Error deleting batch ${i / batchSize}:`, deleteError);
            } else {
                console.log(`Deleted batch ${i / batchSize + 1}`);
            }
        }
        console.log('Cleanup complete.');
    } else {
        console.log('No duplicates to delete.');
    }
}

cleanupDuplicates();
