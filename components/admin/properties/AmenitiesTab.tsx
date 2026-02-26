"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Plus, Trash2, ListFilter, Sparkles, ChefHat, Car, Map, Utensils, ChevronDown, Wine, Music, Waves, ShieldCheck, Ticket, Plane, Calendar, GlassWater } from "lucide-react";
import { PropertyFormData } from "./PropertyFormSchema";
import { useState } from "react";

const SUGGESTED_CATEGORIES = [
    "Bedroom & Laundry",
    "Entertainment",
    "Heating and Cooling",
    "Internet and Office",
    "Kitchen and Dining",
    "Bathroom",
    "Location Features",
    "Outdoor",
    "Safety"
];

const COMMON_ITEMS = {
    "Bedroom & Laundry": ["Washing machine", "Iron", "Hangers", "Bed linens", "Extra pillows and blankets", "Room-darkening shades"],
    "Entertainment": ["HDTV with Netflix", "Marshall Bluetooth sound system", "Books and reading material", "Standard cable"],
    "Heating and Cooling": ["Air conditioning", "Central heating", "Portable fans"],
    "Internet and Office": ["High-speed WiFi", "Dedicated workspace", "Ergonomic chair"],
    "Kitchen and Dining": ["Fully equipped kitchen", "Nespresso machine", "Dishwasher", "Wine glasses", "Toaster", "Cooking basics"],
    "Bathroom": ["Hair dryer", "Premium toiletries", "Hot water", "Walk-in shower", "Bathtub"],
    "Outdoor": ["Pool", "Garden", "Private entrance", "Patio or balcony", "Outdoor furniture"],
    "Location Features": ["River view", "Resort access", "Beach access", "City view"]
};

const AVAILABLE_ICONS = [
    { label: "Heating/Cooling", value: "/icons/heating_navy.png" },
    { label: "Entertainment", value: "/icons/entertainment_navy.png" },
    { label: "Outdoor", value: "/icons/outdoor_navy.png" },
    { label: "Parking", value: "/icons/parking_navy.png" },
    { label: "Bedroom/Laundry", value: "/icons/bedroom_navy.png" },
    { label: "Internet/Office", value: "/icons/internet_navy.png" },
    { label: "Kitchen", value: "/icons/kitchen_navy.png" },
    { label: "Bathroom", value: "/icons/bathroom_navy.png" },
];

const VIP_ICONS = [
    { label: "Concierge", value: "Sparkles", icon: Sparkles },
    { label: "Chef", value: "ChefHat", icon: ChefHat },
    { label: "Chauffeur", value: "Car", icon: Car },
    { label: "Transfer", value: "Plane", icon: Plane },
    { label: "Tours", value: "Map", icon: Map },
    { label: "Dining", value: "Utensils", icon: Utensils },
    { label: "Wine", value: "Wine", icon: Wine },
    { label: "Drinks", value: "GlassWater", icon: GlassWater },
    { label: "Music", value: "Music", icon: Music },
    { label: "Wellness", value: "Waves", icon: Waves },
    { label: "Security", value: "ShieldCheck", icon: ShieldCheck },
    { label: "Tickets", value: "Ticket", icon: Ticket },
    { label: "Calendar", value: "Calendar", icon: Calendar },
];

const DEFAULT_ICONS: Record<string, string> = {
    "Bedroom & Laundry": "/icons/bedroom_navy.png",
    "Entertainment": "/icons/entertainment_navy.png",
    "Heating and Cooling": "/icons/heating_navy.png",
    "Internet and Office": "/icons/internet_navy.png",
    "Kitchen and Dining": "/icons/kitchen_navy.png",
    "Bathroom": "/icons/bathroom_navy.png",
    "Outdoor": "/icons/outdoor_navy.png",
    "Location Features": "/icons/outdoor_navy.png",
    "Safety": "/icons/parking_navy.png"
};

interface AmenitiesTabProps {
    activeLang: string;
    dir: 'ltr' | 'rtl';
}

