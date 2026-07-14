import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSupabaseAdmin } from "./supabase";

/**
 * The "brain" for AI guest messaging (transport-neutral — Beds24 is the current PMS/transport,
 * but nothing in this file talks to it directly).
 *
 * This is where the two things n8n gives you with a "memory" node + an
 * "OpenAI node" are assembled by hand — with more control:
 *
 *   • Short-term memory (the conversation)  → `history` passed into the context
 *   • Long-term memory (tone + knowledge)   → BRAND_TONE + property knowledge (Supabase)
 *   • Guest memory (past stays, prefs)      → reservation context (Supabase) [optional]
 *
 * Flow: buildContext() gathers the memories → draftReply() calls the LLM.
 * Nothing is sent here — the draft goes to the admin approval queue.
 *
 * Env vars:
 *   AI_MESSAGING_PROVIDER     — optional, "openai" | "gemini" (auto-detected from keys)
 *   OPENAI_API_KEY            — required when using OpenAI (as in app/actions/translate.ts)
 *   OPENAI_MESSAGING_MODEL    — optional, defaults to gpt-4o-mini
 *   GEMINI_API_KEY            — required when using Gemini (already in .env.local)
 *   GEMINI_MESSAGING_MODEL    — optional, defaults to gemini-flash-latest
 *
 * NOTE: server-only. Never import this from a client component.
 * The provider is swappable; the context (memories) is identical either way.
 *
 * Scope note: this file holds only types, tone, knowledge loading, context/prompt building,
 * and draftReply(). The decision/queue pipeline (classify → draft → escalate) lives in
 * lib/ai-decision.ts, and the transport plumbing (webhook/sync → this pipeline → Beds24) lives
 * in lib/beds24/bot-bridge.ts.
 */

type AIProvider = "openai" | "gemini";

const OPENAI_MODEL = process.env.OPENAI_MESSAGING_MODEL || "gpt-4o-mini";
// Default to the pinned stable model — the "-latest" alias has been unreliable (503 "high demand").
const GEMINI_MODEL = process.env.GEMINI_MESSAGING_MODEL || "gemini-2.5-flash";
/** One stable fallback model, tried if the primary is overloaded/unavailable. Kept short so the
 * whole draft attempt stays webhook-safe (a long retry/fallback chain can outlast the request). */
const GEMINI_FALLBACK_MODELS = ["gemini-2.0-flash"];

/** Picks the provider: explicit env var, else whichever API key is present (OpenAI first). */
function resolveProvider(): AIProvider {
    const explicit = process.env.AI_MESSAGING_PROVIDER as AIProvider | undefined;
    if (explicit === "openai" || explicit === "gemini") return explicit;
    if (process.env.OPENAI_API_KEY) return "openai";
    if (process.env.GEMINI_API_KEY) return "gemini";
    return "openai";
}

export interface ProviderStatus {
    provider: AIProvider;
    model: string;
    openaiKeyPresent: boolean;
    geminiKeyPresent: boolean;
    /** Whether the active provider has its key set — i.e. drafting can run. */
    ready: boolean;
}

/** Non-secret snapshot of the LLM config, safe to surface in the admin UI. */
export function describeProvider(): ProviderStatus {
    const provider = resolveProvider();
    const openaiKeyPresent = !!process.env.OPENAI_API_KEY;
    const geminiKeyPresent = !!process.env.GEMINI_API_KEY;
    return {
        provider,
        model: provider === "gemini" ? GEMINI_MODEL : OPENAI_MODEL,
        openaiKeyPresent,
        geminiKeyPresent,
        ready: provider === "gemini" ? geminiKeyPresent : openaiKeyPresent,
    };
}

/**
 * Long-term memory: how Lovely Memories speaks. Calibrated from real host conversations
 * (the "Achilleas voice") — 2026-07-09. Tune further as more conversations come in.
 */
