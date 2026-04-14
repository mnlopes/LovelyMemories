"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { undoAirbnbImport } from "@/app/actions/airbnb-import";
import { useRouter } from "next/navigation";
import { StatusModal } from "@/components/admin/ui/StatusModal";

export default function UndoImportButton({ batchId }: { batchId: string }) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const router = useRouter();

    const handleUndo = async () => {
        setIsDeleting(true);
        setIsModalOpen(false);
        try {
            const res = await undoAirbnbImport(batchId);
            if (res.success) {
                toast.success("Import successfully undone.");
                router.refresh();
            } else {
                toast.error(res.error || "Failed to undo import.");
            }
        } catch (error: any) {
            toast.error(error.message || "An unexpected error occurred");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                disabled={isDeleting}
                className="p-2 text-[#a3a3a3] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                title="Undo Import"
            >
                {isDeleting ? <Loader2 className="size-4 animate-spin text-red-500" /> : <Trash2 className="size-4" />}
            </button>

            <StatusModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                type="warning"
                title="Desfazer Importação?"
                message="Tens a certeza que queres desfazer esta importação? Isto irá remover todos os registos financeiros associados a este lote."
                actionLabel="Sim, Desfazer"
                onAction={handleUndo}
            />
        </>
    );
}
