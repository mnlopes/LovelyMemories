'use server';

import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

type AIProvider = 'gemini' | 'openai';

export async function translateText(content: string, targetLang: string, apiKey?: string, provider: AIProvider = 'gemini') {
    if (!content) return content;

    // Fallback to env vars if no key passed
    const key = apiKey || (provider === 'openai' ? process.env.OPENAI_API_KEY : process.env.GEMINI_API_KEY);

    const cleanContent = content ? content.trim() : "";

    if (!key) {
        throw new Error(`Missing API Key for ${provider}. Please check your environment variables (.env.local).`);
    }

    try {
        if (provider === 'openai') {
            const openai = new OpenAI({ apiKey: key });
            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: "You are a professional translator for a luxury real estate agency. Translate the text strictly. Do not add quotes." },
                    { role: "user", content: `Translate this to ${targetLang === 'he' ? 'Hebrew' : targetLang === 'pt' ? 'Portuguese' : targetLang}:\n\n"${cleanContent}"` }
                ],
                temperature: 0.3,
            });
            return response.choices[0]?.message?.content?.trim() || content;
        } else {
            // Gemini (Default) with Model Fallback
            const genAI = new GoogleGenerativeAI(key);
            // Prefixing with models/ can help with some SDK versions
            const GEMINI_MODELS = [
                "gemini-flash-latest",
                "gemini-2.0-flash",
                "gemini-1.5-flash-8b",
                "gemini-1.5-pro",
                "gemini-pro-latest"
            ];

            let lastError;

            // Helper for exponential backoff retry (max 3 retries)
            const retryWithBackoff = async (fn: () => Promise<any>, maxRetries = 3) => {
                for (let i = 0; i <= maxRetries; i++) {
                    try {
                        return await fn();
                    } catch (err: any) {
                        const msg = err.message || '';
                        // 429, 500, 503 are retryable
                        const isRetryable = msg.includes('429') || msg.includes('quota') || msg.includes('500') || msg.includes('503');

                        if (isRetryable && i < maxRetries) {
                            const delay = Math.pow(2, i) * 3000 + Math.random() * 1000;
                            console.warn(`[GEMINI] Rate Limit reached. Waiting ${Math.round(delay / 1000)}s before retry ${i + 1}/${maxRetries}...`);
                            await new Promise(resolve => setTimeout(resolve, delay));
                            continue;
                        }
                        throw err;
                    }
                }
            };

            // Try models in order
            for (const baseModelName of GEMINI_MODELS) {
                const namesToTry = [`models/${baseModelName}`, baseModelName];

                for (const modelName of namesToTry) {
                    try {
                        console.log(`[GEMINI] Attempting translation with ${modelName} (${targetLang})...`);
                        const model = genAI.getGenerativeModel({ model: modelName });
                        const prompt = `You are a professional translator. Translate the text below strictly into ${targetLang === 'he' ? 'Hebrew' : targetLang === 'pt' ? 'Portuguese' : targetLang}.\nText: "${cleanContent}"`;

                        const translatedText = await retryWithBackoff(async () => {
                            const result = await model.generateContent(prompt);
                            return result.response.text();
                        });

                        if (translatedText) return translatedText.trim();
                    } catch (err: any) {
                        lastError = err;
                        const msg = err.message || '';
                        console.warn(`[GEMINI] Model ${modelName} failed: ${msg.split('\n')[0]}`);

                        if (msg.includes('404') || msg.includes('not found')) {
                            continue;
                        }
                        continue;
                    }
                }
            }

            // If all failed
            console.error(`All Gemini models failed. Last error:`, lastError);
            throw new Error("All Gemini models failed. Check Usage/API Key.");
        }
    } catch (error: any) {
        console.error(`Translation error (${provider}):`, error.message);
        throw error; // Propagate error to caller
    }
}

