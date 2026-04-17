"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

async function getSupabase() {
    const cookieStore = await cookies();
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set(name, value, options) {
                    cookieStore.set(name, value, options);
                },
                remove(name, options) {
                    cookieStore.delete(name, options);
                },
            },
        }
    );
}

// --- Instagram / Social Wall Actions ---

export async function getInstagramPosts() {
    const supabase = await getSupabase();
    const { data, error } = await supabase
        .from('instagram_posts')
        .select('*')
        .order('display_order', { ascending: true });

    if (error) {
        console.error("Error fetching instagram posts:", error);
        return [];
    }
    return data || [];
}

export async function upsertInstagramPost(data: any) {
    const supabase = await getSupabase();
    
    // Use upsert to handle both new and existing slots
    const { error } = await supabase
        .from('instagram_posts')
        .upsert({
            ...data,
            updated_at: new Date().toISOString()
        });

    if (error) return { success: false, error: error.message };
    
    revalidatePath('/[locale]/about-us', 'layout');
    return { success: true };
}

// --- Blog Actions ---

export async function upsertBlogPost(data: any) {
    const supabase = await getSupabase();
    
    const { data: result, error } = await supabase
        .from('blog_posts')
        .upsert({
            ...data,
            updated_at: new Date().toISOString(),
        })
        .select()
        .single();

    if (error) return { success: false, error: error.message };
    
    revalidatePath('/[locale]/blog', 'layout');
    return { success: true, data: result };
}

export async function getBlogPosts(locale?: string) {
    const supabase = await getSupabase();
    
    let query = supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false });

    if (locale && locale !== 'all') {
        query = query.eq('locale', locale);
    }

    const { data, error } = await query;
    if (error) {
        console.error("Error fetching blog posts:", error);
        return [];
    }
    return data || [];
}

export async function deleteBlogPost(id: string) {
    const supabase = await getSupabase();
    
    const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', id);

    if (error) return { success: false, error: error.message };
    
    revalidatePath('/[locale]/blog', 'layout');
    return { success: true };
}

export async function toggleBlogPostStatus(id: string, isPublished: boolean) {
    const supabase = await getSupabase();
    
    const { error } = await supabase
        .from('blog_posts')
        .update({ 
            is_published: isPublished,
            published_at: isPublished ? new Date().toISOString() : null 
        })
        .eq('id', id);

    if (error) return { success: false, error: error.message };
    
    revalidatePath('/[locale]/blog', 'layout');
    return { success: true };
}
