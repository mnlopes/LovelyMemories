
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function seedTestData() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const ownerId = "295d6140-4917-4d7b-8e58-b9e1ff958a51"; // Carolina
    const propertyIds = [
        "da357bc5-04c5-4bad-9d66-bf7f9471992f", // The Terraced Loft
        "c84aeb91-612d-4315-88b8-7e93139b602e"  // Virtudes 1
    ];

    console.log('Assigning properties to Carolina...');
    for (const pid of propertyIds) {
        const { error: propError } = await supabase
            .from('properties')
            .update({ owner_id: ownerId, is_active: true })
            .eq('id', pid);
        if (propError) console.error(`Error updating property ${pid}:`, propError);
    }

    const testReservations = [
        {
            property_id: propertyIds[0],
            reference_id: "LM-TEST-001",
            guest_name: "Marcelo Lopes",
            customer_name: "Marcelo Lopes",
            check_in: "2026-04-01",
            check_out: "2026-04-05",
            status: "checked-in",
            total_price: 650,
            adults: 2,
            children: 1,
            infants: 0,
            payment_method: "cash",
            created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
        },
        {
            property_id: propertyIds[1],
            reference_id: "LM-TEST-002",
            guest_name: "John Smith",
            customer_name: "John Smith",
            check_in: "2026-03-25",
            check_out: "2026-03-30",
            status: "completed",
            total_price: 1250,
            adults: 4,
            children: 0,
            infants: 0,
            payment_method: "stripe",
            created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() // 10 days ago
        },
        {
            property_id: propertyIds[0],
            reference_id: "LM-TEST-003",
            guest_name: "Alica Keys",
            customer_name: "Alica Keys",
            check_in: "2026-04-10",
            check_out: "2026-04-15",
            status: "confirmed",
            total_price: 850,
            adults: 2,
            children: 0,
            infants: 0,
            payment_method: "bank_transfer",
            created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // Yesterday
        },
        {
            property_id: propertyIds[1],
            reference_id: "LM-TEST-004",
            guest_name: "Maria Silva",
            customer_name: "Maria Silva",
            check_in: "2026-03-10",
            check_out: "2026-03-15",
            status: "completed",
            total_price: 950,
            adults: 3,
            children: 1,
            infants: 1,
            payment_method: "cash",
            created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days ago
        },
        {
            property_id: propertyIds[0],
            reference_id: "LM-TEST-005",
            guest_name: "Bob Dylan",
            customer_name: "Bob Dylan",
            check_in: "2026-04-02",
            check_out: "2026-04-04",
            status: "confirmed",
            total_price: 450,
            adults: 1,
            children: 0,
            infants: 0,
            payment_method: "stripe",
            created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() // 12 hours ago
        }
    ];

    console.log('Inserting test reservations...');
    const { error: resError } = await supabase
        .from('reservations')
        .insert(testReservations);

    if (resError) {
        console.error('Error inserting reservations:', resError);
    } else {
        console.log('Successfully inserted test data for Carolina!');
    }
}

seedTestData();
