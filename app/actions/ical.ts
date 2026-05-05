"use server";

import { getSupabaseAdmin } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

/**
 * Manual ICS Parser for Airbnb/Standard Calendars
 * Avoids dependencies that crash in Next.js/Turbopack environments (like node-ical/rrule)
 */
function parseIcalManual(icsContent: string) {
    const events: any[] = [];
    const lines = icsContent.split(/\r?\n/);
    const unfoldedLines: string[] = [];
    
    // Unfold lines (iCal RFC 5545 specifies that lines starting with space/tab are continuation of previous line)
    for (const line of lines) {
        if (line.startsWith(' ') || line.startsWith('\t')) {
            if (unfoldedLines.length > 0) {
                unfoldedLines[unfoldedLines.length - 1] += line.substring(1);
            }
        } else {
            unfoldedLines.push(line);
        }
    }

    let currentEvent: any = null;

    for (const line of unfoldedLines) {
        if (line.startsWith('BEGIN:VEVENT')) {
            currentEvent = {};
        } else if (line.startsWith('END:VEVENT')) {
            if (currentEvent && currentEvent.dtstart && currentEvent.dtend) {
                events.push(currentEvent);
            }
            currentEvent = null;
        } else if (currentEvent) {
            // Handle parameters in keys like DTSTART;VALUE=DATE:20240101
            const firstColon = line.indexOf(':');
            if (firstColon === -1) continue;
            
            const keyPart = line.substring(0, firstColon);
            const value = line.substring(firstColon + 1);
            const key = keyPart.split(';')[0]; // Extract the base key name

            if (key === 'DTSTART') {
                currentEvent.dtstart = parseIcalDate(value);
            } else if (key === 'DTEND') {
                currentEvent.dtend = parseIcalDate(value);
            } else if (key === 'SUMMARY') {
                currentEvent.summary = value;
            } else if (key === 'UID') {
                currentEvent.uid = value;
            }
        }
    }
    return events;
}

/**
 * Helper to parse iCal date strings like 20240401 or 20240401T120000Z
 */
function parseIcalDate(dateStr: string) {
    if (!dateStr) return null;
    // Format: YYYYMMDD
    const y = parseInt(dateStr.substring(0, 4));
    const m = parseInt(dateStr.substring(4, 6)) - 1;
    const d = parseInt(dateStr.substring(6, 8));
    
    if (dateStr.includes('T')) {
        const h = parseInt(dateStr.substring(9, 11)) || 0;
        const min = parseInt(dateStr.substring(11, 13)) || 0;
        const s = parseInt(dateStr.substring(13, 15)) || 0;
        return new Date(Date.UTC(y, m, d, h, min, s));
    }
    
    return new Date(Date.UTC(y, m, d));
}

/**
 * Synchronizes property blocked dates from an iCal URL.
 */
