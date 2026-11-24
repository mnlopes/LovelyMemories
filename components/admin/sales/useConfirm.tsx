"use client";

import { useCallback, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import DeleteConfirmModal from "@/components/admin/ui/DeleteConfirmModal";

type ConfirmOptions = {
    title: string;
    message: string;
    /** Defaults to "Remove". */
    confirmLabel?: string;
    variant?: "danger" | "warning";
};

/**
 * The backoffice confirmation modal (as in coupons and rooms) as a promise, so a handler reads
 * `if (!(await confirm({...}))) return;` instead of the browser's window.confirm.
 * Render `dialog` once in the component.
 */
export function useConfirm(): { confirm: (o: ConfirmOptions) => Promise<boolean>; dialog: ReactNode } {
    const t = useTranslations("AdminSales");
    const [pending, setPending] = useState<{ options: ConfirmOptions; resolve: (ok: boolean) => void } | null>(null);

    const confirm = useCallback(
        (options: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ options, resolve })),
        [],
    );

    const close = (ok: boolean) => {
        pending?.resolve(ok);
        setPending(null);
    };

    const dialog = pending ? (
        <DeleteConfirmModal
            isOpen
            isLoading={false}
            onClose={() => close(false)}
            onConfirm={() => close(true)}
            title={pending.options.title}
            message={pending.options.message}
            confirmLabel={pending.options.confirmLabel ?? t("confirm.remove")}
            cancelLabel={t("confirm.cancel")}
            variant={pending.options.variant ?? "danger"}
        />
    ) : null;

    return { confirm, dialog };
}
