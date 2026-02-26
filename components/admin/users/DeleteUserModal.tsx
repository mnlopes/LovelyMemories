"use client";

import { useState } from "react";
import { Trash2, AlertCircle, Loader2 } from "lucide-react";
import { deleteUser } from "@/app/actions/user";
import { toast } from "sonner";
import { Profile } from "@/lib/types";
import { useTranslations } from "next-intl";

interface DeleteUserModalProps {
    isOpen: boolean;
    userToDelete: Profile | null;
    onClose: () => void;
    onSuccess: () => void;
}

export function DeleteUserModal({ isOpen, userToDelete, onClose, onSuccess }: DeleteUserModalProps) {
    const t = useTranslations("AdminUsers.deleteModal");
    const [loading, setLoading] = useState(false);

    if (!isOpen || !userToDelete) return null;

    const handleDelete = async () => {
        setLoading(true);
        try {
            const { success, error } = await deleteUser(userToDelete.id) as { success: boolean, error?: string };
            if (error) {
                toast.error(t('error', { error }));
            } else {
                toast.success(t('success'));
                onSuccess();
                onClose();
            }
        } catch (error: any) {
            toast.error(t('error', { error: error.message }));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-md bg-white dark:bg-admin-dark-surface rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-8 pb-6 flex flex-col items-center text-center">
                    <div className="size-16 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                        <AlertCircle className="size-8 text-red-500" />
                    </div>

                    <h3 className="text-2xl font-playfair font-bold text-[#171717] dark:text-admin-dark-text-primary mb-3">
                        {t('title')}
                    </h3>
                    <p className="text-[#a3a3a3] text-sm font-medium leading-relaxed mb-8">
                        {t.rich('description', {
                            name: <span key="name" className="text-[#171717] dark:text-white font-bold">{userToDelete.full_name || userToDelete.email}</span>,
                            irreversible: <span key="irreversible" className="text-red-500 font-bold uppercase tracking-wider">{t('irreversible')}</span>
                        })}
                    </p>

                    <div className="flex w-full gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 border border-[#f5f5f5] dark:border-admin-dark-border text-[#171717] dark:text-admin-dark-text-primary font-bold rounded-xl hover:bg-[#fafafa] dark:hover:bg-admin-dark-bg transition-all"
                        >
                            {t('cancel')}
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={loading}
                            className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                            {t('confirmButton')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
