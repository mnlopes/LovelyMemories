import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import parse from "html-react-parser";
import { Calendar, ArrowLeft, User } from "lucide-react";
import Link from "next/link";

export default async function BlogPostPage({
    params,
}: {
    params: Promise<{ locale: string; slug: string }>;
}) {
    const { locale, slug } = await params;
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

    const { data: post } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .eq('locale', locale)
        .eq('is_published', true)
        .single();

    if (!post) {
        notFound();
    }

    return (
        <article className="min-h-screen bg-white">
            {/* HERO / COVER IMAGE */}
            <div className="relative h-[60vh] w-full overflow-hidden">
                <img 
                    src={post.image_url || "/legacy/blog/images/Blog-background.png"} 
                    alt={post.title}
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40" />
                
                <div className="absolute inset-0 flex items-end">
                    <div className="container mx-auto px-4 pb-16 md:pb-24">
                        <Link 
                            href={`/blog`}
                            className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-8 text-sm font-bold uppercase tracking-widest"
                        >
                            <ArrowLeft className="size-4" />
                            Back to Blog
                        </Link>
                        <h1 className="text-4xl md:text-6xl font-bold text-white max-w-4xl leading-tight">
                            {post.title}
                        </h1>
                        
                        <div className="flex flex-wrap items-center gap-6 mt-8 text-white/90 text-[11px] font-black uppercase tracking-[0.2em]">
                            <div className="flex items-center gap-2">
                                <Calendar className="size-3 text-gold-400" />
                                {new Date(post.created_at).toLocaleDateString(locale, {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric'
                                })}
                            </div>

                            {post.author_name && (
                                <div className="flex items-center gap-2">
                                    <div className="w-1 h-1 bg-gold-400 rounded-full" />
                                    <User className="size-3 text-gold-400" />
                                    <span>{post.author_name}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENT SECTION */}
            <div className="container mx-auto px-4 py-20">
                <div className="max-w-3xl mx-auto">
                    {/* EXCERPT */}
                    {post.excerpt && (
                        <div className="mb-16">
                            <p className="text-xl md:text-2xl text-gray-500 font-light italic leading-relaxed border-l-4 border-gold-400 pl-8">
                                {post.excerpt}
                            </p>
                        </div>
                    )}

                    {/* RICH TEXT CONTENT */}
                    <div className="blog-content">
                        {parse(post.content || "")}
                    </div>

                    {/* SHARED STYLE FOR RICH TEXT */}
                    <style dangerouslySetInnerHTML={{ __html: `
                        .blog-content {
                            font-size: 1.125rem !important;
                            line-height: 1.9 !important;
                            color: #374151 !important;
                            font-family: var(--font-montserrat), sans-serif !important;
                        }

                        /* Global Block Fix */
                        .blog-content p { margin-bottom: 1.5rem !important; }
                        .blog-content b, .blog-content strong { color: #111827 !important; font-weight: 800 !important; }
                        
                        /* Headings - AGGRESSIVE OVERRIDES */
                        .blog-content h1 { 
                            display: block !important;
                            font-size: 3.5rem !important; 
                            font-weight: 900 !important; 
                            margin-top: 4rem !important; 
                            margin-bottom: 2rem !important; 
                            color: #111827 !important; 
                            letter-spacing: -0.02em !important; 
                            line-height: 1.1 !important; 
                            font-family: var(--font-montserrat), sans-serif !important;
                        }
                        .blog-content h2 { 
                            display: block !important;
                            font-size: 2.25rem !important; 
                            font-weight: 800 !important; 
                            margin-top: 3.5rem !important; 
                            margin-bottom: 1.5rem !important; 
                            color: #111827 !important; 
                            letter-spacing: -0.01em !important; 
                            line-height: 1.2 !important; 
                        }
                        .blog-content h3 { 
                            display: block !important;
                            font-size: 1.75rem !important; 
                            font-weight: 700 !important; 
                            margin-top: 2.5rem !important; 
                            margin-bottom: 1rem !important; 
                            color: #111827 !important; 
                            line-height: 1.3 !important; 
                        }

                        /* Ensure nested bold tags inside headings don't break size */
                        .blog-content h1 b, .blog-content h1 strong,
                        .blog-content h2 b, .blog-content h2 strong,
                        .blog-content h3 b, .blog-content h3 strong {
                            font-size: inherit !important;
                            font-weight: inherit !important;
                            color: inherit !important;
                        }

                        /* Lists */
                        .blog-content ul { list-style-type: disc !important; margin-left: 1.5rem !important; margin-bottom: 2rem !important; color: #4b5563 !important; }
                        .blog-content ol { list-style-type: decimal !important; margin-left: 1.5rem !important; margin-bottom: 2rem !important; color: #4b5563 !important; }
                        .blog-content li { margin-bottom: 0.75rem !important; padding-left: 0.5rem !important; display: list-item !important; }
                        .blog-content li::marker { color: #d4af37 !important; font-weight: bold !important; }

                        /* Links */
                        .blog-content a { color: #d4af37 !important; text-decoration: underline !important; text-underline-offset: 4px !important; font-weight: 600 !important; transition: opacity 0.2s !important; }
                        .blog-content a:hover { opacity: 0.8 !important; }

                        /* Blockquotes */
                        .blog-content blockquote { border-left: 3px solid #d4af37 !important; padding-left: 1.5rem !important; font-style: italic !important; color: #6b7280 !important; margin: 2.5rem 0 !important; font-size: 1.25rem !important; }
                    `}} />
                </div>
            </div>
        </article>
    );
}
