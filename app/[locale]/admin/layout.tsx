import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminBottomNav } from "@/components/admin/AdminBottomNav";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminThemeProvider } from "@/components/admin/AdminThemeProvider";
import { AdminNavProvider } from "@/components/admin/AdminNavProvider";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Plus_Jakarta_Sans } from "next/font/google";

const plusJakartaSans = Plus_Jakarta_Sans({
    subsets: ["latin"],
    variable: "--font-plus-jakarta",
});

export const dynamic = 'force-dynamic';

import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

export default async function AdminLayout({
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
        .select('*')
        .eq('id', user.id)
        .single();

    if (!profile || (profile.role !== 'super_admin' && profile.role !== 'admin' && profile.role !== 'editor')) {
        redirect(`/${locale}`);
    }

    // Restriction: Only Super Admin can see the Overview, Reports and Settings
    // If Admin/Editor lands on /admin, redirect them to /admin/properties
    const isSuperAdmin = profile.role === 'super_admin';
    const isRootAdminPage = true; // Since this layout wraps all /admin pages, we need to check the actual path

    // However, layouts in Next.js don't easily give the current path in server components without tricks
    // But we can check if the children being rendered is the overview page? 
    // Actually, it's easier to handle this in the page.tsx itself or a middleware.
    // Let's stick to the UI hiding for now, but if the user wants strict URL protection:

    // I will add a check in the AdminOverview (page.tsx) and future report pages.

    return (
        <NextIntlClientProvider messages={messages} locale={locale}>
            <AdminThemeProvider>
                <AdminNavProvider>
                    <div className={`${plusJakartaSans.variable} font-sans antialiased text-admin-text-primary`}>
                        <div className="flex h-screen overflow-hidden bg-admin-surface">
                            {/* Sidebar (fixed on desktop, off-canvas drawer on mobile) */}
                            <AdminSidebar />

                            {/* Main Content Area */}
                            <main className="flex-1 overflow-y-auto bg-admin-bg flex flex-col">
                                <AdminHeader user={user} profile={profile} />
                                {/* pb extra no mobile: espaço para a barra de navegação inferior fixa */}
                                <div className="px-4 sm:px-6 lg:px-10 pt-4 sm:pt-6 lg:pt-10 pb-28 md:pb-10 w-full space-y-8 lg:space-y-16">
                                    <div className="w-full">
                                        {children}
                                    </div>
                                </div>
                            </main>

                            {/* Barra de navegação inferior (mobile) */}
                            <AdminBottomNav />
                        </div>
                    </div>
                </AdminNavProvider>
            </AdminThemeProvider>
        </NextIntlClientProvider>
    );
}
