"use client";

import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, MoreHorizontal, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

export default function AdminOverview() {
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/login");
                return;
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            if (profile?.role !== 'super_admin') {
                const locale = window.location.pathname.split('/')[1] || 'en';
                router.push(`/${locale}/admin/properties`);
            } else {
                setIsAuthorized(true);
            }
        };
        checkAuth();
    }, [router]);

    if (isAuthorized === null) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-admin-text-primary"></div>
            </div>
        );
    }
    const upcomingBookings = [
        { id: 1, name: "Julianna Henderson", property: "Skyline Penthouse", dates: "Nov 12 - Nov 18", guests: "2 Adults", status: "Check-in", image: "https://images.unsplash.com/photo-1544161515-4af6b1d4640b?q=80&w=2070&auto=format&fit=crop" },
        { id: 2, name: "Marcus Wright", property: "Liberty Lofts #402", dates: "Nov 15 - Nov 22", guests: "1 Adult", status: "Pending", image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop" },
        { id: 3, name: "Sarah Jenkins", property: "Ocean Front Apts", dates: "Nov 20 - Dec 05", guests: "3 Adults", status: "Check-in", image: "https://images.unsplash.com/photo-1580674271209-40e4ed11efe9?q=80&w=2070&auto=format&fit=crop" },
        { id: 4, name: "David G.", property: "Emerald Heights", dates: "Nov 22 - Nov 30", guests: "2 Adults", status: "Confirmed", image: "https://images.unsplash.com/photo-1540518614846-7eded433c457?q=80&w=2070&auto=format&fit=crop" },
    ];

    const inventory = [
        { name: "Skyline Penthouse", location: "Upper East Side, NY", rent: "$12,500", status: "Occupied", image: "https://images.unsplash.com/photo-1544161515-4af6b1d4640b?q=80&w=2070&auto=format&fit=crop", details: "3 Bedrooms • 2,400 sqft" },
        { name: "Emerald Heights", location: "Business District, LDN", rent: "$45,000", status: "Occupied", image: "https://images.unsplash.com/photo-1540518614846-7eded433c457?q=80&w=2070&auto=format&fit=crop", details: "Commercial Suite • 4,500 sqft" },
        { name: "Liberty Lofts", location: "Brooklyn, NY", rent: "$8,200", status: "Available", image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop", details: "Studio Loft • 1,100 sqft" },
    ];

    return (
        <div className="space-y-16 pb-20">
            {/* Header Section */}
            <section className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-admin-text-primary">Portfolio Dashboard</h2>
                    <p className="text-admin-text-secondary mt-2 font-medium">Overview for {new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}</p>
                </div>
                <button className="px-5 py-2.5 bg-admin-surface text-admin-text-primary border border-admin-border rounded text-sm font-semibold hover:bg-admin-bg transition-all flex items-center gap-2 shadow-sm">
                    <Plus className="size-4" />
                    New Property
                </button>
            </section>

            {/* Upcoming Bookings Slider */}
            <section className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold tracking-tight dark:text-admin-dark-text-primary">Upcoming Bookings</h3>
                    <div className="flex gap-2">
                        <button className="size-8 rounded border border-admin-border flex items-center justify-center hover:bg-admin-bg transition-colors text-admin-text-secondary hover:text-admin-text-primary">
                            <ChevronLeft className="size-4" />
                        </button>
                        <button className="size-8 rounded border border-admin-border flex items-center justify-center hover:bg-admin-bg transition-colors text-admin-text-secondary hover:text-admin-text-primary">
                            <ChevronRight className="size-4" />
                        </button>
                    </div>
                </div>
                <div className="flex gap-6 overflow-x-auto no-scrollbar -mx-4 px-4 pb-4">
                    {upcomingBookings.map((booking) => (
                        <div key={booking.id} className="min-w-[320px] bg-admin-surface rounded-xl border border-admin-border overflow-hidden group shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                            <div className="h-44 bg-cover bg-center relative" style={{ backgroundImage: `url(${booking.image})` }}>
                                <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors"></div>
                            </div>
                            <div className="p-5">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h4 className="font-bold text-admin-text-primary">{booking.name}</h4>
                                        <p className="text-xs text-admin-text-secondary mt-0.5">{booking.property}</p>
                                    </div>
                                    <span className="bg-[#f4f7f4] dark:bg-[#718571]/20 text-[#718571] dark:text-[#a3c3a3] text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">{booking.status}</span>
                                </div>
                                <div className="flex items-center gap-4 py-3 border-t border-admin-border transition-colors duration-300">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-admin-text-secondary uppercase font-bold tracking-wider">Dates</span>
                                        <span className="text-xs font-semibold text-admin-text-primary">{booking.dates}</span>
                                    </div>
                                    <div className="w-px h-8 bg-admin-border"></div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-admin-text-secondary uppercase font-bold tracking-wider">Guests</span>
                                        <span className="text-xs font-semibold text-admin-text-primary">{booking.guests}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Property Inventory Table */}
            <section className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold tracking-tight dark:text-admin-dark-text-primary">Property Inventory</h3>
                    <div className="flex gap-4">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-admin-surface border border-admin-border rounded text-xs font-medium cursor-pointer hover:bg-admin-bg transition-colors text-admin-text-primary">
                            Filter
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-admin-surface border border-admin-border rounded text-xs font-medium cursor-pointer hover:bg-admin-bg transition-colors text-admin-text-primary">
                            Recently Added
                        </div>
                    </div>
                </div>
                <div className="bg-admin-surface rounded-2xl border border-admin-border overflow-hidden shadow-sm transition-colors duration-300">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-admin-border">
                                <th className="px-8 py-5 text-[10px] font-bold text-admin-text-secondary uppercase tracking-widest">Property Details</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-admin-text-secondary uppercase tracking-widest">Location</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-admin-text-secondary uppercase tracking-widest">Rent (Monthly)</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-admin-text-secondary uppercase tracking-widest">Status</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-admin-text-secondary uppercase tracking-widest text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-admin-border">
                            {inventory.map((item, idx) => (
                                <tr key={idx} className="group hover:bg-admin-bg transition-colors">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="size-14 rounded bg-admin-bg bg-cover bg-center shrink-0 shadow-sm border border-admin-border" style={{ backgroundImage: `url(${item.image})` }}></div>
                                            <div>
                                                <p className="font-bold text-admin-text-primary">{item.name}</p>
                                                <p className="text-xs text-admin-text-secondary mt-0.5">{item.details}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <p className="text-sm font-medium text-admin-text-primary">{item.location}</p>
                                    </td>
                                    <td className="px-8 py-6">
                                        <p className="text-sm font-bold text-admin-text-primary">{item.rent}</p>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${item.status === 'Occupied'
                                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20'
                                            : 'bg-admin-bg text-admin-text-secondary border border-admin-border'
                                            }`}>
                                            <span className={`size-1 rounded-full ${item.status === 'Occupied' ? 'bg-emerald-500' : 'bg-admin-text-secondary'}`}></span>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-right font-medium">
                                        <button className="text-admin-text-secondary hover:text-admin-text-primary transition-colors">
                                            <MoreHorizontal className="size-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
