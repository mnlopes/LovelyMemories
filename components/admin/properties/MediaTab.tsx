"use client";

import { useFormContext, useFieldArray } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Upload, Star, GripVertical, Trash2, ImageIcon, Loader2 } from "lucide-react";
import { useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { PropertyFormData } from "./PropertyFormSchema";
import { AnimatePresence, motion } from "framer-motion";

export default function MediaTab() {
    const t = useTranslations('PropertyEditor');
    const { control, setValue, watch } = useFormContext<PropertyFormData>();
    const { fields, append, remove, move } = useFieldArray({
        control,
        name: "images",
    });

    const images = watch("images") || [];
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const draggedItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    const handleDragStart = (index: number) => {
        draggedItem.current = index;
    };

    const handleDragEnter = (index: number) => {
        dragOverItem.current = index;
    };

    const handleDragEnd = () => {
        if (draggedItem.current !== null && dragOverItem.current !== null && draggedItem.current !== dragOverItem.current) {
            const newImages = [...images];
            const [movedImage] = newImages.splice(draggedItem.current, 1);
            newImages.splice(dragOverItem.current, 0, movedImage);
            
            const updatedImages = newImages.map((img, idx) => ({
                ...img,
                order: idx,
                is_main: idx === 0
            }));
            setValue("images", updatedImages, { shouldDirty: true });
        }
        draggedItem.current = null;
        dragOverItem.current = null;
    };

    const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);
        setUploadProgress(0);

        const totalFiles = files.length;
        let uploadedCount = 0;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `gallery/${fileName}`;

            try {
                const { error: uploadError } = await supabase.storage
                    .from('properties')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('properties')
                    .getPublicUrl(filePath);

                append({
                    url: publicUrl,
                    alt: {},
                    is_main: images.length === 0 && uploadedCount === 0,
                    order: images.length + uploadedCount,
                });

                uploadedCount++;
                setUploadProgress(Math.round((uploadedCount / totalFiles) * 100));
            } catch (error: any) {
                console.error('Error uploading file:', error);
                alert(`Error uploading ${file.name}: ${error.message || 'Unknown error'}`);
            }
        }

        setIsUploading(false);
        setUploadProgress(0);
    }, [append, images.length]);

    const setMainImage = (index: number) => {
        if (index === 0) return;
        const newImages = [...images];
        const [movedImage] = newImages.splice(index, 1);
        newImages.unshift(movedImage);
        
        const updatedImages = newImages.map((img, i) => ({
            ...img,
            is_main: i === 0,
            order: i
        }));
        setValue("images", updatedImages, { shouldDirty: true });
    };

    // Calculate placeholders
    const minSlots = 8;
    const placeholderCount = Math.max(0, minSlots - images.length);

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            {/* Header section with upload button */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-black text-[#171717] dark:text-admin-dark-text-primary uppercase tracking-tight">{t('media.gallery')}</h3>
                    <p className="text-sm text-[#a3a3a3] dark:text-admin-dark-text-secondary font-medium">{t('media.manageDesc')}</p>
                </div>
                <label className="flex items-center gap-2 px-6 py-3 bg-[#171717] dark:bg-white text-white dark:text-black rounded-2xl text-sm font-bold hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-lg dark:shadow-white/5">
                    <Upload className="size-4" />
                    {t('media.uploadPhotos')}
                    <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={isUploading}
                    />
                </label>
            </div>

            {isUploading && (
                <div className="p-6 bg-white dark:bg-white/5 rounded-2xl border border-[#f5f5f5] dark:border-white/10 shadow-sm animate-pulse">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Loader2 className="size-4 animate-spin text-gold-400" />
                            <span className="text-xs font-black text-[#171717] dark:text-admin-dark-text-primary uppercase tracking-wider">{t('media.processing')}</span>
                        </div>
                        <span className="text-xs font-black text-gold-400">{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-2 bg-[#f5f5f5] dark:bg-white/10 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gold-400 transition-all duration-300 shadow-[0_0_10px_rgba(197,160,89,0.5)]"
                            style={{ width: `${uploadProgress}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Structured Grid with Draggable Items and Placeholders */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 p-1">
                <AnimatePresence initial={false}>
                    {images.map((image, index) => (
                        <motion.div
                            key={image.url}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            layout
                            draggable
                            onDragStart={() => handleDragStart(index)}
                            onDragEnter={() => handleDragEnter(index)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => e.preventDefault()}
                            className={`group relative aspect-square bg-white dark:bg-white/5 rounded-3xl overflow-hidden border transition-all shadow-sm hover:shadow-xl cursor-grab active:cursor-grabbing ${index === 0 ? 'border-gold-400 ring-2 ring-gold-400/20' : 'border-[#f5f5f5] dark:border-white/10 hover:border-gold-400/50 dark:hover:border-white/20'}`}
                        >
                            <img
                                src={image.url}
                                alt={`Property image ${index + 1}`}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />

                            {/* Overlay UI */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-[2px] flex flex-col items-center justify-center gap-4">
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setMainImage(index); }}
                                        className={`p-3 rounded-2xl transition-all scale-90 group-hover:scale-100 duration-500 hover:scale-110 ${index === 0
                                            ? 'bg-gold-400 text-white shadow-[0_0_15px_rgba(197,160,89,0.5)]'
                                            : 'bg-white/20 text-white hover:bg-white/40 backdrop-blur-md'
                                            }`}
                                        title={index === 0 ? t('media.isMain') : t('media.setMain')}
                                    >
                                        <Star className={`size-5 ${index === 0 ? 'fill-current' : ''}`} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); remove(index); }}
                                        className="p-3 bg-white/20 hover:bg-red-500 text-white rounded-2xl backdrop-blur-md transition-all scale-90 group-hover:scale-100 duration-500 hover:scale-110"
                                        title={t('media.delete')}
                                    >
                                        <Trash2 className="size-5" />
                                    </button>
                                </div>
                                <div className="text-[10px] text-white font-black uppercase tracking-[0.2em] opacity-60 flex items-center gap-1.5">
                                    <GripVertical className="size-3" />
                                    {t('media.reorder')}
                                </div>
                            </div>

                            {/* Badges */}
                            {index === 0 && (
                                <div className="absolute top-4 left-4 z-10 px-3 py-1.5 bg-white dark:bg-admin-dark-surface shadow-xl rounded-xl text-[10px] font-black text-[#171717] dark:text-admin-dark-text-primary flex items-center gap-2 border border-[#f5f5f5] dark:border-white/10">
                                    <Star className="size-3 fill-gold-400 text-gold-400" />
                                    <span className="uppercase tracking-[0.1em]">{t('media.coverPhoto')}</span>
                                </div>
                            )}
                            {index === 1 && (
                                <div className="absolute top-4 left-4 z-10 px-3 py-1.5 bg-white/90 backdrop-blur-sm dark:bg-admin-dark-surface/90 shadow-xl rounded-xl text-[10px] font-black text-[#171717] dark:text-admin-dark-text-primary flex items-center gap-2 border border-[#f5f5f5] dark:border-white/10">
                                    <ImageIcon className="size-3 text-gold-400" />
                                    <span className="uppercase tracking-[0.1em]">Secondary Cover</span>
                                </div>
                            )}

                            {/* Order Badge */}
                            <div className="absolute bottom-4 right-4 size-7 flex items-center justify-center bg-black/60 backdrop-blur-md rounded-lg text-[10px] font-black text-white border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                                #{index + 1}
                            </div>
                        </motion.div>
                    ))}

                    {/* Placeholders */}
                    {Array.from({ length: placeholderCount }).map((_, i) => (
                        <div
                            key={`placeholder-${i}`}
                            className="aspect-square rounded-3xl border-2 border-dashed border-[#f5f5f5] dark:border-white/5 bg-[#fafafa]/30 dark:bg-white/[0.01] flex flex-col items-center justify-center gap-3 text-[#a3a3a3] dark:text-white/10 opacity-60 hover:opacity-100 hover:border-gold-400/30 transition-all group cursor-pointer"
                            onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
                        >
                            <div className="p-4 bg-[#f5f5f5] dark:bg-white/5 rounded-2xl group-hover:scale-110 transition-transform">
                                <ImageIcon className="size-6" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t('media.addPhoto')}</span>
                        </div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Helper message if no images */}
            {images.length === 0 && !isUploading && (
                <div className="flex flex-col items-center justify-center py-10 text-[#a3a3a3] gap-4">
                    <p className="text-sm font-medium italic">{t('media.emptyGallery')}</p>
                </div>
            )}
        </div>
    );
}