const DEFAULT_BRAND_TONE = `You are the guest-experience assistant for Lovely Memories, a vacation-rental
management company hosting apartments in Porto, Portugal. You write on behalf of the host team
(the human host is Achilleas). Guests you talk to have ALREADY booked — this is their stay, not a
sales conversation.

Voice:
- Warm and welcoming, like a real host who loves the city — never robotic or call-centre generic.
- Answer the actual question first, clearly, then add any genuinely useful detail.
- Friendly and personal. Light, occasional emoji is fine (😊 🙂). In Portuguese use "tu".
- Keep it to a short message suitable for the Airbnb chat.

House policy you can state confidently:
- Check-in is after 3 pm; check-out is by the listed time. Early check-in / late check-out
  usually can't be accommodated, but if the apartment is ready earlier the team lets them know.
- Check-in codes/instructions are sent at 3 pm on the arrival day (earlier if the place is ready).
- Before arrival, guests must complete the mandatory Portuguese government (SEF) form — share the
  form link if the property has one; never collect their ID details in the chat yourself.

Hard rules:
- Reply in the guest's language. If you cannot tell, reply in English — never assume Portuguese.
- Use ONLY the facts provided below. If you don't have the information, say so honestly and offer
  to check with the team — never invent door codes, Wi-Fi passwords, prices, addresses, or policies.
- Do NOT accept, decline, or negotiate bookings, dates, prices, refunds, or cancellations. Say the
  team will confirm, and stay warm.
- If the guest is upset or complaining, be genuinely empathetic, apologise for the trouble, and say
  the team will help — never argue, never suggest cancelling their reservation.
- Never ask for or repeat a guest's personal/identity data in the chat — point them to the official form.`;

export interface PropertyKnowledge {
    /** Row primary key (uuid). Present for saved rows; the stable handle for edit/delete. */
    id?: string | null;
    /** External (Beds24) property id — the match key for incoming messages. */
    externalPropertyId?: string | null;
    /** Beds24 room id — needed by the agent's calendar tool. */
    beds24RoomId?: number | null;
    /** Optional human label, e.g. "C3". No longer the primary key. */
    code?: string | null;
    listingName?: string | null;
    checkIn?: string | null;
    checkOut?: string | null;
    /** Full address (imported) — useful for directions. */
    address?: string | null;
    /** House rules summary, e.g. "No smoking, no pets" (imported). */
    houseRules?: string | null;
    /** Amenities list (imported), readable. */
    amenities?: string | null;
    wifiName?: string | null;
    wifiPassword?: string | null;
    doorCode?: string | null;
    parking?: string | null;
    /** Building entrance instructions, e.g. keypad sequence + street address. */
    buildingAccess?: string | null;
    /** Apartment location + lockbox, e.g. "2nd floor, door CH; lockbox 0911". */
    apartmentAccess?: string | null;
    /** Emergency phone number. */
    emergencyContact?: string | null;
    /** Mandatory SEF (government) form URL to share before arrival. */
    govFormUrl?: string | null;
    /** Airbnb guidebook URL. */
    guidebookUrl?: string | null;
    tips?: string | null;
    /** Optional per-property tone override, appended to BRAND_TONE. */
    toneNotes?: string | null;
    /** Public URLs of access/key-pickup indication photos (attached to access replies). */
    accessPhotos?: string[] | null;
}

export interface ReservationContext {
    guestName?: string | null;
    checkInDate?: string | null;
    checkOutDate?: string | null;
    guests?: number | null;
    previousStays?: number | null;
}

export interface ThreadMessage {
    role: "guest" | "host";
    content: string;
    at?: string | null;
}

export interface DraftContext {
    guestMessage: string;
    /** Guest's language for the reply, e.g. "pt" | "en" | "he". */
    locale?: string;
    property: PropertyKnowledge | null;
    reservation: ReservationContext | null;
    history: ThreadMessage[];
    /** Effective brand tone/instructions (DB override, else the built-in default). */
    brandTone?: string | null;
}

/** The built-in default tone, shown in the editor as the starting point. */
export const DEFAULT_BRAND_TONE_TEXT = DEFAULT_BRAND_TONE;

