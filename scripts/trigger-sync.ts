import 'dotenv/config';
import { syncPropertyICal } from '../app/actions/ical';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function triggerSync() {
    const propertyId = '758de934-cf49-45fc-89f9-5f1a4d40d966';
    console.log(`Triggering sync for property ${propertyId}...`);
    
    const result = await syncPropertyICal(propertyId);
    console.log('Sync Result:', JSON.stringify(result, null, 2));

    // Wait a bit and trigger again to verify no duplicates are created
    console.log('Triggering second sync to verify deduplication...');
    const result2 = await syncPropertyICal(propertyId);
    console.log('Second Sync Result:', JSON.stringify(result2, null, 2));
}

triggerSync();
