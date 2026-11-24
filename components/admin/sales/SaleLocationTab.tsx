"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { isShortMapsLink, parseGoogleMapsCoords } from "@/lib/sales/geo";
import { CoordInput } from "./CoordInput";
import { Section, focusRing, input, label, secondaryBtn, type Lang, type SaleTabProps } from "./ui";

const PickerMap = dynamic(() => import("./SaleLocationPickerMap"), {
    ssr: false,
    loading: () => <div className="h-full w-full animate-pulse bg-[#f5f5f5] dark:bg-admin-dark-bg" />,
});

const CITY_SUGGESTIONS = ["Porto", "Vila Nova de Gaia", "Algarve", "Mykonos"];
const LANGS: Lang[] = ["pt", "en"];

export function SaleLocationTab({ form, set }: SaleTabProps) {
    const t = useTranslations("AdminSales");
    const [mapsLink, setMapsLink] = useState("");
    const [mapsHint, setMapsHint] = useState<string | null>(null);

    const setPoint = (lat: number, lng: number) => {
        set("lat", lat);
        set("lng", lng);
    };

    function applyMapsLink() {
        const found = parseGoogleMapsCoords(mapsLink);
        if (!found) {
            setMapsHint(isShortMapsLink(mapsLink) ? t("location.mapsLinkShort") : t("location.mapsLinkNotFound"));
            return;
        }
        setPoint(found.lat, found.lng);
        setMapsHint(null);
        setMapsLink("");
    }

    const setNearby = (index: number, field: "name" | "distance", lang: Lang, value: string) =>
        set(
            "nearby",
            form.nearby.map((n, i) => (i === index ? { ...n, [field]: { ...n[field], [lang]: value } } : n)),
        );

    return (
        <>
            <Section title={t("location.publicSection")} hint={t("location.publicHint")}>
                <div className="grid gap-4 md:grid-cols-3">
                    <label className={label}>
                        {t("location.city")}
                        <input
                            id="sale-field-city"
                            type="text"
                            list="sale-city-suggestions"
                            value={form.city}
                            onChange={(e) => set("city", e.target.value)}
                            maxLength={120}
                            className={input}
                        />
                        <datalist id="sale-city-suggestions">
                            {CITY_SUGGESTIONS.map((c) => (
                                <option key={c} value={c} />
                            ))}
                        </datalist>
                    </label>
                    <label className={label}>
                        {t("location.area")}
                        <input
                            type="text"
                            value={form.area_label}
                            onChange={(e) => set("area_label", e.target.value)}
                            maxLength={120}
                            className={input}
                        />
                    </label>
                    <label className={label}>
                        {t("location.street")}
                        <input
                            type="text"
                            value={form.street ?? ""}
                            onChange={(e) => set("street", e.target.value || null)}
                            maxLength={200}
                            className={input}
                        />
                    </label>
                </div>
            </Section>

            <Section title={t("location.exactSection")} hint={t("location.exactHint")}>
                <label className={label}>
                    {t("location.exactAddress")}
                    <input
                        type="text"
                        value={form.address_private ?? ""}
                        onChange={(e) => set("address_private", e.target.value || null)}
                        maxLength={300}
                        className={input}
                    />
                </label>
                <div className="flex flex-col gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#a3a3a3]">
                        {t("location.mapTitle")}
                    </span>
                    <div className="h-80 overflow-hidden rounded-2xl border border-[#f5f5f5] dark:border-admin-dark-border md:h-[460px] lg:h-[520px]">
                        <PickerMap lat={form.lat} lng={form.lng} onPick={setPoint} />
                    </div>
                    <p className="text-xs text-[#a3a3a3]">{t("location.mapHint")}</p>
                </div>
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="sale-maps-link" className="text-[11px] font-bold uppercase tracking-wider text-[#a3a3a3]">
                        {t("location.mapsLink")}
                    </label>
                    <div className="flex gap-2">
                        <input
                            id="sale-maps-link"
                            type="url"
                            inputMode="url"
                            spellCheck={false}
                            autoComplete="off"
                            value={mapsLink}
                            onChange={(e) => {
                                setMapsLink(e.target.value);
                                setMapsHint(null);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    applyMapsLink();
                                }
                            }}
                            placeholder="https://www.google.com/maps/…"
                            aria-invalid={mapsHint ? true : undefined}
                            aria-describedby={mapsHint ? "sale-maps-hint" : undefined}
                            className={input}
                        />
                        <button
                            type="button"
                            disabled={!mapsLink.trim()}
                            onClick={applyMapsLink}
                            className={`${secondaryBtn} shrink-0 px-5`}
                        >
                            {t("location.mapsLinkUse")}
                        </button>
                    </div>
                    {mapsHint && (
                        <p id="sale-maps-hint" role="alert" className="text-xs font-semibold text-red-600 dark:text-red-400">
                            {mapsHint}
                        </p>
                    )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <label className={label}>
                        {t("location.lat")}
                        <CoordInput value={form.lat} onChange={(v) => set("lat", v)} limit={90} placeholder="41.1579" />
                    </label>
                    <label className={label}>
                        {t("location.lng")}
                        <CoordInput value={form.lng} onChange={(v) => set("lng", v)} limit={180} placeholder="-8.6291" />
                    </label>
                </div>
                <p className="text-xs text-[#a3a3a3]">{t("location.coordsHint")}</p>
            </Section>

            <Section title={t("location.nearbySection")}>
                {form.nearby.length > 0 && (
                    <ul className="grid gap-3 lg:grid-cols-2">
                        {form.nearby.map((n, i) => (
                            <li
                                key={i}
                                className="flex flex-col gap-3 rounded-2xl border border-[#f5f5f5] dark:border-admin-dark-border bg-[#fafafa] dark:bg-admin-dark-bg p-3"
                            >
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        aria-label={t("location.removePlace")}
                                        onClick={() =>
                                            set(
                                                "nearby",
                                                form.nearby.filter((_, j) => j !== i),
                                            )
                                        }
                                        className={`flex size-11 items-center justify-center rounded-lg text-[#a3a3a3] hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 md:size-9 ${focusRing}`}
                                    >
                                        <X className="size-4" aria-hidden="true" />
                                    </button>
                                </div>
                                {LANGS.map((lang) => (
                                    <div key={lang} className="grid grid-cols-2 gap-2">
                                        <input
                                            type="text"
                                            aria-label={`${t("location.placeName")} (${lang.toUpperCase()})`}
                                            placeholder={`${t("location.placeName")} (${lang.toUpperCase()})`}
                                            value={n.name[lang] ?? ""}
                                            onChange={(e) => setNearby(i, "name", lang, e.target.value)}
                                            maxLength={5000}
                                            className={input}
                                        />
                                        <input
                                            type="text"
                                            aria-label={`${t("location.distance")} (${lang.toUpperCase()})`}
                                            placeholder={`${t("location.distance")} (${lang.toUpperCase()})`}
                                            value={n.distance[lang] ?? ""}
                                            onChange={(e) => setNearby(i, "distance", lang, e.target.value)}
                                            maxLength={5000}
                                            className={input}
                                        />
                                    </div>
                                ))}
                            </li>
                        ))}
                    </ul>
                )}
                <button
                    type="button"
                    disabled={form.nearby.length >= 30}
                    onClick={() => set("nearby", [...form.nearby, { name: {}, distance: {} }])}
                    className={`${secondaryBtn} self-start`}
                >
                    <Plus className="size-4" aria-hidden="true" />
                    {t("location.addPlace")}
                </button>
            </Section>
        </>
    );
}
