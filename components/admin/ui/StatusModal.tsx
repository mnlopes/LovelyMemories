"use client";

import { CheckCircle2, XCircle, AlertCircle, X, Loader2 } from "lucide-react";
import { useEffect } from "react";

interface StatusModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'success' | 'error' | 'loading' | 'warning';
    title: string;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
}

export function StatusModal({
    isOpen,
    onClose,
    type,
    title,
    message,
    actionLabel,
    onAction
}: StatusModalProps) {
    // Close on ESC
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    if (!isOpen) return null;

    const config = {
        success: {
            icon: <CheckCircle2 className="size-12 text-green-500" />,
            bg: 'bg-green-50 dark:bg-green-500/10',
            button: 'bg-[#171717] dark:bg-white hover:bg-black dark:hover:bg-gray-200 text-white dark:text-black'
        },
        error: {
            icon: <XCircle className="size-12 text-red-500" />,
            bg: 'bg-red-50 dark:bg-red-500/10',
            button: 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20'
        },
        warning: {
            icon: <AlertCircle className="size-12 text-amber-500" />,
            bg: 'bg-amber-50 dark:bg-amber-500/10',
            button: 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20'
        },
        loading: {
            icon: <Loader2 className="size-12 text-[#171717] dark:text-white animate-spin" />,
            bg: 'bg-gray-50 dark:bg-white/5',
            button: 'hidden'
        }
    };

    const current = config[type];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-admin-dark-surface rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-transparent dark:border-admin-dark-border">
                {/* Header/Banner */}
                <div className={`h-32 ${current.bg} flex items-center justify-center relative transition-colors`}>
                    {type !== 'loading' && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onClose();
                            }}
                            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
                        >
                            <X className="size-5" />
                        </button>
                    )}
                    {current.icon}
                </div>

                {/* Content */}
                <div className="p-8 text-center transition-colors">
                    <h3 className="text-xl font-bold text-[#171717] dark:text-admin-dark-text-primary mb-2 transition-colors">{title}</h3>
                    <p className="text-[#737373] dark:text-admin-dark-text-secondary text-sm leading-relaxed mb-8 transition-colors">
                        {message}
                    </p>

                    <div className="flex flex-col gap-3">
                        {type !== 'loading' && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onAction ? onAction() : onClose();
                                }}
                                className={`w-full py-3.5 rounded-xl font-bold transition-all transform active:scale-[0.98] ${current.button}`}
                            >
                                {actionLabel || 'Entendi'}
                            </button>
                        )}

                        {(type === 'error' || type === 'warning') && onAction && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onClose();
                                }}
                                className="w-full py-3 text-sm font-bold text-[#737373] dark:text-admin-dark-text-secondary hover:text-[#171717] dark:hover:text-white transition-all"
                            >
                                Cancelar
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
