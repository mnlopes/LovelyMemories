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
        console.warn(`Missing API Key for ${provider}. Skipping translation.`);
        return content;
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
            // Extensive list of possible model names to bypass 404s
            const GEMINI_MODELS = [
                "gemini-1.5-flash",
                "gemini-1.5-flash-latest",
                "gemini-1.5-flash-001",
                "gemini-1.5-flash-002",
                "gemini-1.5-flash-8b",
                "gemini-1.5-pro",
                "gemini-1.0-pro",
                "gemini-pro"
            ];

            let lastError;

            // Try models in order
            for (const modelName of GEMINI_MODELS) {
                try {
                    const model = genAI.getGenerativeModel({ model: modelName });
                    const prompt = `You are a professional translator. Translate the text below strictly into ${targetLang === 'he' ? 'Hebrew' : targetLang === 'pt' ? 'Portuguese' : targetLang}.\nText: "${cleanContent}"`;

                    const result = await model.generateContent(prompt);
                    const response = result.response;
                    const text = response.text();
                    if (text) return text.trim();
                } catch (err: any) {
                    const msg = err.message || '';
                    console.warn(`Gemini Model ${modelName} failed: ${msg.split('\n')[0]}`); // Log specific error

                    // Only continue if it's a 404/400/403
                    if (msg.includes('404') || msg.includes('not found') || msg.includes('400') || msg.includes('403')) {
                        lastError = err;
                        continue;
                    }
                    throw err; // Re-throw other errors (quota, etc)
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

        await Promise.all(targets.map(async (lang) => {
            // Translate if missing OR if forced
            if (force || !newField[lang] || newField[lang].trim() === '' || newField[lang] === '[object Object]') {
                try {
                    const translated = await translateText(sourceText, lang, apiKey, provider);
                    if (translated && translated !== newField[lang]) {
                        newField[lang] = translated;
                        fieldChanged = true;
                    }
                } catch (e) {
                    // Ignore individual field translation errors to allow partial success
                    console.warn(`Failed to translate field to ${lang}`);
                }
            }
        }));

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
        return Promise.all(items.map(async (item) => {
            if (item.text) item.text = await translateField(item.text); // Highlights
            if (item.name) item.name = await translateField(item.name); // Rooms
            if (item.details) item.details = await translateField(item.details);
            if (item.beds) item.beds = await translateField(item.beds);
            if (item.alt) item.alt = await translateField(item.alt); // Images
            return item;
        }));
    };

    if (translatedData.highlights) translatedData.highlights = await translateNested(translatedData.highlights);
    if (translatedData.rooms) translatedData.rooms = await translateNested(translatedData.rooms);
    if (translatedData.images) translatedData.images = await translateNested(translatedData.images);

    // Cancellation
    if (translatedData.cancellation) {
        if (translatedData.cancellation.text) translatedData.cancellation.text = await translateField(translatedData.cancellation.text);
        if (translatedData.cancellation.refundText) translatedData.cancellation.refundText = await translateField(translatedData.cancellation.refundText);
        if (translatedData.cancellation.deadline) translatedData.cancellation.deadline = await translateField(translatedData.cancellation.deadline);
    }

    // Amenities
    if (translatedData.amenities && Array.isArray(translatedData.amenities)) {
        translatedData.amenities = await Promise.all(translatedData.amenities.map(async (cat: any) => {
            if (cat.items && Array.isArray(cat.items)) {
                cat.items = await Promise.all(cat.items.map(async (item: any) => await translateField(item)));
            }
            return cat;
        }));
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
