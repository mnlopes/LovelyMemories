"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import PropertyEditorForm from "@/components/admin/properties/PropertyEditorForm";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

export default function NewPropertyPage() {
    const t = useTranslations('AdminProperties');
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
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
        <PropertyEditorForm 
            isEditing={false} 
            mode={isBuilding ? 'building' : undefined} 
            initialData={importedData} 
        />
    );
}
