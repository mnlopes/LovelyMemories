"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Search, Loader2, Edit2, Trash2, Globe, AlertCircle, HelpCircle, GripVertical } from "lucide-react";
import { getFaqs, deleteFaq, reorderFaqs } from "@/app/actions/cms";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import FaqEditor from "./FaqEditor";
import { StatusModal } from "@/components/admin/ui/StatusModal";
import { Faq } from "@/lib/types";

interface FaqManagementProps {
    locale: string;
}

export default function FaqManagement({ locale }: FaqManagementProps) {
    const t = useTranslations('AdminContent.faq');
    const [faqs, setFaqs] = useState<Faq[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterLocale, setFilterLocale] = useState(locale);
    const [editingFaq, setEditingFaq] = useState<Faq | null>(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [faqToDelete, setFaqToDelete] = useState<string | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    const triggerRefresh = useCallback(() => {
        setRefreshTrigger(prev => prev + 1);
    }, []);

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex !== null && draggedIndex !== index) {
            setDragOverIndex(index);
        }
    };

    const handleDragLeave = () => {
        setDragOverIndex(null);
    };

    const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        setDragOverIndex(null);
        if (draggedIndex === null || draggedIndex === targetIndex) return;

        const draggedItem = filteredFaqs[draggedIndex];
        const targetItem = filteredFaqs[targetIndex];
        
        const mainDraggedIndex = faqs.findIndex(f => f.id === draggedItem.id);
        const mainTargetIndex = faqs.findIndex(f => f.id === targetItem.id);
        
        if (mainDraggedIndex === -1 || mainTargetIndex === -1) return;

        const newFaqs = [...faqs];
        const [item] = newFaqs.splice(mainDraggedIndex, 1);
        newFaqs.splice(mainTargetIndex, 0, item);

        // Update display_order based on the new array indices
        const updatedFaqs = newFaqs.map((faq, idx) => ({
            ...faq,
            display_order: idx + 1
        }));

        setFaqs(updatedFaqs);
        setDraggedIndex(null);

        setIsLoading(true);
        const res = await reorderFaqs(updatedFaqs);
        if (res.success) {
            toast.success("FAQs reordered successfully");
        } else {
            toast.error("Failed to save reorder: " + res.error);
            triggerRefresh();
        }
        setIsLoading(false);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
        setDragOverIndex(null);
    };
    useEffect(() => {
        let isMounted = true;
        const fetchFaqs = async () => {
            setIsLoading(true);
            const data = await getFaqs(filterLocale === "all" ? undefined : filterLocale);
            if (isMounted) {
                setFaqs(data);
                setIsLoading(false);
            }
        };
        fetchFaqs();
        return () => {
            isMounted = false;
        };
    }, [filterLocale, refreshTrigger]);

    const handleDelete = (id: string) => {
        setFaqToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!faqToDelete) return;
        
        setIsDeleteModalOpen(false);
        const res = await deleteFaq(faqToDelete);
        if (res.success) {
            toast.success("FAQ deleted successfully");
            triggerRefresh();
        } else {
            toast.error("Error: " + res.error);
        }
        setFaqToDelete(null);
    };

    const filteredFaqs = faqs.filter(f => 
        (f.question && f.question.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (f.answer && f.answer.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (isEditorOpen) {
        return (
            <FaqEditor 
                faq={editingFaq} 
                locale={locale} 
                onClose={() => {
                    setIsEditorOpen(false);
                    setEditingFaq(null);
                }} 
                onSave={() => {
                    setIsEditorOpen(false);
                    setEditingFaq(null);
                    triggerRefresh();
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
                    <div className="flex items-center gap-2 px-4 py-3 bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f0f0f0] dark:border-white/5 rounded-2xl group">
                        <Globe className="size-4 text-[#a3a3a3]" />
                        <select 
                            value={filterLocale}
                            onChange={(e) => setFilterLocale(e.target.value)}
                            className="bg-transparent text-xs font-bold outline-none cursor-pointer"
                        >
                            <option value="en">English</option>
                            <option value="pt">Português</option>
                            <option value="he">Hebrew</option>
                            <option value="all">{t('allLanguages')}</option>
                        </select>
                    </div>
                </div>

                <button 
                    onClick={() => {
                        setEditingFaq({
                            question: "",
                            answer: "",
                            locale: filterLocale === "all" ? locale : filterLocale,
                            display_order: faqs.length + 1
                        });
                        setIsEditorOpen(true);
                    }}
                    className="flex items-center gap-2 px-6 py-3.5 bg-[#171717] dark:bg-white text-white dark:text-black rounded-2xl text-sm font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl"
                >
                    <Plus className="size-4" />
                    {t('newFaq')}
                </button>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-white/5 rounded-3xl border border-[#f5f5f5] dark:border-white/10 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-[#fafafa] dark:bg-admin-dark-bg/50">
                            <th className="px-8 py-5 text-[10px] font-black text-[#a3a3a3] uppercase tracking-widest w-[50%]">{t('table.question')}</th>
                            <th className="px-8 py-5 text-[10px] font-black text-[#a3a3a3] uppercase tracking-widest">{t('table.locale')}</th>
                            <th className="px-8 py-5 text-[10px] font-black text-[#a3a3a3] uppercase tracking-widest">{t('table.order')}</th>
                            <th className="px-8 py-5 text-[10px] font-black text-[#a3a3a3] uppercase tracking-widest text-right">{t('table.actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f5f5f5] dark:divide-white/5">
                        {isLoading ? (
                            <tr>
                                <td colSpan={4} className="px-8 py-20 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <Loader2 className="size-8 animate-spin text-admin-accent" />
                                        <span className="text-sm font-bold text-[#a3a3a3] uppercase tracking-widest">{t('table.loading')}</span>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredFaqs.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-8 py-20 text-center text-[#a3a3a3] font-medium italic">
                                    <div className="flex flex-col items-center gap-3">
                                        <AlertCircle className="size-8 opacity-20" />
                                        <span>{t('table.empty')}</span>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredFaqs.map((item, index) => (
                                <tr 
                                    key={item.id} 
                                    draggable={true}
                                    onDragStart={(e) => handleDragStart(e, index)}
                                    onDragOver={(e) => handleDragOver(e, index)}
                                    onDragLeave={handleDragLeave}
                                    onDragEnd={handleDragEnd}
                                    onDrop={(e) => handleDrop(e, index)}
                                    className={`group hover:bg-[#fafafa] dark:hover:bg-white/5 transition-all duration-200 ${
                                        draggedIndex === index ? "opacity-20 bg-gray-100/50 dark:bg-white/5" : ""
                                    } ${
                                        dragOverIndex === index && draggedIndex !== null && draggedIndex !== index
                                            ? index > draggedIndex
                                                ? "[&>td]:shadow-[inset_0_-2px_0_var(--admin-accent)] bg-admin-accent/5 dark:bg-admin-accent/10"
                                                : "[&>td]:shadow-[inset_0_2px_0_var(--admin-accent)] bg-admin-accent/5 dark:bg-admin-accent/10"
                                            : ""
                                    }`}
                                >
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="size-10 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center flex-shrink-0 text-gray-400">
                                                <HelpCircle className="size-5" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="font-bold text-[#171717] dark:text-admin-dark-text-primary line-clamp-1">{item.question}</div>
                                                <div className="text-[11px] text-[#a3a3a3] font-medium line-clamp-1 mt-0.5">{item.answer}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className="px-2 py-1 bg-gray-100 dark:bg-white/10 rounded text-[10px] font-black uppercase tracking-widest">
                                            {item.locale}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-2 text-xs font-bold text-[#171717] dark:text-admin-dark-text-secondary cursor-grab active:cursor-grabbing">
                                            <GripVertical className="size-4 text-[#a3a3a3] opacity-50 group-hover:opacity-100 transition-opacity" />
                                            <span>{item.display_order}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => {
                                                    setEditingFaq(item);
                                                    setIsEditorOpen(true);
                                                }}
                                                className="p-2 text-[#a3a3a3] hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-all"
                                            >
                                                <Edit2 className="size-4" />
                                            </button>
                                            <button 
                                                onClick={() => item.id && handleDelete(item.id)}
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
