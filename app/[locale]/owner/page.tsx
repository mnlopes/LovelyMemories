
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Link, redirect } from "@/i18n/routing";
import { DashboardMetricCard } from "@/components/owner/DashboardMetricCard";
import { RevenueChart } from "@/components/owner/RevenueChart";
import { OccupancyDonut } from "@/components/owner/OccupancyDonut";
import { RecentActivityList } from "@/components/owner/RecentActivityList";
import { Building2, TrendingUp, Users, Wallet } from "lucide-react";
import { getOwnerDashboardStats } from "@/app/actions/owner-analytics";
import { getEffectiveUser } from "@/app/actions/auth-context";

import { getMessages, getTranslations } from "next-intl/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { DashboardFilters } from "@/components/owner/DashboardFilters";

export default async function OwnerDashboard({ 
    params,
    searchParams 
}: { 
    params: Promise<{ locale: string }>,
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const { locale } = await params;
    const sParams = await searchParams;
    const cookieStore = await cookies();

    const { userId, realUser } = await getEffectiveUser();
    const t = await getTranslations('OwnerDashboard');

    if (!realUser) {
        redirect({ href: '/login', locale });
    }

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

    // Get Filter Values
    const propertyId = sParams.property as string | undefined;
    const year = sParams.year ? parseInt(sParams.year as string) : undefined;
    const month = sParams.month ? parseInt(sParams.month as string) : undefined;
    const page = sParams.page ? parseInt(sParams.page as string) : 1;

    // Fetch Owner Properties for Filter
    const { getSupabaseAdmin } = await import('@/lib/supabase');
    const adminSupabase = await getSupabaseAdmin();

    const { data: properties } = await adminSupabase
        .from('properties')
        .select('id, title, slug, owner_id')
        .eq('owner_id', userId)
        .eq('is_active', true);

    // Fetch Dashboard Stats with Filters
    const stats = await getOwnerDashboardStats({ 
        propertyId, 
        year, 
        month,
        page 
    });

    // Fetch profile for name
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', userId).single();
    const displayName = profile?.full_name?.split(' ')[0] || "Owner";

    return (
        <div className="space-y-8 max-w-[1600px] mx-auto">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <h1 className="text-3xl md:text-4xl font-playfair font-bold text-[#0A1128] mb-2">
                        {t('welcome', { name: displayName })}
                    </h1>
                    <p className="text-gray-500 font-light tracking-wide">
                        {t('subtitle')}
                    </p>
                </div>
                <div className="text-right hidden md:block opacity-60">
                    <p className="text-sm font-bold text-[#0A1128]">
                        {new Date().toLocaleDateString(locale === 'pt' ? 'pt-PT' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
            </div>

            {/* Filter Bar */}
            <DashboardFilters properties={properties || []} locale={locale} />

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
                <DashboardMetricCard
                    title={t('revenue')}
                    value={`€${stats.totalRevenue.toLocaleString()}`}
                    iconName="wallet"
                    trend={{ value: stats.revenueTrend, label: t('vsLastMonth') }}
                    delay={0.1}
                />
                <DashboardMetricCard
                    title={t('activeProperties')}
                    value={stats.activeProperties}
                    iconName="building"
                    delay={0.2}
                />
                <DashboardMetricCard
                    title={t('totalGuests')}
                    value={stats.totalGuests.toLocaleString()}
                    iconName="users"
                    trend={{ value: stats.guestsTrend, label: t('vsLastMonth') }}
                    delay={0.3}
                />
                <DashboardMetricCard
                    title={t('avgOccupancy')}
                    value={`${stats.avgOccupancy}%`}
                    iconName="trending"
                    trend={{ value: stats.occupancyTrend, label: t('vsLastMonth') }}
                    delay={0.4}
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                {/* Revenue Chart - Spans 2 cols */}
                <div className="lg:col-span-2 h-[300px] lg:h-[400px]">
                    <RevenueChart data={stats.revenueData} height={400} />
                </div>

                {/* Vertical Stack for Right Col */}
                <div className="grid grid-cols-1 gap-6 h-full">
                    {/* Occupancy Donut */}
                    <div className="h-[280px]">
                        <OccupancyDonut
                            occupied={Math.round(stats.activeProperties * (stats.avgOccupancy / 100))}
                            available={Math.round(stats.activeProperties * (1 - stats.avgOccupancy / 100))}
                            maintenance={0}
                        />
                    </div>
                </div>
            </div>

            {/* Recent Activity Full Row */}
            <div className="grid grid-cols-1">
                <RecentActivityList 
                    activities={stats.recentActivity} 
                    totalCount={stats.totalActivityCount} 
                    currentPage={page} 
                />
            </div>
        </div>
    );
}
