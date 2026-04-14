"use server";

import Papa from "papaparse";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Input Validation Schema
const importSchema = z.object({
    propertyId: z.string().uuid("Invalid property ID"),
    filename: z.string().min(1, "Filename is required"),
});

export async function submitAirbnbCSV(formData: FormData) {
    const file = formData.get("file") as File;
    const targetMonth = formData.get("targetMonth") ? parseInt(formData.get("targetMonth") as string, 10) : null;
    const targetYear = formData.get("targetYear") ? parseInt(formData.get("targetYear") as string, 10) : null;
    const propertyId = formData.get("propertyId") as string;

    // 1. Basic validation
    if (!file) return { success: false, error: "No file uploaded" };
    
    const validation = importSchema.safeParse({ propertyId, filename: file.name });
    if (!validation.success) {
        return { success: false, error: validation.error.issues[0].message };
    }

    try {
        const text = await file.text();
        const { data: rawRows, errors: parseErrors } = Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
        });

        if (parseErrors.length > 0) {
            console.warn("CSV Parsing issues:", parseErrors);
        }

        // 2. Initialize Supabase
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!, // Admin context
            {
                cookies: {
                    get(name: string) { return cookieStore.get(name)?.value; },
                },
            }
        );

        // 3. Robust Authentication & Authorization
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return { success: false, error: "Unauthorized" };

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'super_admin' && profile?.role !== 'admin') {
            return { success: false, error: "Insufficient permissions to import data." };
        }

        // 4. Basic Debounce: Check for recent same-filename imports by user
        const { data: recentImport } = await supabase
            .from("import_history")
            .select("id")
            .eq("imported_by", user.id)
            .eq("filename", file.name)
            .gt("imported_at", new Date(Date.now() - 15000).toISOString())
            .maybeSingle();

        if (recentImport) {
            console.warn("Duplicate import detected (debounced):", file.name);
            return { success: false, error: "This file was already sent a few seconds ago. Please wait." };
        }

        // 4. Data Transformation
        const reservations = (rawRows as any[]).filter(row => row.Type === "Reservation" && row["Confirmation code"]);
        if (reservations.length === 0) {
            return { success: false, error: "No valid reservation rows detected in CSV." };
        }

        // 5. Create Batch Entry (Audit Trail)
        const { data: batch, error: batchError } = await supabase
            .from("import_history")
            .insert({
                filename: file.name,
                imported_by: user.id,
                total_records: reservations.length,
                status: 'processing',
                property_id: propertyId,
                target_month: targetMonth,
                target_year: targetYear
            })
            .select()
            .single();

        if (batchError) throw new Error(`Batch creation failed: ${batchError.message}`);

        // 6. Bulk Data Mapping
        const reservationPayloads = reservations.map(row => {
            const confirmationCode = row["Confirmation code"];
            const startDateStr = row["Start date"];
            const nights = parseInt(row["Nights"] || "0", 10);
            
            // Date Parsing Logic
            let startDate = new Date(startDateStr);
            if (isNaN(startDate.getTime())) {
                const parts = startDateStr.split(/[-/]/);
                if (parts.length === 3) {
                    if (parts[2].length === 4) startDate = new Date(`${parts[2]}-${parts[0]}-${parts[1]}`);
                    else if (parts[0].length === 4) startDate = new Date(startDateStr);
                }
            }

            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + nights);

            const amount = parseFloat((row["Amount"] || "0").replace(/[^\d.-]/g, ""));
            const serviceFee = parseFloat((row["Service fee"] || "0").replace(/[^\d.-]/g, ""));
            const cleaningFee = parseFloat((row["Cleaning fee"] || "0").replace(/[^\d.-]/g, ""));
            const payoutDate = new Date(row["Date"]);

            return {
                property_id: propertyId,
                status: "completed",
                check_in: startDate.toISOString().split("T")[0],
                check_out: endDate.toISOString().split("T")[0],
                guest_name: row["Guest"],
                platform: 'airbnb',
                reference_id: confirmationCode, 
                external_confirmation_code: confirmationCode,
                total_price: amount + serviceFee, 
                base_price: amount - cleaningFee,
                cleaning_fee: cleaningFee,
                net_amount: amount,
                service_fee: serviceFee,
                payout_date: isNaN(payoutDate.getTime()) ? null : payoutDate.toISOString().split("T")[0],
                import_batch_id: batch.id,
                currency: row["Currency"] || "EUR"
            };
        });

        // 7. Bulk Upsert (Performance & Atomicity)
        const { error: upsertError } = await supabase
            .from("reservations")
            .upsert(reservationPayloads, {
                onConflict: 'property_id, external_confirmation_code',
                ignoreDuplicates: false
            });

        if (upsertError) throw upsertError;

        // 8. Finalize Batch
        await supabase
            .from("import_history")
            .update({ status: 'completed' })
            .eq('id', batch.id);

        revalidatePath("/admin/imports");
        revalidatePath("/[locale]/admin/imports", "page");

        return { 
            success: true, 
            imported: reservationPayloads.length
        };

    } catch (e: any) {
        console.error("Critical Import Error:", e);
        return { success: false, error: e.message || "An unexpected error occurred during import." };
    }
}

export async function undoAirbnbImport(batchId: string) {
    if (!batchId) return { success: false, error: "Batch ID is required" };

    try {
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!, 
            {
                cookies: {
                    get(name: string) { return cookieStore.get(name)?.value; },
                },
            }
        );

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'super_admin' && profile?.role !== 'admin') {
            return { success: false, error: "Insufficient permissions" };
        }

        // 1. Reset financial fields in reservations linked to this batch
        const { error: resetError } = await supabase
            .from("reservations")
            .update({
                net_amount: null,
                service_fee: null,
                cleaning_fee: null,
                payout_date: null,
                import_batch_id: null
            })
            .eq("import_batch_id", batchId);

        if (resetError) throw resetError;

        // 2. Delete the import batch entry
        const { error: deleteError } = await supabase
            .from("import_history")
            .delete()
            .eq("id", batchId);

        if (deleteError) throw deleteError;

        revalidatePath("/admin/imports");
        revalidatePath("/[locale]/admin/imports", "page");

        return { success: true };
    } catch (e: any) {
        console.error("Undo Error:", e);
        return { success: false, error: e.message };
    }
}

export async function getBatchReservations(batchId: string) {
    if (!batchId) return { success: false, error: "Batch ID is required" };

    try {
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, 
            {
                cookies: {
                    get(name: string) { return cookieStore.get(name)?.value; },
                },
            }
        );

        const { data, error } = await supabase
            .from("reservations")
            .select(`
                id,
                external_confirmation_code,
                guest_name,
                check_in,
                check_out,
                total_price,
                service_fee,
                net_amount,
                currency
            `)
            .eq("import_batch_id", batchId)
            .order('check_in', { ascending: false });

        if (error) throw error;

        return { success: true, data };
    } catch (e: any) {
        console.error("Get Batch Reservations Error:", e);
        return { success: false, error: e.message };
    }
}