export async function syncPropertyICal(propertyId: string) {
    console.log(`[iCal Sync] Starting sync for property: ${propertyId}`);
    
    try {
        const supabase = await getSupabaseAdmin();

        // 1. Fetch Property iCal URLs
        const { data: property, error: propertyError } = await supabase
            .from('properties')
            .select('id, title, ical_import_urls')
            .eq('id', propertyId)
            .single();

        if (propertyError || !property) {
            return { success: false, error: 'Property not found', propertyId };
        }

        const propertyTitle = typeof property.title === 'object' ? property.title.en : property.title;
        const urls: string[] = property.ical_import_urls || [];
        let newEventsCount = 0;
        
        if (urls.length === 0) {
            return { success: true, message: 'No iCal URLs to sync', propertyTitle };
        }

        const uniqueEventsMap = new Map();
        let totalEventsFound = 0;
        let successfulFetches = 0;
 
        // Process each URL and collect all events
        for (const url of urls) {
            try {
                console.log(`[iCal Sync] Fetching URL for ${propertyTitle}: ${url.substring(0, 50)}...`);
                
                const response = await fetch(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'Accept': 'text/calendar'
                    },
                    cache: 'no-store'
                });
 
                if (!response.ok) {
                    console.error(`[iCal Sync] Fetch failed for ${url.substring(0, 30)}: ${response.status}`);
                    continue;
                }
                
                const icsContent = await response.text();
                const vevents = parseIcalManual(icsContent);
 
                // Determine source for this URL
                const lowUrl = url.toLowerCase();
                const source = lowUrl.includes('booking.com') ? 'booking_com' : 'airbnb_booking';
                
                // Add to unique map (latest URL wins for same UID if applicable)
                for (const event of vevents) {
                    if (event.uid) {
                        console.log(`[iCal Sync Debug] Parsed event: ${event.uid} | Start: ${event.dtstart.toISOString()} | End: ${event.dtend.toISOString()} | Summary: ${event.summary}`);
                        uniqueEventsMap.set(event.uid, { ...event, source });
                    }
                }
 
                totalEventsFound += vevents.length;
                successfulFetches++;
                
                console.log(`[iCal Sync] Parsed ${vevents.length} events from ${url.substring(0, 30)} (${source})`);
            } catch (urlError) {
                console.error(`[iCal Sync] Error processing URL:`, urlError);
            }
        }
 
        const uniqueEvents = Array.from(uniqueEventsMap.values());
        console.log(`[iCal Sync] Mirroring ${uniqueEvents.length} unique events for ${propertyTitle}`);

        if (successfulFetches > 0) {
            // 1. Fetch existing external blocks to handle Start Date Preservation and Cleanup
            const { data: existingBlocks } = await supabase
                .from('blocked_dates')
                .select('id, external_id, start_date, end_date, property_id')
                .eq('property_id', propertyId)
                .in('source', ['airbnb_booking', 'booking_com']);

            const existingMap = new Map();
            const existingEndMap = new Map(); // Fallback for shifting UIDs
            
            existingBlocks?.forEach(b => {
                if (b.external_id) existingMap.set(b.external_id, b);
                
                // Map by end_date as a fallback for shifting UIDs in Airbnb
                const endStr = b.end_date.split('T')[0];
                const key = `${b.property_id}_${endStr}`;
                if (!existingEndMap.has(key)) {
                    existingEndMap.set(key, b);
                }
            });

            const now = new Date();
            const todayStr = now.toISOString().split('T')[0];

            // 2. Prepare blocks for upsert
            const blocksToUpsert = uniqueEvents.map(event => {
                let start = event.dtstart.toISOString();
                
                // Try to find existing record by UID first, then by End Date fallback
                const existingByUid = existingMap.get(event.uid);
                const endStr = event.dtend.toISOString().split('T')[0];
                const existingByEndDate = existingEndMap.get(`${propertyId}_${endStr}`);
                
                const existing = existingByUid || existingByEndDate;

                if (existing) {
                    // PRESERVE START DATE IF:
                    // 1. New start is after old start (shifted)
                    // 2. Old start is in the past (or today) - we want to keep the historical start
                    const existingStartOnly = existing.start_date.split('T')[0];
                    const newStartOnly = start.split('T')[0];

                    if (newStartOnly > existingStartOnly && existingStartOnly <= todayStr) {
                        console.log(`[iCal Sync] Preserving start date ${existing.start_date} for UID ${event.uid} (matched via ${existingByUid ? 'UID' : 'End Date'})`);
                        start = existing.start_date;
                    }
                }

                return {
                    property_id: propertyId,
                    start_date: start,
                    end_date: event.dtend.toISOString(),
                    reason: event.summary || (event.source === 'booking_com' ? 'Booking.com' : 'Airbnb Booking'),
                    source: event.source,
                    external_id: event.uid
                };
            });

            // 3. Perform UPSERT or manual update
            if (blocksToUpsert.length > 0) {
                const { error: upsertError } = await supabase
                    .from('blocked_dates')
                    .upsert(blocksToUpsert, { onConflict: 'property_id,external_id' });
                
                if (upsertError) {
                    console.warn('[iCal Sync] Automatic Upsert failed, falling back to manual update:', upsertError.message);
                    for (const block of blocksToUpsert) {
                        try {
                            const existing = existingMap.get(block.external_id);
                            if (existing) {
                                await supabase.from('blocked_dates').update(block).eq('id', existing.id);
                            } else {
                                await supabase.from('blocked_dates').insert(block);
                            }
                        } catch (err) {
                            console.error(`[iCal Sync] Error in manual sync:`, err);
                        }
                    }
                }
            }

            // 4. Cleanup: Delete defunct FUTURE or ONGOING records
            // We delete any record that is no longer in the feed and ends in the future
            // This catches cancelled bookings and shifting UIDs (since we already have the new UID inserted)
            const currentUids = new Set(uniqueEvents.map(e => e.uid));
            const uidsToDelete = existingBlocks?.filter(b => {
                const isStillInFeed = currentUids.has(b.external_id);
                const endsInFuture = new Date(b.end_date) >= now;
                
                // If it's an Airbnb/Booking block, it's not in the current feed, and it's not a historical past block
                return !isStillInFeed && endsInFuture;
            }).map(b => b.id) || [];

            if (uidsToDelete.length > 0) {
                console.log(`[iCal Sync] Deleting ${uidsToDelete.length} defunct/overlapping blocks`);
                await supabase
                    .from('blocked_dates')
                    .delete()
                    .in('id', uidsToDelete);
            }

            newEventsCount = uniqueEvents.length;
        } else if (urls.length > 0) {
            console.warn(`[iCal Sync] Sync skipped for ${propertyTitle} as no URLs could be fetched.`);
            return { success: false, error: 'Could not fetch any iCal URLs', propertyId };
        }

        // 5. Update Property Sync Status (Success)
        await supabase
            .from('properties')
            .update({
                last_sync_at: new Date().toISOString(),
                sync_status: 'success',
                last_sync_error: null
            })
            .eq('id', propertyId);

        revalidatePath('/', 'layout');
        
        return { 
            success: true, 
            newEvents: newEventsCount, 
            totalFound: totalEventsFound,
            propertyTitle 
        };
    } catch (e: any) {
        console.error('Global error in syncPropertyICal:', e.message);
        
        // Update Property Sync Status (Failure)
        try {
            const supabase = await getSupabaseAdmin();
            await supabase
                .from('properties')
                .update({
                    last_sync_at: new Date().toISOString(),
                    sync_status: 'failed',
                    last_sync_error: e.message
                })
                .eq('id', propertyId);
        } catch (updateError) {
            console.error('Failed to update sync status on error:', updateError);
        }

        return { success: false, error: e.message, propertyId };
    }
}