/**
 * Loads the admin-editable global brand tone from the DB, falling back to the built-in default.
 * Fails soft (returns the default) if the settings table/row is missing.
 */
export async function loadBrandTone(): Promise<string> {
    try {
        const supabase = await getSupabaseAdmin();
        const { data, error } = await supabase
            .from("ai_messaging_settings")
            .select("brand_tone")
            .eq("id", 1)
            .maybeSingle();
        if (error || !data?.brand_tone?.trim()) return DEFAULT_BRAND_TONE;
        return data.brand_tone;
    } catch {
        return DEFAULT_BRAND_TONE;
    }
}

/** The property_ai_extras columns (secrets/extras kept out of the public properties table). */
export const EXTRAS_COLUMNS =
    "id, property_id, wifi_name, wifi_password, door_code, building_access, apartment_access, emergency_contact, gov_form_url, guidebook_url, tips, tone_notes, access_photos";

/** Base property columns read from the booking-site `properties` table for AI context. */
export const PROPERTY_BASE_COLUMNS = "id, title, check_in, address, house_rules, amenities, parking";

/** Maps a `properties` row (localised jsonb) to the base AI fields. */
export function mapPropertyBase(p: Record<string, unknown>): Partial<PropertyKnowledge> {
    const asObj = <T,>(v: unknown): T | null => (v && typeof v === "object" ? (v as T) : null);
    const title = asObj<{ en?: string }>(p.title);
    const ci = asObj<{ arrivalStart?: string; departureEnd?: string }>(p.check_in);
    const rules = asObj<{ petsAllowed?: boolean; smokingAllowed?: boolean; partiesAllowed?: boolean }>(p.house_rules);
    const amenities = Array.isArray(p.amenities) ? (p.amenities as Array<{ items?: Array<{ en?: string } | string> }>) : null;
    const parking = asObj<{ size?: { en?: string } }>(p.parking);

    const rulesText = rules
        ? [
              rules.petsAllowed === false ? "No pets" : rules.petsAllowed === true ? "Pets allowed" : null,
              rules.smokingAllowed === false ? "No smoking" : null,
              rules.partiesAllowed === false ? "No parties or events" : null,
          ].filter(Boolean).join(", ")
        : "";

    const amenitiesText = amenities
        ? amenities.flatMap((a) => (a.items ?? []).map((it) => (typeof it === "string" ? it : it?.en))).filter(Boolean).join(", ")
        : "";

    return {
        listingName: title?.en ?? null,
        checkIn: ci?.arrivalStart ?? null,
        checkOut: ci?.departureEnd ?? null,
        address: (p.address as string) ?? null,
        houseRules: rulesText || null,
        amenities: amenitiesText || null,
        parking: parking?.size?.en ?? null,
    };
}

/** Maps a property_ai_extras row to the extras portion of PropertyKnowledge. */
export function mapExtrasRow(d: Record<string, unknown> | null | undefined): Partial<PropertyKnowledge> {
    if (!d) return { accessPhotos: [] };
    return {
        wifiName: (d.wifi_name as string) ?? null,
        wifiPassword: (d.wifi_password as string) ?? null,
        doorCode: (d.door_code as string) ?? null,
        buildingAccess: (d.building_access as string) ?? null,
        apartmentAccess: (d.apartment_access as string) ?? null,
        emergencyContact: (d.emergency_contact as string) ?? null,
        govFormUrl: (d.gov_form_url as string) ?? null,
        guidebookUrl: (d.guidebook_url as string) ?? null,
        tips: (d.tips as string) ?? null,
        toneNotes: (d.tone_notes as string) ?? null,
        accessPhotos: Array.isArray(d.access_photos) ? (d.access_photos as string[]) : [],
    };
}

/**
 * Loads a property's operational knowledge by its external (Beds24) property id.
 *
 * The external id has no direct column on the booking-site `properties` table — it's resolved
 * through `beds24_properties.beds24_property_id` (bigint) → `beds24_properties.internal_property_id`
 * (uuid, nullable, no FK — plain-value mapping by design). If that internal id is null (property
 * imported from Beds24 but not yet linked to a booking-site listing), this still returns partial
 * knowledge — just the Beds24 property name, no base fields, no extras — rather than failing.
 *
 * Fails soft (returns null) so a draft still works with less context.
 */
