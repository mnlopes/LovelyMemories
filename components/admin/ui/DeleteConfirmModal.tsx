"use client";

import { Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DeleteConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isLoading: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning';
}

export default function DeleteConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    isLoading,
    title,
    message,
    confirmLabel = "Delete",
    cancelLabel = "Cancel",
    variant = 'danger'
}: DeleteConfirmModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={!isLoading ? onClose : undefined}
            />

            {/* Modal Panel */}
            <div className="relative w-full max-w-sm bg-white dark:bg-[#1c1c1c] rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-black/5 dark:border-white/5">
                <div className="p-8 text-center">
                    <div className={cn(
                        "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6",
                        variant === 'danger' ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                    )}>
                        <AlertTriangle className="size-8" />
                    </div>

                    <h2 className="text-2xl font-black text-[#171717] dark:text-white mb-3 uppercase tracking-tight">{title}</h2>
                    <p className="text-[#737373] dark:text-[#a3a3a3] text-sm font-medium leading-relaxed mb-8">
                        {message}
                    </p>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="flex-1 px-6 py-3 border border-[#e5e5e5] dark:border-white/10 rounded-2xl text-xs font-black uppercase tracking-widest text-[#171717] dark:text-white hover:bg-[#fafafa] dark:hover:bg-white/5 transition-all disabled:opacity-50"
                        >
                            {cancelLabel}
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isLoading}
                            className={cn(
                                "flex-1 px-6 py-3 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2",
                                variant === 'danger' ? "bg-red-600 hover:bg-red-700 shadow-red-500/20" : "bg-amber-600 hover:bg-amber-700 shadow-amber-500/20"
                            )}
                        >
                            {isLoading && <Loader2 className="size-4 animate-spin" />}
                            {confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
