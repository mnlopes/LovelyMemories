import { BookingSidebar } from "@/components/BookingSidebar";
import { PolicySection } from "@/components/PolicySection";
import { AmenitiesGrid } from "@/components/AmenitiesGrid";
import { PropertyImmersiveGallery } from "@/components/PropertyImmersiveGallery";
import { PropertyHighlights } from "@/components/PropertyHighlights";
import { PropertyNeighborhood } from "@/components/PropertyNeighborhood";
import { ReviewsSection } from "@/components/ReviewsSection";
import { PropertyGallery } from "@/components/PropertyGallery";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { client } from "@/sanity/lib/client";
import { urlFor } from "@/sanity/lib/image";
import { notFound } from "next/navigation";
import { ShieldCheck, Info } from "lucide-react";

// Generate Static Params for all properties
export async function generateStaticParams() {
    const query = `*[_type == "property"]{ "id": slug.current }`;
    const slugs = await client.fetch(query);
    return slugs;
}

// Helper to map amenity strings to icons
const getIconForAmenity = (label: string) => {
    const lower = label.toLowerCase();
    if (lower.includes('wifi') || lower.includes('internet')) return 'wifi';
    if (lower.includes('kitchen') || lower.includes('chef')) return 'kitchen';
    if (lower.includes('theater') || lower.includes('cinema') || lower.includes('tv')) return 'cinema';
    if (lower.includes('ac') || lower.includes('air')) return 'ac';
    if (lower.includes('security') || lower.includes('doorman')) return 'security';
    if (lower.includes('parking') || lower.includes('garage')) return 'parking';
    if (lower.includes('coffee')) return 'coffee';
    if (lower.includes('pool')) return 'pool';
    if (lower.includes('gym')) return 'gym';
    return 'star'; // default
};

async function getProperty(slug: string) {
    const query = `*[_type == "property" && slug.current == $slug][0]{
        title,
        location,
        price,
        shortTermPrice,
        midTermPrice,
        longTermPrice,
        cleaningFee,
        cityTax,
        description,
        mainImage,
        gallery,
        amenities,
        stats,
        houseRules,
        cancellationPolicy,
        hostBio,
        hostImage,
        agent->{
            name,
            role,
            image,
            email,
            phone
        },
        "reviews": *[_type == "review" && property._ref == ^._id] | order(date desc)[0...6]{
            name,
            location,
            date,
            rating,
            text,
            avatar
        }
    }`;
    return client.fetch(query, { slug });
}