export default function AmenitiesTab({ activeLang, dir }: AmenitiesTabProps) {
    const t = useTranslations('PropertyEditor');
    const { control, register, getValues, setValue } = useFormContext<PropertyFormData>();

    // VIP Services Control
    const { fields: vipFields, append: appendVip, remove: removeVip } = useFieldArray({
        control,
        name: "vip_services"
    });

    const [newVipTitle, setNewVipTitle] = useState("");
    const [selectedVipIcon, setSelectedVipIcon] = useState("ChefHat");
    const [showNewVipIconPicker, setShowNewVipIconPicker] = useState(false);
    const [openVipIconIndex, setOpenVipIconIndex] = useState<number | null>(null);

    const addVipService = () => {
        if (!newVipTitle.trim()) return;
        appendVip({
            title: { en: newVipTitle.trim(), pt: newVipTitle.trim(), he: newVipTitle.trim() },
            icon: selectedVipIcon
        });
        setNewVipTitle("");
        setShowNewVipIconPicker(false);
    };

    // Amenities Control
    const { fields: amenityFields, append: appendAmenity, remove: removeAmenity, update: updateAmenity } = useFieldArray({
        control,
        name: "amenities",
    });

    const [newCategoryName, setNewCategoryName] = useState("");

    const addCategory = (name: string) => {
        if (!name.trim()) return;
        const icon = DEFAULT_ICONS[name] || "/icons/outdoor_navy.png";
        appendAmenity({ category: name, icon, items: [] });
        setNewCategoryName("");
    };

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Left Column: Property Amenities */}
                <div className="space-y-8">
                    <div className="flex items-center justify-between pb-2 border-b border-[#f5f5f5] dark:border-admin-dark-border transition-colors">
                        <h3 className="text-lg font-bold text-[#171717] dark:text-admin-dark-text-primary">
                            {t('amenities.propertyAmenities')}
                        </h3>
                    </div>

                    <div className="space-y-6">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                placeholder={t('amenities.newCategory')}
                                className="flex-1 bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f5f5f5] dark:border-admin-dark-border rounded-xl px-4 py-3 text-sm text-[#171717] dark:text-admin-dark-text-primary outline-none focus:border-[#171717] transition-all"
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCategory(newCategoryName))}
                            />
                            <button
                                type="button"
                                onClick={() => addCategory(newCategoryName)}
                                className="px-6 py-3 bg-[#171717] dark:bg-white text-white dark:text-black rounded-xl text-xs font-bold hover:opacity-80 transition-all"
                            >
                                {t('amenities.addCategory')}
                            </button>
                        </div>

                        {/* Suggested Categories */}
                        <div className="flex flex-wrap gap-2">
                            {SUGGESTED_CATEGORIES.filter(cat => !amenityFields.some(f => f.category === cat)).map(cat => (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => addCategory(cat)}
                                    className="px-3 py-1.5 bg-[#fafafa] dark:bg-admin-dark-bg border border-[#eaeaea] dark:border-admin-dark-border rounded-lg text-[10px] font-bold text-[#171717] dark:text-admin-dark-text-primary hover:border-[#171717] transition-all"
                                >
                                    + {t(`amenitiesCategories.${cat}`)}
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            {amenityFields.map((field, index) => (
                                <CategorySection
                                    key={field.id}
                                    index={index}
                                    category={field.category}
                                    icon={field.icon}
                                    removeCategory={() => removeAmenity(index)}
                                    updateCategory={(data) => updateAmenity(index, { ...field, ...data })}
                                    control={control}
                                    register={register}
                                    activeLang={activeLang}
                                    dir={dir}
                                />
                            ))}

                            {amenityFields.length === 0 && (
                                <div className="py-12 flex flex-col items-center justify-center border border-dashed border-[#eaeaea] dark:border-admin-dark-border rounded-[32px] opacity-50">
                                    <ListFilter className="size-8 mb-2 text-[#a3a3a3]" />
                                    <p className="text-xs font-bold text-[#a3a3a3]">{t('amenities.noCategories')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: VIP Services */}
                <div className="space-y-8">
                    <div className="flex items-center justify-between pb-2 border-b border-[#f5f5f5] dark:border-admin-dark-border transition-colors">
                        <h3 className="text-lg font-bold text-[#171717] dark:text-admin-dark-text-primary">
                            {t('amenities.vipTitle')}
                        </h3>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-[#a3a3a3] uppercase tracking-wider">{t('amenities.addVip')}</label>
                            <div className="flex gap-2">
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setShowNewVipIconPicker(!showNewVipIconPicker)}
                                        className="size-12 rounded-xl bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f5f5f5] dark:border-admin-dark-border flex items-center justify-center hover:border-[#171717] transition-all"
                                    >
                                        {(() => {
                                            const IconComp = VIP_ICONS.find(v => v.value === selectedVipIcon)?.icon || Sparkles;
                                            return <IconComp className="size-5 text-[#171717] dark:text-white" />;
                                        })()}
                                    </button>

                                    {showNewVipIconPicker && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setShowNewVipIconPicker(false)} />
                                            <div className="absolute top-full left-0 mt-2 p-3 bg-white dark:bg-admin-dark-surface rounded-xl border border-[#eaeaea] dark:border-admin-dark-border shadow-xl z-50 grid grid-cols-4 gap-2 w-48 animate-in fade-in zoom-in-95 duration-200">
                                                {VIP_ICONS.map((opt) => (
                                                    <button
                                                        key={opt.value}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedVipIcon(opt.value);
                                                            setShowNewVipIconPicker(false);
                                                        }}
                                                        className={`size-10 rounded-lg flex items-center justify-center hover:bg-[#fafafa] dark:hover:bg-admin-dark-bg transition-all border ${selectedVipIcon === opt.value ? 'border-[#171717] bg-[#fafafa] dark:bg-admin-dark-bg' : 'border-transparent'}`}
                                                    >
                                                        <opt.icon className="size-5" />
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                                <input
                                    type="text"
                                    value={newVipTitle}
                                    onChange={(e) => setNewVipTitle(e.target.value)}
                                    placeholder={t('amenities.vipPlaceholder')}
                                    className="flex-1 bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f5f5f5] dark:border-admin-dark-border rounded-xl px-4 py-3 text-sm text-[#171717] dark:text-admin-dark-text-primary outline-none focus:border-[#171717] transition-all"
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addVipService())}
                                />
                                <button
                                    type="button"
                                    onClick={addVipService}
                                    className="px-6 py-3 bg-[#171717] dark:bg-white text-white dark:text-black rounded-xl text-xs font-bold hover:opacity-80 transition-all flex items-center gap-2"
                                >
                                    <Plus className="size-3" />
                                    {t('basic.add')}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {vipFields.map((field, index) => {
                                const IconComp = VIP_ICONS.find(v => v.value === field.icon)?.icon || Sparkles;
                                return (
                                    <div key={field.id} className="group p-4 bg-[#fafafa] dark:bg-admin-dark-bg rounded-2xl border border-transparent hover:border-[#f5f5f5] flex items-center gap-4 transition-all">
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => setOpenVipIconIndex(openVipIconIndex === index ? null : index)}
                                                className="size-10 rounded-xl bg-white dark:bg-admin-dark-surface border border-[#eaeaea] dark:border-admin-dark-border flex items-center justify-center text-[#171717] dark:text-admin-dark-text-primary shadow-sm hover:border-[#171717] transition-all"
                                            >
                                                <IconComp className="size-5" />
                                            </button>

                                            {openVipIconIndex === index && (
                                                <>
                                                    <div className="fixed inset-0 z-40" onClick={() => setOpenVipIconIndex(null)} />
                                                    <div className="absolute top-full left-0 mt-2 p-3 bg-white dark:bg-admin-dark-surface rounded-xl border border-[#eaeaea] dark:border-admin-dark-border shadow-xl z-50 grid grid-cols-4 gap-2 w-48 animate-in fade-in zoom-in-95 duration-200">
                                                        {VIP_ICONS.map((opt) => (
                                                            <button
                                                                key={opt.value}
                                                                type="button"
                                                                onClick={() => {
                                                                    setValue(`vip_services.${index}.icon`, opt.value);
                                                                    setOpenVipIconIndex(null);
                                                                }}
                                                                className={`size-10 rounded-lg flex items-center justify-center hover:bg-[#fafafa] dark:hover:bg-admin-dark-bg transition-all border ${field.icon === opt.value ? 'border-[#171717] bg-[#fafafa] dark:bg-admin-dark-bg' : 'border-transparent'}`}
                                                            >
                                                                <opt.icon className="size-5" />
                                                            </button>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <input
                                                key={`vip-${index}-${activeLang}`}
                                                {...register(`vip_services.${index}.title.${activeLang}` as any)}
                                                className="w-full bg-transparent text-sm font-bold text-[#171717] dark:text-admin-dark-text-primary outline-none"
                                                placeholder={t('amenities.vipLabel', { lang: activeLang })}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeVip(index)}
                                            className="p-1.5 text-[#a3a3a3] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <Trash2 className="size-4" />
                                        </button>
                                    </div>
                                );
                            })}
                            {vipFields.length === 0 && (
                                <div className="py-12 flex flex-col items-center justify-center border border-dashed border-[#eaeaea] dark:border-admin-dark-border rounded-[32px] opacity-50">
                                    <ChefHat className="size-8 mb-2 text-[#a3a3a3]" />
                                    <p className="text-xs font-bold text-[#a3a3a3]">{t('amenities.noVip')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}


interface CategorySectionProps {
    index: number;
    category: string;
    icon?: string;
    removeCategory: () => void;
    updateCategory: (data: Partial<{ category: string, icon: string }>) => void;
    control: any;
    register: any;
    activeLang: string;
    dir: 'ltr' | 'rtl';
}

function CategorySection({ index, category, icon, removeCategory, updateCategory, control, register, activeLang, dir }: CategorySectionProps) {
    const t = useTranslations('PropertyEditor');
    const { fields, append, remove, update } = useFieldArray({
        control,
        name: `amenities.${index}.items` as any,
    });
    const { getValues } = useFormContext<PropertyFormData>();

    const [newItem, setNewItem] = useState("");
    const [showIconPicker, setShowIconPicker] = useState(false);

    const addItem = (name: string) => {
        if (!name.trim()) return;
        const itemPayload = { en: "", pt: "", he: "" };
        (itemPayload as any)[activeLang] = name.trim();
        append(itemPayload);
        setNewItem("");
    };

    const suggestedItemsForCat = COMMON_ITEMS[category as keyof typeof COMMON_ITEMS] || [];

    return (
        <div className="bg-white dark:bg-admin-dark-surface rounded-2xl border border-[#eaeaea] dark:border-admin-dark-border overflow-hidden transition-all shadow-sm">
            <div className="p-4 border-b border-[#eaeaea] dark:border-admin-dark-border bg-[#fafafa] dark:bg-admin-dark-bg flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setShowIconPicker(!showIconPicker)}
                            className="size-10 rounded-xl bg-white dark:bg-admin-dark-surface border border-[#eaeaea] dark:border-admin-dark-border flex items-center justify-center hover:border-[#171717] transition-all shadow-sm"
                        >
                            {icon ? (
                                <img src={icon} alt="Icon" className="size-6 object-contain" />
                            ) : (
                                <Sparkles className="size-4 text-[#a3a3a3]" />
                            )}
                        </button>

                        {showIconPicker && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowIconPicker(false)} />
                                <div className="absolute top-full left-0 mt-2 p-3 bg-white dark:bg-admin-dark-surface rounded-xl border border-[#eaeaea] dark:border-admin-dark-border shadow-xl z-50 grid grid-cols-4 gap-2 w-48 animate-in fade-in zoom-in-95 duration-200">
                                    {AVAILABLE_ICONS.map((opt) => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => {
                                                updateCategory({ icon: opt.value });
                                                setShowIconPicker(false);
                                            }}
                                            className={`size-10 rounded-lg flex items-center justify-center hover:bg-[#fafafa] transition-all border ${icon === opt.value ? 'border-[#171717] bg-[#fafafa]' : 'border-transparent'}`}
                                        >
                                            <img src={opt.value} alt={opt.label} className="size-6 object-contain" />
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                    <input
                        {...register(`amenities.${index}.category`)}
                        className="bg-transparent font-bold text-[#171717] dark:text-admin-dark-text-primary outline-none text-sm"
                    />
                </div>
                <button
                    type="button"
                    onClick={removeCategory}
                    className="p-1.5 text-[#a3a3a3] hover:text-red-500 rounded-lg transition-all"
                >
                    <Trash2 className="size-3.5" />
                </button>
            </div>

            <div className="p-4 space-y-4">
                <div className="space-y-2">
                    {fields.map((field, itemIndex) => {
                        return (
                            <div key={field.id} className="flex items-center justify-between p-2.5 bg-[#fafafa] dark:bg-admin-dark-bg rounded-xl border border-transparent hover:border-[#eaeaea] group/item transition-all">
                                <input
                                    key={`amenity-${index}-${itemIndex}-${activeLang}`}
                                    {...register(`amenities.${index}.items.${itemIndex}.${activeLang}` as any)}
                                    dir={dir}
                                    className={`bg-transparent text-xs text-[#171717] dark:text-admin-dark-text-primary outline-none w-full font-bold`}
                                />
                                <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-all">
                                    <button type="button" onClick={() => remove(itemIndex)} className="p-1 text-[#a3a3a3] hover:text-red-500">
                                        <Trash2 className="size-3" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={newItem}
                            onChange={(e) => setNewItem(e.target.value)}
                            placeholder={t('amenities.addItem')}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem(newItem))}
                            className="flex-1 bg-white dark:bg-admin-dark-bg border border-[#eaeaea] dark:border-admin-dark-border rounded-xl px-3 py-2 text-xs text-[#171717] dark:text-admin-dark-text-primary outline-none focus:border-[#171717] transition-all"
                        />
                        <button
                            type="button"
                            onClick={() => addItem(newItem)}
                            className="p-2 bg-[#171717] dark:bg-white text-white dark:text-black rounded-lg"
                        >
                            <Plus className="size-3.5" />
                        </button>
                    </div>
                </div>

                {suggestedItemsForCat.length > 0 && suggestedItemsForCat.some(item => {
                    const items = getValues(`amenities.${index}.items` as any) || [];
                    return !items.some((f: any) => {
                        if (typeof f === 'string') return f.toLowerCase() === item.toLowerCase();
                        if (typeof f === 'object') return (f.en || '').toLowerCase() === item.toLowerCase();
                        return false;
                    });
                }) && (
                        <div className="pt-3 border-t border-[#f5f5f5] dark:border-admin-dark-border">
                            <div className="flex flex-wrap gap-1.5">
                                {suggestedItemsForCat.filter(item => {
                                    const items = getValues(`amenities.${index}.items` as any) || [];
                                    return !items.some((f: any) => {
                                        if (typeof f === 'string') return f.toLowerCase() === item.toLowerCase();
                                        if (typeof f === 'object') return (f.en || '').toLowerCase() === item.toLowerCase();
                                        return false;
                                    });
                                }).slice(0, 5).map(item => (
                                    <button
                                        key={item}
                                        type="button"
                                        onClick={() => addItem(item)}
                                        className="px-2 py-1 bg-white dark:bg-admin-dark-surface border border-[#eaeaea] dark:border-admin-dark-border rounded-lg text-[9px] font-bold text-[#171717] dark:text-admin-dark-text-primary hover:border-[#171717] transition-all"
                                    >
                                        + {item}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
            </div>
        </div>
    );
}
