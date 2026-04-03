"use client";

import { useState, useEffect } from "react";
import { X, Link as LinkIcon, Globe, Loader2 } from "lucide-react";
import { scrapeAirbnbListing } from "@/app/actions/airbnb";
import { toast } from "sonner";
import { useRouter, useParams } from "next/navigation";

interface ImportAirbnbModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ImportAirbnbModal({ isOpen, onClose }: ImportAirbnbModalProps) {
    const [url, setUrl] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const params = useParams();
    const locale = (params?.locale as string) || 'en';

    // Close on ESC
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    const handleImport = async () => {
        if (!url || !url.includes("airbnb")) {
            toast.error("Please enter a valid Airbnb URL");
            return;
        }

        setIsLoading(true);
        try {
            const res = await scrapeAirbnbListing(url);
            
            if (res.success && res.data) {
                localStorage.setItem("airbnb_import_data", JSON.stringify(res.data));
                toast.success("Property details extracted successfully.");
                onClose();
                router.push(`/${locale}/admin/properties/new?mode=import`);
            } else {
                toast.error(res.error || "Failed to extract data from Airbnb.");
            }
        } catch (error) {
            console.error("Import Error:", error);
            toast.error("An error occurred during import.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-admin-dark-surface rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-gray-100 dark:border-white/10">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-50 dark:border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center border border-gray-100 dark:border-white/10">
                            <Globe className="size-5 text-[#171717] dark:text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-[#171717] dark:text-white tracking-tight">Airbnb Import</h3>
                            <p className="text-xs text-[#a3a3a3] font-medium">Auto-fill listing details</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 rounded-full transition-all"
                        disabled={isLoading}
                    >
                        <X className="size-5" />
                    </button>
                </div>

                <div className="p-8">
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-[#a3a3a3] px-1">
                                Airbnb Listing URL
                            </label>
                            <div className="relative group">
                                <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-[#a3a3a3] group-focus-within:text-[#171717] dark:group-focus-within:text-white transition-colors" />
                                <input
                                    type="text"
                                    placeholder="https://www.airbnb.com/rooms/..."
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    className="w-full bg-[#fafafa] dark:bg-white/5 border border-gray-100 dark:border-white/10 pl-11 pr-4 py-3.5 rounded-xl text-sm font-medium focus:ring-1 focus:ring-[#171717] dark:focus:ring-white border-transparent focus:border-[#171717] outline-none transition-all dark:text-white placeholder:text-[#d4d4d4]"
                                    disabled={isLoading}
                                    autoFocus
                                />
                            </div>
                            <p className="text-[11px] text-[#a3a3a3] px-1 font-medium italic">
                                English content and high-resolution images will be extracted.
                            </p>
                        </div>

                        {isLoading && (
                            <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-white/5 rounded-xl animate-in fade-in slide-in-from-bottom-2">
                                <Loader2 className="size-5 text-[#171717] dark:text-white animate-spin" />
                                <div>
                                    <p className="text-xs font-bold text-[#171717] dark:text-white">Scanning listing...</p>
                                    <p className="text-[10px] text-[#a3a3a3] font-medium">Extracting metadata and gallery.</p>
                                </div>
                            </div>
                        )}

                        <div className="pt-2 flex flex-col gap-3">
                            <button
                                onClick={handleImport}
                                disabled={isLoading || !url}
                                className="w-full bg-[#171717] dark:bg-white text-white dark:text-[#171717] py-3.5 rounded-xl font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-30 disabled:scale-100 flex items-center justify-center gap-2 shadow-lg shadow-black/5"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="size-4 animate-spin" />
                                        Importing...
                                    </>
                                ) : (
                                    "Continue to Review"
                                )}
                            </button>
                            {!isLoading && (
                                <button
                                    onClick={onClose}
                                    className="w-full py-2 text-[11px] font-bold text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
