"use client";

import { useFormContext, useWatch, useFieldArray } from "react-hook-form";
import { FormSelect } from "@/components/admin/ui/FormSelect";
import { Building2, Home, Eye, EyeOff, Clock, Plus, Trash2, Info, Sparkles } from "lucide-react";
import { PropertyFormData } from "./PropertyFormSchema";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import HighlightsManager from "./HighlightsManager";

interface BasicInfoTabProps {
    mode?: 'building';
    activeLang: string;
    dir: 'ltr' | 'rtl';
}

export default function BasicInfoTab({ mode, activeLang, dir }: BasicInfoTabProps) {
    const { register, control, setValue, getValues, formState: { errors } } = useFormContext<PropertyFormData>();
    const [parentOptions, setParentOptions] = useState<{ label: string; value: string }[]>([]);

    // Highlights Control
    const { append: appendHighlight } = useFieldArray({
        control,
        name: "highlights",
    });

    const galleryImages = useWatch({ control, name: "images" }) || [];

    const addHighlight = () => {
        const firstImage = galleryImages[0]?.url || "";
        appendHighlight({
            image: firstImage,
            text: { en: "", pt: "", he: "" }
        });
    };

    // Home Truths Control
    const { fields: truthFields, append: appendTruth, remove: removeTruth, update: updateTruth } = useFieldArray({
        control,
        name: "home_truths",
    });

    const [newTruth, setNewTruth] = useState("");

    const addTruth = () => {
        if (!newTruth.trim()) return;
        const payload = { en: "", pt: "", he: "" };
        (payload as any)[activeLang] = newTruth.trim();
        appendTruth(payload);
        setNewTruth("");
    };

    // Watch fields
    const isMultiUnit = useWatch({ control, name: "is_multi_unit" });
    const parentId = useWatch({ control, name: "parent_id" });
    const status = useWatch({ control, name: "status" });

    const handleStatusCycle = () => {
        const states: PropertyFormData['status'][] = ['active', 'coming_soon', 'hidden'];
        const currentIndex = states.indexOf(status || 'active');
        const nextIndex = (currentIndex + 1) % states.length;
        setValue('status', states[nextIndex], { shouldDirty: true });
    };

    const getStatusConfig = (s: string) => {
        switch (s) {
            case 'active':
                return {
                    label: 'Active',
                    icon: Eye,
                    className: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20'
                };
            case 'coming_soon':
                return {
                    label: 'Coming Soon',
                    icon: Clock,
                    className: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-500/20'
                };
            case 'hidden':
            default:
                return {
                    label: 'Hidden',
                    icon: EyeOff,
                    className: 'bg-gray-50 dark:bg-admin-dark-bg text-gray-500 dark:text-admin-dark-text-secondary border-gray-100 dark:border-admin-dark-border'
                };
        }
    };

    const statusConfig = getStatusConfig(status || 'active');

    // Fetch buildings on mount
    useEffect(() => {
        async function fetchBuildings() {
            const { data } = await supabase
                .from('properties')
                .select('id, title, slug')
                .eq('is_multi_unit', true);

            if (data) {
                setParentOptions(data.map(p => {
                    const titleObj = p.title as any;
                    const label = titleObj?.[activeLang] || titleObj?.en || titleObj?.pt || p.slug || 'Untitled Building';
                    return {
                        label,
                        value: p.id
                    };
                }));
            }
        }
        fetchBuildings();
    }, [activeLang]);

    // Clear parent_id if is_multi_unit is checked
    useEffect(() => {
        if (isMultiUnit) {
            setValue('parent_id', null);
        }
    }, [isMultiUnit, setValue]);

    return (
        <div className="space-y-12 animate-in fade-in duration-500">
            {/* Hidden Fields */}
            <input type="hidden" {...register("is_multi_unit")} />
            <input type="hidden" {...register("parent_id")} />
            <input type="hidden" {...register("status")} />

            {/* Top Layout Grid: Identity & Description */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Left Column: Identity */}
                <div className="space-y-8">
                    <div className="flex items-center justify-between pb-2 border-b border-[#f5f5f5] dark:border-admin-dark-border transition-colors">
                        <h3 className="text-lg font-bold text-[#171717] dark:text-admin-dark-text-primary">
                            {mode === 'building' ? 'Building Name' : 'Identity'}
                        </h3>

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={handleStatusCycle}
                                className={`px-3 py-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 transition-all hover:scale-105 active:scale-95 ${statusConfig.className}`}
                            >
                                <statusConfig.icon className="size-3" />
                                {statusConfig.label}
                            </button>

                            <div className="h-4 w-px bg-[#f5f5f5] dark:bg-admin-dark-border mx-1" />

                            <div className="flex items-center gap-2">
                                {isMultiUnit ? (
                                    <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider border border-blue-100 dark:border-blue-500/20 flex items-center gap-1.5 transition-colors">
                                        <Building2 className="size-3" />
                                        Building
                                    </span>
                                ) : parentId ? (
                                    <span className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 text-[10px] font-bold uppercase tracking-wider border border-purple-100 dark:border-purple-500/20 flex items-center gap-1.5 transition-colors">
                                        <Home className="size-3" />
                                        {parentOptions.find(o => o.value === parentId)?.label || 'Unit'}
                                    </span>
                                ) : (
                                    <span className="px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-admin-dark-bg text-gray-400 dark:text-admin-dark-text-secondary text-[10px] font-bold uppercase tracking-wider border border-gray-100 dark:border-admin-dark-border flex items-center gap-1.5 transition-colors">
                                        Standalone
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="space-y-6">
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-[#a3a3a3] uppercase tracking-wider">
                                    Internal Slug (URL)
                                </label>
                                <input
                                    {...register("slug")}
                                    placeholder="e.g. edificio-paraiso"
                                    className="w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f5f5f5] dark:border-admin-dark-border rounded-xl px-4 py-3 text-[#171717] dark:text-admin-dark-text-primary text-sm focus:bg-white dark:focus:bg-admin-dark-surface focus:border-[#171717] dark:focus:border-white transition-all outline-none"
                                />
                                <p className="text-[10px] text-[#a3a3a3] font-medium">Identifier for the property URL.</p>
                                {errors.slug && <p className="text-xs text-red-500 font-bold">{errors.slug.message}</p>}
                            </div>

                            {mode !== 'building' && (
                                <FormSelect
                                    label="Property Type"
                                    {...register("type")}
                                    options={[
                                        { value: 'apartment', label: 'Apartment' },
                                        { value: 'villa', label: 'Villa' },
                                        { value: 'studio', label: 'Studio' },
                                    ]}
                                />
                            )}
                        </div>

                        <div className="space-y-6 pt-2">
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-[#a3a3a3] uppercase tracking-wider">
                                    {mode === 'building' ? 'Building Name' : 'Title'} ({activeLang.toUpperCase()})
                                </label>
                                <input
                                    {...register(`title.${activeLang}` as any)}
                                    dir={dir}
                                    placeholder={mode === 'building' ? "e.g. Paraíso 331" : "e.g. The Flower Power"}
                                    className={`w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f5f5f5] dark:border-admin-dark-border rounded-xl px-4 py-3 text-[#171717] dark:text-admin-dark-text-primary text-lg font-bold focus:bg-white dark:focus:bg-admin-dark-surface focus:border-[#171717] dark:focus:border-white transition-all outline-none ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
                                />
                            </div>

                            {mode !== 'building' && (
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-[#a3a3a3] uppercase tracking-wider">
                                        Subtitle ({activeLang.toUpperCase()})
                                    </label>
                                    <input
                                        {...register(`subtitle.${activeLang}` as any)}
                                        dir={dir}
                                        placeholder="e.g. Two Bedroom Home"
                                        className={`w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f5f5f5] dark:border-admin-dark-border rounded-xl px-4 py-3 text-[#171717] dark:text-admin-dark-text-primary text-sm focus:bg-white dark:focus:bg-admin-dark-surface focus:border-[#171717] dark:focus:border-white transition-all outline-none ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Description */}
                <div className="space-y-8 flex flex-col">
                    <h3 className="text-lg font-bold text-[#171717] dark:text-admin-dark-text-primary pb-2 border-b border-[#f5f5f5] dark:border-admin-dark-border transition-colors">
                        Description
                    </h3>
                    <div className="space-y-1.5 flex-1 flex flex-col">
                        <label className="text-sm font-bold text-[#a3a3a3] uppercase tracking-wider">
                            Description ({activeLang.toUpperCase()})
                        </label>
                        <textarea
                            {...register(`description.${activeLang}` as any)}
                            dir={dir}
                            rows={14}
                            placeholder={mode === 'building' ? "Detailed description of the building..." : "Detailed property description..."}
                            className={`w-full flex-1 bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f5f5f5] dark:border-admin-dark-border rounded-xl px-4 py-3 text-[#171717] dark:text-admin-dark-text-primary text-sm focus:bg-white dark:focus:bg-admin-dark-surface focus:border-[#171717] dark:focus:border-white transition-all outline-none resize-none ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
                        />
                    </div>
                </div>
            </div>

            {/* Bottom Layout Grid: Highlights Intro & Highlights Manager */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 border-t border-[#f5f5f5] dark:border-admin-dark-border pt-12 transition-colors">
                <div className="space-y-6">
                    <h3 className="text-lg font-bold text-[#171717] dark:text-admin-dark-text-primary pb-2 border-b border-[#f5f5f5] dark:border-admin-dark-border transition-colors">
                        Highlights Intro (What to expect)
                    </h3>
                    <div className="space-y-1.5 flex-1 flex flex-col">
                        <label className="text-sm font-bold text-[#a3a3a3] uppercase tracking-wider">
                            Intro Text ({activeLang.toUpperCase()})
                        </label>
                        <textarea
                            {...register(`highlights_intro.${activeLang}` as any)}
                            dir={dir}
                            rows={8}
                            placeholder="e.g. Our homes are handpicked and decorated to the highest standards..."
                            className={`w-full flex-1 bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f5f5f5] dark:border-admin-dark-border rounded-xl px-4 py-3 text-[#171717] dark:text-admin-dark-text-primary text-sm focus:bg-white dark:focus:bg-admin-dark-surface focus:border-[#171717] dark:focus:border-white transition-all outline-none resize-none ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
                        />
                        <p className="text-[10px] text-[#a3a3a3] font-medium italic mt-2">Customizes the introduction text shown above the highlights carousel on the property page.</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex items-center justify-between pb-2 border-b border-[#f5f5f5] dark:border-admin-dark-border transition-colors">
                        <h3 className="text-lg font-bold text-[#171717] dark:text-admin-dark-text-primary">
                            Highlights Manager
                        </h3>
                        <button
                            type="button"
                            onClick={addHighlight}
                            className="flex items-center gap-2 px-4 py-1.5 bg-[#171717] dark:bg-white text-white dark:text-black rounded-xl text-[10px] font-bold uppercase tracking-wider hover:opacity-80 transition-all shadow-sm"
                        >
                            <Plus className="size-3" />
                            Add Highlight
                        </button>
                    </div>
                    <div className="pt-2">
                        <HighlightsManager activeLang={activeLang} />
                    </div>
                </div>
            </div>

            {/* Good to Know & Stay Hours Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 border-t border-[#f5f5f5] dark:border-admin-dark-border pt-12 transition-colors">
                {/* Good to Know / Home Truths */}
                <div className="space-y-6">
                    <h3 className="text-lg font-bold text-[#171717] dark:text-admin-dark-text-primary pb-2 border-b border-[#f5f5f5] dark:border-admin-dark-border transition-colors">
                        Good to Know
                    </h3>
                    <div className="space-y-4 pt-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-[#a3a3a3] uppercase tracking-wider">Add New Fact / Home Truth</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newTruth}
                                    onChange={(e) => setNewTruth(e.target.value)}
                                    placeholder="e.g. No elevator available..."
                                    className="flex-1 bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f5f5f5] dark:border-admin-dark-border rounded-xl px-4 py-3 text-sm text-[#171717] dark:text-admin-dark-text-primary outline-none focus:border-[#171717] transition-all"
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTruth())}
                                />
                                <button
                                    type="button"
                                    onClick={addTruth}
                                    className="px-6 py-3 bg-[#171717] dark:bg-white text-white dark:text-black rounded-xl text-xs font-bold hover:opacity-80 transition-all flex items-center gap-2"
                                >
                                    <Plus className="size-3" />
                                    Add
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {truthFields.map((field, index) => {
                                const actualItem = getValues(`home_truths.${index}` as any);
                                const isLegacy = typeof actualItem === 'string';

                                return (
                                    <div key={field.id} className="group p-3 bg-[#fafafa] dark:bg-admin-dark-bg rounded-xl border border-transparent hover:border-[#f5f5f5] flex items-center gap-3 transition-all">
                                        <div className="flex-1">
                                            {isLegacy ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-[#171717] dark:text-admin-dark-text-primary opacity-60 flex-1">{actualItem}</span>
                                                    <button type="button" onClick={() => updateTruth(index, { en: actualItem, pt: actualItem, he: actualItem })} className="text-[#a3a3a3] hover:text-[#171717]">
                                                        <Sparkles className="size-3" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <input
                                                    {...register(`home_truths.${index}.${activeLang}` as any)}
                                                    className="w-full bg-transparent text-xs text-[#171717] dark:text-admin-dark-text-primary outline-none"
                                                />
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeTruth(index)}
                                            className="p-1.5 text-[#a3a3a3] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <Trash2 className="size-3.5" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Stay Hours */}
                <div className="space-y-6">
                    <h3 className="text-lg font-bold text-[#171717] dark:text-admin-dark-text-primary pb-2 border-b border-[#f5f5f5] dark:border-admin-dark-border transition-colors">
                        Stay Hours
                    </h3>
                    <div className="grid grid-cols-2 gap-6 pt-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-[#a3a3a3] uppercase tracking-wider">Arrival (Check-in)</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    {...register("check_in.arrivalStart")}
                                    placeholder="from 15:00"
                                    className="w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f5f5f5] dark:border-admin-dark-border rounded-xl px-4 py-3 pl-10 text-[#171717] dark:text-admin-dark-text-primary text-sm focus:border-[#171717] dark:focus:border-white outline-none transition-all"
                                />
                                <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#a3a3a3]" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-[#a3a3a3] uppercase tracking-wider">Departure (Check-out)</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    {...register("check_in.departureEnd")}
                                    placeholder="before 11:00"
                                    className="w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f5f5f5] dark:border-admin-dark-border rounded-xl px-4 py-3 pl-10 text-[#171717] dark:text-admin-dark-text-primary text-sm focus:border-[#171717] dark:focus:border-white outline-none transition-all"
                                />
                                <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#a3a3a3]" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
