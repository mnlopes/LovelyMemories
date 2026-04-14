
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { ProfileForm } from "@/components/owner/ProfileForm";
import { SecurityForm } from "@/components/owner/SecurityForm";
import { getTranslations, getMessages } from "next-intl/server";
import { redirect } from "next/navigation";
import { getEffectiveUser } from "@/app/actions/auth-context";

export const dynamic = 'force-dynamic';

export default async function OwnerProfilePage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const cookieStore = await cookies();

    const { userId, realUser, isImpersonating } = await getEffectiveUser();

    if (!realUser) {
        redirect(`/${locale}/login`);
    }

    const { getSupabaseAdmin } = await import('@/lib/supabase');
    const adminSupabase = await getSupabaseAdmin();

    // Fetch user profile for metadata
    const { data: profile } = await adminSupabase
        .from('profiles')
        .select('full_name, phone, preferred_language, email')
        .eq('id', userId)
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
                        email: profile?.email || '',
                        phone: profile?.phone || '',
                        language: profile?.preferred_language || locale
                    }} 
                    isReadOnly={isImpersonating}
                />
                <SecurityForm isReadOnly={isImpersonating} />
            </div>
        </div>
    );
}