export default async function PropertyPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const property = await getProperty(id);

    if (!property) {
        return notFound();
    }

    const formattedAmenities = property.amenities?.map((am: string) => ({
        label: am,
        icon: getIconForAmenity(am)
    })) || [];

    // Safety check for images
    const mainImageUrl = property.mainImage ? urlFor(property.mainImage).url() : "";
    const agentImageUrl = property.agent?.image ? urlFor(property.agent.image).url() : "";
    const galleryUrls = property.gallery?.map((img: any) => urlFor(img).url()) || [];

    return (
        <div className="bg-white min-h-screen font-inter text-navy-950">
            <Navbar />

            <PropertyImmersiveGallery
                title={property.title}
                images={galleryUrls.length > 0 ? [mainImageUrl, ...galleryUrls] : [mainImageUrl]}
            />

            <main className="relative z-10 bg-white">
                <div className="container mx-auto px-6 py-20">
                    <div className="flex flex-col lg:flex-row gap-20">

                        {/* Left Column: Content (Scrolls) */}
                        <div className="w-full lg:w-[65%] space-y-20 relative">

                            {/* Title & Stats */}
                            <div className="pt-4">
                                <nav className="flex gap-2 text-[10px] uppercase font-bold text-gray-400 mb-8 tracking-widest">
                                    <span>Home</span> / <span>Porto</span> / <span>{property.title}</span>
                                </nav>
                                <h1 className="text-5xl md:text-7xl font-playfair font-bold text-navy-950 mb-8 leading-tight">
                                    {property.title}
                                </h1>
                                <div className="flex flex-wrap gap-8 text-sm font-bold text-navy-900/60 uppercase tracking-widest border-b border-gray-100 pb-12">
                                    <div className="flex items-center gap-2"><span className="text-navy-950">{property.stats?.guests || 0}</span> guests</div>
                                    <div className="flex items-center gap-2"><span className="text-navy-950">{property.stats?.bedrooms || 0}</span> bedroom</div>
                                    <div className="flex items-center gap-2"><span className="text-navy-950">{property.stats?.bathrooms || 0}</span> bathroom</div>
                                    <div className="flex items-center gap-2"><span className="text-navy-950">{property.stats?.sqft || 0}</span> sq/m</div>
                                </div>
                            </div>

                            {/* Description */}
                            <section className="max-w-3xl">
                                <h3 className="text-[11px] font-extrabold text-[#AD9C7E] uppercase tracking-[0.4em] mb-10">The Residence</h3>
                                <p className="text-navy-950 text-2xl md:text-3xl font-playfair leading-[1.4] mb-12">
                                    {property.description}
                                </p>
                                <div className="w-20 h-px bg-gray-200" />
                            </section>

                            {/* Promise Block */}
                            <section className="p-16 bg-[#FBFBFA] border border-[#F1F0EC] rounded-[32px] space-y-12">
                                <div className="space-y-4">
                                    <h3 className="text-[11px] font-extrabold text-[#AD9C7E] uppercase tracking-[0.3em]">Our Promise</h3>
                                    <h2 className="text-4xl font-playfair font-bold text-navy-950">The Lovely Promise</h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                    <div className="space-y-4">
                                        <div className="w-12 h-12 rounded-full bg-white border border-[#F1F0EC] flex items-center justify-center shadow-sm">
                                            <ShieldCheck className="w-6 h-6 text-[#AD9C7E]" />
                                        </div>
                                        <h4 className="text-lg font-bold text-navy-950">No time for average</h4>
                                        <p className="text-navy-950/60 text-sm leading-relaxed font-medium">
                                            We rejected 32,765 homes across the globe so you don't have to settle for anything less than perfection.
                                        </p>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="w-12 h-12 rounded-full bg-white border border-[#F1F0EC] flex items-center justify-center shadow-sm">
                                            <ShieldCheck className="w-6 h-6 text-[#AD9C7E]" />
                                        </div>
                                        <h4 className="text-lg font-bold text-navy-950">Hosts we know</h4>
                                        <p className="text-navy-950/60 text-sm leading-relaxed font-medium">
                                            Every home is managed by hosts with a proven track record of excellence and impeccable service.
                                        </p>
                                    </div>
                                </div>
                            </section>

                            {/* Amenities */}
                            <AmenitiesGrid amenities={formattedAmenities} />

                            {/* Highlights */}
                            <PropertyHighlights />

                            {/* Neighborhood */}
                            <PropertyNeighborhood location={property.location} />

                            {/* Policies */}
                            <PolicySection
                                rules={property.houseRules}
                                cancellationPolicy={property.cancellationPolicy}
                            />

                        </div>

                        {/* Right Column: Sidebar (Sticky) */}
                        <div className="w-full lg:w-[35%] relative z-20 -mt-64 lg:-mt-[420px]">
                            <BookingSidebar
                                shortTermPrice={property.shortTermPrice}
                                midTermPrice={property.midTermPrice}
                                longTermPrice={property.longTermPrice}
                                cleaningFee={property.cleaningFee}
                                cityTax={property.cityTax}
                                agent={{
                                    name: property.agent?.name || "Lovely Memories",
                                    role: property.agent?.role || "Concierge",
                                    image: agentImageUrl,
                                }}
                            />
                        </div>

                    </div>
                </div>


                <ReviewsSection agent={property.agent} reviews={property.reviews} />

                <Footer />
            </main>
        </div>
    );
}

