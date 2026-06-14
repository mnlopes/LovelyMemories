import { getMessages, getTranslations } from "next-intl/server";
import { getEffectiveUser } from "@/app/actions/auth-context";
import { ImpersonationBanner } from "@/components/owner/ImpersonationBanner";

import { OwnerSidebar } from "@/components/owner/OwnerSidebar";
import { OwnerMobileHeader } from "@/components/owner/OwnerMobileHeader";
import { OwnerBottomNav } from "@/components/owner/OwnerBottomNav";
import { redirect } from "next/navigation";
import { Plus_Jakarta_Sans } from "next/font/google"; // Reuse font
import { NextIntlClientProvider } from "next-intl";

const plusJakartaSans = Plus_Jakarta_Sans({
    subsets: ["latin"],
    variable: "--font-plus-jakarta",
});

export const dynamic = 'force-dynamic';

export default async function OwnerLayout({
    children,
    params
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    const { userId, realUser, realProfile, isImpersonating } = await getEffectiveUser();
    const messages = await getMessages();
    const t = await getTranslations('OwnerLayout');

    if (!realUser) {
        redirect(`/${locale}/login`);
    }

    // Role check: Allow if owner OR if real user is admin/super_admin AND impersonating
    if (!isImpersonating && realProfile?.role !== 'owner') {
        redirect(`/${locale}/admin`);
    }

    // Fetch impersonated owner name if needed
    let impersonatedName = "";
    if (isImpersonating && userId) {
        const { getSupabaseAdmin } = await import('@/lib/supabase');
        const adminSupabase = await getSupabaseAdmin();
        const { data: ownerProfile } = await adminSupabase
            .from('profiles')
            .select('full_name')
            .eq('id', userId)
            .single();
        impersonatedName = ownerProfile?.full_name || "Owner";
    }

    return (
        <NextIntlClientProvider messages={messages} locale={locale}>
            <div className={`${plusJakartaSans.variable} font-sans antialiased text-[#192537] bg-gray-50 min-h-screen flex flex-col`}>
                {isImpersonating && <ImpersonationBanner ownerName={impersonatedName} />}
                <div className="flex-1 flex overflow-hidden">
                    <OwnerSidebar />
                    <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                        <OwnerMobileHeader />
                        <div className="flex-1 overflow-y-auto p-4 pb-24 lg:p-8 lg:pb-8">
                            {children}
                        </div>
                    </main>
                </div>
                <OwnerBottomNav />
            </div>
        </NextIntlClientProvider>
    );
}
