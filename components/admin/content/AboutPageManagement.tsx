"use client";

import { useEffect, useState, useCallback } from "react";
import {
    Loader2,
    Save,
    Plus,
    Trash2,
    Upload,
    Image as ImageIcon,
    GripVertical,
    ChevronDown,
    Check,
    Image as ImgIcon,
    AlignLeft,
    Clock,
    Film,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getPageSections, upsertPageSection, deletePageSection } from "@/app/actions/cms";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { CmsPageSection } from "@/lib/types";

const PAGE_SLUG = "about-us";

const languages = [
    { code: "en", label: "English (EN)", flag: "/legacy/home/images/english-flag.svg" },
    { code: "pt", label: "Português (PT)", flag: "/legacy/home/images/portuguese-flag.svg" },
    { code: "he", label: "Hebrew (HE)", flag: "/legacy/home/images/he.svg" },
];

interface HeroState {
    id?: string;
    title: string;
    image_url: string;
    video_url: string;
}

interface IntroState {
    id?: string;
    content: string;
}

interface TimelineItem {
    id?: string;
    key: string; // stable local key for React lists / drag
    subtitle: string; // year
    title: string;
    content: string;
    image_url: string;
}

interface AboutPageManagementProps {
    locale: string;
}

let tempCounter = 0;
const newKey = () => `tmp-${Date.now()}-${tempCounter++}`;

