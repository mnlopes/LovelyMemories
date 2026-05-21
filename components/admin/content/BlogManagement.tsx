"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Filter, Loader2, Edit2, Trash2, Globe, EyeOff, Eye, AlertCircle, ChevronDown, Check } from "lucide-react";
import { getBlogPosts, deleteBlogPost, toggleBlogPostStatus } from "@/app/actions/cms";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import BlogEditor from "./BlogEditor";
import { StatusModal } from "@/components/admin/ui/StatusModal";

interface BlogManagementProps {
    locale: string;
}

export default function BlogManagement({ locale }: BlogManagementProps) {
    const t = useTranslations('AdminContent.blog');
    const [posts, setPosts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterLocale, setFilterLocale] = useState(locale);
    const [showLangFilterDropdown, setShowLangFilterDropdown] = useState(false);

    const filterLanguages = [
        { code: 'en', label: 'English (EN)', flag: '/legacy/home/images/english-flag.svg' },
        { code: 'pt', label: 'Português (PT)', flag: '/legacy/home/images/portuguese-flag.svg' },
        { code: 'he', label: 'Hebrew (HE)', flag: '/legacy/home/images/he.svg' },
        { code: 'all', label: t('allLanguages'), isAll: true }
    ];
    const [editingPost, setEditingPost] = useState<any | null>(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [postToDelete, setPostToDelete] = useState<string | null>(null);

    const loadPosts = async () => {
        setIsLoading(true);
        const data = await getBlogPosts(filterLocale === "all" ? undefined : filterLocale);
        setPosts(data);
        setIsLoading(false);
    };

    useEffect(() => {
        loadPosts();
    }, [filterLocale]);

    const handleDelete = (id: string) => {
        setPostToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!postToDelete) return;
        
        setIsDeleteModalOpen(false);
        const res = await deleteBlogPost(postToDelete);
        if (res.success) {
            toast.success("Post deleted");
            loadPosts();
        } else {
            toast.error("Error: " + res.error);
        }
        setPostToDelete(null);
    };

    const handleToggleStatus = async (id: string, current: boolean) => {
        const res = await toggleBlogPostStatus(id, !current);
        if (res.success) {
            toast.success("Status updated");
            loadPosts();
        }
    };

    const filteredPosts = posts.filter(p => 
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.slug.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (isEditorOpen) {
        return (
            <BlogEditor 
                post={editingPost} 
                locale={locale} 
                onClose={() => {
                    setIsEditorOpen(false);
                    setEditingPost(null);
                }} 
                onSave={() => {
                    setIsEditorOpen(false);
                    setEditingPost(null);
                    loadPosts();
                }}
            />
        );
    }

    return (
        <div className="space-y-6">
            {/* Filters & Actions */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white dark:bg-white/5 p-6 rounded-3xl border border-[#f5f5f5] dark:border-white/10 shadow-sm">
                <div className="flex flex-1 items-center gap-4 w-full md:w-auto">
                    <div className="relative flex-1 max-w-md group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-[#a3a3a3] group-focus-within:text-admin-accent transition-colors" />
                        <input 
                            type="text"
                            placeholder={t('searchPlaceholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f0f0f0] dark:border-white/5 rounded-2xl text-sm font-medium outline-none focus:ring-1 focus:ring-admin-accent transition-all"
                        />
                    </div>
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setShowLangFilterDropdown(!showLangFilterDropdown)}
                            className="flex items-center gap-2 px-4 py-3 bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f0f0f0] dark:border-white/5 rounded-2xl group text-xs font-bold transition-all cursor-pointer text-left focus:outline-none"
                        >
                            {(() => {
                                const selected = filterLanguages.find(l => l.code === filterLocale);
                                return (
                                    <span className="flex items-center gap-2 min-w-0">
                                        {selected?.isAll ? (
                                            <Globe className="size-4 text-[#a3a3a3] shrink-0" />
                                        ) : (
                                            selected?.flag && (
                                                <img 
                                                    src={selected.flag} 
                                                    alt={selected.label} 
                                                    className="w-4 h-4 rounded-full object-cover border border-black/10 dark:border-white/10 shrink-0" 
                                                />
                                            )
                                        )}
                                        <span className="truncate text-[#171717] dark:text-admin-dark-text-primary">{selected?.label}</span>
                                    </span>
                                );
                            })()}
                            <ChevronDown className="size-3.5 text-gray-400 shrink-0 ml-1" />
                        </button>

                        {showLangFilterDropdown && (
                            <>
                                <div 
                                    className="fixed inset-0 z-40" 
                                    onClick={() => setShowLangFilterDropdown(false)} 
                                />
                                <div className="absolute top-full left-0 mt-2 bg-white dark:bg-[#1a2331] border border-[#f0f0f0] dark:border-white/10 rounded-2xl shadow-xl z-50 overflow-hidden divide-y divide-[#f5f5f5] dark:divide-white/5 animate-in fade-in slide-in-from-top-2 duration-150 w-48 max-h-60 overflow-y-auto custom-scrollbar">
                                    {filterLanguages.map((lang) => {
                                        const isSelected = filterLocale === lang.code;
                                        return (
                                            <button
                                                key={lang.code}
                                                type="button"
                                                onClick={() => {
                                                    setFilterLocale(lang.code);
                                                    setShowLangFilterDropdown(false);
                                                }}
                                                className={`w-full px-4 py-2.5 flex items-center justify-between text-left text-xs font-bold transition-colors ${
                                                    isSelected 
                                                        ? 'bg-[#a39076]/10 text-[#a39076] dark:bg-[#a39076]/20' 
                                                        : 'text-[#171717] dark:text-admin-dark-text-primary hover:bg-[#fafafa] dark:hover:bg-white/5'
                                                }`}
                                            >
                                                <span className="flex items-center gap-2 min-w-0">
                                                    {lang.isAll ? (
                                                        <Globe className="size-4 text-[#a3a3a3] shrink-0" />
                                                    ) : (
                                                        <img 
                                                            src={lang.flag} 
                                                            alt={lang.label} 
                                                            className="w-4 h-4 rounded-full object-cover border border-black/10 dark:border-white/10 shrink-0" 
                                                        />
                                                    )}
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
                    onClick={() => {
                        setEditingPost(null);
                        setIsEditorOpen(true);
                    }}
                    className="flex items-center gap-2 px-6 py-3.5 bg-[#171717] dark:bg-white text-white dark:text-black rounded-2xl text-sm font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl"
                >
                    <Plus className="size-4" />
                    {t('newArticle')}
                </button>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-white/5 rounded-3xl border border-[#f5f5f5] dark:border-white/10 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-[#fafafa] dark:bg-admin-dark-bg/50">
                            <th className="px-8 py-5 text-[10px] font-black text-[#a3a3a3] uppercase tracking-widest">{t('table.article')}</th>
                            <th className="px-8 py-5 text-[10px] font-black text-[#a3a3a3] uppercase tracking-widest">{t('table.locale')}</th>
                            <th className="px-8 py-5 text-[10px] font-black text-[#a3a3a3] uppercase tracking-widest">{t('table.status')}</th>
                            <th className="px-8 py-5 text-[10px] font-black text-[#a3a3a3] uppercase tracking-widest">{t('table.date')}</th>
                            <th className="px-8 py-5 text-[10px] font-black text-[#a3a3a3] uppercase tracking-widest text-right">{t('table.actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f5f5f5] dark:divide-white/5">
                        {isLoading ? (
                            <tr>
                                <td colSpan={5} className="px-8 py-20 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <Loader2 className="size-8 animate-spin text-admin-accent" />
                                        <span className="text-sm font-bold text-[#a3a3a3] uppercase tracking-widest">{t('table.loading')}</span>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredPosts.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-8 py-20 text-center text-[#a3a3a3] font-medium italic">
                                    <div className="flex flex-col items-center gap-3">
                                        <AlertCircle className="size-8 opacity-20" />
                                        <span>{t('table.empty')}</span>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredPosts.map((post) => (
                                <tr key={post.id} className="group hover:bg-[#fafafa] dark:hover:bg-white/5 transition-colors">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="size-12 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                                                {post.image_url ? (
                                                    <img src={post.image_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                                                        < Globe className="size-5" />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-bold text-[#171717] dark:text-admin-dark-text-primary line-clamp-1">{post.title}</div>
                                                <div className="text-[10px] text-[#a3a3a3] font-bold uppercase tracking-tight">/{post.slug}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className="px-2 py-1 bg-gray-100 dark:bg-white/10 rounded text-[10px] font-black uppercase tracking-widest">
                                            {post.locale}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <button 
                                            onClick={() => handleToggleStatus(post.id, post.is_published)}
                                            className={cn(
                                                "flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                                                post.is_published 
                                                    ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400" 
                                                    : "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400"
                                            )}
                                        >
                                            {post.is_published ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
                                            {post.is_published ? t('status.published') : t('status.draft')}
                                        </button>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="text-xs font-medium text-[#171717] dark:text-admin-dark-text-secondary">
                                            {new Date(post.created_at).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => {
                                                    setEditingPost(post);
                                                    setIsEditorOpen(true);
                                                }}
                                                className="p-2 text-[#a3a3a3] hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-all"
                                            >
                                                <Edit2 className="size-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(post.id)}
                                                className="p-2 text-[#a3a3a3] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                                            >
                                                <Trash2 className="size-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <StatusModal 
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                type="warning"
                title={t('deleteModal.title')}
                message={t('deleteModal.message')}
                actionLabel={t('deleteModal.confirm')}
                onAction={confirmDelete}
            />
        </div>
    );
}
