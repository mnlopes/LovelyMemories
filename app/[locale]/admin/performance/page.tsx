import { BarChart3, TrendingUp, PieChart, LineChart } from "lucide-react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function AdminPerformancePage(props: { params: Promise<{ locale: string }> }) {
    const { locale } = await props.params;
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) { return cookieStore.get(name)?.value },
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect(`/${locale}/login`);

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'super_admin') {
        redirect(`/${locale}/admin/properties`);
    }

    return (
        <div className="space-y-10 pb-20">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-[#171717] dark:text-admin-dark-text-primary">Performance</h2>
                <p className="text-[#a3a3a3] mt-2 font-medium">Analytics and key performance indicators.</p>
            </div>

            {/* Charts Placeholder Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-admin-dark-surface rounded-2xl border border-[#f5f5f5] dark:border-admin-dark-border p-6 shadow-sm min-h-[400px] flex flex-col transition-colors duration-300">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-[#171717] dark:text-admin-dark-text-primary">Occupancy Rate</h3>
                        <div className="bg-[#f4f7f4] dark:bg-emerald-500/10 text-[#718571] dark:text-emerald-400 text-xs font-bold px-2 py-1 rounded border border-emerald-50 dark:border-emerald-500/20">+5% vs last month</div>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-[#f5f5f5] dark:border-admin-dark-border rounded-xl bg-[#fafafa]/50 dark:bg-admin-dark-bg/50">
                        <LineChart className="size-8 text-[#a3a3a3]/30 dark:text-admin-dark-text-secondary/20" />
                        <p className="font-bold text-[#a3a3a3]/50 uppercase tracking-widest text-xs">Occupancy Chart</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-admin-dark-surface rounded-2xl border border-[#f5f5f5] dark:border-admin-dark-border p-6 shadow-sm min-h-[400px] flex flex-col transition-colors duration-300">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-[#171717] dark:text-admin-dark-text-primary">Revenue by Channel</h3>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-[#f5f5f5] dark:border-admin-dark-border rounded-xl bg-[#fafafa]/50 dark:bg-admin-dark-bg/50">
                        <PieChart className="size-8 text-[#a3a3a3]/30 dark:text-admin-dark-text-secondary/20" />
                        <p className="font-bold text-[#a3a3a3]/50 uppercase tracking-widest text-xs">Distribution Chart</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
