// lib/push.ts — push do Co-Host. Nunca lança (chamado no caminho do webhook).
import webpush from "web-push";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function notifyNewDecision(input: {
    guestName: string | null; propertyName: string | null; preview: string;
}): Promise<void> {
    try {
        const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        const priv = process.env.VAPID_PRIVATE_KEY;
        const title = `${input.guestName ?? "Guest"} · ${input.propertyName ?? "Co-Host"}`;
        const body = input.preview.slice(0, 120);

        // Só web push. Sem subscrições/chaves → não faz nada (sem fallback de email).
        if (pub && priv) {
            webpush.setVapidDetails("mailto:info@lovelymemories.pt", pub, priv);
            const supabase = await getSupabaseAdmin();
            const { data: subs } = await supabase
                .from("cohost_push_subscriptions")
                .select("id, endpoint, p256dh, auth");
            for (const s of subs ?? []) {
                try {
                    await webpush.sendNotification(
                        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                        JSON.stringify({ title, body, url: "/en/admin/cohost" }),
                    );
                } catch (e: unknown) {
                    const code = (e as { statusCode?: number }).statusCode;
                    // Subscription morta → limpar
                    if (code === 404 || code === 410) {
                        await supabase.from("cohost_push_subscriptions").delete().eq("id", s.id);
                    }
                }
            }
        }
    } catch (e) {
        console.error("[cohost-push] notify failed:", e);
    }
}
