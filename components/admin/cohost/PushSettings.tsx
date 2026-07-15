"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { BellRing, BellOff } from "lucide-react";
import { savePushSubscription, removePushSubscription } from "@/app/actions/ai-inbox";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
    const padding = "=".repeat((4 - (base64.length % 4)) % 4);
    const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(b64);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
}

export function PushSettings() {
    const t = useTranslations("AdminCohost.push");
    const [state, setState] = useState<"unsupported" | "off" | "on" | "busy">("busy");

    useEffect(() => {
        (async () => {
            if (!("serviceWorker" in navigator) || !("PushManager" in window)) { setState("unsupported"); return; }
            const reg = await navigator.serviceWorker.register("/cohost-sw.js");
            const sub = await reg.pushManager.getSubscription();
            setState(sub ? "on" : "off");
        })().catch(() => setState("unsupported"));
    }, []);

    const enable = async () => {
        setState("busy");
        try {
            const perm = await Notification.requestPermission();
            if (perm !== "granted") { setState("off"); return; }
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
            });
            const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
            await savePushSubscription(json);
            setState("on");
        } catch { setState("off"); }
    };

    const disable = async () => {
        setState("busy");
        try {
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription();
            if (sub) { await removePushSubscription(sub.endpoint); await sub.unsubscribe(); }
        } finally { setState("off"); }
    };

    if (state === "unsupported") {
        return <p className="p-4 text-xs text-[#a3a3a3]">{t("unsupported")}</p>;
    }
    return (
        <div className="flex items-center justify-between gap-3 border-t border-[#f5f5f5] p-4 dark:border-white/10">
            <div>
                <p className="text-sm font-semibold text-[#171717] dark:text-white">{t("title")}</p>
                <p className="text-xs text-[#a3a3a3]">{state === "on" ? t("enabledHint") : t("disabledHint")}</p>
            </div>
            <button
                disabled={state === "busy"}
                onClick={state === "on" ? disable : enable}
                className="flex items-center gap-1.5 rounded-xl bg-[#171717] px-3 py-2 text-xs font-bold text-white disabled:opacity-50 dark:bg-white dark:text-black"
            >
                {state === "on" ? <BellOff className="size-3.5" /> : <BellRing className="size-3.5" />}
                {state === "on" ? t("disable") : t("enable")}
            </button>
        </div>
    );
}
