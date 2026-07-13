"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "@/i18n/routing";
import {
    runBeds24PollNow, importOwnedListings, connectCobaia, importExistingBookings,
    sendBeds24Message, createTestBooking, cancelTestBooking, getCalendarPreview,
} from "@/app/actions/beds24";

/* Painel de medição da Fase 1 — UI funcional (a UI premium é o PMS final). */

type AnyRow = Record<string, any>;

function Card({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
    return (
        <div className="bg-white dark:bg-admin-dark-surface p-6 rounded-2xl border border-[#f5f5f5] dark:border-admin-dark-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold dark:text-admin-dark-text-primary">{title}</h2>
                {right}
            </div>
            {children}
        </div>
    );
}

function Pill({ children, tone = "gray" }: { children: React.ReactNode; tone?: "gray" | "green" | "red" | "blue" | "amber" }) {
    const tones: Record<string, string> = {
        gray: "bg-gray-100 text-gray-700",
        green: "bg-emerald-100 text-emerald-700",
        red: "bg-red-100 text-red-700",
        blue: "bg-blue-100 text-blue-700",
        amber: "bg-amber-100 text-amber-700",
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

function fmtLatency(ms: number | null) {
    if (ms === null || ms === undefined) return "—";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
}

function fmtTime(t?: string | null) {
    return t ? new Date(t).toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—";
}

export default function Beds24Dashboard(props: {
    status: { config: AnyRow | null; recentCalls: AnyRow[]; recentEvents: AnyRow[] };
    properties: AnyRow[];
    bookings: AnyRow[];
    messages: AnyRow[];
}) {
    const { status, properties, bookings, messages } = props;
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [feedback, setFeedback] = useState<string | null>(null);
    const [replyFor, setReplyFor] = useState<number | null>(null);
    const [replyText, setReplyText] = useState("");
    const [preview, setPreview] = useState<{ name: string; calendar: AnyRow[] } | null>(null);
    const [testBookingId, setTestBookingId] = useState<number | null>(null);

    // Live view: re-fetch server data every 30s so webhook-ingested rows show up
    // without manual reload. Reads our own DB only — zero Beds24 API credits.
    useEffect(() => {
        const id = setInterval(() => router.refresh(), 30_000);
        return () => clearInterval(id);
    }, [router]);

    const run = (label: string, fn: () => Promise<unknown>) => {
        setFeedback(null);
        startTransition(async () => {
            try {
                const result = await fn();
                setFeedback(`✅ ${label}: ${typeof result === "string" ? result : JSON.stringify(result)?.slice(0, 400)}`);
            } catch (e) {
                setFeedback(`❌ ${label}: ${e instanceof Error ? e.message : String(e)}`);
            }
        });
    };

    const cobaia = properties.find((p) => p.is_cobaia);
    const credits = status.config?.credit_remaining;

    return (
        <div className="space-y-6 pb-20 text-[#171717] dark:text-admin-dark-text-primary">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Beds24 PMS Lab</h1>
                    <p className="text-[#a3a3a3] mt-1 font-medium text-sm">Fase 1 — medição webhook vs polling · 6 anúncios Primary Owner · produção (só super_admin) · atualização automática 30s</p>
                </div>
                <div className="flex items-center gap-2">
                    {credits !== null && credits !== undefined && (
                        <Pill tone={Number(credits) > 30 ? "green" : "amber"}>créditos: {credits}</Pill>
                    )}
                    <button
                        onClick={() => run("Poll manual", runBeds24PollNow)}
                        disabled={isPending}
                        className="px-4 py-2 rounded-xl bg-black text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
                    >
                        {isPending ? "A correr…" : "Sync agora (polling)"}
                    </button>
                </div>
            </div>

            {feedback && (
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-admin-dark-surface border border-[#f5f5f5] dark:border-admin-dark-border text-sm font-mono break-all">
                    {feedback}
                </div>
            )}

            {/* 1. Propriedades + ações */}
            <Card
                title={`Propriedades (${properties.length})`}
                right={
                    <button
                        onClick={() => run("Importar anúncios owned", importOwnedListings)}
                        disabled={isPending}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                        Importar os 6 (connect: none)
                    </button>
                }
            >
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-[#a3a3a3] border-b border-[#f5f5f5] dark:border-admin-dark-border">
                                <th className="py-2 pr-4">Nome</th>
                                <th className="py-2 pr-4">Beds24 prop/room</th>
                                <th className="py-2 pr-4">Airbnb listing</th>
                                <th className="py-2 pr-4">Estado</th>
                                <th className="py-2">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {properties.map((p) => (
                                <tr key={p.id} className="border-b border-[#fafafa] dark:border-admin-dark-border/50">
                                    <td className="py-2 pr-4 font-medium">
                                        {p.name} {p.is_cobaia && <Pill tone="blue">cobaia</Pill>}
                                    </td>
                                    <td className="py-2 pr-4 font-mono text-xs">{p.beds24_property_id} / {p.beds24_room_id}</td>
                                    <td className="py-2 pr-4 font-mono text-xs">{p.airbnb_listing_id ?? "—"}</td>
                                    <td className="py-2 pr-4">
                                        <Pill tone={p.sync_state === "connected" ? "green" : p.sync_state === "imported" ? "blue" : "gray"}>{p.sync_state}</Pill>
                                    </td>
                                    <td className="py-2 space-x-2 whitespace-nowrap">
                                        <button onClick={() => run(`Preview calendário ${p.name}`, async () => { const r = await getCalendarPreview(p.beds24_property_id); setPreview(r); return `${r.calendar.length} períodos`; })} disabled={isPending} className="text-xs underline text-blue-600">calendário</button>
                                        {p.sync_state === "imported" && p.role === "primary_owner" && (
                                            <button onClick={() => { if (confirm(`LIGAR ${p.name} ao sync (Prices & Availability)? Isto começa a empurrar preços/disponibilidade para o Airbnb LIVE.`)) run(`Ligar cobaia ${p.name}`, () => connectCobaia(p.beds24_property_id)); }} disabled={isPending} className="text-xs underline text-emerald-700">ligar (cobaia)</button>
                                        )}
                                        {p.sync_state === "connected" && (
                                            <>
                                                <button onClick={() => run(`Importar reservas ${p.name}`, () => importExistingBookings(p.beds24_property_id))} disabled={isPending} className="text-xs underline text-blue-600">importar reservas</button>
                                                <button onClick={() => run(`Reserva teste ${p.name}`, async () => { const r = await createTestBooking(p.beds24_property_id); setTestBookingId(r.bookingId); return r; })} disabled={isPending} className="text-xs underline text-amber-700">reserva teste 2027</button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {properties.length === 0 && (
                                <tr><td colSpan={5} className="py-6 text-center text-[#a3a3a3]">Nada importado ainda — clica “Importar os 6”.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {testBookingId && (
                    <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm flex items-center justify-between">
                        <span>Reserva de teste <b>#{testBookingId}</b> criada (10–13 mar 2027). Cronometra no multicalendário do Airbnb e depois cancela.</span>
                        <button onClick={() => run(`Cancelar teste #${testBookingId}`, async () => { const r = await cancelTestBooking(testBookingId); setTestBookingId(null); return r; })} disabled={isPending} className="px-3 py-1 rounded-lg bg-amber-600 text-white text-xs">Cancelar reserva teste</button>
                    </div>
                )}
                {preview && (
                    <div className="mt-3 p-3 rounded-xl bg-gray-50 dark:bg-admin-dark-surface border border-[#f5f5f5] dark:border-admin-dark-border">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold">Calendário Beds24 — {preview.name} (30 dias)</span>
                            <button onClick={() => setPreview(null)} className="text-xs underline">fechar</button>
                        </div>
                        <div className="flex flex-wrap gap-1 text-xs font-mono">
                            {preview.calendar.map((c, i) => (
                                <span key={i} className={`px-2 py-1 rounded ${c.override === "blackout" || c.numAvail === 0 ? "bg-red-100" : "bg-emerald-50"}`}>
                                    {c.from}→{c.to} €{c.price1 ?? "—"} min{c.minStay ?? "—"}
                                </span>
                            ))}
                        </div>
                        <p className="text-xs text-[#a3a3a3] mt-2">Compara com o multicalendário do Airbnb ANTES de ligar o sync.</p>
                    </div>
                )}
            </Card>

            {/* 2. Medição: webhooks recebidos */}
            <Card title={`Webhooks recebidos (${status.recentEvents.length})`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-[#a3a3a3] border-b border-[#f5f5f5] dark:border-admin-dark-border">
                                <th className="py-2 pr-4">Recebido</th>
                                <th className="py-2 pr-4">Latência</th>
                                <th className="py-2 pr-4">Tipo</th>
                                <th className="py-2 pr-4">Booking</th>
                                <th className="py-2">Processado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {status.recentEvents.map((e) => (
                                <tr key={e.id} className="border-b border-[#fafafa] dark:border-admin-dark-border/50">
                                    <td className="py-2 pr-4">{fmtTime(e.received_at)}</td>
                                    <td className="py-2 pr-4 font-mono">{fmtLatency(e.latency_ms)}</td>
                                    <td className="py-2 pr-4">{e.event_type}</td>
                                    <td className="py-2 pr-4 font-mono text-xs">{e.beds24_booking_id ?? "—"}</td>
                                    <td className="py-2">{e.processed ? <Pill tone="green">ok</Pill> : <Pill tone="red">{e.processing_error?.slice(0, 60) ?? "não"}</Pill>}</td>
                                </tr>
                            ))}
                            {status.recentEvents.length === 0 && (
                                <tr><td colSpan={5} className="py-6 text-center text-[#a3a3a3]">Ainda nenhum webhook — configura o URL + header secreto no Beds24 (Settings → Properties → Access).</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* 3. Reservas */}
            <Card title={`Reservas (${bookings.length})`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-[#a3a3a3] border-b border-[#f5f5f5] dark:border-admin-dark-border">
                                <th className="py-2 pr-4">Hóspede</th>
                                <th className="py-2 pr-4">Datas</th>
                                <th className="py-2 pr-4">Prop</th>
                                <th className="py-2 pr-4">Estado</th>
                                <th className="py-2 pr-4">Valor</th>
                                <th className="py-2 pr-4">Canal</th>
                                <th className="py-2">1º visto via</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bookings.map((b) => (
                                <tr key={b.id} className="border-b border-[#fafafa] dark:border-admin-dark-border/50">
                                    <td className="py-2 pr-4 font-medium">{b.guest_first_name} {b.guest_last_name}</td>
                                    <td className="py-2 pr-4 font-mono text-xs">{b.arrival} → {b.departure}</td>
                                    <td className="py-2 pr-4 font-mono text-xs">{b.beds24_property_id}</td>
                                    <td className="py-2 pr-4"><Pill tone={b.status === "confirmed" ? "green" : b.status === "cancelled" ? "red" : "gray"}>{b.status}</Pill></td>
                                    <td className="py-2 pr-4">{b.price ? `€${b.price}` : "—"}</td>
                                    <td className="py-2 pr-4">{b.channel ?? "—"}</td>
                                    <td className="py-2"><Pill tone={b.first_seen_via === "webhook" ? "blue" : "amber"}>{b.first_seen_via}</Pill></td>
                                </tr>
                            ))}
                            {bookings.length === 0 && (
                                <tr><td colSpan={7} className="py-6 text-center text-[#a3a3a3]">Sem reservas sincronizadas ainda.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* 4. Mensagens */}
            <Card title={`Mensagens (${messages.length})`}>
                <div className="space-y-2">
                    {messages.map((m) => (
                        <div key={m.id} className="p-3 rounded-xl border border-[#f5f5f5] dark:border-admin-dark-border">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                    <Pill tone={m.source === "guest" ? "blue" : m.source === "host" ? "green" : "gray"}>{m.source}</Pill>
                                    <span className="text-xs text-[#a3a3a3]">booking {m.beds24_booking_id} · {fmtTime(m.message_time)} · visto via {m.first_seen_via} ({fmtLatency(m.latency_ms)})</span>
                                </div>
                                {m.source === "guest" && (
                                    <button onClick={() => { setReplyFor(m.beds24_booking_id); setReplyText(""); }} className="text-xs underline text-blue-600">responder</button>
                                )}
                            </div>
                            <p className="mt-1 text-sm whitespace-pre-wrap">{m.message}</p>
                            {replyFor === m.beds24_booking_id && (
                                <div className="mt-2 flex gap-2">
                                    <input
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        placeholder="Escreve a resposta…"
                                        className="flex-1 px-3 py-2 rounded-lg border border-[#e5e5e5] dark:border-admin-dark-border bg-transparent text-sm"
                                    />
                                    <button
                                        onClick={() => run(`Enviar msg booking ${m.beds24_booking_id}`, async () => { const r = await sendBeds24Message(m.beds24_booking_id, replyText); setReplyFor(null); return r; })}
                                        disabled={isPending || !replyText.trim()}
                                        className="px-3 py-2 rounded-lg bg-black text-white text-xs font-medium disabled:opacity-50"
                                    >
                                        Enviar
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                    {messages.length === 0 && (
                        <p className="py-6 text-center text-[#a3a3a3] text-sm">Sem mensagens ainda — chegam via webhook ou no “Sync agora”.</p>
                    )}
                </div>
            </Card>

            {/* 5. API log */}
            <Card title="Chamadas API recentes (custo em créditos)">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs font-mono">
                        <tbody>
                            {status.recentCalls.map((c) => (
                                <tr key={c.id} className="border-b border-[#fafafa] dark:border-admin-dark-border/50">
                                    <td className="py-1 pr-3">{fmtTime(c.called_at)}</td>
                                    <td className="py-1 pr-3">{c.method} {c.endpoint}</td>
                                    <td className="py-1 pr-3">{c.status}</td>
                                    <td className="py-1 pr-3">custo {c.request_cost ?? "—"}</td>
                                    <td className="py-1 pr-3">restam {c.credit_remaining ?? "—"}</td>
                                    <td className="py-1">{c.duration_ms}ms {c.error && <span className="text-red-600">{String(c.error).slice(0, 50)}</span>}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
