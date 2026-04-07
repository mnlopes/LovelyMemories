
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { ProfileForm } from "@/components/owner/ProfileForm";
import { SecurityForm } from "@/components/owner/SecurityForm";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function OwnerProfilePage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const cookieStore = await cookies();

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect(`/${locale}/login`);
    }

    // Fetch user profile for metadata
    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone, preferred_language')
        .eq('id', user.id)
        .single();

    const t = await getTranslations('OwnerProfile');

    return (
        <div className="max-w-4xl mx-auto space-y-12">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <h1 className="text-3xl md:text-4xl font-playfair font-bold text-[#0A1128] mb-2">
                    {t('title')}
                </h1>
                <p className="text-gray-500 font-light tracking-wide">
                    {t('subtitle')}
                </p>
            </div>

            <div className="space-y-8">
                <ProfileForm 
                    initialData={{ 
                        fullName: profile?.full_name || '', 
                        email: user.email || '',
                        phone: profile?.phone || '',
                        language: profile?.preferred_language || locale
                    }} 
                />
                <SecurityForm />
            </div>
        </div>
    );
}
