import { PropertyDetails } from "@/components/PropertyDetails";
import { PROPERTIES } from "@/lib/data";
import { Metadata } from "next";

type Props = {
    params: { locale: string; slug: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const property = PROPERTIES.find((p) => p.slug === slug);

    if (!property) {
        return {
            title: "Property Not Found - Lovely Memories",
        };
    }

    return {
        title: `${property.title} - Lovely Memories`,
        description: property.subtitle,
    };
}

export default async function PropertyDetailPage({ params }: Props) {
    const { slug } = await params;
    return <PropertyDetails slug={slug} />;
}
