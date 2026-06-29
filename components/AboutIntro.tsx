"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { getPageSections } from "@/app/actions/cms";

export const AboutIntro = () => {
    const t = useTranslations("AboutIntro");
    const params = useParams();
    const locale = (params?.locale as string) || "en";

    const [content, setContent] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        getPageSections("about-us", locale).then((secs) => {
            if (!active) return;
            const intro = secs.find((s) => s.section_type === "intro");
            if (intro && intro.content) setContent(intro.content);
        });
        return () => {
            active = false;
        };
    }, [locale]);

    const paragraphs = content
        ? content.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
        : [t("p1"), t("p2")];

    return (
        <section className="py-24 bg-white">
            <div className="container mx-auto px-4 max-w-4xl text-center">
                <div className="space-y-8 text-[#696969] text-lg md:text-xl font-light leading-relaxed">
                    {paragraphs.map((p, i) => (
                        <h6 key={i} className="m-0">
                            {p}
                        </h6>
                    ))}
                </div>
            </div>
        </section>
    );
};
