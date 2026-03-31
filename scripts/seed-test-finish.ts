
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getSupabaseAdmin } from '../lib/supabase';

async function seed() {
    console.log("🚀 Starting seed for test reservations...");
    const adminSupabase = await getSupabaseAdmin();

    // 1. Get a property ID
    const { data: property, error: propError } = await adminSupabase
        .from('properties')
        .select('id, slug')
        .limit(1)
        .single();

    if (propError || !property) {
        console.error("❌ Error fetching property:", propError);
        return;
    }

    console.log(`🏠 Using property: ${property.slug} (${property.id})`);

    const today = new Date().toISOString().split('T')[0];
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 3);
    const pastStr = pastDate.toISOString().split('T')[0];

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const futureStr = futureDate.toISOString().split('T')[0];

    const testReservations = [
        {
            property_id: property.id,
            check_in: pastStr,
            check_out: futureStr,
            guest_name: "TESTE FINISH 1 (Carol)",
            guest_email: "carol.test@example.com",
            guest_phone: "+351912345678",
            status: 'confirmed',
            total_price: 1500,
            adults: 2,
            children: 0,
            infants: 0,
            reference_id: "TEST-FIN-001",
            payment_method: 'credit_card'
        },
        {
            property_id: property.id,
            check_in: pastStr,
            check_out: futureStr,
            guest_name: "TESTE FINISH 2 (Marcelo)",
            guest_email: "marcelo.test@example.com",
            guest_phone: "+351912345679",
            status: 'confirmed',
            total_price: 850,
            adults: 1,
            children: 0,
            infants: 0,
            reference_id: "TEST-FIN-002",
            payment_method: 'wire'
        },
        {
            property_id: property.id,
            check_in: today,
            check_out: futureStr,
            guest_name: "TESTE FINISH 3 (Joao)",
            guest_email: "joao.test@example.com",
            guest_phone: "+351912345680",
            status: 'confirmed',
            total_price: 2100,
            adults: 2,
            children: 1,
            infants: 0,
            reference_id: "TEST-FIN-003",
            payment_method: 'credit_card'
        }
    ];

    console.log("📝 Inserting 3 test reservations...");
    const { data, error: insertError } = await adminSupabase
        .from('reservations')
        .insert(testReservations)
        .select();

    if (insertError) {
        console.error("❌ Error inserting reservations:", insertError);
    } else {
        console.log("✅ Successfully inserted test reservations!");
        console.log(data.map(r => ` - ${r.guest_name} (ID: ${r.id})`).join('\n'));
    }
}

seed().catch(err => {
    console.error("💥 Fatal error:", err);
});
