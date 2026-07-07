"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ScrollText, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { ActivityTimeline } from "@/components/admin/ActivityTimeline";
import { OwnerActivityPanel } from "@/components/admin/OwnerActivityPanel";

type TabType = "log" | "owners";

export default function ActivityLogPage() {
    const t = useTranslations("AdminOwnerActivity");
    const [activeTab, setActiveTab] = useState<TabType>("log");

    return (
        <div className="container mx-auto p-6 max-w-6xl">
            <div className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                    {activeTab === "log" ? "Activity Log" : t("title")}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                    {activeTab === "log"
                        ? "A chronological record of system events and user actions. Visibility is restricted based on your administrative privileges."
                        : t("subtitle")}
                </p>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 p-1 bg-white dark:bg-white/5 border border-[#f5f5f5] dark:border-white/10 rounded-2xl w-full md:w-fit shadow-sm mb-8">
                <button
                    onClick={() => setActiveTab("log")}
                    className={cn(
                        "flex items-center gap-2 px-4 md:px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap shrink-0",
                        activeTab === "log"
                            ? "bg-[#171717] dark:bg-white text-white dark:text-black shadow-lg"
                            : "text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white"
                    )}
                >
                    <ScrollText className="size-4" />
                    {t("tabs.log")}
                </button>
                <button
                    onClick={() => setActiveTab("owners")}
                    className={cn(
                        "flex items-center gap-2 px-4 md:px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap shrink-0",
                        activeTab === "owners"
                            ? "bg-[#171717] dark:bg-white text-white dark:text-black shadow-lg"
                            : "text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white"
                    )}
                >
                    <UsersRound className="size-4" />
                    {t("tabs.owners")}
                </button>
            </div>

            {activeTab === "log" ? (
                <div className="bg-white dark:bg-admin-dark-surface rounded-xl border border-gray-200 dark:border-admin-dark-border p-6 shadow-sm">
                    <ActivityTimeline limit={50} />
                </div>
            ) : (
                <OwnerActivityPanel />
            )}
        </div>
    );
}
