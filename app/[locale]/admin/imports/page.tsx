import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { FileUp, Clock, CheckCircle2, Calendar, Home } from "lucide-react";
import ImportUploadZone from "./components/ImportUploadZone";
import UndoImportButton from "./components/UndoImportButton";
import { HistoryFilters } from "./components/HistoryFilters";
import HistoryTableRow from "./components/HistoryTableRow";

export default async function AdminImportsPage(props: { 
    params: Promise<{ locale: string }>;
    searchParams: Promise<{ month?: string; year?: string; propertyId?: string }>;
}) {
    const { locale } = await props.params;
    const searchParams = await props.searchParams;
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

    if (profile?.role !== 'super_admin' && profile?.role !== 'admin') {
        redirect(`/${locale}/admin/properties`);
    }

    // 1. Fetch properties for filter - excluding buildings (multi-units)
    const { data: propertiesData } = await supabase
        .from('properties')
        .select('id, title, is_multi_unit')
        .order('title');

    const properties = (propertiesData || []).filter(p => p.is_multi_unit !== true);

    // 2. Build filtered query for imports
    let query = supabase
        .from('import_history')
        .select(`
            *,
            profiles!import_history_imported_by_fkey(full_name),
            properties:property_id(title)
        `)
        .order('imported_at', { ascending: false });

    if (searchParams.month) query = query.eq('target_month', parseInt(searchParams.month));
    if (searchParams.year) query = query.eq('target_year', parseInt(searchParams.year));
    if (searchParams.propertyId) query = query.eq('property_id', searchParams.propertyId);

    const { data: imports, error: importsError } = await query.limit(100);

    if (importsError) {
        console.error("History query error:", importsError);
    }

    const getMonthName = (month: number) => {
        const date = new Date(2026, month - 1, 1);
        return format(date, 'MMMM');
    };

    const getPropertyTitle = (title: any) => {
        if (!title) return 'Unknown Property';
        if (typeof title === 'string') return title;
        return title.en || title[locale] || Object.values(title)[0] || 'Unknown Property';
    };

    return (
        <div className="space-y-10 pb-20 text-[#171717]">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold tracking-tight dark:text-admin-dark-text-primary">Airbnb Imports</h2>
                <p className="text-[#a3a3a3] mt-2 font-medium">Upload and manage Airbnb Earnings CSV reports.</p>
            </div>

            {/* Upload Zone */}
            <div className="bg-white dark:bg-admin-dark-surface p-6 rounded-2xl border border-[#f5f5f5] dark:border-admin-dark-border shadow-sm">
                <ImportUploadZone />
            </div>

            {/* History Table */}
            <section className="space-y-6">
                <div className="flex flex-row items-center gap-8 relative z-30">
                    <h3 className="text-xl font-bold tracking-tight dark:text-admin-dark-text-primary w-[30%] shrink-0 truncate">
                        Import History
                    </h3>
                    <div className="w-[70%]">
                        <HistoryFilters properties={(properties as any) || []} locale={locale} />
                    </div>
                </div>
                
                <div className="bg-white dark:bg-admin-dark-surface rounded-2xl border border-[#f5f5f5] dark:border-admin-dark-border overflow-hidden shadow-sm">
                    {imports && imports.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-[#f5f5f5] dark:border-admin-dark-border">
                                        <th className="px-6 py-4 text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest">Import Date</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest">Property</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest">Target Period</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest text-center">Records</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest">Status</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#f5f5f5] dark:divide-admin-dark-border">
                                    {imports.map((item) => (
                                        <HistoryTableRow 
                                            key={item.id} 
                                            item={item} 
                                            locale={locale}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-12 text-center flex flex-col items-center justify-center gap-4">
                            <Clock className="size-10 text-[#a3a3a3]/50" />
                            <p className="text-[#a3a3a3] font-medium">No imports found for the selected criteria.</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
