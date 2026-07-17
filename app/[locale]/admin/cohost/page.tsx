"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Sparkles, MessagesSquare, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { InboxShell } from "@/components/admin/inbox/InboxShell";
import { BotSettings } from "@/components/admin/inbox/BotSettings";
import { DecisionFeed } from "@/components/admin/cohost/DecisionFeed";
import { PushSettings } from "@/components/admin/cohost/PushSettings";

type TabType = "decisions" | "inbox" | "settings";

function CohostPageInner() {
    const t = useTranslations("AdminCohost");
    const searchParams = useSearchParams();
    const deepDecisionId = searchParams.get("decision");
    // Deep-link de notificação (?decision=…) aterra sempre nas Decisões.
    const initial = deepDecisionId ? "decisions" : ((searchParams.get("tab") as TabType) || "decisions");
    const [activeTab, setActiveTab] = useState<TabType>(
        ["decisions", "inbox", "settings"].includes(initial) ? initial : "decisions",
    );
    const [openReservationId, setOpenReservationId] = useState<string | null>(null);

    const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
        { key: "decisions", label: t("tabs.decisions"), icon: <Sparkles className="size-4" /> },
        { key: "inbox", label: t("tabs.inbox"), icon: <MessagesSquare className="size-4" /> },
        { key: "settings", label: t("tabs.settings"), icon: <Settings2 className="size-4" /> },
    ];

    return (
        <div className={cn("mx-auto p-4 md:p-6", activeTab === "inbox" ? "w-full max-w-none" : "container max-w-3xl")}>
            <div className="mb-4 md:mb-6">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{t("title")}</h1>
                {/* Subtítulo redundante no mobile: a saudação + contexto já orientam. */}
                <p className="hidden md:block text-gray-500 dark:text-gray-400 mt-1 text-sm">{t("subtitle")}</p>
            </div>
            {/* Mobile: 3 terços iguais (ícone sobre texto). Desktop: pills inline w-fit. */}
            <div className="flex items-stretch gap-1 p-1 bg-white dark:bg-white/5 border border-[#f5f5f5] dark:border-white/10 rounded-2xl w-full md:w-fit shadow-sm mb-6">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={cn(
                            "flex flex-1 md:flex-none flex-col md:flex-row items-center justify-center gap-1 md:gap-2 px-2 md:px-6 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all",
                            activeTab === tab.key
                                ? "bg-[#171717] dark:bg-white text-white dark:text-black shadow-lg"
                                : "text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white",
                        )}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>
            {activeTab === "decisions" ? (
                <DecisionFeed initialDecisionId={deepDecisionId} onOpenConversation={(rid) => { setOpenReservationId(rid); setActiveTab("inbox"); }} />
            ) : activeTab === "inbox" ? (
                <InboxShell openReservationId={openReservationId} />
            ) : (
                <div className="rounded-2xl border border-[#f5f5f5] bg-white shadow-sm dark:border-admin-dark-border dark:bg-admin-dark-surface overflow-hidden">
                    <BotSettings globalBotEnabled={true} onChanged={() => {}} />
                    <PushSettings />
                </div>
            )}
        </div>
    );
}

export default function CohostPage() {
    return (
        <Suspense fallback={null}>
            <CohostPageInner />
        </Suspense>
    );
}
