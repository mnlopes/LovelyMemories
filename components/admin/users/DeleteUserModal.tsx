"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { Profile } from "@/lib/types";
import { deleteUser } from "@/app/actions/user";
import { toast } from "sonner";

interface DeleteUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    userToDelete: Profile | null;
}

export function DeleteUserModal({ isOpen, onClose, onSuccess, userToDelete }: DeleteUserModalProps) {
    const [isLoading, setIsLoading] = useState(false);

    if (!userToDelete) return null;

    const handleDelete = async () => {
        setIsLoading(true);
        try {
            await deleteUser(userToDelete.id);
            toast.success("User deleted successfully");
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error("Failed to delete user: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-md bg-white dark:bg-admin-dark-surface rounded-[32px] overflow-hidden shadow-2xl border border-red-100 dark:border-red-900/20"
                    >
                        <div className="p-8 md:p-10">
                            {/* Icon & Close */}
                            <div className="flex justify-between items-start mb-6">
                                <div className="size-14 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                                    <AlertTriangle className="size-7 text-red-500" />
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-[#f5f5f5] dark:hover:bg-admin-dark-bg rounded-xl transition-colors text-[#a3a3a3]"
                                >
                                    <X className="size-5" />
                                </button>
                            </div>

                            {/* Text content */}
                            <h3 className="text-2xl font-playfair font-bold text-[#171717] dark:text-admin-dark-text-primary mb-3">
                                Eliminate User?
                            </h3>
                            <p className="text-[#a3a3a3] text-sm font-medium leading-relaxed mb-8">
                                You are about to delete <span className="text-[#171717] dark:text-white font-bold">{userToDelete.full_name || userToDelete.email}</span>.
                                This action is <span className="text-red-500 font-bold uppercase tracking-wider">irreversible</span> and will remove all access immediately.
                            </p>

                            {/* Actions */}
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={onClose}
                                    disabled={isLoading}
                                    className="px-6 py-4 rounded-2xl border border-[#f5f5f5] dark:border-admin-dark-border text-sm font-bold uppercase tracking-wider text-[#171717] dark:text-admin-dark-text-primary hover:bg-[#f5f5f5] dark:hover:bg-admin-dark-border transition-all disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={isLoading}
                                    className="px-6 py-4 bg-red-500 text-white rounded-2xl text-sm font-bold uppercase tracking-wider hover:bg-red-600 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
                                >
                                    {isLoading ? (
                                        <Loader2 className="size-4 animate-spin" />
                                    ) : (
                                        "Delete User"
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
