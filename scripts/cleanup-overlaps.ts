import 'dotenv/config';
import { getSupabaseAdmin } from '../lib/supabase';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function cleanupOverlaps() {
    const supabase = await getSupabaseAdmin();
    console.log('Fetching all Airbnb/Booking blocks to identify overlaps...');
    
    const { data: blocks, error: fetchError } = await supabase
        .from('blocked_dates')
        .select('*')
        .in('source', ['airbnb_booking', 'booking_com'])
        .order('property_id', { ascending: true })
        .order('end_date', { ascending: true });

    if (fetchError) {
        console.error('Error fetching blocks:', fetchError);
        return;
    }

    if (!blocks || blocks.length === 0) {
        console.log('No blocks found.');
        return;
    }

    // Group by property_id + source + end_date
    const groups: Record<string, typeof blocks> = {};
    blocks.forEach(b => {
        // We use end_date as the anchor for the same reservation
        const key = `${b.property_id}_${b.source}_${b.end_date}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(b);
    });

    const idsToDelete: string[] = [];
    const updates: { id: string, data: any }[] = [];

    for (const [key, items] of Object.entries(groups)) {
        if (items.length > 1) {
            console.log(`Found ${items.length} overlapping records for group ${key}`);
            
            // 1. Find the earliest start_date among them
            items.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
            const earliestStart = items[0].start_date;
            
            // 2. Find the record with the most recent created_at (likely has the correct current UID)
            const mostRecent = [...items].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
            
            // 3. Keep mostRecent, but update its start_date to earliestStart
            // Actually, we can choose any one to keep, let's keep the one that we want to remain in the DB
            const toKeep = mostRecent;
            if (toKeep.start_date !== earliestStart) {
                updates.push({ id: toKeep.id, data: { start_date: earliestStart } });
            }

            // 4. Mark others for deletion
            items.forEach(item => {
                if (item.id !== toKeep.id) {
                    idsToDelete.push(item.id);
                }
            });
        }
    }

    console.log(`Planned updates: ${updates.length}`);
    console.log(`Planned deletions: ${idsToDelete.length}`);

    // Execute Updates
    for (const update of updates) {
        console.log(`Updating block ${update.id} start_date to ${update.data.start_date}`);
        await supabase.from('blocked_dates').update(update.data).eq('id', update.id);
    }

    // Execute Deletions
    if (idsToDelete.length > 0) {
        const batchSize = 50;
        for (let i = 0; i < idsToDelete.length; i += batchSize) {
            const batch = idsToDelete.slice(i, i + batchSize);
            await supabase.from('blocked_dates').delete().in('id', batch);
            console.log(`Deleted batch ${i / batchSize + 1}`);
        }
    }

    console.log('Cleanup overlaps complete.');
}

cleanupOverlaps();
