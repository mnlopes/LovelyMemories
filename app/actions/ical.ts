"use server";

import { getSupabaseAdmin } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { feedsForSync, propertyIdsWithFeeds, recordFeedRead, type SyncFeed } from '@/lib/ical-feeds';
import { messageForOutcome, outcomeForStatus, type FeedOutcome } from '@/lib/ical-feed-url';
import { PROPERTY_EDITORS, requireRole } from '@/lib/auth/require-role';

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

// The iCal links live in public.property_ical_feeds (service role only — they are secrets).
// `feeds` is loaded server-side by the batch callers; never accept it from the browser.
type SyncProperty = { id: string; title: string | { en?: string }; feeds?: SyncFeed[] };
type SyncOptions = {
    /** Row (and feeds) already loaded by the batch query — skips re-reading them. */
    property?: SyncProperty;
    /** The batch robot revalidates once per run instead of once per property. */
    revalidate?: boolean;
};

/** Date-only (YYYY-MM-DD): blocked_dates.start_date/end_date are DATE columns. */
const dateOnly = (v: string | null | undefined) => (v || '').slice(0, 10);

/**
 * Synchronizes property blocked dates from an iCal URL.
 * Server action (manual sync from the backoffice) — always re-reads the property itself.
 */
export async function syncPropertyICal(propertyId: string) {
    // A "use server" export is a public POST endpoint: check the caller first.
    try {
        await requireRole(PROPERTY_EDITORS);
    } catch {
        // Same shape as the internal failure results, so callers keep their narrowing.
        return { success: false, error: 'Not authorized', propertyId } as Awaited<ReturnType<typeof syncPropertyICalInternal>>;
    }
    return syncPropertyICalInternal(propertyId);
}

