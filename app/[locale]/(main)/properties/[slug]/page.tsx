import { PropertyDetails } from "@/components/PropertyDetails";
import { PROPERTIES } from "@/lib/data";
import { Metadata } from "next";

type Props = {
    params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const property = PROPERTIES.find((p) => p.slug === slug);

    if (!property) {
        // Brand suffix is added by the root layout's title template.
        return {
            title: "Property Not Found",
        };
    }

    return {
        title: `${property.title} — ${property.subtitle}`,
        description: property.subtitle,
    };
}

export default async function PropertyDetailPage({ params }: Props) {
    const { slug } = await params;
    return <PropertyDetails slug={slug} />;
}