export async function translatePropertyFields(data: any, sourceLang: string = 'en', apiKey?: string, provider: AIProvider = 'gemini', force: boolean = false) {
    const targets = ['en', 'pt', 'he'].filter(l => l !== sourceLang);
    const translatedData = { ...data };
    let changesCount = 0;

    // Pre-check API basic availability before starting loop
    const key = apiKey || (provider === 'openai' ? process.env.OPENAI_API_KEY : process.env.GEMINI_API_KEY);
    if (!key) {
        throw new Error(`Missing API Key for ${provider}. Please check your environment variables (.env.local).`);
    }

    const translateField = async (fieldValue: any) => {
        if (!fieldValue) return fieldValue;

        // Handle String inputs (convert to object)
        let sourceObject = fieldValue;
        if (typeof fieldValue === 'string') {
            if (fieldValue === '[object Object]') {
                sourceObject = { [sourceLang]: '' };
            } else {
                sourceObject = { [sourceLang]: fieldValue };
            }
        } else if (typeof fieldValue !== 'object') {
            return fieldValue;
        }

        const sourceText = sourceObject[sourceLang];
        if (!sourceText) return sourceObject;

        const newField = { ...sourceObject };
        let fieldChanged = false;

        // Use sequential loop instead of Promise.all to avoid 429 Quota Exceeded
        for (const lang of targets) {
            // Translate if missing OR if forced
            if (force || !newField[lang] || newField[lang].trim() === '' || newField[lang] === '[object Object]') {
                try {
                    const translated = await translateText(sourceText, lang, apiKey, provider);
                    if (translated && translated !== newField[lang]) {
                        newField[lang] = translated;
                        fieldChanged = true;
                    }
                    // Sequential processing with conservative delay to avoid 429 (requested 5s+)
                    await new Promise(resolve => setTimeout(resolve, 5000));
                } catch (e: any) {
                    // Re-throw critical missing key or quota errors
                    const msg = e.message || "";
                    if (msg.includes("Missing API Key") || msg.includes("429") || msg.includes("quota")) {
                        throw e;
                    }

                    // Ignore individual field translation errors (AI failures) to allow partial success
                    console.warn(`Failed to translate field to ${lang}: ${msg}`);
                }
            }
        }

        if (fieldChanged) changesCount++;
        return newField;
    };

    // Apply translation to specific fields
    if (translatedData.title) translatedData.title = await translateField(translatedData.title);
    if (translatedData.subtitle) translatedData.subtitle = await translateField(translatedData.subtitle);
    if (translatedData.description) translatedData.description = await translateField(translatedData.description);

    // Helper for nested fields
    const translateNested = async (items: any[]) => {
        if (!items || !Array.isArray(items)) return items;
        const result = [];
        for (const item of items) {
            const newItem = { ...item };
            if (newItem.text) newItem.text = await translateField(newItem.text); // Highlights
            if (newItem.name) newItem.name = await translateField(newItem.name); // Rooms
            if (newItem.details) newItem.details = await translateField(newItem.details);
            if (newItem.beds) newItem.beds = await translateField(newItem.beds);
            if (newItem.alt) newItem.alt = await translateField(newItem.alt); // Images
            result.push(newItem);
        }
        return result;
    };

    if (translatedData.highlights) translatedData.highlights = await translateNested(translatedData.highlights);
    if (translatedData.rooms) translatedData.rooms = await translateNested(translatedData.rooms);
    if (translatedData.images) translatedData.images = await translateNested(translatedData.images);

    // Nearby Places
    if (translatedData.nearby_places && Array.isArray(translatedData.nearby_places)) {
        const newNearby = [];
        for (const cat of translatedData.nearby_places) {
            const newCat = { ...cat };
            if (newCat.items && Array.isArray(newCat.items)) {
                const newItems = [];
                for (const item of newCat.items) {
                    const newItem = { ...item };
                    if (newItem.name) newItem.name = await translateField(newItem.name);
                    if (newItem.subtitle) newItem.subtitle = await translateField(newItem.subtitle);
                    newItems.push(newItem);
                }
                newCat.items = newItems;
            }
            newNearby.push(newCat);
        }
        translatedData.nearby_places = newNearby;
    }

    // Cancellation
    if (translatedData.cancellation) {
        if (translatedData.cancellation.text) translatedData.cancellation.text = await translateField(translatedData.cancellation.text);
        if (translatedData.cancellation.refundText) translatedData.cancellation.refundText = await translateField(translatedData.cancellation.refundText);
        if (translatedData.cancellation.deadline) translatedData.cancellation.deadline = await translateField(translatedData.cancellation.deadline);
    }

    // Amenities
    if (translatedData.amenities && Array.isArray(translatedData.amenities)) {
        const newAmenities = [];
        for (const cat of translatedData.amenities) {
            const newCat = { ...cat };
            if (newCat.items && Array.isArray(newCat.items)) {
                const newItems = [];
                for (const item of newCat.items) {
                    newItems.push(await translateField(item));
                }
                newCat.items = newItems;
            }
            newAmenities.push(newCat);
        }
        translatedData.amenities = newAmenities;
    }

    return { data: translatedData, changes: changesCount };
}

export async function translateAllProperties(apiKey?: string, provider: AIProvider = 'gemini', force: boolean = false) {
    try {
        // Use Service Role Key to bypass RLS for this batch operation
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        if (!supabaseServiceKey) {
            console.warn("Using ANON key for batch update. This will likely fail RLS policies.");
        }

        const adminSupabase = createClient(supabaseUrl, supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

        // 1. Fetch all properties
        const { data: properties, error } = await adminSupabase
            .from('properties')
            .select('*');

        if (error) throw error;

        let updatedCount = 0;
        let totalChanges = 0;
        let errorsCount = 0;

        for (const property of properties) {
            try {
                // Translate
                const { data: translated, changes } = await translatePropertyFields(property, 'en', apiKey, provider, force);

                if (changes > 0) {
                    // Save
                    const { error: updateError } = await adminSupabase
                        .from('properties')
                        .update(translated)
                        .eq('id', property.id);

                    if (updateError) {
                        console.error(`Update error for ${property.slug}:`, updateError);
                        errorsCount++;
                    } else {
                        updatedCount++;
                        totalChanges += changes;
                    }
                }
            } catch (err) {
                console.error(`Translation failed for ${property.slug}:`, err);
                errorsCount++;
            }
        }

        if (updatedCount === 0 && errorsCount > 0) {
            return { success: false, error: "Failed to translate properties. Check API Key quotas or permissions." };
        }

        return {
            success: true,
            message: `Translation complete. Updated ${updatedCount} properties with ${totalChanges} translations. Errors: ${errorsCount}.`
        };

    } catch (error: any) {
        console.error("Batch translation error:", error);
        return { success: false, error: error.message };
    }
}
