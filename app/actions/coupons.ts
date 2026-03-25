"use server";

import { z } from "zod";
import { supabase, getSupabaseAdmin } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

// Schema for coupon validation
const CouponSchema = z.object({
    code: z.string().min(1, "Código do cupão é obrigatório"),
});

/**
 * Validates a coupon code and returns its details if valid.
 */
export async function validateCoupon(code: string) {
    const result = CouponSchema.safeParse({ code });
    if (!result.success) {
        return { success: false, error: "Código inválido." };
    }

    const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('active', true)
        .single();

    if (error || !data) {
        return { success: false, error: "Cupão não encontrado ou inativo." };
    }

    // Check expiration
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
        return { success: false, error: "Este cupão expirou." };
    }

    // Check usage limit
    if (data.max_uses && data.used_count >= data.max_uses) {
        return { success: false, error: "Limite de utilizações deste cupão atingido." };
    }

    return {
        success: true,
        coupon: {
            code: data.code,
            discount_type: data.discount_type,
            discount_value: data.discount_value,
        }
    };
}

/**
 * Gets all coupons (Admin only)
 */
export async function getCoupons() {
    const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching coupons:", error);
        return { success: false, error: "Erro ao carregar cupões." };
    }

    return { success: true, coupons: data };
}

/**
 * Creates or updates a coupon (Admin only)
 */
export async function saveCoupon(couponData: any) {
    const adminSupabase = await getSupabaseAdmin();
    
    // Ensure code is uppercase
    if (couponData.code) {
        couponData.code = couponData.code.toUpperCase();
    }

    const { data, error } = await adminSupabase
        .from('coupons')
        .upsert(couponData)
        .select()
        .single();

    if (error) {
        console.error("Error saving coupon:", error);
        return { success: false, error: "Erro ao guardar cupão." };
    }

    revalidatePath("/admin/coupons");
    return { success: true, coupon: data };
}

/**
 * Deletes a coupon (Admin only)
 */
export async function deleteCoupon(id: string) {
    const adminSupabase = await getSupabaseAdmin();
    const { error } = await adminSupabase
        .from('coupons')
        .delete()
        .eq('id', id);

    if (error) {
        console.error("Error deleting coupon:", error);
        return { success: false, error: "Erro ao eliminar cupão." };
    }

    revalidatePath("/admin/coupons");
    return { success: true };
}

/**
 * Toggles coupon active status (Admin only)
 */
export async function toggleCouponActive(id: string, active: boolean) {
    const adminSupabase = await getSupabaseAdmin();
    const { error } = await adminSupabase
        .from('coupons')
        .update({ active })
        .eq('id', id);

    if (error) {
        console.error("Error toggling coupon status:", error);
        return { success: false, error: "Erro ao atualizar estado do cupão." };
    }

    revalidatePath("/admin/coupons");
    return { success: true };
}
