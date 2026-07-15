"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const tr = (field: any, locale: string): string => {
    if (!field) return "";
    if (typeof field === "string") return field;
    if (typeof field === "object") return field[locale] || field.en || Object.values(field)[0] || "";
    return "";
};

export function usePropertyCalendarData(propertyId: string, locale: string) {
    const [loading, setLoading] = useState(true);
    const [properties, setProperties] = useState<any[]>([]);
    const [reservations, setReservations] = useState<any[]>([]);
    const [blockedDates, setBlockedDates] = useState<any[]>([]);
    const [propertyImages, setPropertyImages] = useState<Record<string, string>>({});
    const [allProperties, setAllProperties] = useState<{ id: string; title: string }[]>([]);
    const [pricePerNight, setPricePerNight] = useState<number | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        const [resRes, propRes, blockRes, allRes] = await Promise.all([
            supabase.from("reservations").select("*, properties:property_id(*)").eq("property_id", propertyId).order("created_at", { ascending: false }),
            supabase.from("properties").select("id, title, subtitle, images, city, address, bedrooms, bathrooms, max_guests, is_multi_unit, price_per_night").eq("id", propertyId).single(),
            supabase.from("blocked_dates").select("*").eq("property_id", propertyId),
            supabase.from("properties").select("id, title").order("title", { ascending: true }),
        ]);

        const prop = propRes.data;
        if (prop) {
            const mainImage = prop.images?.[0]?.url || (typeof prop.images?.[0] === "string" ? prop.images[0] : "");
            const enhanced = { ...prop, title: tr(prop.title, locale) || "Untitled Property", subtitle: tr(prop.subtitle, locale), city: tr(prop.city, locale), mainImage };
            setProperties([enhanced]);
            setPropertyImages(mainImage ? { [prop.id]: mainImage } : {});
            setPricePerNight(typeof prop.price_per_night === "number" ? prop.price_per_night : null);
        }
        setReservations((resRes.data || []).map((res: any) => ({ ...res, property_name: tr(res.properties?.title, locale) })));
        setBlockedDates(blockRes.data || []);
        setAllProperties((allRes.data || []).map((p: any) => ({ id: p.id, title: tr(p.title, locale) || p.id })));
        setLoading(false);
    }, [propertyId, locale]);

    useEffect(() => { void refresh(); }, [refresh]);

    return { loading, properties, reservations, blockedDates, propertyImages, allProperties, pricePerNight, refresh };
}
