import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminThemeProvider } from "@/components/admin/AdminThemeProvider";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Plus_Jakarta_Sans } from "next/font/google";

const plusJakartaSans = Plus_Jakarta_Sans({
    subsets: ["latin"],
    variable: "--font-plus-jakarta",
});

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
    children,
    params
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
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

    // Role check
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (!profile || (profile.role !== 'super_admin' && profile.role !== 'admin' && profile.role !== 'editor')) {
        redirect(`/${locale}`);
    }

    return (
        <AdminThemeProvider>
            <div className={`${plusJakartaSans.variable} font-sans`}>
                <div className="flex h-screen overflow-hidden bg-white dark:bg-admin-dark-bg text-[#171717] dark:text-admin-dark-text-primary antialiased transition-all duration-500">
                    {/* Fixed Sidebar */}
                    <AdminSidebar />

                    {/* Main Content Area */}
                    <main className="flex-1 overflow-y-auto bg-[#fafafa]/50 dark:bg-admin-dark-surface/50 flex flex-col transition-all duration-500">
                        <AdminHeader user={user} profile={profile} />
                        <div className="p-10 w-full space-y-16">
                            <div className="w-full">
                                {children}
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </AdminThemeProvider>
    );
}