/**
 * Force sync for ALL properties.
 * Used by the "Robot" or manual global sync.
 */
export async function syncAllPropertiesICal() {
    try {
        const supabase = await getSupabaseAdmin();
        const { data: properties, error } = await supabase
            .from('properties')
            .select('id, title')
            .is('is_active', true);

        if (error || !properties) {
            return { success: false, error: error?.message || 'No active properties found' };
        }

        let totalNewEvents = 0;
        let results: any[] = [];
        let failures: any[] = [];
        const BATCH_SIZE = 10;

        // Process properties in batches to balance speed and resource usage
        for (let i = 0; i < properties.length; i += BATCH_SIZE) {
            const batch = properties.slice(i, i + BATCH_SIZE);
            const batchPromises = batch.map(prop => syncPropertyICal(prop.id));
            const batchResults = await Promise.all(batchPromises);

            batchResults.forEach((res, index) => {
                const prop = batch[index];
                if (res.success) {
                    totalNewEvents += (res.newEvents || 0);
                } else {
                    failures.push({ id: prop.id, title: prop.title, error: (res as any).error });
                }
                results.push({ id: prop.id, title: prop.title, ...res });
            });
        }

        return { 
            success: true, 
            totalNewEvents, 
            propertiesSynced: properties.length - failures.length,
            failures,
            results 
        };
    } catch (e: any) {
        console.error('Global sync error:', e);
        return { success: false, error: e.message };
    }
}

/**
 * Sync properties that haven't been synced in a while.
 * This is the scalable "Robot" sync.
 * @param batchSize Number of properties to sync in one run (default 70 for 200 properties / 3 min cycle)
 * @param intervalInMinutes The sync interval threshold
 */
export async function syncOverduePropertiesICal(batchSize: number = 70, intervalInMinutes: number = 3) {
    try {
        const supabase = await getSupabaseAdmin();
        const now = new Date();
        const cutoff = new Date(now.getTime() - (intervalInMinutes * 60 * 1000));

        // Find properties that:
        // 1. Are active
        // 2. Have ical urls
        // 3. Haven't been synced since the cutoff OR have never been synced (null)
        // Order by last_sync_at ASC to get the ones that have been waiting the longest
        const { data: properties, error } = await supabase
            .from('properties')
            .select('id, title, last_sync_at')
            .eq('is_active', true)
            .not('ical_import_urls', 'eq', '[]')
            .or(`last_sync_at.is.null,last_sync_at.lte.${cutoff.toISOString()}`)
            .order('last_sync_at', { ascending: true, nullsFirst: true })
            .limit(batchSize);

        if (error) {
            console.error('[iCal Robot] Query error:', error);
            return { success: false, error: error.message };
        }

        if (!properties || properties.length === 0) {
            return { success: true, message: 'All properties are up to date', count: 0 };
        }

        console.log(`[iCal Robot] Syncing ${properties.length} overdue properties... (Cutoff: ${cutoff.toISOString()})`);

        let totalNewEvents = 0;
        let results: any[] = [];
        let failures: any[] = [];

        // We can process these in smaller sub-batches of 5 for safety within the serverless function
        const SUB_BATCH_SIZE = 5;
        for (let i = 0; i < properties.length; i += SUB_BATCH_SIZE) {
            const batch = properties.slice(i, i + SUB_BATCH_SIZE);
            const batchPromises = batch.map(prop => syncPropertyICal(prop.id));
            const batchResults = await Promise.all(batchPromises);

            batchResults.forEach((res, index) => {
                const prop = batch[index];
                if (res.success) {
                    totalNewEvents += (res.newEvents || 0);
                } else {
                    failures.push({ id: prop.id, title: prop.title, error: (res as any).error });
                }
                results.push({ id: prop.id, title: prop.title, ...res });
            });
        }

        return {
            success: true,
            totalNewEvents,
            propertiesSynced: properties.length - failures.length,
            failures,
            results,
            batchSizeUsed: properties.length
        };
    } catch (e: any) {
        console.error('Robot sync error:', e);
        return { success: false, error: e.message };
    }
}
