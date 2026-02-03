"use client";

import { useFormContext, useFieldArray } from "react-hook-form";
import { Plus, Trash2, MapPin, Footprints, Car } from "lucide-react";

interface NearbyPlaceItem {
    name: string;
    time: string;
    icon: "car" | "walk";
}

interface NearbyCategory {
    category: string;
    items: NearbyPlaceItem[];
}

export default function NearbyPlacesManager() {
    const { control } = useFormContext();

    // We assume these exist because they are initialized in PropertyEditorForm's defaultValues
    // Index 0: essentials, Index 1: localAttractions

    return (
        <div className="space-y-12">
            <CategorySection
                title="Essentials"
                categoryKey="essentials"
                description="Supermarkets, pharmacies, hospitals, etc."
                categoryIndex={0}
            />

            <CategorySection
                title="Points of Interest"
                categoryKey="localAttractions"
                description="Museums, monuments, viewpoints, etc."
                categoryIndex={1}
            />
        </div>
    );
}

function CategorySection({ title, categoryKey, description, categoryIndex }: {
    title: string;
    categoryKey: string;
    description: string;
    categoryIndex: number;
}) {
    const { control, register } = useFormContext();
    const { fields, append, remove } = useFieldArray({
        control,
        name: `nearby_places.${categoryIndex}.items`,
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-[#171717] dark:text-admin-dark-text-primary uppercase tracking-tight">{title}</h3>
                    <p className="text-sm text-[#a3a3a3] font-medium">{description}</p>
                </div>
                <button
                    type="button"
                    onClick={() => append({ name: "", time: "", icon: "walk" })}
                    className="flex items-center gap-2 px-3 py-1.5 bg-[#171717] dark:bg-white text-white dark:text-black rounded-lg text-xs font-bold hover:bg-black dark:hover:bg-gray-200 transition-all shadow-sm"
                >
                    <Plus className="size-3.5" />
                    Add {title}
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {fields.map((field, index) => (
                    <div
                        key={field.id}
                        className="flex items-start gap-4 p-4 bg-[#fafafa] dark:bg-admin-dark-bg rounded-xl border border-[#f5f5f5] dark:border-admin-dark-border group transition-all hover:border-[#eaeaea] dark:hover:border-admin-dark-text-secondary/30"
                    >
                        <div className="flex-1 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-[#a3a3a3] uppercase tracking-wider">Name</label>
                                    <input
                                        {...register(`nearby_places.${categoryIndex}.items.${index}.name`)}
                                        placeholder="e.g. Clérigos Tower"
                                        className="w-full bg-white dark:bg-admin-dark-surface border border-[#eaeaea] dark:border-admin-dark-border rounded-lg px-3 py-2 text-sm text-[#171717] dark:text-admin-dark-text-primary outline-none focus:border-[#171717] dark:focus:border-white transition-colors"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-[#a3a3a3] uppercase tracking-wider">Distance/Time</label>
                                    <input
                                        {...register(`nearby_places.${categoryIndex}.items.${index}.time`)}
                                        placeholder="e.g. 10 min walk"
                                        className="w-full bg-white dark:bg-admin-dark-surface border border-[#eaeaea] dark:border-admin-dark-border rounded-lg px-3 py-2 text-sm text-[#171717] dark:text-admin-dark-text-primary outline-none focus:border-[#171717] dark:focus:border-white transition-colors"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-[#a3a3a3] uppercase tracking-wider">Method</label>
                                    <select
                                        {...register(`nearby_places.${categoryIndex}.items.${index}.icon`)}
                                        className="w-full bg-white dark:bg-admin-dark-surface border border-[#eaeaea] dark:border-admin-dark-border rounded-lg px-3 py-2 text-sm text-[#171717] dark:text-admin-dark-text-primary outline-none focus:border-[#171717] dark:focus:border-white transition-colors appearance-none"
                                    >
                                        <option value="walk" className="dark:bg-admin-dark-surface">On foot</option>
                                        <option value="car" className="dark:bg-admin-dark-surface">By car</option>
                                    </select>
                                </div>
                            </div>

                            {/* Coordinates for the map */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-white dark:bg-admin-dark-surface rounded-lg border border-[#f0f0f0] dark:border-admin-dark-border transition-colors">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-[#a3a3a3] min-w-8">LAT</span>
                                    <input
                                        type="number"
                                        step="any"
                                        {...register(`nearby_places.${categoryIndex}.items.${index}.coordinates.0` as any)}
                                        placeholder="41.1458"
                                        className="flex-1 bg-transparent text-xs text-[#171717] dark:text-admin-dark-text-primary outline-none font-medium"
                                    />
                                </div>
                                <div className="flex items-center gap-2 border-l border-[#f0f0f0] dark:border-admin-dark-border pl-4">
                                    <span className="text-[10px] font-bold text-[#a3a3a3] min-w-8">LNG</span>
                                    <input
                                        type="number"
                                        step="any"
                                        {...register(`nearby_places.${categoryIndex}.items.${index}.coordinates.1` as any)}
                                        placeholder="-8.6139"
                                        className="flex-1 bg-transparent text-xs text-[#171717] dark:text-admin-dark-text-primary outline-none font-medium"
                                    />
                                </div>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => remove(index)}
                            className="p-2 text-[#a3a3a3] hover:text-red-500 transition-colors bg-white dark:bg-admin-dark-surface rounded-lg border border-[#f5f5f5] dark:border-admin-dark-border hover:border-red-100 dark:hover:border-red-500/20"
                        >
                            <Trash2 className="size-4" />
                        </button>
                    </div>
                ))}

                {fields.length === 0 && (
                    <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-[#f5f5f5] dark:border-admin-dark-border rounded-2xl text-[#a3a3a3] transition-colors">
                        <p className="text-sm font-medium">No items added to {title}.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
