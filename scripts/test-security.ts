import { processReservation } from "../app/actions/reservation";

async function runTests() {
    console.log("=== STARTING SECURITY VERIFICATION ===\n");

    const commonData = {
        fullName: "Security Tester",
        email: "test@example.com",
        phone: "912345678",
        propertySlug: "rdm-ii-premium-apartments",
        checkIn: "2026-06-10",
        checkOut: "2026-06-15",
        adults: 2,
        infants: 0,
        website: "", // Empty honeypot
    };

    // Test 1: Valid Reservation
    console.log("Test 1: Valid Reservation");
    const result1 = await processReservation(commonData);
    console.log("Result:", result1.success ? "✅ SUCCESS" : "❌ FAILED", result1.error || "", result1.ref || "");
    console.log("-".repeat(30));

    // Test 2: Honeypot Protection
    console.log("Test 2: Honeypot Protection (filling hidden field)");
    const result2 = await processReservation({ ...commonData, website: "bot" });
    console.log("Result:", !result2.success && result2.error === "Bot activity detected." ? "✅ BLOCKED CORRECTLY" : "❌ FAILED TO BLOCK");
    console.log("-".repeat(30));

    // Test 3: Property Capacity Protection
    console.log("Test 3: Property Capacity Protection (10 guests for a 4-guest house)");
    const result3 = await processReservation({ ...commonData, adults: 10 });
    console.log("Result:", !result3.success && result3.error?.includes("accommodates up to") ? "✅ BLOCKED CORRECTLY" : "❌ FAILED TO BLOCK");
    console.log("-".repeat(30));

    // Test 4: Property Existence
    console.log("Test 4: Fake Property Slug");
    const result4 = await processReservation({ ...commonData, propertySlug: "hacker-palace" });
    console.log("Result:", !result4.success && result4.error === "Invalid property selected." ? "✅ BLOCKED CORRECTLY" : "❌ FAILED TO BLOCK");
    console.log("-".repeat(30));

    // Test 5: Date Logic (Reverse dates)
    console.log("Test 5: Check-out before Check-in");
    const result5 = await processReservation({ ...commonData, checkIn: "2026-06-15", checkOut: "2026-06-10" });
    console.log("Result:", !result5.success && result5.error === "Check-out date must be after check-in date." ? "✅ BLOCKED CORRECTLY" : "❌ FAILED TO BLOCK");
    console.log("-".repeat(30));

    // Test 6: Past Date
    console.log("Test 6: Past Date check-in");
    const result6 = await processReservation({ ...commonData, checkIn: "2020-01-01" });
    console.log("Result:", !result6.success && result6.error === "Check-in date cannot be in the past." ? "✅ BLOCKED CORRECTLY" : "❌ FAILED TO BLOCK");
    console.log("-".repeat(30));

    // Test 7: Zod - Invalid Email
    console.log("Test 7: Zod - Invalid Email Format");
    const result7 = await processReservation({ ...commonData, email: "not-an-email" });
    console.log("Result:", !result7.success && result7.error === "Invalid data submitted." ? "✅ BLOCKED CORRECTLY (Zod)" : "❌ FAILED TO BLOCK");
    console.log("-".repeat(30));

    // Test 8: Zod - Name too short
    console.log("Test 8: Zod - Name too short");
    const result8 = await processReservation({ ...commonData, fullName: "Ab" });
    console.log("Result:", !result8.success && result8.error === "Invalid data submitted." ? "✅ BLOCKED CORRECTLY (Zod)" : "❌ FAILED TO BLOCK");
    console.log("-".repeat(30));

    // Test 9: Zod - Phone too short
    console.log("Test 9: Zod - Phone too short");
    const result9 = await processReservation({ ...commonData, phone: "123" });
    console.log("Result:", !result9.success && result9.error === "Invalid data submitted." ? "✅ BLOCKED CORRECTLY (Zod)" : "❌ FAILED TO BLOCK");
    console.log("-".repeat(30));

    console.log("\n=== SECURITY VERIFICATION COMPLETE ===");
}

runTests().catch(console.error);
