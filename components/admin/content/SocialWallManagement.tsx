"use client";

import { useEffect, useState } from "react";
import { Instagram, Save, Loader2, Link as LinkIcon, Image as ImageIcon, CheckCircle2, Trash2 } from "lucide-react";
import { getInstagramPosts, fetchAndStoreInstagramImage, upsertInstagramPost } from "@/app/actions/cms";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import DeleteConfirmModal from "../ui/DeleteConfirmModal";

interface SocialWallManagementProps {
    locale: string;
}

export default function SocialWallManagement({ locale }: SocialWallManagementProps) {
    const t = useTranslations('AdminContent.social');
    const [posts, setPosts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [savingSlot, setSavingSlot] = useState<number | null>(null);
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; order: number | null }>({ isOpen: false, order: null });

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

    const [imageError, setImageError] = useState<Record<number, boolean>>({});

    const handleFetchAndSave = async (order: number, url: string) => {
        if (!url) {
            toast.error("Please enter a link");
            return;
        }

        // Reset error for this slot
        setImageError(prev => ({ ...prev, [order]: false }));
        setSavingSlot(order);

        try {
            const res = await fetchAndStoreInstagramImage(order, url);

            if (res.success) {
                toast.success("Image captured and stored permanently!");
                loadPosts();
            } else {
                toast.error(res.error || "Failed to capture image");
            }
        } catch (error: any) {
            toast.error("Error processing link: " + error.message);
        } finally {
            setSavingSlot(null);
        }
    };

    const handleConfirmDelete = async () => {
        const order = deleteModal.order;
        if (!order) return;

        setSavingSlot(order);
        setDeleteModal({ isOpen: false, order: null });
        
        try {
            const res = await upsertInstagramPost({
                display_order: order,
                image_url: "",
                permalink: ""
            });

            if (res.success) {
                toast.success("Slot cleared successfully");
                // Clear input field manually
                const input = document.getElementById(`link-${order}`) as HTMLInputElement;
                if (input) input.value = "";
                loadPosts();
            } else {
                toast.error("Failed to clear slot");
            }
        } catch (error: any) {
            toast.error("Error clearing slot: " + error.message);
        } finally {
            setSavingSlot(null);
        }
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
                        <div className="relative aspect-square bg-[#fafafa] dark:bg-admin-dark-bg transition-colors flex items-center justify-center overflow-hidden">
                            {post.image_url && !imageError[post.display_order] ? (
                                <img 
                                    key={post.image_url}
                                    src={post.image_url} 
                                    alt="" 
                                    onError={() => setImageError(prev => ({ ...prev, [post.display_order]: true }))}
                                    className={cn(
                                        "w-full h-full object-cover transition-transform duration-700",
                                        savingSlot === post.display_order && "opacity-50 blur-sm"
                                    )} 
                                />
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-[#a3a3a3] p-6 text-center">
                                    {imageError[post.display_order] ? (
                                        <>
                                            <ImageIcon className="size-10 text-red-400 opacity-50" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-red-400">Image Protected</span>
                                            <p className="text-[9px] font-medium opacity-50">Instagram is blocking this direct image preview. The link will still work on the website.</p>
                                        </>
                                    ) : (
                                        <>
                                            <ImageIcon className="size-10 opacity-30" />
                                            <span className="text-[10px] font-black uppercase tracking-widest opacity-30">{t('empty')}</span>
                                        </>
                                    )}
                                </div>
                            )}

                            {savingSlot === post.display_order && (
                                <div className="absolute inset-0 bg-white/40 dark:bg-black/40 flex flex-col items-center justify-center gap-2 backdrop-blur-sm">
                                    <Loader2 className="size-8 animate-spin text-admin-accent" />
                                    <span className="text-[10px] font-black text-admin-accent uppercase tracking-widest">Fetching...</span>
                                </div>
                            )}

                            <div className="absolute top-4 left-4 px-3 py-1 bg-white dark:bg-admin-dark-bg rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg">
                                {t('slot')} #{post.display_order}
                            </div>

                            {(post.image_url || post.permalink) && (
                                <button
                                    onClick={() => setDeleteModal({ isOpen: true, order: post.display_order })}
                                    className="absolute top-4 right-4 p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300"
                                    title="Remove post"
                                >
                                    <Trash2 className="size-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Link Input */}
                        <div className="p-5 space-y-4 bg-[#fafafa] dark:bg-admin-dark-bg/50 border-t border-[#f5f5f5] dark:border-white/5">
                            <div>
                                <label className="text-[10px] font-black text-[#a3a3a3] uppercase tracking-widest px-1 block mb-2">
                                    {t('link')}
                                </label>
                                <div className="flex flex-col gap-3">
                                    <div className="relative group">
                                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[#a3a3a3] group-focus-within:text-admin-accent transition-colors" />
                                        <input 
                                            id={`link-${post.display_order}`}
                                            type="text"
                                            placeholder="https://instagram.com/p/..."
                                            defaultValue={post.permalink}
                                            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-white/5 border border-[#f0f0f0] dark:border-white/5 rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-admin-accent transition-all"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        disabled={savingSlot === post.display_order}
                                        onClick={() => {
                                            const input = document.getElementById(`link-${post.display_order}`) as HTMLInputElement;
                                            handleFetchAndSave(post.display_order, input.value);
                                        }}
                                        className="w-full py-2.5 bg-[#171717] dark:bg-white text-white dark:text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black dark:hover:bg-gray-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {savingSlot === post.display_order ? (
                                            <Loader2 className="size-3 animate-spin" />
                                        ) : (
                                            <Save className="size-3" />
                                        )}
                                        {savingSlot === post.display_order ? "Processing..." : "Fetch & Save"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <DeleteConfirmModal 
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, order: null })}
                onConfirm={handleConfirmDelete}
                isLoading={savingSlot !== null}
                title="Clear Social Slot"
                message="Are you sure you want to remove this highlight? This action cannot be undone."
                confirmLabel="Remove"
                cancelLabel="Cancel"
            />
        </div>
    );
}
