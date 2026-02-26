import { useFormContext, useFieldArray, useWatch } from "react-hook-form";
import { Plus, Trash2, Image as ImageIcon, Sparkles, ChevronDown } from "lucide-react";
import { PropertyFormData } from "./PropertyFormSchema";
import { useState } from "react";
import { useTranslations } from "next-intl";

interface HighlightsManagerProps {
    activeLang: string;
    dir?: 'ltr' | 'rtl';
}

export default function HighlightsManager({ activeLang, dir = 'ltr' }: HighlightsManagerProps) {
    const t = useTranslations('PropertyEditor');
    const form = useFormContext<PropertyFormData>();

    const highlightsArray = useFieldArray({
        control: form.control,
        name: "highlights",
    });

    // Watch gallery images to allow selection
    const galleryImages = useWatch({
        control: form.control,
        name: "images"
    }) || [];

    const [openSelectorIndex, setOpenSelectorIndex] = useState<number | null>(null);

    const onAddHighlight = () => {
        const firstImage = galleryImages[0]?.url || "";
        highlightsArray.append({
            image: firstImage,
            text: { en: "", pt: "", he: "" }
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-[#f5f5f5] dark:border-admin-dark-border transition-colors">
                <h3 className="text-lg font-bold text-[#171717] dark:text-admin-dark-text-primary">
                    {t('highlights.title')}
                </h3>
                <button
                    type="button"
                    onClick={onAddHighlight}
                    className="flex items-center gap-2 px-4 py-1.5 bg-[#171717] dark:bg-white text-white dark:text-black rounded-xl text-[10px] font-bold uppercase tracking-wider hover:opacity-80 transition-all shadow-sm"
                >
                    <Plus className="size-3" />
                    {t('highlights.addHighlight')}
                </button>
            </div>

            <div className="grid grid-cols-1 gap-6 pt-2">
                {highlightsArray.fields.map((field, index) => (
                    <div
                        key={field.id}
                        className="p-8 bg-white dark:bg-white/5 rounded-[32px] border border-[#f5f5f5] dark:border-white/10 group hover:border-gold-400/50 dark:hover:border-white/20 transition-all shadow-sm hover:shadow-xl flex flex-col md:flex-row gap-8"
                    >
                        {/* Image Preview & Selector */}
                        <div className="w-full md:w-64 space-y-3">
                            <label className="text-[10px] font-bold text-[#a3a3a3] uppercase tracking-wider">{t('highlights.imageLabel')}</label>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setOpenSelectorIndex(openSelectorIndex === index ? null : index)}
                                    className="w-full aspect-video rounded-2xl bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f5f5f5] dark:border-white/10 overflow-hidden group/img relative hover:border-gold-400 dark:hover:border-white transition-all shadow-inner"
                                >
                                    {(field as any).image ? (
                                        <img src={(field as any).image} className="w-full h-full object-cover" alt="Preview" />
                                    ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-[#a3a3a3] gap-2">
                                            <ImageIcon className="size-6" />
                                            <span className="text-[10px] uppercase font-bold">{t('highlights.selectImage')}</span>
                                        </div>
                                    )}
                                    <div className="absolute inset-x-0 bottom-0 bg-black/50 p-2 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold uppercase tracking-wider">
                                        {t('highlights.changeImage')}
                                    </div>
                                </button>

                                {openSelectorIndex === index && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setOpenSelectorIndex(null)} />
                                        <div className="absolute top-full left-0 mt-2 p-3 bg-white rounded-2xl border border-[#eaeaea] shadow-xl z-50 w-full max-h-64 overflow-y-auto animate-in fade-in zoom-in-95 duration-200 grid grid-cols-2 gap-2">
                                            {galleryImages.map((img, i) => (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    onClick={() => {
                                                        const current = highlightsArray.fields[index];
                                                        highlightsArray.update(index, {
                                                            ...current,
                                                            image: img.url
                                                        });
                                                        setOpenSelectorIndex(null);
                                                    }}
                                                    className="aspect-video rounded-lg overflow-hidden border border-[#eaeaea] hover:border-[#171717] transition-all"
                                                >
                                                    <img src={img.url} className="w-full h-full object-cover" alt={`Gallery ${i}`} />
                                                </button>
                                            ))}
                                            {galleryImages.length === 0 && (
                                                <p className="col-span-2 text-[10px] text-center py-4 text-[#a3a3a3]">{t('highlights.uploadFirst')}</p>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Content Input */}
                        <div className="flex-1 space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-bold text-[#a3a3a3] uppercase tracking-wider">
                                    {t('highlights.descriptionLabel', { lang: activeLang.toUpperCase() })}
                                </label>
                                <button
                                    type="button"
                                    onClick={() => highlightsArray.remove(index)}
                                    className="p-1 px-2 text-[10px] font-bold text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all flex items-center gap-1"
                                >
                                    <Trash2 className="size-3" />
                                    {t('highlights.remove')}
                                </button>
                            </div>
                            <textarea
                                key={`highlight-${index}-${activeLang}`}
                                {...form.register(`highlights.${index}.text.${activeLang}` as any)}
                                dir={dir}
                                placeholder={t('highlights.placeholder')}
                                rows={4}
                                className={`w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f5f5f5] dark:border-white/10 rounded-2xl px-5 py-4 text-[#171717] dark:text-admin-dark-text-primary text-sm focus:bg-white dark:focus:bg-admin-dark-surface focus:border-gold-400 dark:focus:border-white transition-all outline-none resize-none font-medium ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
                            />
                            <p className="text-[11px] text-[#a3a3a3] dark:text-admin-dark-text-secondary italic font-medium">{t('highlights.helpText')}</p>
                        </div>
                    </div>
                ))}

                {highlightsArray.fields.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 bg-[#fafafa] dark:bg-admin-dark-bg border-2 border-dashed border-[#eaeaea] dark:border-admin-dark-border rounded-[32px] text-[#a3a3a3] gap-4 transition-colors">
                        <div className="size-12 rounded-full bg-white dark:bg-admin-dark-surface border border-[#eaeaea] dark:border-admin-dark-border flex items-center justify-center shadow-sm">
                            <Sparkles className="size-6 opacity-20" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-bold text-[#171717] dark:text-admin-dark-text-primary transition-colors">{t('highlights.emptyTitle')}</p>
                            <button
                                type="button"
                                onClick={onAddHighlight}
                                className="mt-2 text-[10px] font-bold text-gold-400 hover:text-gold-500 uppercase tracking-widest transition-colors"
                            >
                                {t('highlights.emptyAction')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
