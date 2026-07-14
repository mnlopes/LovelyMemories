"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { MessagesSquare, ScrollText, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { ActivityTimeline } from "@/components/admin/ActivityTimeline";
import { OwnerActivityPanel } from "@/components/admin/OwnerActivityPanel";
import { InboxShell } from "@/components/admin/inbox/InboxShell";
import { getCurrentUserRole } from "@/app/actions/user";

type TabType = "inbox" | "log" | "owners";

export default function ActivityLogPage() {
    const t = useTranslations("AdminOwnerActivity");
    const ti = useTranslations("AiInbox");
    const [activeTab, setActiveTab] = useState<TabType>("log");
    // Rollout: a tab do inbox só aparece a super_admin até o E2E estar validado
    // (as actions ai-inbox também recusam outros roles — defesa em profundidade).
    const [showInbox, setShowInbox] = useState(false);

    useEffect(() => {
        void getCurrentUserRole().then((role) => {
            if (role === "super_admin") {
                setShowInbox(true);
                setActiveTab("inbox");
            }
        }).catch(() => {});
    }, []);

    const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
        ...(showInbox ? [{ key: "inbox" as TabType, label: ti("title"), icon: <MessagesSquare className="size-4" /> }] : []),
        { key: "log", label: t("tabs.log"), icon: <ScrollText className="size-4" /> },
        { key: "owners", label: t("tabs.owners"), icon: <UsersRound className="size-4" /> },
    ];

    return (
        <div className={cn(
            "mx-auto p-6",
            // O inbox usa a largura toda; as outras tabs ficam contidas.
            activeTab === "inbox" ? "w-full max-w-none" : "container max-w-6xl",
        )}>
            <div className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                    {activeTab === "inbox" ? ti("title") : activeTab === "log" ? "Activity Log" : t("title")}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                    {activeTab === "inbox"
                        ? ti("subtitle")
                        : activeTab === "log"
                            ? "A chronological record of system events and user actions. Visibility is restricted based on your administrative privileges."
                            : t("subtitle")}
                </p>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 p-1 bg-white dark:bg-white/5 border border-[#f5f5f5] dark:border-white/10 rounded-2xl w-full md:w-fit shadow-sm mb-8">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={cn(
                            "flex items-center gap-2 px-4 md:px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap shrink-0",
                            activeTab === tab.key
                                ? "bg-[#171717] dark:bg-white text-white dark:text-black shadow-lg"
                                : "text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white"
                        )}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === "inbox" ? (
                <InboxShell />
            ) : activeTab === "log" ? (
                <div className="bg-white dark:bg-admin-dark-surface rounded-xl border border-gray-200 dark:border-admin-dark-border p-6 shadow-sm">
                    <ActivityTimeline limit={50} />
                </div>
            ) : (
                <OwnerActivityPanel />
            )}
        </div>
    );
}
