import { BookingSidebar } from "@/components/BookingSidebar";
import { PolicySection } from "@/components/PolicySection";
import { AmenitiesGrid } from "@/components/AmenitiesGrid";
import { PropertyImmersiveGallery } from "@/components/PropertyImmersiveGallery";
import { PropertyHighlights } from "@/components/PropertyHighlights";
import { PropertyNeighborhood } from "@/components/PropertyNeighborhood";
import { ReviewsSection } from "@/components/ReviewsSection";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { getPropertyBySlug } from "@/lib/services";
import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";

// Generate Static Params for all properties using Supabase
export async function generateStaticParams() {
    const { data: properties } = await supabase
        .from('properties')
        .select('slug')
        .neq('status', 'hidden');

    return (properties || []).map(p => ({
        id: p.slug
    }));
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

export default async function PropertyPage({ params }: { params: Promise<{ id: string; locale: string }> }) {
    const { id, locale } = await params;
    const activeLang = locale as 'en' | 'pt' | 'he';
    const property = await getPropertyBySlug(id);

    if (!property) {
        return notFound();
    }

    const title = property.title[activeLang] || property.title.en;
    const description = property.description[activeLang] || property.description.en;

    const formattedAmenities = property.amenities?.flatMap((cat: any) =>
        (cat.items || []).map((item: any) => ({
            label: item[activeLang] || item.en || '',
            icon: getIconForAmenity(item.en || '')
        }))
    ) || [];

    const galleryUrls = property.images || [];

    return (
        <div className="bg-white min-h-screen font-inter text-navy-950">
            <Navbar />

            <PropertyImmersiveGallery
                title={title}
                images={galleryUrls}
            />

            <main className="relative z-10 bg-white">
                <div className="container mx-auto px-6 py-20">
                    <div className="flex flex-col lg:flex-row gap-20">

                        {/* Left Column: Content (Scrolls) */}
                        <div className="w-full lg:w-[65%] space-y-20 relative">

                            {/* Title & Stats */}
                            <div className="pt-4">
                                <nav className="flex gap-2 text-[10px] uppercase font-bold text-gray-400 mb-8 tracking-widest">
                                    <span>Home</span> / <span>Porto</span> / <span>{title}</span>
                                </nav>
                                <h1 className="text-5xl md:text-7xl font-playfair font-bold text-navy-950 mb-8 leading-tight">
                                    {title}
                                </h1>
                                <div className="flex flex-wrap gap-8 text-sm font-bold text-navy-900/60 uppercase tracking-widest border-b border-gray-100 pb-12">
                                    <div className="flex items-center gap-2"><span className="text-navy-950">{property.guests || 0}</span> guests</div>
                                    <div className="flex items-center gap-2"><span className="text-navy-950">{property.bedrooms || 0}</span> bedroom</div>
                                    <div className="flex items-center gap-2"><span className="text-navy-950">{property.bathrooms || 0}</span> bathroom</div>
                                    <div className="flex items-center gap-2"><span className="text-navy-950">{property.area || 0}</span> sq/m</div>
                                </div>
                            </div>

                            {/* Description */}
                            <section className="max-w-3xl">
                                <h3 className="text-[11px] font-extrabold text-[#AD9C7E] uppercase tracking-[0.4em] mb-10">The Residence</h3>
                                <div className="text-navy-950 text-2xl md:text-3xl font-playfair leading-[1.4] mb-12 space-y-6">
                                    {description.map((para: string, i: number) => (
                                        <p key={i}>{para}</p>
                                    ))}
                                </div>
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
                            <PropertyHighlights highlights={property.highlights} locale={activeLang} />

                            {/* Neighborhood */}
                            <PropertyNeighborhood location={property.location} nearbyPlaces={property.nearbyPlaces} locale={activeLang} />

                            {/* Policies */}
                            <PolicySection
                                rules={property.policies?.houseRules}
                                cancellationPolicy={{
                                    text: property.policies?.cancellation?.text?.[activeLang] || property.policies?.cancellation?.text?.en || '',
                                    refundText: property.policies?.cancellation?.refundText?.[activeLang] || property.policies?.cancellation?.refundText?.en || '',
                                    deadline: property.policies?.cancellation?.deadline?.[activeLang] || property.policies?.cancellation?.deadline?.en || '',
                                }}
                            />

                        </div>

                        {/* Right Column: Sidebar (Sticky) */}
                        <div className="w-full lg:w-[35%] relative z-20 -mt-64 lg:-mt-[420px]">
                            <BookingSidebar
                                propertyId={property.id}
                                pricePerNight={property.price?.perNight}
                                cleaningFee={property.policies?.pricing?.cleaning_fee}
                                cityTax={2}
                                weeklyDiscount={property.policies?.pricing?.weekly_discount_percent}
                                monthlyDiscount={property.policies?.pricing?.monthly_discount_percent}
                                agent={{
                                    name: "Lovely Memories",
                                    role: "Concierge",
                                    image: "https://lovely-memories.pt/logo.png",
                                }}
                            />
                        </div>

                    </div>
                </div>


                {/* Reviews fallback for now as we don't have them in Supabase yet */}
                <ReviewsSection agent={null} reviews={[]} />

                <Footer />
            </main>
        </div>
    );
}

