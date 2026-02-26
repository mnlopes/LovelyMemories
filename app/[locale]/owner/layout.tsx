import { OwnerSidebar } from "@/components/owner/OwnerSidebar";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Plus_Jakarta_Sans } from "next/font/google"; // Reuse font
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

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
    const cookieStore = await cookies();
    const messages = await getMessages();

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

    // Role check
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile || profile.role !== 'owner') {
        // If not owner, maybe admin trying to view?
        // For now strict check, redirect home or admin
        if (profile?.role === 'admin' || profile?.role === 'super_admin') {
            // Admins might want to see how it looks, but for now let's keep it strict
            // redirect(`/${locale}/admin`);
        }
        // Redirect unauthorized to home
        if (profile?.role !== 'owner') {
            redirect(`/${locale}`);
        }
    }

    return (
        <NextIntlClientProvider messages={messages} locale={locale}>
            <div className={`${plusJakartaSans.variable} font-sans antialiased text-[#192537] bg-gray-50 min-h-screen flex`}>
                <OwnerSidebar />
                <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                    {/* Header could go here */}
                    <div className="flex-1 overflow-y-auto p-8">
                        {children}
                    </div>
                </main>
            </div>
        </NextIntlClientProvider>
    );
}
