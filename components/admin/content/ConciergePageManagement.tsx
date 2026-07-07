"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, ChevronDown, Image as ImageIcon, Loader2, PanelTop, Plus, Save, TextQuote, Trash2, Upload } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getPageSections, upsertPageSection, deletePageSection } from "@/app/actions/cms";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { CmsPageSection } from "@/lib/types";

const PAGE_SLUG = "concierge";

// EN/PT only — the client does not use Hebrew for now.
const languages = [
    { code: "en", label: "English (EN)", flag: "/legacy/home/images/english-flag.svg" },
    { code: "pt", label: "Português (PT)", flag: "/legacy/home/images/portuguese-flag.svg" },
];

interface SectionState {
    id?: string;
    subtitle: string;
    title: string;
    content: string;
    image_url: string;
}

interface Highlight {
    label: string;
    desc: string;
}

interface DeckImage {
    id?: string;
    key: string;
    image_url: string;
}

let tempCounter = 0;
const newKey = () => `tmp-${Date.now()}-${tempCounter++}`;

const emptySection = (): SectionState => ({ subtitle: "", title: "", content: "", image_url: "" });

const toState = (row?: CmsPageSection): SectionState => ({
    id: row?.id,
    subtitle: row?.subtitle || "",
    title: row?.title || "",
    content: row?.content || "",
    image_url: row?.image_url || "",
});

