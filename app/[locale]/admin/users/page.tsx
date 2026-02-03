export const dynamic = 'force-dynamic';

import { Users, Search, Filter, Mail, Phone, MoreHorizontal } from "lucide-react";

export default function AdminUsersPage() {
    // Mock data for display
    const users = [
        { id: 1, name: "Julianna Henderson", email: "julianna@example.com", phone: "+1 (555) 123-4567", role: "Tenant", status: "Active" },
        { id: 2, name: "Marcus Wright", email: "marcus@example.com", phone: "+1 (555) 987-6543", role: "Owner", status: "Active" },
        { id: 3, name: "Sarah Jenkins", email: "sarah@example.com", phone: "+1 (555) 456-7890", role: "Tenant", status: "Past Due" },
    ];

    return (
        <div className="space-y-10 pb-20">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-[#171717] dark:text-admin-dark-text-primary">Tenants & Users</h2>
                    <p className="text-[#a3a3a3] mt-2 font-medium">Manage user profiles and access roles.</p>
                </div>
                <div className="flex gap-2">
                    <button className="px-5 py-2.5 bg-[#171717] dark:bg-white text-white dark:text-black rounded text-sm font-semibold hover:bg-black dark:hover:bg-gray-200 transition-all flex items-center gap-2">
                        Invite User
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a3a3a3] size-4" />
                    <input
                        type="text"
                        placeholder="Search users..."
                        className="w-full bg-white dark:bg-admin-dark-surface border border-[#f5f5f5] dark:border-admin-dark-border pl-10 pr-4 py-2 rounded-lg text-sm focus:ring-1 focus:ring-[#8ca38c] outline-none shadow-sm placeholder:text-[#a3a3a3] text-[#171717] dark:text-admin-dark-text-primary transition-colors"
                    />
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white dark:bg-admin-dark-surface rounded-2xl border border-[#f5f5f5] dark:border-admin-dark-border overflow-hidden shadow-sm transition-colors duration-300">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-[#f5f5f5] dark:border-admin-dark-border">
                            <th className="px-8 py-5 text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest">User Details</th>
                            <th className="px-8 py-5 text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest">Contact</th>
                            <th className="px-8 py-5 text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest">Role</th>
                            <th className="px-8 py-5 text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest">Status</th>
                            <th className="px-8 py-5 text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f5f5f5] dark:divide-admin-dark-border">
                        {users.map((user) => (
                            <tr key={user.id} className="group hover:bg-[#fafafa]/50 dark:hover:bg-admin-dark-bg/50 transition-colors">
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-4">
                                        <div className="size-10 rounded-full bg-[#f5f5f5] dark:bg-admin-dark-bg flex items-center justify-center text-[#171717] dark:text-admin-dark-text-primary font-bold text-sm border border-transparent dark:border-admin-dark-border">
                                            {user.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-[#171717] dark:text-admin-dark-text-primary">{user.name}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2 text-xs text-[#171717] dark:text-admin-dark-text-primary">
                                            <Mail className="size-3 text-[#a3a3a3]" />
                                            {user.email}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-[#a3a3a3]">
                                            <Phone className="size-3" />
                                            {user.phone}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <span className="text-sm font-medium text-[#171717] dark:text-admin-dark-text-primary">{user.role}</span>
                                </td>
                                <td className="px-8 py-6">
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${user.status === 'Active'
                                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/30'
                                        : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-500/30'
                                        }`}>
                                        {user.status}
                                    </span>
                                </td>
                                <td className="px-8 py-6 text-right">
                                    <button className="text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white transition-colors p-2 hover:bg-gray-100 dark:hover:bg-admin-dark-bg rounded-lg">
                                        <MoreHorizontal className="size-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
