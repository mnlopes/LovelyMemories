"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import PropertyEditorForm from "@/components/admin/properties/PropertyEditorForm";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Globe } from "lucide-react";
import { toast } from "sonner";

export default function NewPropertyPage() {
    const t = useTranslations('AdminProperties');
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const locale = (params?.locale as string) || 'en';
    const [importedData, setImportedData] = useState<any>(null);
    
    // Check if we are creating a building or a regular property
    const mode = searchParams.get('mode');
    const isBuilding = mode === 'building';

    useEffect(() => {
        if (searchParams.get("mode") === "import") {
            const data = localStorage.getItem("airbnb_import_data");
            if (data) {
                try {
                    const parsed = JSON.parse(data);
                    setImportedData(parsed);
                    // Clear it so it doesn't persist on fresh new property
                    localStorage.removeItem("airbnb_import_data");
                    toast.success("Design system and content imported. Ready to review!");
                } catch (e) {
                    console.error("Failed to parse imported data", e);
                }
            }
        }
    }, [searchParams]);

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="p-2 hover:bg-[#f5f5f5] dark:hover:bg-white/5 rounded-full transition-colors"
                >
                    <ArrowLeft className="size-5 text-[#171717] dark:text-admin-dark-text-primary" />
                </button>
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-bold tracking-tight text-[#171717] dark:text-admin-dark-text-primary">
                            {isBuilding ? t('addBuilding') : t('addProperty')}
                        </h2>
                        {importedData && (
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 text-[10px] font-bold rounded flex items-center gap-1 border border-slate-200 dark:border-white/10">
                                <Globe className="size-3" />
                                Airbnb Import
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-[#a3a3a3] font-medium">
                        {isBuilding ? "Create a parent property to group multiple units." : t('subtitle_new')}
                    </p>
                </div>
            </div>

            <div className="max-w-5xl">
                <PropertyEditorForm 
                    isEditing={false} 
                    mode={isBuilding ? 'building' : undefined} 
                    initialData={importedData} 
                />
            </div>
        </div>
    );
}