export async function loadPropertyKnowledge(externalPropertyId: string | null | undefined): Promise<PropertyKnowledge | null> {
    if (!externalPropertyId) return null;
    try {
        const supabase = await getSupabaseAdmin();
        const beds24PropertyId = Number(externalPropertyId);
        if (!Number.isFinite(beds24PropertyId)) return null;

        const { data: beds24Prop } = await supabase
            .from("beds24_properties")
            .select("internal_property_id, name, beds24_room_id")
            .eq("beds24_property_id", beds24PropertyId)
            .maybeSingle();
        if (!beds24Prop) return null;

        const roomId = (beds24Prop as { beds24_room_id: number | null }).beds24_room_id ?? null;

        const internalPropertyId = (beds24Prop as { internal_property_id: string | null }).internal_property_id;
        if (!internalPropertyId) {
            // Not yet linked to a booking-site listing — partial knowledge only.
            return {
                externalPropertyId,
                beds24RoomId: roomId,
                listingName: (beds24Prop as { name: string | null }).name ?? null,
            };
        }

        const { data: prop } = await supabase
            .from("properties")
            .select(PROPERTY_BASE_COLUMNS)
            .eq("id", internalPropertyId)
            .maybeSingle();
        const { data: extras } = await supabase
            .from("property_ai_extras")
            .select(EXTRAS_COLUMNS)
            .eq("property_id", internalPropertyId)
            .maybeSingle();

        return {
            id: internalPropertyId,
            externalPropertyId,
            beds24RoomId: roomId,
            ...(prop ? mapPropertyBase(prop as Record<string, unknown>) : { listingName: (beds24Prop as { name: string | null }).name ?? null }),
            ...mapExtrasRow(extras as Record<string, unknown> | null),
        };
    } catch {
        return null;
    }
}

/**
 * Gathers the three memories into a single context object, ready for draftReply().
 * `history` and `reservation` are passed in by the caller (from the inbound webhook / sync)
 * for now; wire them to real sources as the integration lands.
 */
export async function buildContext(input: {
    guestMessage: string;
    externalPropertyId?: string | null;
    locale?: string;
    reservation?: ReservationContext | null;
    history?: ThreadMessage[];
}): Promise<DraftContext> {
    const [property, brandTone] = await Promise.all([
        loadPropertyKnowledge(input.externalPropertyId),
        loadBrandTone(),
    ]);
    return {
        guestMessage: input.guestMessage,
        locale: input.locale,
        property,
        reservation: input.reservation ?? null,
        history: input.history ?? [],
        brandTone,
    };
}

