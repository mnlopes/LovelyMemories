import { BlogContent } from '@/components/blog/BlogContent';
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildPageMetadata } from "@/lib/seo";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "PageMeta" });
    return buildPageMetadata({
        locale,
        path: "blog",
        title: t("blogTitle"),
        description: t("blogDesc"),
    });
}

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
