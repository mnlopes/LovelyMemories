"use client";

import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, MoreHorizontal, Plus } from "lucide-react";

export default function AdminOverview() {
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
                    <h2 className="text-3xl font-bold tracking-tight text-[#171717] dark:text-admin-dark-text-primary">Portfolio Dashboard</h2>
                    <p className="text-[#a3a3a3] mt-2 font-medium">Overview for {new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}</p>
                </div>
                <button className="px-5 py-2.5 bg-[#171717] dark:bg-white text-white dark:text-black rounded text-sm font-semibold hover:bg-black dark:hover:bg-gray-200 transition-all flex items-center gap-2">
                    <Plus className="size-4" />
                    New Property
                </button>
            </section>

            {/* Upcoming Bookings Slider */}
            <section className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold tracking-tight dark:text-admin-dark-text-primary">Upcoming Bookings</h3>
                    <div className="flex gap-2">
                        <button className="size-8 rounded border border-[#eeeeee] dark:border-admin-dark-border flex items-center justify-center hover:bg-white dark:hover:bg-admin-dark-surface transition-colors text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white">
                            <ChevronLeft className="size-4" />
                        </button>
                        <button className="size-8 rounded border border-[#eeeeee] dark:border-admin-dark-border flex items-center justify-center hover:bg-white dark:hover:bg-admin-dark-surface transition-colors text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white">
                            <ChevronRight className="size-4" />
                        </button>
                    </div>
                </div>
                <div className="flex gap-6 overflow-x-auto no-scrollbar -mx-4 px-4 pb-4">
                    {upcomingBookings.map((booking) => (
                        <div key={booking.id} className="min-w-[320px] bg-white dark:bg-admin-dark-surface rounded-xl border border-[#f5f5f5] dark:border-admin-dark-border overflow-hidden group shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                            <div className="h-44 bg-cover bg-center relative" style={{ backgroundImage: `url(${booking.image})` }}>
                                <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors"></div>
                            </div>
                            <div className="p-5">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h4 className="font-bold text-[#171717] dark:text-admin-dark-text-primary">{booking.name}</h4>
                                        <p className="text-xs text-[#a3a3a3] mt-0.5">{booking.property}</p>
                                    </div>
                                    <span className="bg-[#f4f7f4] dark:bg-[#718571]/20 text-[#718571] dark:text-[#a3c3a3] text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">{booking.status}</span>
                                </div>
                                <div className="flex items-center gap-4 py-3 border-t border-[#f5f5f5] dark:border-admin-dark-border transition-colors duration-300">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-[#a3a3a3] uppercase font-bold tracking-wider">Dates</span>
                                        <span className="text-xs font-semibold dark:text-admin-dark-text-primary">{booking.dates}</span>
                                    </div>
                                    <div className="w-px h-8 bg-[#f5f5f5] dark:bg-admin-dark-border"></div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-[#a3a3a3] uppercase font-bold tracking-wider">Guests</span>
                                        <span className="text-xs font-semibold dark:text-admin-dark-text-primary">{booking.guests}</span>
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
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-admin-dark-surface border border-[#f5f5f5] dark:border-admin-dark-border rounded text-xs font-medium cursor-pointer hover:bg-[#fafafa] dark:hover:bg-admin-dark-surface/80 transition-colors">
                            Filter
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-admin-dark-surface border border-[#f5f5f5] dark:border-admin-dark-border rounded text-xs font-medium cursor-pointer hover:bg-[#fafafa] dark:hover:bg-admin-dark-surface/80 transition-colors">
                            Recently Added
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-admin-dark-surface rounded-2xl border border-[#f5f5f5] dark:border-admin-dark-border overflow-hidden shadow-sm transition-colors duration-300">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-[#f5f5f5] dark:border-admin-dark-border">
                                <th className="px-8 py-5 text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest">Property Details</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest">Location</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest">Rent (Monthly)</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest">Status</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#f5f5f5] dark:divide-admin-dark-border">
                            {inventory.map((item, idx) => (
                                <tr key={idx} className="group hover:bg-[#fafafa]/50 dark:hover:bg-admin-dark-bg/50 transition-colors">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="size-14 rounded bg-[#f5f5f5] dark:bg-admin-dark-bg bg-cover bg-center shrink-0 shadow-sm border border-[#eeeeee] dark:border-admin-dark-border" style={{ backgroundImage: `url(${item.image})` }}></div>
                                            <div>
                                                <p className="font-bold text-[#171717] dark:text-admin-dark-text-primary">{item.name}</p>
                                                <p className="text-xs text-[#a3a3a3] mt-0.5">{item.details}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <p className="text-sm font-medium text-[#171717] dark:text-admin-dark-text-primary">{item.location}</p>
                                    </td>
                                    <td className="px-8 py-6">
                                        <p className="text-sm font-bold text-[#171717] dark:text-admin-dark-text-primary">{item.rent}</p>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${item.status === 'Occupied'
                                            ? 'bg-[#f4f7f4] dark:bg-[#718571]/20 text-[#718571] dark:text-[#a3c3a3] border border-[#e7ece7] dark:border-[#718571]/30'
                                            : 'bg-[#fafafa] dark:bg-admin-dark-bg text-[#a3a3a3] border border-[#eeeeee] dark:border-admin-dark-border'
                                            }`}>
                                            <span className={`size-1 rounded-full ${item.status === 'Occupied' ? 'bg-[#718571]' : 'bg-[#a3a3a3]'}`}></span>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-right font-medium">
                                        <button className="text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white transition-colors">
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
