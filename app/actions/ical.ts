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
    let currentEvent: any = null;

    for (const line of lines) {
        if (line.startsWith('BEGIN:VEVENT')) {
            currentEvent = {};
        } else if (line.startsWith('END:VEVENT')) {
            if (currentEvent && currentEvent.dtstart && currentEvent.dtend) {
                events.push(currentEvent);
            }
            currentEvent = null;
        } else if (currentEvent) {
            if (line.startsWith('DTSTART')) {
                const val = line.split(':')[1] || line.split(';')[1]?.split(':')[1];
                currentEvent.dtstart = parseIcalDate(val);
            } else if (line.startsWith('DTEND')) {
                const val = line.split(':')[1] || line.split(';')[1]?.split(':')[1];
                currentEvent.dtend = parseIcalDate(val);
            } else if (line.startsWith('SUMMARY')) {
                currentEvent.summary = line.split(':')[1];
            } else if (line.startsWith('UID')) {
                currentEvent.uid = line.split(':')[1];
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
        
        if (urls.length === 0) {
            return { success: true, message: 'No iCal URLs to sync', propertyTitle };
        }

        let newEventsCount = 0;
        let totalEventsFound = 0;

        // Process each URL
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
                    console.error(`[iCal Sync] Fetch failed: ${response.status}`);
                    continue;
                }
                
                const icsContent = await response.text();
                // console.log(`[iCal Sync DEBUG] Body length: ${icsContent.length}`);
                
                const vevents = parseIcalManual(icsContent);
                totalEventsFound += vevents.length;
                
                console.log(`[iCal Sync] Found ${vevents.length} total events in ICS`);

                // Fetch existing external blocked dates to avoid duplicates
                const { data: existingBlocks } = await supabase
                    .from('blocked_dates')
                    .select('external_id')
                    .eq('property_id', propertyId)
                    .not('external_id', 'is', null);

                const existingExternalIds = new Set(existingBlocks?.map(b => b.external_id));
                const blocksToInsert: any[] = [];

                for (const event of vevents) {
                    const uid = event.uid;
                    if (!uid || existingExternalIds.has(uid)) continue;

                    blocksToInsert.push({
                        property_id: propertyId,
                        start_date: event.dtstart.toISOString(),
                        end_date: event.dtend.toISOString(),
                        reason: event.summary || 'Airbnb Booking',
                        source: 'airbnb_booking',
                        external_id: uid
                    });
                    
                    newEventsCount++;
                }

                if (blocksToInsert.length > 0) {
                    const { error: insertError } = await supabase
                        .from('blocked_dates')
                        .insert(blocksToInsert);
                    if (insertError) console.error('[iCal Sync] Insert error:', insertError);
                }
            } catch (urlError) {
                console.error(`[iCal Sync] Error processing URL:`, urlError);
            }
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
        let results = [];
        let failures = [];

        for (const prop of properties) {
            const res = await syncPropertyICal(prop.id);
            if (res.success) {
                totalNewEvents += (res.newEvents || 0);
            } else {
                failures.push({ id: prop.id, title: prop.title, error: (res as any).error });
            }
            results.push({ id: prop.id, title: prop.title, ...res });
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
