"use server";

import Papa from "papaparse";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseAirbnbRows, findOverlaps, type ExistingStay } from "@/lib/airbnb-import/parse";

// Input Validation Schema
const importSchema = z.object({
    propertyId: z.string().uuid("Invalid property ID"),
    filename: z.string().min(1, "Filename is required"),
});

export type AirbnbImportResult = {
    success: boolean;
    imported?: number;
    error?: string;
    details?: string[];
    warnings?: string[];
};

export async function submitAirbnbCSV(formData: FormData): Promise<AirbnbImportResult> {
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

        // 5. Parse & validate the whole file BEFORE writing anything
        const { stays, errors: rowErrors, warnings } = parseAirbnbRows(rawRows as Record<string, string>[]);
        if (rowErrors.length > 0) {
            return { success: false, error: `O ficheiro tem ${rowErrors.length} linha(s) inválida(s). Nada foi importado.`, details: rowErrors };
        }
        if (stays.length === 0) {
            return { success: false, error: "No valid reservation rows detected in CSV." };
        }
        const codes = stays.map(s => s.code);

        // 6. Wrong-file guards: codes already stored under another property…
        const { data: elsewhere, error: elsewhereError } = await supabase
            .from("reservations")
            .select("property_id, external_confirmation_code, reference_id, properties(title)")
            .neq("property_id", propertyId)
            .or(`external_confirmation_code.in.(${codes.join(',')}),reference_id.in.(${codes.join(',')})`);
        if (elsewhereError) throw elsewhereError;

        type ElsewhereRow = { property_id: string; external_confirmation_code: string | null; reference_id: string | null; properties: { title?: { pt?: string; en?: string } } | null };
        const conflicts: string[] = ((elsewhere || []) as unknown as ElsewhereRow[]).map(r => {
            const title = r.properties?.title?.pt || r.properties?.title?.en || r.property_id;
            return `${r.external_confirmation_code || r.reference_id} já está registada noutra casa: ${title}.`;
        });

        // …and stays that overlap other reservations of this property.
        const minIn = stays.reduce((m, s) => s.checkIn < m ? s.checkIn : m, stays[0].checkIn);
        const maxOut = stays.reduce((m, s) => s.checkOut > m ? s.checkOut : m, stays[0].checkOut);
        const { data: existingRows, error: existingError } = await supabase
            .from("reservations")
            .select("external_confirmation_code, reference_id, check_in, check_out, platform, guest_name, import_history(filename)")
            .eq("property_id", propertyId)
            .neq("status", "cancelled")
            .lt("check_in", maxOut)
            .gt("check_out", minIn);
        if (existingError) throw existingError;

        type ExistingRow = { external_confirmation_code: string | null; reference_id: string | null; check_in: string; check_out: string; platform: string | null; guest_name: string | null; import_history: { filename: string } | null };
        const existing: ExistingStay[] = ((existingRows || []) as unknown as ExistingRow[]).map(r => ({
            code: r.external_confirmation_code || r.reference_id,
            checkIn: r.check_in,
            checkOut: r.check_out,
            label: r.import_history?.filename
                ? `${r.external_confirmation_code} (import "${r.import_history.filename}")`
                : `${r.reference_id || 'reserva'} de ${r.guest_name || 'hóspede'} (${r.platform || 'direta'})`,
        }));
        conflicts.push(...findOverlaps(stays, existing));

        if (conflicts.length > 0) {
            return {
                success: false,
                error: "Este ficheiro choca com reservas que já existem. Confirma que escolheste a casa certa (se um import anterior estava errado, desfá-lo primeiro). Nada foi importado.",
                details: conflicts,
            };
        }

        // 7. Create Batch Entry (Audit Trail)
        const { data: batch, error: batchError } = await supabase
            .from("import_history")
            .insert({
                filename: file.name,
                imported_by: user.id,
                total_records: stays.length,
                status: 'processing',
                property_id: propertyId,
                target_month: targetMonth,
                target_year: targetYear
            })
            .select()
            .single();

        if (batchError) throw new Error(`Batch creation failed: ${batchError.message}`);

        // 8. Bulk Data Mapping
        const reservationPayloads = stays.map(s => ({
            property_id: propertyId,
            status: "completed",
            check_in: s.checkIn,
            check_out: s.checkOut,
            guest_name: s.guest,
            platform: 'airbnb',
            reference_id: s.code,
            external_confirmation_code: s.code,
            total_price: s.amount + s.serviceFee,
            base_price: s.amount - s.cleaningFee,
            cleaning_fee: s.cleaningFee,
            net_amount: s.amount,
            service_fee: s.serviceFee,
            payout_date: s.payoutDate,
            import_batch_id: batch.id,
            currency: s.currency
        }));

        // 9. Bulk Upsert — on failure mark the batch "failed" so the history tells the team to re-import
        const { error: upsertError } = await supabase
            .from("reservations")
            .upsert(reservationPayloads, {
                onConflict: 'property_id, external_confirmation_code',
                ignoreDuplicates: false
            });

        if (upsertError) {
            await supabase.from("import_history").update({ status: 'failed' }).eq("id", batch.id);
            revalidatePath("/[locale]/admin/imports", "page");
            throw new Error(`Falha ao gravar as reservas: ${upsertError.message}`);
        }

        // 10. Finalize Batch
        await supabase
            .from("import_history")
            .update({ status: 'completed' })
            .eq('id', batch.id);

        revalidatePath("/admin/imports");
        revalidatePath("/[locale]/admin/imports", "page");

        return {
            success: true,
            imported: reservationPayloads.length,
            warnings
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

        const { data: batch, error: batchError } = await supabase
            .from("import_history")
            .select("imported_at")
            .eq("id", batchId)
            .single();
        if (batchError) throw batchError;

        const { data: rows, error: rowsError } = await supabase
            .from("reservations")
            .select("id, created_at")
            .eq("import_batch_id", batchId);
        if (rowsError) throw rowsError;

        // Rows this batch created are removed; rows that existed before it (re-imports
        // of an older reservation) only lose the financial data, as before.
        const importedAt = new Date(batch.imported_at).getTime();
        const createdIds = (rows || []).filter(r => new Date(r.created_at).getTime() >= importedAt).map(r => r.id);
        const preexistingIds = (rows || []).filter(r => !createdIds.includes(r.id)).map(r => r.id);

        if (createdIds.length > 0) {
            const { error: deleteRowsError } = await supabase
                .from("reservations")
                .delete()
                .in("id", createdIds);
            if (deleteRowsError) throw deleteRowsError;
        }

        // 1. Reset financial fields in pre-existing reservations linked to this batch
        if (preexistingIds.length > 0) {
            const { error: resetError } = await supabase
                .from("reservations")
                .update({
                    net_amount: null,
                    service_fee: null,
                    cleaning_fee: null,
                    payout_date: null,
                    import_batch_id: null
                })
                .in("id", preexistingIds);

            if (resetError) throw resetError;
        }

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
