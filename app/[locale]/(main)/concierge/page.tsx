import { ConciergeHero } from "@/components/ConciergeHero";
import { ConciergeIntro } from "@/components/ConciergeIntro";
import { ConciergeServices } from "@/components/ConciergeServices";
import { PropertyOwnerSection } from "@/components/PropertyOwnerSection";

import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildPageMetadata } from "@/lib/seo";
import { getPageSections } from "@/app/actions/cms";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "PageMeta" });
    return buildPageMetadata({
        locale,
        path: "concierge",
        title: t("conciergeTitle"),
        description: t("conciergeDesc"),
    });
}

export default async function ConciergePage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    // EN/PT are edited in the backoffice; any other locale (he) falls back to EN.
    const cmsLocale = locale === "pt" ? "pt" : "en";
    let sections = await getPageSections("concierge", cmsLocale);
    // Deck images are language-neutral: locales without their own rows reuse EN's.
    if (cmsLocale !== "en" && !sections.some((s) => s.section_type === "intro-image")) {
        const enSections = await getPageSections("concierge", "en");
        sections = [...sections, ...enSections.filter((s) => s.section_type === "intro-image")];
    }

    return (
        <main className="relative pt-20 overflow-x-clip">
            <ConciergeHero initialSections={sections} />
            <ConciergeIntro initialSections={sections} />
            <ConciergeServices initialSections={sections} />
            <PropertyOwnerSection />
        </main>
    );
}
