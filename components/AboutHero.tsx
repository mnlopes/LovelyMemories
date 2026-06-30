"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { getPageSections } from "@/app/actions/cms";

const FALLBACK_IMAGE = "/legacy/about-us/images/about-feature.png";

export const AboutHero = () => {
    const t = useTranslations("AboutHero");
    const params = useParams();
    const locale = (params?.locale as string) || "en";

    const [hero, setHero] = useState<{ title: string; image_url: string; video_url: string } | null>(null);

    useEffect(() => {
        let active = true;
        getPageSections("about-us", locale).then((secs) => {
            if (!active) return;
            const h = secs.find((s) => s.section_type === "hero");
            if (h) setHero({ title: h.title || "", image_url: h.image_url || "", video_url: h.video_url || "" });
        });
        return () => {
            active = false;
        };
    }, [locale]);

    const title = hero?.title || t("title");
    const image = hero?.image_url || FALLBACK_IMAGE;
    const video = hero?.video_url || "";
    const lines = title.split("\n");

    return (
        <section className="relative h-[60vh] flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0">
                {video ? (
                    <video
                        key={video}
                        className="w-full h-full object-cover"
                        src={video}
                        poster={image}
                        autoPlay
                        loop
                        muted
                        playsInline
                    />
                ) : (
                    <img src={image} alt="About Us" className="w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-black/40" />
            </div>
            <div className="relative z-10 text-center px-4">
                <h1 className="text-white font-bold text-4xl md:text-6xl leading-tight drop-shadow-lg">
                    {lines.map((line, i) => (
                        <React.Fragment key={i}>
                            {i > 0 && <br />}
                            {line}
                        </React.Fragment>
                    ))}
                </h1>
            </div>
        </section>
    );
};
