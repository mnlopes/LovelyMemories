"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { Faq, CmsPageSection } from "@/lib/types";

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
                    cookieStore.set({ name, value, ...options });
                },
                remove(name, options) {
                    cookieStore.delete({ name, ...options });
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

export async function fetchAndStoreInstagramImage(order: number, url: string) {
    const supabase = await getSupabase();
    
    try {
        // 1. Normalize
        const cleanUrl = url.split('?')[0];
        const match = cleanUrl.match(/\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
        if (!match) throw new Error("Invalid Instagram link format");
        
        const code = match[2];
        const permalink = `https://www.instagram.com/p/${code}/`;
        const embedUrl = `https://www.instagram.com/p/${code}/embed/`;

        console.log("Fetching from Embed URL:", embedUrl);

        const response = await fetch(embedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Upgrade-Insecure-Requests': '1',
            },
            cache: 'no-store'
        });

        if (!response.ok) throw new Error(`Instagram returned status ${response.status}`);
        
        const html = await response.text();
        
        // 2. Extract image URL (Multiple methods)
        let rawImageUrl = null;

        // Method A: OG Image (Standard - Case Insensitive + Quotes)
        const ogMatch = html.match(/<meta[^>]+(?:property|name)=["']og:image["'][^>]+content=["']([^"']+)["']/i);
        if (ogMatch) rawImageUrl = ogMatch[1].replace(/&amp;/g, '&');

        // Method B: display_url in JSON
        if (!rawImageUrl) {
            const displayUrlMatch = html.match(/"display_url"\s*:\s*"([^"]+)"/);
            if (displayUrlMatch) rawImageUrl = displayUrlMatch[1].replace(/\\u0026/g, '&');
        }

        // Method C: thumbnail_src in JSON
        if (!rawImageUrl) {
            const thumbMatch = html.match(/"thumbnail_src"\s*:\s*"([^"]+)"/);
            if (thumbMatch) rawImageUrl = thumbMatch[1].replace(/\\u0026/g, '&');
        }

        // Method D: EmbeddedMediaImage class in HTML
        if (!rawImageUrl) {
            const imgMatch = html.match(/class=["']EmbeddedMediaImage["'][^>]+src=["']([^"']+)["']/i);
            if (imgMatch) rawImageUrl = imgMatch[1].replace(/&amp;/g, '&');
        }

        if (!rawImageUrl) {
            // Save HTML to scratch for debugging if it fails again
            console.error("Failed to find image URL. HTML Length:", html.length);
            throw new Error("Could not find image in this post. Instagram might be blocking access.");
        }

        console.log("Found Image URL:", rawImageUrl);

        // 3. Download the image
        const imageRes = await fetch(rawImageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.instagram.com/',
            }
        });
        if (!imageRes.ok) throw new Error(`Failed to download image from CDN (Status: ${imageRes.status})`);
        
        const imageBlob = await imageRes.blob();
        const buffer = Buffer.from(await imageBlob.arrayBuffer());

        // 4. Upload to Supabase Storage
        const fileName = `social-${code}-${Date.now()}.jpg`;
        const filePath = `instagram/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('social-images')
            .upload(filePath, buffer, {
                contentType: 'image/jpeg',
                upsert: true
            });

        if (uploadError) throw new Error("Storage Upload Error: " + uploadError.message);

        const { data: { publicUrl } } = supabase.storage
            .from('social-images')
            .getPublicUrl(filePath);

        // 5. Update Database
        const { error: dbError } = await supabase
            .from('instagram_posts')
            .upsert({
                display_order: order,
                permalink: permalink,
                image_url: publicUrl,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'display_order'
            });

        if (dbError) throw new Error("Database Error: " + dbError.message);

        revalidatePath('/[locale]/about-us', 'layout');
        return { success: true, imageUrl: publicUrl };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("fetchAndStoreInstagramImage Error:", error);
        return { success: false, error: errorMessage };
    }
}

export async function upsertInstagramPost(data: Record<string, unknown>) {
    const supabase = await getSupabase();
    
    // Use upsert to handle both new and existing slots
    const { error } = await supabase
        .from('instagram_posts')
        .upsert({
            ...data,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'display_order'
        });

    if (error) return { success: false, error: error.message };
    
    revalidatePath('/[locale]/about-us', 'layout');
    return { success: true };
}

// --- Blog Actions ---

export async function upsertBlogPost(data: Record<string, unknown>) {
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

// --- FAQ Actions ---

export async function getFaqs(locale?: string) {
    const supabase = await getSupabase();
    
    let query = supabase
        .from('faqs')
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

    if (locale && locale !== 'all') {
        query = query.eq('locale', locale);
    }

    const { data, error } = await query;
    if (error) {
        console.error("Error fetching FAQs:", error);
        return [];
    }
    return data || [];
}

export async function upsertFaq(data: Faq) {
    const supabase = await getSupabase();
    
    const { data: result, error } = await supabase
        .from('faqs')
        .upsert({
            ...data,
            updated_at: new Date().toISOString(),
        })
        .select()
        .single();

    if (error) return { success: false, error: error.message };
    
    revalidatePath('/[locale]/contact', 'layout');
    return { success: true, data: result };
}

export async function deleteFaq(id: string) {
    const supabase = await getSupabase();
    
    const { error } = await supabase
        .from('faqs')
        .delete()
        .eq('id', id);

    if (error) return { success: false, error: error.message };
    
    revalidatePath('/[locale]/contact', 'layout');
    return { success: true };
}

export async function reorderFaqs(faqs: Faq[]) {
    const supabase = await getSupabase();
    
    const payloads = faqs.map(faq => ({
        id: faq.id,
        question: faq.question,
        answer: faq.answer,
        locale: faq.locale,
        display_order: faq.display_order,
        updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
        .from('faqs')
        .upsert(payloads);

    if (error) return { success: false, error: error.message };
    
    revalidatePath('/[locale]/contact', 'layout');
    return { success: true };
}

// --- CMS Page Sections Actions ---

export async function getPageSections(pageSlug: string, locale?: string) {
    const supabase = await getSupabase();
    
    let query = supabase
        .from('cms_page_sections')
        .select('*')
        .eq('page_slug', pageSlug)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

    if (locale && locale !== 'all') {
        query = query.eq('locale', locale);
    }

    const { data, error } = await query;
    if (error) {
        console.error(`Error fetching CMS page sections for ${pageSlug}:`, error);
        return [];
    }
    return data || [];
}

export async function upsertPageSection(data: CmsPageSection) {
    const supabase = await getSupabase();
    
    const { data: result, error } = await supabase
        .from('cms_page_sections')
        .upsert({
            ...data,
            updated_at: new Date().toISOString(),
        })
        .select()
        .single();

    if (error) return { success: false, error: error.message };
    
    revalidatePath('/[locale]/terms-conditions', 'layout');
    revalidatePath('/[locale]/privacy-policy', 'layout');
    return { success: true, data: result };
}

export async function deletePageSection(id: string) {
    const supabase = await getSupabase();
    
    const { error } = await supabase
        .from('cms_page_sections')
        .delete()
        .eq('id', id);

    if (error) return { success: false, error: error.message };
    
    revalidatePath('/[locale]/terms-conditions', 'layout');
    revalidatePath('/[locale]/privacy-policy', 'layout');
    return { success: true };
}

export async function reorderPageSections(sections: CmsPageSection[]) {
    const supabase = await getSupabase();
    
    const payloads = sections.map(section => ({
        id: section.id,
        page_slug: section.page_slug,
        title: section.title,
        content: section.content,
        icon: section.icon,
        locale: section.locale,
        display_order: section.display_order,
        list_items: section.list_items,
        updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
        .from('cms_page_sections')
        .upsert(payloads);

    if (error) return { success: false, error: error.message };
    
    revalidatePath('/[locale]/terms-conditions', 'layout');
    revalidatePath('/[locale]/privacy-policy', 'layout');
    return { success: true };
}

