import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAvailability } from '@/lib/pricing';
import { addMinutes } from 'date-fns';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

      // 3. Create new lock
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
