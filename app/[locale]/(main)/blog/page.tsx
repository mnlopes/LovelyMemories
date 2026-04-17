import { BlogContent } from '@/components/blog/BlogContent';
import { Metadata } from "next";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const metadata: Metadata = {
    title: "Blog - Lovely Memories",
    description: "Read our latest stories and memories from Porto.",
};

export default async function BlogPage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    
    // Fetch real blog posts for the current locale
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
            },
        }
    );

    const { data: posts } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('locale', locale)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

    return (
        <BlogContent initialPosts={posts || []} locale={locale} />
    );
}
