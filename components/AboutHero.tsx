"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { getPageSections } from "@/app/actions/cms";
import { CmsPageSection } from "@/lib/types";

const FALLBACK_IMAGE = "/legacy/about-us/images/about-feature.png";

interface HeroData {
    title: string;
    image_url: string;
    video_url: string;
    media_type: string;
}

const toHero = (sections: CmsPageSection[]): HeroData | null => {
    const h = sections.find((s) => s.section_type === "hero");
    if (!h) return null;
    return {
        title: h.title || "",
        image_url: h.image_url || "",
        video_url: h.video_url || "",
        media_type: h.media_type || "",
    };
};

export const AboutHero = ({ initialSections }: { initialSections?: CmsPageSection[] }) => {
    const t = useTranslations("AboutHero");
    const params = useParams();
    const locale = (params?.locale as string) || "en";

    const [hero, setHero] = useState<HeroData | null>(
        initialSections ? toHero(initialSections) : null
    );
    // Mount gate: render the <video> only on the client (the poster image is shown
    // server-side and until the first frame, so there is no black flash).
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (initialSections) return; // already have server data
        let active = true;
        getPageSections("about-us", locale).then((secs) => {
            if (active) setHero(toHero(secs));
        });
        return () => {
            active = false;
        };
    }, [locale, initialSections]);

    const title = hero?.title || t("title");
    const image = hero?.image_url || FALLBACK_IMAGE;
    const wantsVideo = hero?.media_type ? hero.media_type === "video" : !!hero?.video_url;
    const videoSrc = wantsVideo ? hero?.video_url || "" : "";
    const lines = title.split("\n");

    return (
        <section className="relative h-[60vh] flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0">
                {mounted && videoSrc ? (
                    <video
                        key={videoSrc}
                        className="w-full h-full object-cover"
                        src={videoSrc}
                        poster={image}
                        autoPlay
                        loop
                        muted
                        playsInline
                        preload="auto"
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
