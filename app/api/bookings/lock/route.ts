import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAvailability } from '@/lib/pricing';
import { addMinutes } from 'date-fns';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// --- Abuse guards for this PUBLIC, unauthenticated endpoint -------------------------
// This endpoint creates 15-min availability locks. Without guards an attacker could
// flood it (a fresh sessionId per call) to lock every available date and make the site
// unbookable (a booking-DoS). These are lightweight, infra-free mitigations with
// deliberately generous thresholds so a real guest is never blocked:
//   1) best-effort in-memory per-IP throttle (no shared store on serverless, but it
//      meaningfully raises the cost of a scripted flood);
//   2) a sane max lock date-range (kills the "one giant lock blocks everything" trick);
//   3) a generous cap on simultaneous active locks per property.
const LOCK_WINDOW_MS = 60_000;
const LOCK_MAX_PER_IP_WINDOW = 30;
const MAX_LOCK_NIGHTS = 180;
const MAX_ACTIVE_LOCKS_PER_PROPERTY = 50;

const ipHits = new Map<string, { count: number; resetAt: number }>();
function tooManyRequests(ip: string): boolean {
  const now = Date.now();
  // Opportunistic cleanup so the map can't grow unbounded on a long-lived instance.
  if (ipHits.size > 5000) {
    for (const [k, v] of ipHits) if (now > v.resetAt) ipHits.delete(k);
  }
  const entry = ipHits.get(ip);
  if (!entry || now > entry.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + LOCK_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > LOCK_MAX_PER_IP_WINDOW;
}

async function atPropertyLockCap(supabase: any, propertyId: string): Promise<boolean> {
  const { count } = await supabase
    .from('locked_dates')
    .select('id', { count: 'exact', head: true })
    .eq('property_id', propertyId)
    .gt('expires_at', new Date().toISOString());
  return (count || 0) >= MAX_ACTIVE_LOCKS_PER_PROPERTY;
}

/**
 * API to handle 15-minute temporary reservation locks.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { propertyId, checkIn, checkOut, sessionId, extend } = body;

    if (!propertyId || !checkIn || !checkOut || !sessionId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Abuse guards (public endpoint): throttle per IP and validate the requested range.
    const ip =
      req.headers.get('x-real-ip') ||
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      'unknown';
    if (tooManyRequests(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const ci = new Date(checkIn);
    const co = new Date(checkOut);
    const nights = Math.round((co.getTime() - ci.getTime()) / 86_400_000);
    if (isNaN(ci.getTime()) || isNaN(co.getTime()) || nights <= 0 || nights > MAX_LOCK_NIGHTS) {
      return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
    }

    const supabase = supabaseAdmin;

    if (extend) {
      // HANDLE EXTENSION (15 more minutes, only once)
      // Use maybeSingle() to handle missing or duplicate locks gracefully
      const { data: existing, error: findError } = await supabase
        .from('locked_dates')
        .select('*')
        .eq('session_id', sessionId)
        .maybeSingle();

      if (findError) throw findError;

      // Case 1: Lock exists
      if (existing) {
        if (existing.is_extended) {
          return NextResponse.json({ error: 'Session already extended once' }, { status: 403 });
        }

        const newExpiry = addMinutes(new Date(), 15);
        const { error: updateError } = await supabase
          .from('locked_dates')
          .update({ 
            expires_at: newExpiry.toISOString(),
            is_extended: true 
          })
          .eq('session_id', sessionId);

        if (updateError) throw updateError;
        return NextResponse.json({ success: true, expiresAt: newExpiry });
      } 
      
      // Case 2: Lock not found (Resilient recovery)
      // Instead of 404, we try to create a NEW lock but mark it as already extended
      const availability = await verifyAvailability(
        propertyId, 
        new Date(checkIn), 
        new Date(checkOut), 
        sessionId,
        supabase
      );

      if (!availability.available) {
        return NextResponse.json({ error: 'errorTemporarilyLocked' }, { status: 409 });
      }

      if (await atPropertyLockCap(supabase, propertyId)) {
        return NextResponse.json({ error: 'errorTemporarilyLocked' }, { status: 429 });
      }

      const expiresAt = addMinutes(new Date(), 15);
      const { error: insertError } = await supabase
        .from('locked_dates')
        .insert({
          property_id: propertyId,
          check_in: checkIn,
          check_out: checkOut,
          session_id: sessionId,
          expires_at: expiresAt.toISOString(),
          is_extended: true // Mark as extended because this is a recovery extension
        });

      if (insertError) throw insertError;
      return NextResponse.json({ success: true, expiresAt });
    } else {
      // HANDLE INITIAL LOCK
      // 1. Verify availability (ignoring current session if it somehow existed)
      const availability = await verifyAvailability(
        propertyId, 
        new Date(checkIn), 
        new Date(checkOut), 
        sessionId,
        supabase
      );

      if (!availability.available) {
        // Se o bloqueio for de outra pessoa, dá erro 409. 
        // Nota: o verifyAvailability já exclui o sessionId atual, por isso se vier 
        // indisponível é porque pertence REALMENTE a outra pessoa.
        return NextResponse.json({ error: 'errorTemporarilyLocked' }, { status: 409 });
      }

      // 2. Clear any old locks for this session (cleanup)
      await supabase.from('locked_dates').delete().eq('session_id', sessionId);

      // 3. Cap simultaneous active locks per property (abuse guard), then create the lock
      if (await atPropertyLockCap(supabase, propertyId)) {
        return NextResponse.json({ error: 'errorTemporarilyLocked' }, { status: 429 });
      }

      const expiresAt = addMinutes(new Date(), 15);
      const { error: insertError } = await supabase
        .from('locked_dates')
        .insert({
          property_id: propertyId,
          check_in: checkIn,
          check_out: checkOut,
          session_id: sessionId,
          expires_at: expiresAt.toISOString(),
          is_extended: false
        });

      if (insertError) throw insertError;

      return NextResponse.json({ success: true, expiresAt });
    }
  } catch (error: any) {
    console.error('Lock API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * Cleanup lock manually (e.g. user cancels or navigates away)
 */
export async function DELETE(req: Request) {
  try {
    const { sessionId } = await req.json();
    if (!sessionId) return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });

    await supabaseAdmin.from('locked_dates').delete().eq('session_id', sessionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
