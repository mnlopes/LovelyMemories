"use client";

import { useEffect, useState } from "react";
import { Instagram, Save, Upload, Loader2, Link as LinkIcon, Image as ImageIcon, CheckCircle2 } from "lucide-react";
import { getInstagramPosts, upsertInstagramPost } from "@/app/actions/cms";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface SocialWallManagementProps {
    locale: string;
}

export default function SocialWallManagement({ locale }: SocialWallManagementProps) {
    const t = useTranslations('AdminContent.social');
    const [posts, setPosts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
    const [savingSlot, setSavingSlot] = useState<number | null>(null);

    const loadPosts = async () => {
        setIsLoading(true);
        const data = await getInstagramPosts();
        // Ensure we have 4 slots
        const slots = [1, 2, 3, 4].map(order => 
            data.find(p => p.display_order === order) || { display_order: order, image_url: "", permalink: "" }
        );
        setPosts(slots);
        setIsLoading(false);
    };

    useEffect(() => {
        loadPosts();
    }, []);

    const handleFileUpload = async (order: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingSlot(order);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `social-${order}-${Date.now()}.${fileExt}`;
            const filePath = `instagram/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('social-images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('social-images')
                .getPublicUrl(filePath);

            const post = posts.find(p => p.display_order === order);
            await upsertInstagramPost({
                ...post,
                image_url: publicUrl,
                display_order: order
            });

            toast.success(t('success', { order }));
            loadPosts();
        } catch (error: any) {
            toast.error("Upload failed: " + error.message);
        } finally {
            setUploadingSlot(null);
        }
    };

    const handleSaveLink = async (order: number, url: string) => {
        setSavingSlot(order);
        const post = posts.find(p => p.display_order === order);
        const res = await upsertInstagramPost({
            ...post,
            permalink: url,
            display_order: order
        });
        if (res.success) {
            toast.success("Link saved");
        }
        setSavingSlot(null);
    };

    return (
        <div className="space-y-8">
            <div className="bg-white dark:bg-white/5 border border-admin-accent/20 rounded-3xl p-6 flex items-start gap-4">
                <div className="p-3 bg-admin-accent/10 rounded-2xl text-admin-accent">
                    <CheckCircle2 className="size-6" />
                </div>
                <div>
                    <h4 className="text-sm font-black text-[#171717] dark:text-admin-dark-text-primary uppercase tracking-widest mb-1">Live Social Wall</h4>
                    <p className="text-xs text-[#a3a3a3] font-medium leading-relaxed">
                        {t('info')}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {posts.map((post) => (
                    <div key={post.display_order} className="bg-white dark:bg-white/5 rounded-3xl border border-[#f5f5f5] dark:border-white/10 shadow-sm overflow-hidden flex flex-col group">
                        {/* Image Preview */}
                        <div className="relative aspect-square bg-[#fafafa] dark:bg-admin-dark-bg group-hover:bg-[#f5f5f5] dark:group-hover:bg-white/5 transition-colors flex items-center justify-center overflow-hidden">
                            {post.image_url ? (
                                <img src={post.image_url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-[#a3a3a3] opacity-30">
                                    <ImageIcon className="size-10" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">{t('empty')}</span>
                                </div>
                            )}

                            {/* Upload Overlay */}
                            <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all backdrop-blur-[2px] cursor-pointer flex flex-col items-center justify-center gap-3">
                                <span className="p-3 bg-white/20 rounded-2xl text-white backdrop-blur-md">
                                    <Upload className="size-5" />
                                </span>
                                <span className="text-[10px] font-black text-white uppercase tracking-widest">{t('upload')}</span>
                                <input 
                                    type="file" 
                                    className="hidden" 
                                    onChange={(e) => handleFileUpload(post.display_order, e)}
                                    disabled={uploadingSlot === post.display_order}
                                />
                            </label>

                            {uploadingSlot === post.display_order && (
                                <div className="absolute inset-0 bg-white/80 dark:bg-black/80 flex items-center justify-center">
                                    <Loader2 className="size-6 animate-spin text-admin-accent" />
                                </div>
                            )}

                            <div className="absolute top-4 left-4 px-3 py-1 bg-white dark:bg-admin-dark-bg rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg">
                                {t('slot')} #{post.display_order}
                            </div>
                        </div>

                        {/* Link Input */}
                        <div className="p-5 space-y-3 bg-[#fafafa] dark:bg-admin-dark-bg/50 border-t border-[#f5f5f5] dark:border-white/5">
                            <label className="text-[10px] font-black text-[#a3a3a3] uppercase tracking-widest px-1 block mb-1">
                                {t('link')}
                            </label>
                            <div className="relative group">
                                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[#a3a3a3] group-focus-within:text-admin-accent transition-colors" />
                                <input 
                                    type="text"
                                    placeholder="https://instagram.com/p/..."
                                    defaultValue={post.permalink}
                                    onBlur={(e) => handleSaveLink(post.display_order, e.target.value)}
                                    className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-white/5 border border-[#f0f0f0] dark:border-white/5 rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-admin-accent transition-all"
                                />
                                {savingSlot === post.display_order && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <Loader2 className="size-3 animate-spin text-admin-accent" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
