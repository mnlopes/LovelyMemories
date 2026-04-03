
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Link } from "@/i18n/routing";
import { DashboardMetricCard } from "@/components/owner/DashboardMetricCard";
import { RevenueChart } from "@/components/owner/RevenueChart";
import { OccupancyDonut } from "@/components/owner/OccupancyDonut";
import { RecentActivityList } from "@/components/owner/RecentActivityList";
import { Building2, TrendingUp, Users, Wallet } from "lucide-react";
import { getOwnerDashboardStats } from "@/app/actions/owner-analytics";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function OwnerDashboard() {
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

    // Fetch Dashboard Stats (Unified Action: Real Data)
    const stats = await getOwnerDashboardStats();

    // Fetch user profile for name
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user?.id).single();
    const displayName = profile?.full_name?.split(' ')[0] || "Owner";

    return (
        <div className="space-y-8 max-w-[1600px] mx-auto">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-playfair font-bold text-[#0A1128] mb-2">
                        Welcome back, {displayName}
                    </h1>
                    <p className="text-gray-500 font-light tracking-wide">
                        Here is an overview of your portfolio performance.
                    </p>
                </div>
                <div className="text-right hidden md:block">
                    <p className="text-sm font-bold text-[#0A1128]">
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <DashboardMetricCard
                    title="Total Revenue"
                    value={`€${stats.totalRevenue.toLocaleString()}`}
                    iconName="wallet"
                    trend={{ value: stats.revenueTrend, label: "vs last month" }}
                    delay={0.1}
                />
                <DashboardMetricCard
                    title="Active Properties"
                    value={stats.activeProperties}
                    iconName="building"
                    delay={0.2}
                />
                <DashboardMetricCard
                    title="Total Guests"
                    value={stats.totalGuests.toLocaleString()}
                    iconName="users"
                    trend={{ value: stats.guestsTrend, label: "vs last month" }}
                    delay={0.3}
                />
                <DashboardMetricCard
                    title="Avg. Occupancy"
                    value={`${stats.avgOccupancy}%`}
                    iconName="trending"
                    trend={{ value: stats.occupancyTrend, label: "vs last month" }}
                    delay={0.4}
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Revenue Chart - Spans 2 cols */}
                <div className="lg:col-span-2 h-[400px]">
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
                <RecentActivityList activities={stats.recentActivity} />
            </div>
        </div>
    );
}