/** Builds the system prompt: brand tone + long-term memory (property + reservation facts). */
export function buildSystemPrompt(ctx: DraftContext): string {
    const parts: string[] = [ctx.brandTone?.trim() || DEFAULT_BRAND_TONE];

    if (ctx.locale === "pt" || ctx.locale === "he" || ctx.locale === "en") {
        const lang = ctx.locale === "pt" ? "Portuguese" : ctx.locale === "he" ? "Hebrew" : "English";
        parts.push(`LANGUAGE: The guest's language is ${lang}. Write your entire reply in ${lang}, regardless of what language this prompt is in.`);
    } else {
        parts.push(`LANGUAGE: Reply in the SAME language the guest is writing in. If their message is too short or ambiguous to tell (e.g. "ok", "thanks", "done"), match the language used earlier in the conversation, and otherwise reply in English. Never default to Portuguese unless the guest is clearly writing Portuguese.`);
    }

    const p = ctx.property;
    if (p) {
        const facts = [
            p.listingName && `Property: ${p.listingName}${p.code ? ` (${p.code})` : ""}`,
            p.address && `Address: ${p.address}`,
            p.checkIn && `Check-in: ${p.checkIn}`,
            p.checkOut && `Check-out: ${p.checkOut}`,
            p.wifiName && `Wi-Fi network: ${p.wifiName}`,
            p.wifiPassword && `Wi-Fi password: ${p.wifiPassword}`,
            p.doorCode && `Door code: ${p.doorCode}`,
            p.buildingAccess && `Building access: ${p.buildingAccess}`,
            p.apartmentAccess && `Apartment access: ${p.apartmentAccess}`,
            p.parking && `Parking: ${p.parking}`,
            p.houseRules && `House rules: ${p.houseRules}`,
            p.amenities && `Amenities available: ${p.amenities}`,
            p.emergencyContact && `Emergency contact: ${p.emergencyContact}`,
            p.govFormUrl && `Mandatory pre-arrival government (SEF) form: ${p.govFormUrl}`,
            p.guidebookUrl && `Guidebook: ${p.guidebookUrl}`,
            p.tips && `Local tips: ${p.tips}`,
        ].filter(Boolean);
        if (facts.length) parts.push(`Property information (use only what is relevant):\n${facts.join("\n")}`);
        if (p.toneNotes) parts.push(`Tone notes for this property: ${p.toneNotes}`);
        if (p.accessPhotos && p.accessPhotos.length) {
            parts.push("An annotated photo showing where to collect the keys / find the lockbox will be attached to your reply automatically. Refer to it naturally (e.g. \"see the photo below\") instead of describing the location in exhaustive detail.");
        }
    } else {
        parts.push("No property information is available for this conversation. Do not guess property-specific details.");
    }

    const r = ctx.reservation;
    if (r) {
        const res = [
            r.guestName && `Guest name: ${r.guestName}`,
            r.checkInDate && `Arriving: ${r.checkInDate}`,
            r.checkOutDate && `Leaving: ${r.checkOutDate}`,
            typeof r.guests === "number" && `Party size: ${r.guests}`,
            typeof r.previousStays === "number" && r.previousStays > 0 && `Returning guest — ${r.previousStays} previous stay(s). Acknowledge warmly.`,
        ].filter(Boolean);
        if (res.length) parts.push(`Reservation:\n${res.join("\n")}`);
    }

    return parts.join("\n\n");
}

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

/** Builds the full message array: system prompt + short-term memory (thread) + new message. */
export function buildMessages(ctx: DraftContext): ChatMessage[] {
    const history: ChatMessage[] = ctx.history.map((m) => ({
        role: m.role === "guest" ? "user" : "assistant",
        content: m.content,
    }));

    return [
        { role: "system", content: buildSystemPrompt(ctx) },
        ...history,
        { role: "user", content: ctx.guestMessage },
    ];
}

/** Broad: a temporary "try again later" problem — used for the user-facing busy message. */
export function isTransientLlmError(err: unknown): boolean {
    const msg = err instanceof Error ? err.message : String(err);
    return /\b(429|500|502|503|504)\b|overloaded|unavailable|high demand|quota|rate limit|try again/i.test(msg);
}

/**
 * Narrow: worth retrying the SAME model right now. Server hiccups (5xx/overload) yes; quota/429
 * no — a quota won't clear in seconds, so retrying just wastes time and risks a webhook timeout.
 * Those fall over to another model/provider instead (see shouldFallover).
 */
function isRetryable(err: unknown): boolean {
    const msg = err instanceof Error ? err.message : String(err);
    if (/\b429\b|quota|rate limit/i.test(msg)) return false;
    return /\b(500|502|503|504)\b|overloaded|unavailable|high demand|timeout|try again/i.test(msg);
}

/** Retries a call on server hiccups only, with short backoff (~0.6s, 1.2s). Kept brief so the
 *  whole draft attempt stays under a webhook's timeout. */
async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
    let lastErr: unknown;
    for (let i = 0; i < attempts; i++) {
        try {
            return await fn();
        } catch (err) {
            lastErr = err;
            if (!isRetryable(err) || i === attempts - 1) throw err;
            await new Promise((r) => setTimeout(r, 600 * 2 ** i));
        }
    }
    throw lastErr;
}

