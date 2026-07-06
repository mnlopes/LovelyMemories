import { ConciergeHero } from "@/components/ConciergeHero";
import { ConciergeIntro } from "@/components/ConciergeIntro";
import { ConciergeServices } from "@/components/ConciergeServices";
import { ConciergeCta } from "@/components/ConciergeCta";
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
    const sections = await getPageSections("concierge", cmsLocale);

    return (
        <main className="relative pt-20 overflow-x-clip">
            <ConciergeHero initialSections={sections} />
            <ConciergeIntro initialSections={sections} />
            <ConciergeServices initialSections={sections} />
            <ConciergeCta initialSections={sections} />
            <PropertyOwnerSection />
        </main>
    );
}