export default function ConciergePageManagement({ locale }: { locale: string }) {
    const t = useTranslations("AdminContent.conciergePage");

    const [filterLocale, setFilterLocale] = useState(locale === "pt" ? "pt" : "en");
    const [showLangDropdown, setShowLangDropdown] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [uploadingKey, setUploadingKey] = useState<string | null>(null);

    const [hero, setHero] = useState<SectionState>(emptySection());
    const [intro, setIntro] = useState<SectionState>(emptySection());
    const [highlights, setHighlights] = useState<Highlight[]>([
        { label: "", desc: "" },
        { label: "", desc: "" },
    ]);
    const [servicesHeader, setServicesHeader] = useState<SectionState>(emptySection());
    const [deckImages, setDeckImages] = useState<DeckImage[]>([]);
    const [deletedImageIds, setDeletedImageIds] = useState<string[]>([]);

    const load = useCallback(async () => {
        setIsLoading(true);
        const data = await getPageSections(PAGE_SLUG, filterLocale);
        setHero(toState(data.find((s) => s.section_type === "hero")));
        const introRow = data.find((s) => s.section_type === "intro");
        setIntro(toState(introRow));
        const items = (introRow?.list_items || []) as Highlight[];
        setHighlights(
            items.length > 0
                ? items.map((i) => ({ label: i.label || "", desc: i.desc || "" }))
                : [
                      { label: "", desc: "" },
                      { label: "", desc: "" },
                  ]
        );
        setServicesHeader(toState(data.find((s) => s.section_type === "services-header")));
        setDeckImages(
            data
                .filter((s) => s.section_type === "intro-image" && s.image_url)
                .sort((a, b) => a.display_order - b.display_order)
                .map((s) => ({ id: s.id, key: s.id || newKey(), image_url: s.image_url as string }))
        );
        setDeletedImageIds([]);
        setIsLoading(false);
    }, [filterLocale]);

    useEffect(() => {
        load();
    }, [load]);

    const uploadImage = async (file: File): Promise<string | null> => {
        const fileExt = file.name.split(".").pop();
        const fileName = `page-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;
        const { error } = await supabase.storage.from("concierge").upload(`page/${fileName}`, file);
        if (error) {
            toast.error("Upload failed: " + error.message);
            return null;
        }
        const { data: { publicUrl } } = supabase.storage.from("concierge").getPublicUrl(`page/${fileName}`);
        return publicUrl;
    };

    const handleImageUpload =
        (key: string, setter: React.Dispatch<React.SetStateAction<SectionState>>) =>
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setUploadingKey(key);
            const url = await uploadImage(file);
            if (url) setter((prev) => ({ ...prev, image_url: url }));
            setUploadingKey(null);
        };

    const handleDeckUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingKey("deck");
        const url = await uploadImage(file);
        if (url) setDeckImages((prev) => [...prev, { key: newKey(), image_url: url }]);
        setUploadingKey(null);
        e.target.value = "";
    };

    const removeDeckImage = (key: string) => {
        setDeckImages((prev) => {
            const item = prev.find((i) => i.key === key);
            if (item?.id) setDeletedImageIds((d) => [...d, item.id as string]);
            return prev.filter((i) => i.key !== key);
        });
    };

    const handleSave = async () => {
        if (!hero.title.trim()) {
            toast.error(t("validation.heroTitle"));
            return;
        }
        setIsSaving(true);
        try {
            const base = { page_slug: PAGE_SLUG, icon: "", locale: filterLocale, list_items: [] as { label: string; desc: string }[] };
            const payloads: CmsPageSection[] = [
                { ...base, id: hero.id, section_type: "hero", subtitle: hero.subtitle, title: hero.title, content: "", image_url: hero.image_url, display_order: 0 },
                { ...base, id: intro.id, section_type: "intro", subtitle: intro.subtitle, title: intro.title, content: intro.content, image_url: intro.image_url, display_order: 1, list_items: highlights.filter((h) => h.label.trim() || h.desc.trim()) },
                { ...base, id: servicesHeader.id, section_type: "services-header", subtitle: servicesHeader.subtitle, title: servicesHeader.title, content: "", display_order: 2 },
            ];
            // Deck images: one row per image, display_order 20+ keeps them after the fixed sections.
            for (let i = 0; i < deckImages.length; i++) {
                const img = deckImages[i];
                payloads.push({ ...base, id: img.id, section_type: "intro-image", subtitle: "", title: "", content: "", image_url: img.image_url, display_order: 20 + i });
            }
            for (const payload of payloads) {
                const res = await upsertPageSection(payload);
                if (!res.success) throw new Error(res.error);
            }
            for (const id of deletedImageIds) {
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

    const inputCls =
        "w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f0f0f0] dark:border-white/5 py-3.5 px-5 rounded-2xl text-sm font-semibold outline-none focus:ring-1 focus:ring-admin-accent transition-all";
    const labelCls = "text-[10px] font-black text-[#a3a3a3] uppercase tracking-widest px-1 block";

    const ImageTile = ({ value, uploadKey, onUpload }: { value: string; uploadKey: string; onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void }) => (
        <div className="group relative h-[140px] rounded-2xl border-2 border-dashed overflow-hidden flex items-center justify-center transition-all cursor-pointer border-[#f0f0f0] dark:border-white/10 hover:border-admin-accent bg-[#fafafa] dark:bg-admin-dark-bg">
            {value ? (
                <>
                    <img src={value} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-2">
                        <Upload className="size-5 text-white" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">{t("changeImage")}</span>
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center gap-2 text-[#a3a3a3]">
                    <ImageIcon className="size-7 opacity-30" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{t("addImage")}</span>
                </div>
            )}
            <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={onUpload} disabled={uploadingKey === uploadKey} />
            {uploadingKey === uploadKey && (
                <div className="absolute inset-0 bg-white/80 dark:bg-black/80 flex items-center justify-center">
                    <Loader2 className="size-6 animate-spin text-admin-accent" />
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Top bar: language + save */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white dark:bg-white/5 p-6 rounded-3xl border border-[#f5f5f5] dark:border-white/10 shadow-sm">
                <div className="flex items-center gap-3">
                    <span className={labelCls}>{t("contentLanguage")}</span>
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setShowLangDropdown(!showLangDropdown)}
                            className="flex items-center gap-2 px-4 py-3 bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f0f0f0] dark:border-white/5 rounded-2xl text-xs font-bold transition-all cursor-pointer text-left focus:outline-none"
                        >
                            {selectedLang?.flag && <img src={selectedLang.flag} alt={selectedLang.label} className="w-4 h-4 rounded-full object-cover border border-black/10 dark:border-white/10 shrink-0" />}
                            <span className="truncate text-[#171717] dark:text-admin-dark-text-primary">{selectedLang?.label}</span>
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
                                                className={`w-full px-4 py-2.5 flex items-center justify-between text-left text-xs font-bold transition-colors ${isSelected ? "bg-[#a39076]/10 text-[#a39076] dark:bg-[#a39076]/20" : "text-[#171717] dark:text-admin-dark-text-primary hover:bg-[#fafafa] dark:hover:bg-white/5"}`}
                                            >
                                                <span className="flex items-center gap-2 min-w-0">
                                                    <img src={lang.flag} alt={lang.label} className="w-4 h-4 rounded-full object-cover border border-black/10 dark:border-white/10 shrink-0" />
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
                            <PanelTop className="size-5 text-[#a39076]" />
                            <h3 className="text-sm font-black text-[#171717] dark:text-admin-dark-text-primary uppercase tracking-tight">{t("hero.title")}</h3>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className={labelCls}>{t("hero.overline")}</label>
                                    <input type="text" value={hero.subtitle} onChange={(e) => setHero((p) => ({ ...p, subtitle: e.target.value }))} className={inputCls} />
                                </div>
                                <div className="space-y-2">
                                    <label className={labelCls}>{t("hero.heading")}</label>
                                    <input type="text" value={hero.title} onChange={(e) => setHero((p) => ({ ...p, title: e.target.value }))} className={inputCls} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className={labelCls}>{t("hero.image")}</label>
                                <ImageTile value={hero.image_url} uploadKey="hero" onUpload={handleImageUpload("hero", setHero)} />
                            </div>
                        </div>
                    </section>

                    {/* Intro */}
                    <section className="bg-white dark:bg-white/5 p-6 md:p-8 rounded-3xl border border-[#f5f5f5] dark:border-white/10 shadow-sm space-y-6">
                        <div className="flex items-center gap-2">
                            <TextQuote className="size-5 text-[#a39076]" />
                            <h3 className="text-sm font-black text-[#171717] dark:text-admin-dark-text-primary uppercase tracking-tight">{t("intro.title")}</h3>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className={labelCls}>{t("intro.overline")}</label>
                                    <input type="text" value={intro.subtitle} onChange={(e) => setIntro((p) => ({ ...p, subtitle: e.target.value }))} className={inputCls} />
                                </div>
                                <div className="space-y-2">
                                    <label className={labelCls}>{t("intro.heading")}</label>
                                    <input type="text" value={intro.title} onChange={(e) => setIntro((p) => ({ ...p, title: e.target.value }))} className={inputCls} />
                                </div>
                                <div className="space-y-2">
                                    <label className={labelCls}>{t("intro.text")}</label>
                                    <textarea value={intro.content} onChange={(e) => setIntro((p) => ({ ...p, content: e.target.value }))} rows={5} className={`${inputCls} resize-none`} />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className={labelCls}>{t("intro.image")}</label>
                                    <ImageTile value={intro.image_url} uploadKey="intro" onUpload={handleImageUpload("intro", setIntro)} />
                                </div>
                                <div className="space-y-2">
                                    <label className={labelCls}>{t("intro.gallery")}</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {deckImages.map((img, i) => (
                                            <div key={img.key} className="group relative aspect-[4/5] rounded-xl overflow-hidden border border-[#f0f0f0] dark:border-white/10">
                                                <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                                                {i === 0 && (
                                                    <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] font-black uppercase tracking-widest">
                                                        {t("intro.galleryFront")}
                                                    </span>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => removeDeckImage(img.key)}
                                                    aria-label={t("intro.removeImage")}
                                                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all"
                                                >
                                                    <Trash2 className="size-3" />
                                                </button>
                                            </div>
                                        ))}
                                        <label className="relative aspect-[4/5] rounded-xl border-2 border-dashed border-[#f0f0f0] dark:border-white/10 hover:border-admin-accent flex flex-col items-center justify-center gap-1.5 text-[#a3a3a3] hover:text-admin-accent cursor-pointer transition-all">
                                            {uploadingKey === "deck" ? (
                                                <Loader2 className="size-5 animate-spin text-admin-accent" />
                                            ) : (
                                                <>
                                                    <Plus className="size-5" />
                                                    <span className="text-[9px] font-black uppercase tracking-widest">{t("addImage")}</span>
                                                </>
                                            )}
                                            <input type="file" accept="image/*" className="hidden" onChange={handleDeckUpload} disabled={uploadingKey === "deck"} />
                                        </label>
                                    </div>
                                    <p className="text-[10px] text-[#a3a3a3] italic px-1">{t("intro.galleryHint")}</p>
                                </div>
                                {highlights.map((h, i) => (
                                    <div key={i} className="space-y-2 p-4 rounded-2xl border border-[#f0f0f0] dark:border-white/10">
                                        <div className="flex items-center justify-between">
                                            <span className={labelCls}>{t("intro.highlight", { n: i + 1 })}</span>
                                            <button
                                                type="button"
                                                onClick={() => setHighlights((prev) => prev.filter((_, j) => j !== i))}
                                                className="p-1.5 text-[#a3a3a3] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                                                aria-label={t("intro.removeHighlight")}
                                            >
                                                <Trash2 className="size-3.5" />
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            placeholder={t("intro.highlightTitle")}
                                            value={h.label}
                                            onChange={(e) => setHighlights((prev) => prev.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                                            className={inputCls}
                                        />
                                        <input
                                            type="text"
                                            placeholder={t("intro.highlightDesc")}
                                            value={h.desc}
                                            onChange={(e) => setHighlights((prev) => prev.map((x, j) => (j === i ? { ...x, desc: e.target.value } : x)))}
                                            className={inputCls}
                                        />
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => setHighlights((prev) => [...prev, { label: "", desc: "" }])}
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-[#f0f0f0] dark:border-white/10 text-[10px] font-black uppercase tracking-widest text-[#a3a3a3] hover:border-admin-accent hover:text-admin-accent transition-all"
                                >
                                    <Plus className="size-3.5" />
                                    {t("intro.addHighlight")}
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Services header */}
                    <section className="bg-white dark:bg-white/5 p-6 md:p-8 rounded-3xl border border-[#f5f5f5] dark:border-white/10 shadow-sm space-y-6">
                        <div className="flex items-center gap-2">
                            <ImageIcon className="size-5 text-[#a39076]" />
                            <h3 className="text-sm font-black text-[#171717] dark:text-admin-dark-text-primary uppercase tracking-tight">{t("servicesHeader.title")}</h3>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className={labelCls}>{t("servicesHeader.overline")}</label>
                                <input type="text" value={servicesHeader.subtitle} onChange={(e) => setServicesHeader((p) => ({ ...p, subtitle: e.target.value }))} className={inputCls} />
                            </div>
                            <div className="space-y-2">
                                <label className={labelCls}>{t("servicesHeader.heading")}</label>
                                <input type="text" value={servicesHeader.title} onChange={(e) => setServicesHeader((p) => ({ ...p, title: e.target.value }))} className={inputCls} />
                            </div>
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}
