"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { FileText, Instagram, LayoutGrid, HelpCircle, Shield, Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import BlogManagement from "@/components/admin/content/BlogManagement";
import SocialWallManagement from "@/components/admin/content/SocialWallManagement";
import FaqManagement from "@/components/admin/content/FaqManagement";
import CmsPageManagement from "@/components/admin/content/CmsPageManagement";

type TabType = "blog" | "social" | "faq" | "terms" | "privacy";

export default function AdminContentPage() {
    const params = useParams();
    const locale = (params?.locale as string) || "en";
    const t = useTranslations('AdminContent');
    const [activeTab, setActiveTab] = useState<TabType>("blog");

    return (
        <div className="space-y-10 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-xl bg-admin-accent/10 text-admin-accent">
                            <LayoutGrid className="size-6" />
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight text-[#171717] dark:text-admin-dark-text-primary">
                            {t('title')}
                        </h2>
                    </div>
                    <p className="text-[#a3a3a3] font-medium max-w-2xl">
                        {t('subtitle')}
                    </p>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 p-1 bg-white dark:bg-white/5 border border-[#f5f5f5] dark:border-white/10 rounded-2xl w-fit shadow-sm">
                <button
                    onClick={() => setActiveTab("blog")}
                    className={cn(
                        "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                        activeTab === "blog"
                            ? "bg-[#171717] dark:bg-white text-white dark:text-black shadow-lg"
                            : "text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white"
                    )}
                >
                    <FileText className="size-4" />
                    {t('tabs.blog')}
                </button>
                <button
                    onClick={() => setActiveTab("social")}
                    className={cn(
                        "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                        activeTab === "social"
                            ? "bg-[#171717] dark:bg-white text-white dark:text-black shadow-lg"
                            : "text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white"
                    )}
                >
                    <Instagram className="size-4" />
                    {t('tabs.social')}
                </button>
                <button
                    onClick={() => setActiveTab("faq")}
                    className={cn(
                        "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                        activeTab === "faq"
                            ? "bg-[#171717] dark:bg-white text-white dark:text-black shadow-lg"
                            : "text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white"
                    )}
                >
                    <HelpCircle className="size-4" />
                    {t('tabs.faq')}
                </button>
                <button
                    onClick={() => setActiveTab("terms")}
                    className={cn(
                        "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                        activeTab === "terms"
                            ? "bg-[#171717] dark:bg-white text-white dark:text-black shadow-lg"
                            : "text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white"
                    )}
                >
                    <Scale className="size-4" />
                    {t('tabs.terms')}
                </button>
                <button
                    onClick={() => setActiveTab("privacy")}
                    className={cn(
                        "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                        activeTab === "privacy"
                            ? "bg-[#171717] dark:bg-white text-white dark:text-black shadow-lg"
                            : "text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white"
                    )}
                >
                    <Shield className="size-4" />
                    {t('tabs.privacy')}
                </button>
            </div>

            {/* Content Area */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {activeTab === "blog" ? (
                    <BlogManagement locale={locale} />
                ) : activeTab === "social" ? (
                    <SocialWallManagement locale={locale} />
                ) : activeTab === "faq" ? (
                    <FaqManagement locale={locale} />
                ) : activeTab === "terms" ? (
                    <CmsPageManagement pageSlug="terms-conditions" locale={locale} />
                ) : (
                    <CmsPageManagement pageSlug="privacy-policy" locale={locale} />
                )}
            </div>
        </div>
    );
}