/** Whether to fall over to another model/provider: transient outages or a bad/missing model. */
function shouldFallover(err: unknown): boolean {
    const msg = err instanceof Error ? err.message : String(err);
    return isTransientLlmError(err) || /not found|not supported|does not exist|unknown model|invalid model|404/i.test(msg);
}

/**
 * Calls the LLM and returns the drafted reply text. Does not send anything.
 *
 * Resilience: transient upstream errors (503/overloaded/rate limit) are retried with backoff;
 * if a provider is still down, it falls over to the other provider when that key is present
 * (so with both keys set, an outage on one is covered by the other). Within Gemini it also tries
 * pinned fallback models. Throws only if every option fails — the caller leaves it for a human.
 */
export async function draftReply(ctx: DraftContext): Promise<string> {
    const primary = resolveProvider();
    const order: AIProvider[] = primary === "openai" ? ["openai", "gemini"] : ["gemini", "openai"];
    const hasKey = (p: AIProvider) => (p === "openai" ? !!process.env.OPENAI_API_KEY : !!process.env.GEMINI_API_KEY);
    const chain = order.filter(hasKey);
    if (!chain.length) chain.push(primary); // let it throw the clear "missing key" error

    let lastErr: unknown;
    for (let i = 0; i < chain.length; i++) {
        const p = chain[i];
        try {
            const draft = p === "gemini" ? await draftWithGeminiChain(ctx) : await withRetry(() => draftWithOpenAI(ctx));
            if (draft) return draft;
            lastErr = new Error("The model returned an empty draft.");
        } catch (err) {
            lastErr = err;
            const isLast = i === chain.length - 1;
            if (!shouldFallover(err) || isLast) throw err;
            console.warn(`[ai-messaging] ${p} unavailable, falling over to ${chain[i + 1]}:`, err instanceof Error ? err.message : err);
        }
    }
    throw lastErr ?? new Error("The model returned an empty draft.");
}

async function draftWithOpenAI(ctx: DraftContext): Promise<string | undefined> {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("Missing OPENAI_API_KEY. Set it in .env.local to draft AI replies.");

    const openai = new OpenAI({ apiKey: key });
    const response = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: buildMessages(ctx),
        temperature: 0.6,
    });
    return response.choices[0]?.message?.content?.trim();
}

/** Tries the configured Gemini model, then pinned fallbacks, retrying transient errors on each. */
async function draftWithGeminiChain(ctx: DraftContext): Promise<string | undefined> {
    const models = [GEMINI_MODEL, ...GEMINI_FALLBACK_MODELS].filter((m, i, a) => a.indexOf(m) === i);
    let lastErr: unknown;
    for (let i = 0; i < models.length; i++) {
        try {
            return await withRetry(() => draftWithGemini(ctx, models[i]));
        } catch (err) {
            lastErr = err;
            if (!shouldFallover(err) || i === models.length - 1) throw err;
            console.warn(`[ai-messaging] Gemini model ${models[i]} unavailable, trying ${models[i + 1]}`);
        }
    }
    throw lastErr;
}

async function draftWithGemini(ctx: DraftContext, modelName: string): Promise<string | undefined> {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("Missing GEMINI_API_KEY. Set it in .env.local to draft AI replies.");

    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: buildSystemPrompt(ctx),
        generationConfig: { temperature: 0.6 },
    });
    // Gemini history must start with a user turn; guest = user, host = model. Most threads open
    // with OUR scheduled welcome message (a host/model turn), which Gemini rejects outright
    // ("First content should be with role 'user'") — drop leading host turns until the first
    // guest message. OpenAI has no such constraint, so this trim is Gemini-only.
    const history = ctx.history.map((m) => ({
        role: m.role === "guest" ? ("user" as const) : ("model" as const),
        parts: [{ text: m.content }],
    }));
    while (history.length && history[0].role !== "user") history.shift();
    const chat = model.startChat({ history });
    const result = await chat.sendMessage(ctx.guestMessage);
    return result.response.text().trim();
}
