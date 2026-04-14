"use client";

import { useTransition } from "react";
import { stopImpersonation } from "@/app/actions/impersonation";
import { useRouter } from "next/navigation";
import { Loader2, LogOut, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export function ImpersonationBanner({ ownerName }: { ownerName: string }) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const handleExit = () => {
        startTransition(async () => {
            try {
                await stopImpersonation();
                toast.success("Exited impersonation mode");
                router.push("/admin/owners");
                router.refresh();
            } catch (error) {
                toast.error("Failed to exit impersonation mode");
            }
        });
    };

    return (
        <div className="bg-[#0A1128] text-white py-2 px-4 flex items-center justify-between sticky top-0 z-[100] border-b border-white/10 animate-in fade-in slide-in-from-top duration-500">
            <div className="flex items-center gap-3">
                <div className="bg-amber-500/20 p-1.5 rounded-lg border border-amber-500/30">
                    <ShieldAlert className="size-4 text-amber-500" />
                </div>
                <div className="text-sm font-light tracking-wide">
                    <span className="opacity-60">Impersonating </span>
                    <span className="font-bold text-amber-500">{ownerName}</span>
                    <span className="hidden md:inline opacity-60 ml-2">(Admin View Mode)</span>
                </div>
            </div>

            <button
                onClick={handleExit}
                disabled={isPending}
                className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-all text-sm font-bold border border-white/10 group"
            >
                {isPending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                ) : (
                    <LogOut className="size-3.5 group-hover:-translate-x-0.5 transition-transform" />
                )}
                Exit Mode
            </button>
        </div>
    );
}
