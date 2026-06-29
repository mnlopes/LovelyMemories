"use client";

import { useFormStatus } from "react-dom";
import { Loader2, ChevronRight } from "lucide-react";
import { confirmAuthLink, redeemInviteToken } from "@/app/actions/auth";

function SubmitButton({ label }: { label: string }) {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full h-14 bg-[#192537] text-white rounded-2xl font-bold uppercase tracking-[0.1em] hover:bg-[#253652] active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3 group shadow-lg shadow-[#192537]/20"
        >
            {pending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
                <>
                    {label}
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
            )}
        </button>
    );
}

export function ConfirmForm({
    tokenHash,
    inviteToken,
    type,
    next,
    label,
}: {
    tokenHash?: string;
    inviteToken?: string;
    type?: string;
    next: string;
    label: string;
}) {
    // Two link kinds share this interstitial: our long-lived owner-invite token (redeemInviteToken)
    // and Supabase's own token_hash used by password recovery (confirmAuthLink). Both only verify on
    // this explicit submit, so email prefetchers never consume them.
    const isInvite = !!inviteToken;
    return (
        <form action={isInvite ? redeemInviteToken : confirmAuthLink} className="w-full">
            {isInvite ? (
                <input type="hidden" name="invite" value={inviteToken} />
            ) : (
                <>
                    <input type="hidden" name="token_hash" value={tokenHash} />
                    <input type="hidden" name="type" value={type} />
                </>
            )}
            <input type="hidden" name="next" value={next} />
            <SubmitButton label={label} />
        </form>
    );
}
