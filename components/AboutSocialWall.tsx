import { getTranslations } from "next-intl/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const AboutSocialWall = async () => {
    const t = await getTranslations('AboutSocialWall');
    
    // Fetch real data from Supabase
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
        .from('instagram_posts')
        .select('*')
        .order('display_order', { ascending: true })
        .limit(4);

    return (
        <section className="py-24 bg-white">
            <div className="container mx-auto px-4">
                <div className="flex flex-col md:flex-row justify-between items-center mb-12">
                    <div className="mb-6 md:mb-0">
                        <h2 className="text-3xl font-bold text-gray-900">{t('title')}</h2>
                    </div>
                    <div className="hidden md:block">
                        <a
                            className="inline-block px-8 py-3 bg-[#b09e80] text-white font-bold text-sm uppercase tracking-widest hover:bg-[#8e7d65] transition-colors rounded-full"
                            href="https://www.instagram.com/lovely_memories_pt/"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {t('follow')}
                        </a>
                    </div>
                </div>

                {/* Instagram Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {posts?.map((post) => (
                        <a 
                            key={post.id} 
                            href={post.permalink || "https://www.instagram.com/lovely_memories_pt/"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative aspect-square bg-gray-100 overflow-hidden cursor-pointer"
                        >
                            {post.image_url ? (
                                <img 
                                    src={post.image_url} 
                                    alt="Instagram post"
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                                    </svg>
                                </div>
                            )}
                            {/* Hover Overlay */}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                                <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-bold uppercase tracking-widest transition-opacity">
                                    View Post
                                </span>
                            </div>
                        </a>
                    ))}
                    {/* Fallback if no posts (highly unlikely after seed) */}
                    {(!posts || posts.length === 0) && [1,2,3,4].map(i => (
                         <div key={i} className="aspect-square bg-gray-100 animate-pulse rounded-lg" />
                    ))}
                </div>

                {/* Mobile CTA */}
                <div className="mt-8 md:hidden text-center">
                    <a
                        className="inline-block px-8 py-3 bg-[#b09e80] text-white font-bold text-sm uppercase tracking-widest hover:bg-[#8e7d65] transition-colors rounded-full"
                        href="https://www.instagram.com/lovely_memories_pt/"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {t('follow')}
                    </a>
                </div>
            </div>
        </section>
    );
};
