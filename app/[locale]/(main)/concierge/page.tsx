import { ConciergeHero } from "@/components/ConciergeHero";
import { ConciergeIntro } from "@/components/ConciergeIntro";
import { ConciergeServices } from "@/components/ConciergeServices";
import { PropertyOwnerSection } from "@/components/PropertyOwnerSection";

import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildPageMetadata } from "@/lib/seo";

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

export default function ConciergePage() {
    return (
        <main className="relative pt-20 overflow-x-hidden">
            <ConciergeHero />
            <ConciergeIntro />
            <ConciergeServices />
            <PropertyOwnerSection />
        </main>
    );
}