export default function AboutPageManagement({ locale }: AboutPageManagementProps) {
    const t = useTranslations("AdminContent.about");

    const [filterLocale, setFilterLocale] = useState(locale);
    const [showLangDropdown, setShowLangDropdown] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [hero, setHero] = useState<HeroState>({ title: "", image_url: "", video_url: "" });
    const [intro, setIntro] = useState<IntroState>({ content: "" });
    const [timeline, setTimeline] = useState<TimelineItem[]>([]);
    const [deletedIds, setDeletedIds] = useState<string[]>([]);

    const [uploadingKey, setUploadingKey] = useState<string | null>(null); // 'hero' | timeline key
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    const load = useCallback(async () => {
        setIsLoading(true);
        const data = await getPageSections(PAGE_SLUG, filterLocale);
        const heroRow = data.find((s) => s.section_type === "hero");
        const introRow = data.find((s) => s.section_type === "intro");
        const timelineRows = data
            .filter((s) => s.section_type === "timeline")
            .sort((a, b) => a.display_order - b.display_order);

        setHero({
            id: heroRow?.id,
            title: heroRow?.title || "",
            image_url: heroRow?.image_url || "",
            video_url: heroRow?.video_url || "",
        });
        setIntro({ id: introRow?.id, content: introRow?.content || "" });
        setTimeline(
            timelineRows.map((r) => ({
                id: r.id,
                key: r.id || newKey(),
                subtitle: r.subtitle || "",
                title: r.title || "",
                content: r.content || "",
                image_url: r.image_url || "",
            }))
        );
        setDeletedIds([]);
        setIsLoading(false);
    }, [filterLocale]);

    useEffect(() => {
        load();
    }, [load]);

    const uploadImage = async (file: File): Promise<string | null> => {
        const fileExt = file.name.split(".").pop();
        const fileName = `about-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;
        const filePath = `about/${fileName}`;
        const { error: uploadError } = await supabase.storage.from("blog-images").upload(filePath, file);
        if (uploadError) {
            toast.error("Upload failed: " + uploadError.message);
            return null;
        }
        const {
            data: { publicUrl },
        } = supabase.storage.from("blog-images").getPublicUrl(filePath);
        return publicUrl;
    };

    const handleHeroVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingKey("hero-video");
        const url = await uploadImage(file);
        if (url) setHero((prev) => ({ ...prev, video_url: url }));
        setUploadingKey(null);
    };

    const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingKey("hero");
        const url = await uploadImage(file);
        if (url) setHero((prev) => ({ ...prev, image_url: url }));
        setUploadingKey(null);
    };

    const handleTimelineUpload = async (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingKey(key);
        const url = await uploadImage(file);
        if (url) {
            setTimeline((prev) => prev.map((item) => (item.key === key ? { ...item, image_url: url } : item)));
        }
        setUploadingKey(null);
    };

    const updateTimelineItem = (key: string, field: keyof TimelineItem, value: string) => {
        setTimeline((prev) => prev.map((item) => (item.key === key ? { ...item, [field]: value } : item)));
    };

    const addTimelineItem = () => {
        const lastYear = timeline.length > 0 ? parseInt(timeline[timeline.length - 1].subtitle, 10) : NaN;
        const nextYear = Number.isFinite(lastYear) ? String(lastYear + 1) : "";
        setTimeline((prev) => [
            ...prev,
            { key: newKey(), subtitle: nextYear, title: "", content: "", image_url: "" },
        ]);
    };

    const removeTimelineItem = (key: string) => {
        setTimeline((prev) => {
            const item = prev.find((i) => i.key === key);
            if (item?.id) setDeletedIds((d) => [...d, item.id as string]);
            return prev.filter((i) => i.key !== key);
        });
    };

    // Drag & drop reorder
    const handleDragStart = (index: number) => setDraggedIndex(index);
    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex !== null && draggedIndex !== index) setDragOverIndex(index);
    };
    const handleDrop = (targetIndex: number) => {
        if (draggedIndex === null || draggedIndex === targetIndex) {
            setDraggedIndex(null);
            setDragOverIndex(null);
            return;
        }
        setTimeline((prev) => {
            const next = [...prev];
            const [moved] = next.splice(draggedIndex, 1);
            next.splice(targetIndex, 0, moved);
            return next;
        });
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const buildPayload = (overrides: Partial<CmsPageSection>): CmsPageSection => ({
        page_slug: PAGE_SLUG,
        title: "",
        content: "",
        icon: "",
        locale: filterLocale,
        display_order: 0,
        list_items: [],
        ...overrides,
    });

    const handleSave = async () => {
        if (!hero.title.trim()) {
            toast.error(t("validation.heroTitle"));
            return;
        }
        for (const item of timeline) {
            if (!item.subtitle.trim() || !item.title.trim()) {
                toast.error(t("validation.timelineFields"));
                return;
            }
        }

        setIsSaving(true);
        try {
            // Hero
            const heroRes = await upsertPageSection(
                buildPayload({
                    id: hero.id,
                    section_type: "hero",
                    title: hero.title,
                    image_url: hero.image_url,
                    video_url: hero.video_url,
                    display_order: 0,
                })
            );
            if (!heroRes.success) throw new Error(heroRes.error);

            // Intro
            const introRes = await upsertPageSection(
                buildPayload({
                    id: intro.id,
                    section_type: "intro",
                    title: "",
                    content: intro.content,
                    display_order: 1,
                })
            );
            if (!introRes.success) throw new Error(introRes.error);

            // Timeline (display_order 10+)
            for (let i = 0; i < timeline.length; i++) {
                const item = timeline[i];
                const res = await upsertPageSection(
                    buildPayload({
                        id: item.id,
                        section_type: "timeline",
                        subtitle: item.subtitle,
                        title: item.title,
                        content: item.content,
                        image_url: item.image_url,
                        display_order: 10 + i,
                    })
                );
                if (!res.success) throw new Error(res.error);
            }

            // Deletions
            for (const id of deletedIds) {
                await deletePageSection(id);
            }

            toast.success(t("saved"));
            await load();
        } catch (err) {
            toast.error("Save failed: " + (err instanceof Error ? err.message : String(err)));
        } finally {
            setIsSaving(false);
        }
    };

    const selectedLang = languages.find((l) => l.code === filterLocale);

    return (
        <div className="space-y-6">
            {/* Top bar: language + save */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white dark:bg-white/5 p-6 rounded-3xl border border-[#f5f5f5] dark:border-white/10 shadow-sm">
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-[#a3a3a3] uppercase tracking-widest">
                        {t("contentLanguage")}
                    </span>
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setShowLangDropdown(!showLangDropdown)}
                            className="flex items-center gap-2 px-4 py-3 bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f0f0f0] dark:border-white/5 rounded-2xl text-xs font-bold transition-all cursor-pointer text-left focus:outline-none"
                        >
                            {selectedLang?.flag && (
                                <img
                                    src={selectedLang.flag}
                                    alt={selectedLang.label}
                                    className="w-4 h-4 rounded-full object-cover border border-black/10 dark:border-white/10 shrink-0"
                                />
                            )}
                            <span className="truncate text-[#171717] dark:text-admin-dark-text-primary">
                                {selectedLang?.label}
                            </span>
                            <ChevronDown className="size-3.5 text-gray-400 shrink-0 ml-1" />
                        </button>
                        {showLangDropdown && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowLangDropdown(false)} />
                                <div className="absolute top-full left-0 mt-2 bg-white dark:bg-[#1a2331] border border-[#f0f0f0] dark:border-white/10 rounded-2xl shadow-xl z-50 overflow-hidden divide-y divide-[#f5f5f5] dark:divide-white/5 w-48">
                                    {languages.map((lang) => {
                                        const isSelected = filterLocale === lang.code;
                                        return (
                                            <button
                                                key={lang.code}
                                                type="button"
                                                onClick={() => {
                                                    setFilterLocale(lang.code);
                                                    setShowLangDropdown(false);
                                                }}
                                                className={`w-full px-4 py-2.5 flex items-center justify-between text-left text-xs font-bold transition-colors ${
                                                    isSelected
                                                        ? "bg-[#a39076]/10 text-[#a39076] dark:bg-[#a39076]/20"
                                                        : "text-[#171717] dark:text-admin-dark-text-primary hover:bg-[#fafafa] dark:hover:bg-white/5"
                                                }`}
                                            >
                                                <span className="flex items-center gap-2 min-w-0">
                                                    <img
                                                        src={lang.flag}
                                                        alt={lang.label}
                                                        className="w-4 h-4 rounded-full object-cover border border-black/10 dark:border-white/10 shrink-0"
                                                    />
                                                    <span className="truncate">{lang.label}</span>
                                                </span>
                                                {isSelected && <Check className="size-3 text-[#a39076] shrink-0 ml-1" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={isSaving || isLoading}
                    className="flex items-center gap-2 px-6 py-3.5 bg-[#171717] dark:bg-white text-white dark:text-black rounded-2xl text-sm font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-50 disabled:hover:scale-100"
                >
                    {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                    {t("save")}
                </button>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center gap-3 py-32">
                    <Loader2 className="size-8 animate-spin text-admin-accent" />
                    <span className="text-sm font-bold text-[#a3a3a3] uppercase tracking-widest">{t("loading")}</span>
                </div>
            ) : (
                <>
                    {/* Hero */}
                    <section className="bg-white dark:bg-white/5 p-6 md:p-8 rounded-3xl border border-[#f5f5f5] dark:border-white/10 shadow-sm space-y-6">
                        <div className="flex items-center gap-2">
                            <ImgIcon className="size-5 text-[#a39076]" />
                            <h3 className="text-sm font-black text-[#171717] dark:text-admin-dark-text-primary uppercase tracking-tight">
                                {t("hero.title")}
                            </h3>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-[#a3a3a3] uppercase tracking-widest px-1 block">
                                    {t("hero.heading")}
                                </label>
                                <input
                                    type="text"
                                    value={hero.title}
                                    onChange={(e) => setHero((prev) => ({ ...prev, title: e.target.value }))}
                                    className="w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f0f0f0] dark:border-white/5 py-3.5 px-5 rounded-2xl text-sm font-semibold outline-none focus:ring-1 focus:ring-admin-accent transition-all"
                                />
                                <p className="text-[10px] text-[#a3a3a3] italic px-1">{t("hero.headingHint")}</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-[#a3a3a3] uppercase tracking-widest px-1 block">
                                    {t("hero.image")}
                                </label>
                                <div
                                    className={`group relative h-[120px] rounded-2xl border-2 border-dashed overflow-hidden flex items-center justify-center transition-all cursor-pointer ${
                                        hero.image_url
                                            ? "border-solid border-admin-accent/30"
                                            : "border-[#f0f0f0] dark:border-white/10 hover:border-admin-accent bg-[#fafafa] dark:bg-admin-dark-bg"
                                    }`}
                                >
                                    {hero.image_url ? (
                                        <>
                                            <img src={hero.image_url} alt="Hero" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-2">
                                                <Upload className="size-5 text-white" />
                                                <span className="text-[10px] font-black text-white uppercase tracking-widest">
                                                    {t("changeImage")}
                                                </span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 text-[#a3a3a3]">
                                            <ImageIcon className="size-7 opacity-30" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">
                                                {t("addImage")}
                                            </span>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        onChange={handleHeroUpload}
                                        disabled={uploadingKey === "hero"}
                                    />
                                    {uploadingKey === "hero" && (
                                        <div className="absolute inset-0 bg-white/80 dark:bg-black/80 flex items-center justify-center">
                                            <Loader2 className="size-6 animate-spin text-admin-accent" />
                                        </div>
                                    )}
                                </div>
                                <p className="text-[10px] text-[#a3a3a3] italic px-1">{t("hero.imageHint")}</p>

                                {/* Optional looping video */}
                                <label className="text-[10px] font-black text-[#a3a3a3] uppercase tracking-widest px-1 block pt-3">
                                    {t("hero.video")}
                                </label>
                                <div
                                    className={`group relative h-[120px] rounded-2xl border-2 border-dashed overflow-hidden flex items-center justify-center transition-all cursor-pointer ${
                                        hero.video_url
                                            ? "border-solid border-admin-accent/30"
                                            : "border-[#f0f0f0] dark:border-white/10 hover:border-admin-accent bg-[#fafafa] dark:bg-admin-dark-bg"
                                    }`}
                                >
                                    {hero.video_url ? (
                                        <>
                                            <video
                                                key={hero.video_url}
                                                src={hero.video_url}
                                                className="w-full h-full object-cover"
                                                autoPlay
                                                loop
                                                muted
                                                playsInline
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-2">
                                                <Upload className="size-5 text-white" />
                                                <span className="text-[10px] font-black text-white uppercase tracking-widest">
                                                    {t("changeVideo")}
                                                </span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 text-[#a3a3a3]">
                                            <Film className="size-7 opacity-30" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">
                                                {t("addVideo")}
                                            </span>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        accept="video/*"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        onChange={handleHeroVideoUpload}
                                        disabled={uploadingKey === "hero-video"}
                                    />
                                    {uploadingKey === "hero-video" && (
                                        <div className="absolute inset-0 bg-white/80 dark:bg-black/80 flex items-center justify-center">
                                            <Loader2 className="size-6 animate-spin text-admin-accent" />
                                        </div>
                                    )}
                                </div>
                                {hero.video_url && (
                                    <button
                                        type="button"
                                        onClick={() => setHero((prev) => ({ ...prev, video_url: "" }))}
                                        className="flex items-center gap-1.5 text-[10px] font-bold text-[#a3a3a3] hover:text-red-500 transition-colors px-1 pt-1"
                                    >
                                        <Trash2 className="size-3.5" />
                                        {t("removeVideo")}
                                    </button>
                                )}
                                <p className="text-[10px] text-[#a3a3a3] italic px-1">{t("hero.videoHint")}</p>
                            </div>
                        </div>
                    </section>

                    {/* Intro */}
                    <section className="bg-white dark:bg-white/5 p-6 md:p-8 rounded-3xl border border-[#f5f5f5] dark:border-white/10 shadow-sm space-y-4">
                        <div className="flex items-center gap-2">
                            <AlignLeft className="size-5 text-[#a39076]" />
                            <h3 className="text-sm font-black text-[#171717] dark:text-admin-dark-text-primary uppercase tracking-tight">
                                {t("intro.title")}
                            </h3>
                        </div>
                        <textarea
                            value={intro.content}
                            onChange={(e) => setIntro((prev) => ({ ...prev, content: e.target.value }))}
                            rows={6}
                            className="w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f0f0f0] dark:border-white/5 py-4 px-5 rounded-2xl text-sm font-medium leading-relaxed outline-none focus:ring-1 focus:ring-admin-accent transition-all resize-none"
                        />
                        <p className="text-[10px] text-[#a3a3a3] italic px-1">{t("intro.hint")}</p>
                    </section>

                    {/* Timeline */}
                    <section className="bg-white dark:bg-white/5 p-6 md:p-8 rounded-3xl border border-[#f5f5f5] dark:border-white/10 shadow-sm space-y-5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Clock className="size-5 text-[#a39076]" />
                                <h3 className="text-sm font-black text-[#171717] dark:text-admin-dark-text-primary uppercase tracking-tight">
                                    {t("timeline.title")}
                                </h3>
                            </div>
                            <button
                                onClick={addTimelineItem}
                                className="flex items-center gap-2 px-4 py-2.5 bg-[#171717] dark:bg-white text-white dark:text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg"
                            >
                                <Plus className="size-3.5" />
                                {t("timeline.add")}
                            </button>
                        </div>

                        {timeline.length === 0 ? (
                            <div className="py-12 text-center text-[#a3a3a3] font-medium italic border border-dashed border-[#f0f0f0] dark:border-white/10 rounded-2xl">
                                {t("timeline.empty")}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {timeline.map((item, index) => (
                                    <div
                                        key={item.key}
                                        onDragOver={(e) => handleDragOver(e, index)}
                                        onDrop={() => handleDrop(index)}
                                        className={`flex gap-3 items-stretch border rounded-2xl p-3 transition-all ${
                                            dragOverIndex === index && draggedIndex !== index
                                                ? "border-admin-accent bg-admin-accent/5"
                                                : "border-[#f0f0f0] dark:border-white/10"
                                        } ${draggedIndex === index ? "opacity-40" : ""}`}
                                    >
                                        <div
                                            draggable
                                            onDragStart={() => handleDragStart(index)}
                                            onDragEnd={() => {
                                                setDraggedIndex(null);
                                                setDragOverIndex(null);
                                            }}
                                            className="flex items-center text-[#cfcabd] cursor-grab active:cursor-grabbing px-1"
                                            title={t("timeline.drag")}
                                        >
                                            <GripVertical className="size-5" />
                                        </div>

                                        {/* Image */}
                                        <div className="relative w-[88px] h-[88px] rounded-xl overflow-hidden shrink-0 group bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f0f0f0] dark:border-white/5 flex items-center justify-center">
                                            {item.image_url ? (
                                                <img
                                                    src={item.image_url}
                                                    alt={item.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <ImageIcon className="size-6 text-[#a3a3a3] opacity-30" />
                                            )}
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                                <Upload className="size-4 text-white" />
                                            </div>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                onChange={(e) => handleTimelineUpload(item.key, e)}
                                                disabled={uploadingKey === item.key}
                                            />
                                            {uploadingKey === item.key && (
                                                <div className="absolute inset-0 bg-white/80 dark:bg-black/80 flex items-center justify-center">
                                                    <Loader2 className="size-5 animate-spin text-admin-accent" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Fields */}
                                        <div className="flex-1 min-w-0 space-y-2">
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={item.subtitle}
                                                    onChange={(e) =>
                                                        updateTimelineItem(item.key, "subtitle", e.target.value)
                                                    }
                                                    placeholder={t("timeline.yearPlaceholder")}
                                                    className="w-20 bg-[#a39076]/10 border border-[#a39076]/20 text-[#a39076] py-2 px-3 rounded-lg text-xs font-bold text-center outline-none focus:ring-1 focus:ring-admin-accent"
                                                />
                                                <input
                                                    type="text"
                                                    value={item.title}
                                                    onChange={(e) =>
                                                        updateTimelineItem(item.key, "title", e.target.value)
                                                    }
                                                    placeholder={t("timeline.titlePlaceholder")}
                                                    className="flex-1 bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f0f0f0] dark:border-white/5 py-2 px-3 rounded-lg text-xs font-semibold outline-none focus:ring-1 focus:ring-admin-accent"
                                                />
                                            </div>
                                            <textarea
                                                value={item.content}
                                                onChange={(e) =>
                                                    updateTimelineItem(item.key, "content", e.target.value)
                                                }
                                                placeholder={t("timeline.textPlaceholder")}
                                                rows={2}
                                                className="w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f0f0f0] dark:border-white/5 py-2 px-3 rounded-lg text-xs font-medium leading-relaxed outline-none focus:ring-1 focus:ring-admin-accent resize-none"
                                            />
                                        </div>

                                        <button
                                            onClick={() => removeTimelineItem(item.key)}
                                            className="p-2 text-[#a3a3a3] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all self-start"
                                            title={t("timeline.remove")}
                                        >
                                            <Trash2 className="size-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </>
            )}
        </div>
    );
}
