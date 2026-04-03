import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { syncAllPropertiesICal } from '@/app/actions/ical';

// Vercel Cron will hit this endpoint automatically.
// We implement a "Lazy Cron" logic: hits every 1 min but only syncs if enough time has passed.
export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('authorization');
        if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const supabase = await getSupabaseAdmin();

        // 1. Check if enough time has passed since last sync
        const { data: settings, error: settingsError } = await supabase
            .from('system_settings')
            .select('*')
            .in('key', ['ical_sync_interval', 'ical_last_sync_at']);

        const intervalSetting = settings?.find(s => s.key === 'ical_sync_interval')?.value || 5;
        const lastSyncAt = settings?.find(s => s.key === 'ical_last_sync_at')?.value;
        
        const intervalInMinutes = Number(intervalSetting);
        const lastSyncDate = lastSyncAt ? new Date(lastSyncAt) : new Date(0);
        const now = new Date();
        const diffInMinutes = (now.getTime() - lastSyncDate.getTime()) / (1000 * 60);

        if (diffInMinutes < intervalInMinutes) {
            return NextResponse.json({ 
                success: true, 
                skipped: true, 
                message: `Too early. Last sync was ${Math.round(diffInMinutes)} min ago. Interval is ${intervalInMinutes} min.`,
            });
        }

        // 2. Perform Global Sync
        const result = await syncAllPropertiesICal();

        // 3. Update last sync timestamp in settings
        if (result.success) {
            await supabase
                .from('system_settings')
                .upsert({
                    key: 'ical_last_sync_at',
                    value: now.toISOString(),
                    updated_at: new Date().toISOString()
                });
        }

        return NextResponse.json({ 
            success: result.success, 
            newEventsImported: result.success ? (result as any).totalNew : 0,
            propertiesSynced: result.success ? (result as any).results?.length : 0,
            syncStartedAt: now.toISOString(),
            syncFinishedAt: new Date().toISOString()
        });
    } catch (e: any) {
        console.error('CRON ERROR:', e);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
