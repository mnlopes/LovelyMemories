"use client";

import { X, Loader2, AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface DeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isLoading: boolean;
    title?: string;
    message?: string;
}

export default function DeleteModal({
    isOpen,
    onClose,
    onConfirm,
    isLoading,
    title,
    message
}: DeleteModalProps) {
    const t = useTranslations('AdminConcierge.deleteModal');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={!isLoading ? onClose : undefined}
            />

            {/* Modal Panel */}
            <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 text-center">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="size-6 text-red-600" />
                    </div>

                    <h2 className="text-xl font-bold text-[#171717] mb-2">{title || t('title')}</h2>
                    <p className="text-[#737373] text-sm mb-6">
                        {message || t('message')}
                    </p>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="flex-1 px-4 py-2 border border-[#e5e5e5] rounded-xl text-sm font-bold text-[#171717] hover:bg-[#fafafa] transition-colors disabled:opacity-50"
                        >
                            {t('cancel')}
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isLoading}
                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isLoading && <Loader2 className="size-4 animate-spin" />}
                            {t('confirm')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