// Not exported: a "use server" export is callable from the browser, and `opts.property`
// must never be client-supplied (it carries the iCal feeds, i.e. the URLs that get fetched).
async function syncPropertyICalInternal(propertyId: string, opts: SyncOptions = {}) {
    const shouldRevalidate = opts.revalidate !== false;
    console.log(`[iCal Sync] Starting sync for property: ${propertyId}`);

    try {
        const supabase = await getSupabaseAdmin();

        // 1. Fetch the property (unless the batch query already loaded it)
        let property: SyncProperty | null = opts.property ?? null;
        if (!property) {
            const { data, error: propertyError } = await supabase
                .from('properties')
                .select('id, title')
                .eq('id', propertyId)
                .single();

            if (propertyError || !data) {
                return { success: false, error: 'Property not found', propertyId };
            }
            property = data as SyncProperty;
        }

        const propertyTitle = typeof property.title === 'object' ? property.title.en : property.title;
        // The feeds (private table). Only labels ("Feed 1 (airbnb.com)") go to logs and to
        // the error message the backoffice shows — never the URL, which is a credential.
        const feeds: SyncFeed[] = property.feeds ?? (await feedsForSync([propertyId])).get(propertyId) ?? [];
        let newEventsCount = 0;
        // True when blocked_dates was actually written (insert/update/delete) — drives
        // revalidation, so an unchanged feed no longer purges the whole site cache.
        let blocksChanged = false;

        if (feeds.length === 0) {
            return { success: true, message: 'No iCal URLs to sync', propertyTitle };
        }

        const uniqueEventsMap = new Map();
        let totalEventsFound = 0;
        let successfulFetches = 0;
        // Per-feed problems surfaced to the backoffice (red sync icon + tooltip in the
        // properties list). Without this, a wrong URL failed silently forever.
        const urlErrors: string[] = [];

        // Process each feed and collect all events
        for (const feed of feeds) {
            const url = feed.url;
            let outcome: FeedOutcome = 'ok';
            let feedError: string | null = null;
            try {
                console.log(`[iCal Sync] Fetching ${feed.label} for ${propertyTitle}`);

                const response = await fetch(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'Accept': 'text/calendar'
                    },
                    cache: 'no-store'
                });

                if (!response.ok) {
                    console.error(`[iCal Sync] ${feed.label} answered HTTP ${response.status}`);
                    outcome = outcomeForStatus(response.status);
                    feedError = messageForOutcome(feed.label, outcome, `HTTP ${response.status}`);
                } else {
                    const icsContent = await response.text();

                    // INTEGRITY: a wrong URL (e.g. the Airbnb LISTING page pasted instead of its
                    // iCal export) returns HTTP 200 with HTML. Parsing HTML yields 0 events, which
                    // used to count as a *successful* sync — the admin saw "success" while nothing
                    // was ever imported (real overbooking risk). Reject non-iCal content loudly.
                    if (!icsContent.toUpperCase().includes('BEGIN:VCALENDAR')) {
                        outcome = 'not_a_calendar';
                        feedError = messageForOutcome(feed.label, outcome);
                    } else {
                        const vevents = parseIcalManual(icsContent);

                        // Determine source for this feed
                        const lowUrl = url.toLowerCase();
                        const source = lowUrl.includes('booking.com') ? 'booking_com' : 'airbnb_booking';

                        // Add to unique map (latest feed wins for same UID if applicable)
                        for (const event of vevents) {
                            if (event.uid) {
                                uniqueEventsMap.set(event.uid, { ...event, source });
                            }
                        }

                        totalEventsFound += vevents.length;
                        successfulFetches++;

                        console.log(`[iCal Sync] Parsed ${vevents.length} events from ${feed.label} (${source})`);
                    }
                }
            } catch (urlError: any) {
                console.error(`[iCal Sync] Error reading ${feed.label}:`, urlError?.message || urlError);
                outcome = 'unreachable';
                // Some fetch errors echo the URL; keep only the error type.
                feedError = messageForOutcome(feed.label, outcome, urlError?.name || 'network error');
            }

            if (feedError) urlErrors.push(feedError);
            await recordFeedRead(feed.id, outcome, feedError);
        }
        const failedFeeds = feeds.length - successfulFetches;
 
        const uniqueEvents = Array.from(uniqueEventsMap.values());
        console.log(`[iCal Sync] Mirroring ${uniqueEvents.length} unique events for ${propertyTitle}`);

        if (successfulFetches > 0) {
            // 1. Fetch existing external blocks to handle Start Date Preservation and Cleanup
            const { data: existingBlocks } = await supabase
                .from('blocked_dates')
                .select('id, external_id, start_date, end_date, property_id, reason, source')
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

            // 3. Perform UPSERT or manual update — only for blocks that are new or changed.
            // Re-writing every block on every run (every few minutes, 24/7) was the bulk of
            // the Supabase API traffic / log ingestion and needless row churn on a Nano DB.
            // Matching is by UID only: a shifted UID is a new row (the old one is removed by
            // the cleanup below), exactly as before.
            const changedBlocks = blocksToUpsert.filter(block => {
                const current = existingMap.get(block.external_id);
                return !current
                    || dateOnly(current.start_date) !== dateOnly(block.start_date)
                    || dateOnly(current.end_date) !== dateOnly(block.end_date)
                    || (current.reason ?? null) !== (block.reason ?? null)
                    || (current.source ?? null) !== (block.source ?? null);
            });

            if (changedBlocks.length > 0) {
                blocksChanged = true;
                const { error: upsertError } = await supabase
                    .from('blocked_dates')
                    .upsert(changedBlocks, { onConflict: 'property_id,external_id' });

                if (upsertError) {
                    console.warn('[iCal Sync] Automatic Upsert failed, falling back to manual update:', upsertError.message);
                    for (const block of changedBlocks) {
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
            //
            // SAFETY: only run the destructive cleanup when the feed actually returned events.
            // A transient empty/garbled-but-HTTP-200 response from Airbnb/Booking would otherwise
            // wipe ALL future external blocks for this property, opening an overbooking window
            // until the next successful sync re-adds them. We err on the side of keeping blocks:
            // worst case a genuinely-cleared calendar leaves stale blocks (a lost booking, removable
            // in the backoffice) instead of causing a double booking.
            //
            // And only when EVERY feed was read: the events of a feed that failed are missing
            // from `uniqueEvents`, so its blocks would look "cancelled" and be deleted, opening
            // those dates on the site (audit 2026-11-13, L-5). If one feed fails we keep all
            // blocks until a run where every feed reads cleanly.
            if (uniqueEvents.length > 0 && failedFeeds === 0) {
                const currentUids = new Set(uniqueEvents.map(e => e.uid));
                const uidsToDelete = existingBlocks?.filter(b => {
                    const isStillInFeed = currentUids.has(b.external_id);
                    const endsInFuture = new Date(b.end_date) >= now;

                    // If it's an Airbnb/Booking block, it's not in the current feed, and it's not a historical past block
                    return !isStillInFeed && endsInFuture;
                }).map(b => b.id) || [];

                if (uidsToDelete.length > 0) {
                    console.log(`[iCal Sync] Deleting ${uidsToDelete.length} defunct/overlapping blocks`);
                    blocksChanged = true;
                    await supabase
                        .from('blocked_dates')
                        .delete()
                        .in('id', uidsToDelete);
                }
            } else if (failedFeeds > 0) {
                console.warn(`[iCal Sync] ${failedFeeds} feed(s) failed for ${propertyTitle} — skipping cleanup so the failed feed's blocks are kept.`);
            } else {
                console.warn(`[iCal Sync] Feed returned 0 events for ${propertyTitle} — skipping cleanup to avoid wiping blocks on a transient empty feed.`);
            }

            newEventsCount = uniqueEvents.length;
        } else {
            // No feed produced a usable calendar. Mark the property as failed so the existing
            // backoffice alert (red sync icon + "CRITICAL ERROR" tooltip + failed counter)
            // fires, instead of returning silently and leaving a stale "success".
            console.warn(`[iCal Sync] Sync failed for ${propertyTitle}: no URL returned an iCal feed.`);
            const errorMsg = (urlErrors.join(' | ') || 'Could not fetch any iCal URLs').slice(0, 500);
            await supabase
                .from('properties')
                .update({
                    last_sync_at: new Date().toISOString(),
                    sync_status: 'failed',
                    last_sync_error: errorMsg
                })
                .eq('id', propertyId);
            if (shouldRevalidate) revalidatePath('/', 'layout');
            return { success: false, error: errorMsg, propertyId };
        }

        // 5. Update Property Sync Status. A partial failure (one of several URLs bad) is
        // still reported as 'failed' so the admin alert fires — the good URLs were imported.
        const hasUrlErrors = urlErrors.length > 0;
        await supabase
            .from('properties')
            .update({
                last_sync_at: new Date().toISOString(),
                sync_status: hasUrlErrors ? 'failed' : 'success',
                last_sync_error: hasUrlErrors ? urlErrors.join(' | ').slice(0, 500) : null
            })
            .eq('id', propertyId);

        if (shouldRevalidate) revalidatePath('/', 'layout');

        return {
            success: true,
            newEvents: newEventsCount,
            totalFound: totalEventsFound,
            blocksChanged,
            propertyTitle
        };
    } catch (e: any) {
        // properties.last_sync_error is publicly readable: never let a link into it.
        const safeMessage = String(e?.message || 'Sync failed').replace(/https?:\/\/\S+/gi, '[link]').slice(0, 300);
        console.error('Global error in syncPropertyICal:', safeMessage);

        // Update Property Sync Status (Failure)
        try {
            const supabase = await getSupabaseAdmin();
            await supabase
                .from('properties')
                .update({
                    last_sync_at: new Date().toISOString(),
                    sync_status: 'failed',
                    last_sync_error: safeMessage
                })
                .eq('id', propertyId);
        } catch (updateError) {
            console.error('Failed to update sync status on error:', updateError);
        }

        return { success: false, error: safeMessage, propertyId };
    }
}

/**
 * Force sync for ALL properties.
 * Used by the "Robot" or manual global sync.
 */
export async function syncAllPropertiesICal() {
    // A "use server" export is a public POST endpoint: check the caller first.
    try {
        await requireRole(['super_admin', 'admin']);
    } catch {
        return { success: false, error: 'Not authorized' };
    }
    try {
        const supabase = await getSupabaseAdmin();
        const { data: properties, error } = await supabase
            .from('properties')
            .select('id, title')
            .is('is_active', true);

        if (error || !properties) {
            return { success: false, error: error?.message || 'No active properties found' };
        }

        // Load every property's feeds in one query (private table, service role).
        const feedsByProperty = await feedsForSync(properties.map(p => p.id));

        let totalNewEvents = 0;
        let results: any[] = [];
        let failures: any[] = [];
        const BATCH_SIZE = 10;

        // Process properties in batches to balance speed and resource usage
        for (let i = 0; i < properties.length; i += BATCH_SIZE) {
            const batch = properties.slice(i, i + BATCH_SIZE);
            const batchPromises = batch.map(prop => syncPropertyICalInternal(prop.id, {
                property: { id: prop.id, title: prop.title, feeds: feedsByProperty.get(prop.id) ?? [] },
            }));
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
        // 2. Have at least one iCal feed (private table property_ical_feeds)
        // 3. Haven't been synced since the cutoff OR have never been synced (null)
        // Order by last_sync_at ASC to get the ones that have been waiting the longest
        const idsWithFeeds = await propertyIdsWithFeeds();
        if (idsWithFeeds.length === 0) {
            return { success: true, message: 'No properties with iCal feeds', count: 0 };
        }
        const { data: properties, error } = await supabase
            .from('properties')
            .select('id, title, last_sync_at')
            .eq('is_active', true)
            .in('id', idsWithFeeds)
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

        // The feeds of this batch, in one query.
        const feedsByProperty = await feedsForSync(properties.map(p => p.id));

        let totalNewEvents = 0;
        let anyBlocksChanged = false;
        let results: any[] = [];
        let failures: any[] = [];

        // We can process these in smaller sub-batches of 5 for safety within the serverless function
        const SUB_BATCH_SIZE = 5;
        for (let i = 0; i < properties.length; i += SUB_BATCH_SIZE) {
            const batch = properties.slice(i, i + SUB_BATCH_SIZE);
            // Reuse the rows we just loaded (no per-property re-read) and defer revalidation.
            const batchPromises = batch.map(prop => syncPropertyICalInternal(prop.id, {
                property: { id: prop.id, title: prop.title, feeds: feedsByProperty.get(prop.id) ?? [] },
                revalidate: false,
            }));
            const batchResults = await Promise.all(batchPromises);

            batchResults.forEach((res, index) => {
                const prop = batch[index];
                if (res.success) {
                    totalNewEvents += (res.newEvents || 0);
                    if ('blocksChanged' in res && res.blocksChanged) anyBlocksChanged = true;
                } else {
                    failures.push({ id: prop.id, title: prop.title, error: (res as any).error });
                }
                results.push({ id: prop.id, title: prop.title, ...res });
            });
        }

        // One cache revalidation per run, and only when availability actually changed
        // (previously: one full-site revalidatePath per property, every run).
        if (anyBlocksChanged) revalidatePath('/', 'layout');

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
