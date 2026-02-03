export const dynamic = 'force-dynamic';

import { Wallet, TrendingUp, TrendingDown, ArrowUpRight, DollarSign } from "lucide-react";

export default function AdminFinancesPage() {
    return (
        <div className="space-y-10 pb-20">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-[#171717] dark:text-admin-dark-text-primary">Finances</h2>
                <p className="text-[#a3a3a3] mt-2 font-medium">Track revenue, expenses, and financial health.</p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-[#171717] dark:bg-admin-dark-surface rounded-2xl text-white shadow-lg shadow-black/5 border border-transparent dark:border-admin-dark-border transition-colors duration-300">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-white/10 rounded-lg">
                            <Wallet className="size-5 text-white" />
                        </div>
                        <span className="flex items-center gap-1 text-xs font-bold text-[#8ca38c]">
                            <TrendingUp className="size-3" />
                            +12.5%
                        </span>
                    </div>
                    <p className="text-white/60 text-xs uppercase tracking-wider font-bold mb-1">Total Revenue</p>
                    <h3 className="text-3xl font-bold">€124,500</h3>
                </div>

                <div className="p-6 bg-white dark:bg-admin-dark-surface border border-[#f5f5f5] dark:border-admin-dark-border rounded-2xl shadow-sm transition-colors duration-300">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-[#f4f7f4] dark:bg-admin-dark-bg rounded-lg">
                            <DollarSign className="size-5 text-[#718571] dark:text-admin-dark-text-secondary" />
                        </div>
                        <span className="flex items-center gap-1 text-xs font-bold text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-1.5 py-0.5 rounded border border-red-100 dark:border-red-500/20">
                            <TrendingDown className="size-3" />
                            +4.2%
                        </span>
                    </div>
                    <p className="text-[#a3a3a3] text-xs uppercase tracking-wider font-bold mb-1">Total Expenses</p>
                    <h3 className="text-3xl font-bold text-[#171717] dark:text-admin-dark-text-primary">€32,100</h3>
                </div>

                <div className="p-6 bg-white dark:bg-admin-dark-surface border border-[#f5f5f5] dark:border-admin-dark-border rounded-2xl shadow-sm transition-colors duration-300">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-[#f4f7f4] dark:bg-admin-dark-bg rounded-lg">
                            <ArrowUpRight className="size-5 text-[#718571] dark:text-admin-dark-text-secondary" />
                        </div>
                        <span className="flex items-center gap-1 text-xs font-bold text-[#718571] dark:text-emerald-400 bg-[#f4f7f4] dark:bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-100 dark:border-emerald-500/20">
                            <TrendingUp className="size-3" />
                            +18.2%
                        </span>
                    </div>
                    <p className="text-[#a3a3a3] text-xs uppercase tracking-wider font-bold mb-1">Net Profit</p>
                    <h3 className="text-3xl font-bold text-[#171717] dark:text-admin-dark-text-primary">€92,400</h3>
                </div>
            </div>

            {/* Transactions Placeholder */}
            <div className="bg-white dark:bg-admin-dark-surface rounded-2xl border border-[#f5f5f5] dark:border-admin-dark-border overflow-hidden shadow-sm h-64 flex flex-col items-center justify-center gap-3 transition-colors duration-300">
                <Wallet className="size-8 text-[#a3a3a3]/30 dark:text-admin-dark-text-secondary/20" />
                <p className="text-sm font-medium text-[#a3a3a3]">Transaction history coming soon</p>
            </div>
        </div>
    );
}
