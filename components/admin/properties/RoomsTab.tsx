"use client";

import { useFormContext, useFieldArray, useWatch, Control } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Plus, Trash2, Bed, Bath, User, Layout, Image as ImageIcon, Ruler, Upload, Loader2, Baby } from "lucide-react";
import { PropertyFormData } from "./PropertyFormSchema";
import { supabase } from "@/lib/supabase";
import { useState } from "react";

interface RoomsTabProps {
    activeLang: string;
    dir: 'ltr' | 'rtl';
}

interface RoomItemProps {
    index: number;
    activeLang: string;
    dir: 'ltr' | 'rtl';
    remove: (index: number) => void;
    register: any;
    control: Control<PropertyFormData>;
    setValue: any;
}

function RoomItem({ index, activeLang, dir, remove, register, control, setValue }: RoomItemProps) {
    const t = useTranslations('PropertyEditor');
    const [isUploading, setIsUploading] = useState(false);

    const roomType = useWatch({
        control,
        name: `rooms.${index}.type` as any,
    });

    const roomImage = useWatch({
        control,
        name: `rooms.${index}.image` as any,
    });

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `rooms/${fileName}`;

        try {
            const { error: uploadError } = await supabase.storage
                .from('properties')
                .upload(filePath, file);

            if (uploadError) {
                console.error('Supabase upload error:', uploadError);
                throw new Error(uploadError.message);
            }

            const { data: { publicUrl } } = supabase.storage
                .from('properties')
                .getPublicUrl(filePath);

            setValue(`rooms.${index}.image` as any, publicUrl);
        } catch (error: any) {
            console.error('Error uploading room image:', error);
            alert(`Error: ${error.message || 'Unknown upload error'}. Did you run the 'setup_storage.sql' in Supabase?`);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="bg-white dark:bg-admin-dark-surface rounded-[24px] border border-[#eaeaea] dark:border-admin-dark-border overflow-hidden group hover:border-[#171717] dark:hover:border-white transition-all shadow-sm flex flex-col md:flex-row">
            {/* Room Sidebar/Image */}
            <div className="w-full md:w-64 aspect-video md:aspect-auto bg-[#fafafa] dark:bg-admin-dark-bg border-r border-[#eaeaea] dark:border-admin-dark-border relative group">
                {roomImage ? (
                    <img src={roomImage} className="w-full h-full object-cover" alt="Room" />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-[#a3a3a3] dark:text-admin-dark-text-secondary gap-2 p-6">
                        <ImageIcon className="size-8 opacity-20" />
                        <p className="text-[10px] font-bold uppercase tracking-wider text-center">{t('units.noImage')}</p>
                    </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 gap-2">
                    <label className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white text-[#171717] rounded-lg text-xs font-bold hover:bg-gray-100 transition-all cursor-pointer shadow-xl">
                        {isUploading ? <Loader2 className="size-3 animate-spin" /> : <Upload className="size-3" />}
                        {isUploading ? t('units.uploading') : t('units.uploadPhoto')}
                        <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={isUploading} />
                    </label>
                    <div className="w-full px-2">
                        <input
                            type="text"
                            {...register(`rooms.${index}.image` as any)}
                            placeholder={t('units.pasteUrl')}
                            className="w-full bg-white/20 border border-white/30 rounded-lg px-2 py-1.5 text-[10px] text-white placeholder:text-white/60 outline-none backdrop-blur-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Room Details */}
            <div className="flex-1 p-6 space-y-6">
                <div className="flex items-start justify-between">
                    <div className="flex-1 flex gap-4">
                        <div className="space-y-1.5 flex-1">
                            <label className="text-[10px] font-bold text-[#a3a3a3] dark:text-admin-dark-text-secondary uppercase tracking-wider">{t('units.roomName', { lang: activeLang.toUpperCase() })}</label>
                            <input
                                key={`room-name-${index}-${activeLang}`}
                                {...register(`rooms.${index}.name.${activeLang}` as any)}
                                dir={dir}
                                placeholder="e.g. Master Suite"
                                className={`w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-transparent rounded-xl px-0 py-1 text-[#171717] dark:text-admin-dark-text-primary text-lg font-bold focus:bg-white dark:focus:bg-admin-dark-bg focus:border-[#f5f5f5] dark:focus:border-admin-dark-border focus:px-4 focus:py-2 transition-all outline-none ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
                            />
                        </div>
                        <div className="space-y-1.5 w-40">
                            <label className="text-[10px] font-bold text-[#a3a3a3] dark:text-admin-dark-text-secondary uppercase tracking-wider">{t('units.roomType')}</label>
                            <select
                                {...register(`rooms.${index}.type` as any)}
                                className="w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f5f5f5] dark:border-admin-dark-border rounded-xl px-3 py-2 text-[#171717] dark:text-admin-dark-text-primary text-sm focus:bg-white dark:focus:bg-admin-dark-bg focus:border-[#171717] dark:focus:border-white transition-all outline-none"
                            >
                                <option value="bedroom">{t('units.types.bedroom')}</option>
                                <option value="bathroom">{t('units.types.bathroom')}</option>
                                <option value="communal">{t('units.types.communal')}</option>
                                <option value="other">{t('units.types.other')}</option>
                            </select>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => remove(index)}
                        className="p-2 text-[#a3a3a3] dark:text-admin-dark-text-secondary hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                    >
                        <Trash2 className="size-4" />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Configuration based on type */}
                    {roomType === 'bedroom' && (
                        <>
                            <div className="space-y-3">
                                <label className="text-sm font-semibold text-[#171717] dark:text-admin-dark-text-primary">{t('units.sleepingSetup')}</label>
                                <div className="flex gap-4">
                                    <div className="flex-1 space-y-1">
                                        <p className="text-[10px] font-bold text-[#a3a3a3] dark:text-admin-dark-text-secondary uppercase">{t('units.beds')}</p>
                                        <input
                                            type="number"
                                            {...register(`rooms.${index}.bedCount` as any)}
                                            className="w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f5f5f5] dark:border-admin-dark-border rounded-xl px-4 py-2 text-[#171717] dark:text-admin-dark-text-primary text-sm outline-none focus:border-black dark:focus:border-white transition-all"
                                        />
                                    </div>
                                    <div className="flex-[2] space-y-1">
                                        <p className="text-[10px] font-bold text-[#a3a3a3] dark:text-admin-dark-text-secondary uppercase">{t('units.roomType')}</p>
                                        <select
                                            {...register(`rooms.${index}.bedType` as any)}
                                            className="w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f5f5f5] dark:border-admin-dark-border rounded-xl px-4 py-2 text-[#171717] dark:text-admin-dark-text-primary text-sm outline-none focus:border-black dark:focus:border-white transition-all"
                                        >
                                            <option value="double">{t('units.bedTypes.double')}</option>
                                            <option value="single">{t('units.bedTypes.single')}</option>
                                            <option value="sofa">{t('units.bedTypes.sofa')}</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <label className="text-sm font-semibold text-[#171717] dark:text-admin-dark-text-primary">{t('units.features')}</label>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-transparent uppercase invisible">En-suite</p>
                                    <label className="flex items-center gap-3 p-3 bg-[#fafafa] dark:bg-admin-dark-bg rounded-xl border border-[#f5f5f5] dark:border-admin-dark-border cursor-pointer hover:bg-white dark:hover:bg-admin-dark-surface transition-all">
                                        <input
                                            type="checkbox"
                                            {...register(`rooms.${index}.isEnsuite` as any)}
                                            className="size-4 rounded border-[#eaeaea] dark:border-admin-dark-border bg-white dark:bg-admin-dark-bg text-[#171717] dark:text-white focus:ring-[#171717] dark:focus:ring-white"
                                        />
                                        <span className="text-sm font-bold text-[#171717] dark:text-admin-dark-text-primary">{t('units.enSuite')}</span>
                                    </label>
                                </div>
                            </div>
                        </>
                    )}

                    {roomType === 'bathroom' && (
                        <div className="space-y-3 col-span-2">
                            <label className="text-sm font-semibold text-[#171717] dark:text-admin-dark-text-primary">{t('units.features')}</label>
                            <label className="flex items-center gap-3 p-3 bg-[#fafafa] dark:bg-admin-dark-bg rounded-xl border border-[#f5f5f5] dark:border-admin-dark-border cursor-pointer hover:bg-white dark:hover:bg-admin-dark-surface transition-all">
                                <input
                                    type="checkbox"
                                    {...register(`rooms.${index}.isEnsuite` as any)}
                                    className="size-4 rounded border-[#eaeaea] dark:border-admin-dark-border bg-white dark:bg-admin-dark-bg text-[#171717] dark:text-white focus:ring-[#171717] dark:focus:ring-white"
                                />
                                <span className="text-sm font-bold text-[#171717] dark:text-admin-dark-text-primary">{t('units.isEnsuite')}</span>
                            </label>
                        </div>
                    )}
                </div>

                {/* Room Subtitle (Override for "Social Area" / "Luxury Bath") */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[#a3a3a3] dark:text-admin-dark-text-secondary uppercase tracking-wider">
                        {t('units.roomSubtitle', { lang: activeLang.toUpperCase() })}
                        <span className="ml-2 lowercase font-medium opacity-60">{t('units.subtitleDesc')}</span>
                    </label>
                    <input
                        key={`room-beds-${index}-${activeLang}`}
                        {...register(`rooms.${index}.beds.${activeLang}` as any)}
                        dir={dir}
                        placeholder="e.g. 1 Double Bed / Guest Lounge"
                        className={`w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f5f5f5] dark:border-admin-dark-border rounded-xl px-4 py-2 text-[#171717] dark:text-admin-dark-text-primary text-sm focus:bg-white dark:focus:bg-admin-dark-surface focus:border-[#171717] dark:focus:border-white transition-all outline-none ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
                    />
                </div>

                {/* Localized Details */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[#a3a3a3] dark:text-admin-dark-text-secondary uppercase tracking-wider">{t('units.detailsLabel', { lang: activeLang.toUpperCase() })}</label>
                    <textarea
                        key={`room-details-${index}-${activeLang}`}
                        {...register(`rooms.${index}.details.${activeLang}` as any)}
                        dir={dir}
                        rows={2}
                        placeholder={t('units.detailsPlaceholder')}
                        className={`w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f5f5f5] dark:border-admin-dark-border rounded-xl px-4 py-3 text-[#171717] dark:text-admin-dark-text-primary text-sm focus:bg-white dark:focus:bg-admin-dark-surface focus:border-[#171717] dark:focus:border-white transition-all outline-none resize-none ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
                    />
                </div>
            </div>
        </div>
    );
}

export default function RoomsTab({ activeLang, dir }: RoomsTabProps) {
    const t = useTranslations('PropertyEditor');
    const { control, register, setValue } = useFormContext<PropertyFormData>();
    const { fields, append, remove } = useFieldArray({
        control,
        name: "rooms",
    });

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Property Capacity & Layout */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-white dark:bg-admin-dark-bg rounded-2xl border border-[#eaeaea] dark:border-admin-dark-border shadow-sm space-y-3 group hover:border-[#171717] dark:hover:border-white transition-all transition-colors">
                    <div className="flex items-center gap-2 text-[#a3a3a3] dark:text-admin-dark-text-secondary group-hover:text-[#171717] dark:group-hover:text-white transition-colors">
                        <User className="size-4" />
                        <label className="text-[10px] font-bold uppercase tracking-wider">{t('units.maxGuests')}</label>
                    </div>
                    <input
                        type="number"
                        {...register("max_guests")}
                        min={0}
                        className="w-full bg-transparent text-xl font-bold text-[#171717] dark:text-admin-dark-text-primary outline-none"
                    />
                </div>
                <div className="p-4 bg-white dark:bg-admin-dark-bg rounded-2xl border border-[#eaeaea] dark:border-admin-dark-border shadow-sm space-y-3 group hover:border-[#171717] dark:hover:border-white transition-all transition-colors">
                    <div className="flex items-center gap-2 text-[#a3a3a3] dark:text-admin-dark-text-secondary group-hover:text-[#171717] dark:group-hover:text-white transition-colors">
                        <Bed className="size-4" />
                        <label className="text-[10px] font-bold uppercase tracking-wider">{t('units.bedrooms')}</label>
                    </div>
                    <input
                        type="number"
                        {...register("bedrooms")}
                        min={0}
                        className="w-full bg-transparent text-xl font-bold text-[#171717] dark:text-admin-dark-text-primary outline-none"
                    />
                </div>
                <div className="p-4 bg-white dark:bg-admin-dark-bg rounded-2xl border border-[#eaeaea] dark:border-admin-dark-border shadow-sm space-y-3 group hover:border-[#171717] dark:hover:border-white transition-all transition-colors">
                    <div className="flex items-center gap-2 text-[#a3a3a3] dark:text-admin-dark-text-secondary group-hover:text-[#171717] dark:group-hover:text-white transition-colors">
                        <Layout className="size-4" />
                        <label className="text-[10px] font-bold uppercase tracking-wider">{t('units.totalBeds')}</label>
                    </div>
                    <input
                        type="number"
                        {...register("beds")}
                        min={0}
                        className="w-full bg-transparent text-xl font-bold text-[#171717] dark:text-admin-dark-text-primary outline-none"
                    />
                </div>
                <div className="p-4 bg-white dark:bg-admin-dark-bg rounded-2xl border border-[#eaeaea] dark:border-admin-dark-border shadow-sm space-y-3 group hover:border-[#171717] dark:hover:border-white transition-all transition-colors">
                    <div className="flex items-center gap-2 text-[#a3a3a3] dark:text-admin-dark-text-secondary group-hover:text-[#171717] dark:group-hover:text-white transition-colors">
                        <Bath className="size-4" />
                        <label className="text-[10px] font-bold uppercase tracking-wider">{t('units.bathrooms')}</label>
                    </div>
                    <input
                        type="number"
                        {...register("bathrooms")}
                        min={0}
                        className="w-full bg-transparent text-xl font-bold text-[#171717] dark:text-admin-dark-text-primary outline-none"
                    />
                </div>
            </div>
            {/* Bed Size Guide \u0026 Baby Equipment Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 bg-[#fafafa] dark:bg-admin-dark-bg rounded-[32px] border border-[#f5f5f5] dark:border-admin-dark-border shadow-sm">
                {/* Left: Bed Size Guide */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-white dark:bg-admin-dark-surface border border-[#eaeaea] dark:border-admin-dark-border flex items-center justify-center text-[#171717] dark:text-admin-dark-text-primary shadow-sm">
                            <Ruler className="size-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-[#171717] dark:text-admin-dark-text-primary uppercase tracking-tight">{t('units.bedSizeGuide')}</h3>
                            <p className="text-[10px] text-[#a3a3a3] dark:text-admin-dark-text-secondary uppercase tracking-wider font-bold">{t('units.standardDimensions')}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-[#a3a3a3] dark:text-admin-dark-text-secondary uppercase tracking-wider">{t('units.bedSingle')}</label>
                            <input
                                {...register("bed_sizes.single")}
                                placeholder="90 x 190 cm"
                                className="w-full bg-white dark:bg-admin-dark-surface border border-[#eaeaea] dark:border-admin-dark-border rounded-xl px-4 py-2.5 text-[#171717] dark:text-admin-dark-text-primary text-sm focus:border-[#171717] dark:focus:border-white transition-all outline-none"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-[#a3a3a3] dark:text-admin-dark-text-secondary uppercase tracking-wider">{t('units.bedDouble')}</label>
                            <input
                                {...register("bed_sizes.double")}
                                placeholder="140 x 190 cm"
                                className="w-full bg-white dark:bg-admin-dark-surface border border-[#eaeaea] dark:border-admin-dark-border rounded-xl px-4 py-2.5 text-[#171717] dark:text-admin-dark-text-primary text-sm focus:border-[#171717] dark:focus:border-white transition-all outline-none"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-[#a3a3a3] dark:text-admin-dark-text-secondary uppercase tracking-wider">{t('units.bedKing')}</label>
                            <input
                                {...register("bed_sizes.king")}
                                placeholder="160 x 200 cm"
                                className="w-full bg-white dark:bg-admin-dark-surface border border-[#eaeaea] dark:border-admin-dark-border rounded-xl px-4 py-2.5 text-[#171717] dark:text-admin-dark-text-primary text-sm focus:border-[#171717] dark:focus:border-white transition-all outline-none"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-[#a3a3a3] dark:text-admin-dark-text-secondary uppercase tracking-wider">{t('units.bedSuperKing')}</label>
                            <input
                                {...register("bed_sizes.superKing")}
                                placeholder="180 x 200 cm"
                                className="w-full bg-white dark:bg-admin-dark-surface border border-[#eaeaea] dark:border-admin-dark-border rounded-xl px-4 py-2.5 text-[#171717] dark:text-admin-dark-text-primary text-sm focus:border-[#171717] dark:focus:border-white transition-all outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Right: Baby Equipment */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-xl bg-white dark:bg-admin-dark-surface border border-[#eaeaea] dark:border-admin-dark-border flex items-center justify-center text-[#171717] dark:text-admin-dark-text-primary shadow-sm">
                                <Baby className="size-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-[#171717] dark:text-admin-dark-text-primary uppercase tracking-tight">{t('units.babyEquipment')}</h3>
                                <p className="text-[10px] text-[#a3a3a3] dark:text-admin-dark-text-secondary uppercase tracking-wider font-bold">{t('units.travelingWithChildren')}</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                {...register("baby_equipment.available")}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-[#f5f5f5] dark:bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#171717] dark:peer-checked:bg-[#B08D4A]"></div>
                        </label>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[#a3a3a3] dark:text-admin-dark-text-secondary uppercase tracking-wider">
                            {t('units.babyDescription', { lang: activeLang.toUpperCase() })}
                        </label>
                        <textarea
                            key={`baby-text-${activeLang}`}
                            {...register(`baby_equipment.text.${activeLang}`)}
                            dir={dir}
                            rows={3}
                            placeholder={t('units.babyPlaceholder')}
                            className={`w-full bg-white dark:bg-admin-dark-surface border border-[#eaeaea] dark:border-admin-dark-border rounded-xl px-4 py-3 text-[#171717] dark:text-admin-dark-text-primary text-sm focus:border-[#171717] dark:focus:border-white transition-all outline-none resize-none ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
                        />
                    </div>
                </div>
            </div>

            {/* Rooms Management */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-[#171717] dark:text-admin-dark-text-primary">{t('units.roomsAndSpaces')}</h3>
                        <p className="text-sm text-[#a3a3a3] dark:text-admin-dark-text-secondary">{t('units.roomsDesc')}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => append({
                            name: { en: "", pt: "", he: "" },
                            type: 'bedroom',
                            details: { en: "", pt: "", he: "" },
                            beds: { en: "", pt: "", he: "" },
                            bedCount: 1,
                            bedType: 'double',
                            isEnsuite: false
                        })}
                        className="flex items-center gap-2 px-4 py-2 bg-[#171717] dark:bg-white text-white dark:text-black rounded-xl text-sm font-bold hover:bg-black dark:hover:bg-gray-200 transition-all shadow-sm"
                    >
                        <Plus className="size-4" />
                        {t('units.addRoom')}
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {fields.map((field, index) => (
                        <RoomItem
                            key={field.id}
                            index={index}
                            activeLang={activeLang}
                            dir={dir}
                            remove={remove}
                            register={register}
                            control={control}
                            setValue={setValue}
                        />
                    ))}

                    {fields.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-admin-dark-surface border border-dashed border-[#eaeaea] dark:border-admin-dark-border rounded-[32px] text-[#a3a3a3] dark:text-admin-dark-text-secondary gap-4 opacity-80">
                            <div className="size-16 rounded-full bg-[#fafafa] dark:bg-admin-dark-bg flex items-center justify-center border border-[#f5f5f5] dark:border-admin-dark-border">
                                <Layout className="size-8 opacity-20" />
                            </div>
                            <div className="text-center">
                                <p className="text-base font-bold text-[#171717] dark:text-admin-dark-text-primary">{t('units.noRooms')}</p>
                                <p className="text-sm max-w-xs mx-auto">{t('units.noRoomsDesc')}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => append({
                                    name: { en: "", pt: "", he: "" },
                                    type: 'bedroom',
                                    details: { en: "", pt: "", he: "" },
                                    beds: { en: "", pt: "", he: "" },
                                    bedCount: 1,
                                    bedType: 'double',
                                    isEnsuite: false
                                })}
                                className="mt-2 px-6 py-2.5 bg-[#171717] dark:bg-white text-white dark:text-black rounded-xl text-sm font-bold hover:bg-black dark:hover:bg-gray-200 transition-all shadow-sm"
                            >
                                {t('units.getStarted')}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
