import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { syncOverduePropertiesICal } from '@/app/actions/ical';

// Vercel Cron will hit this endpoint automatically.
// We run every 1 minute to spread the load across 200+ properties.
export async function GET(request: Request) {
    try {
        // SECURITY: fail closed. If CRON_SECRET is not configured, reject all requests
        // instead of leaving the endpoint open to the public.
        const authHeader = request.headers.get('authorization');
        if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const supabase = await getSupabaseAdmin();

        // 1. Fetch current sync settings
        const { data: settings } = await supabase
            .from('system_settings')
            .select('*')
            .eq('key', 'ical_sync_interval')
            .single();

        const intervalInMinutes = Number(settings?.value) || 3;
        const now = new Date();

        // 2. Perform Priority-Based Batch Sync
        // We use a batch size of 70 to handle 200 properties in a 3-minute cycle
        const result = await syncOverduePropertiesICal(70, intervalInMinutes);

        // 3. Update global informational timestamp in settings
        await supabase
            .from('system_settings')
            .upsert({
                key: 'ical_last_sync_at',
                value: now.toISOString(),
                updated_at: now.toISOString(),
                description: `Global robot run (Batch Size: ${result.success ? (result as any).batchSizeUsed : 0})`
            });

        return NextResponse.json({ 
            success: result.success, 
            newEventsImported: result.success ? (result as any).totalNewEvents : 0,
            propertiesSynced: result.success ? (result as any).propertiesSynced : 0,
            batchSizeUsed: result.success ? (result as any).batchSizeUsed : 0,
            syncStartedAt: now.toISOString(),
            syncFinishedAt: new Date().toISOString()
        });
    } catch (e: any) {
        console.error('CRON ERROR:', e);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
