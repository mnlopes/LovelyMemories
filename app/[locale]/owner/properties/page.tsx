import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Link } from "@/i18n/routing";
import { ArrowRight, MapPin, Bed, Bath, Users } from "lucide-react";

export default async function OwnerPropertiesPage({
    params
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    const cookieStore = await cookies();

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();

    // Fetch Owner's Properties
    const { data: properties } = await supabase
        .from('properties')
        .select(`
            *,
            locations (*)
        `)
        .eq('owner_id', user?.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    return (
        <div className="space-y-8 max-w-[1400px] mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold font-playfair text-[#0A1128]">
                        My Properties
                    </h1>
                    <p className="text-gray-500 font-light tracking-wide mt-2">
                        Manage and view details of your assigned properties.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {properties?.map((property) => {
                    const title = (property.title as any)?.[locale] || (property.title as any)?.en || property.slug;
                    
                    // Priority: property.images JSONB array or fallback
                    const propertyImages = Array.isArray(property.images) ? property.images : [];
                    const image = propertyImages[0]?.url || propertyImages[0] || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80';
                    
                    const city = (property.locations as any)?.[`name_${locale}`] || (property.locations as any)?.name_en || property.city || 'Portugal';

                    return (
                        <div key={property.id} className="bg-white rounded-[32px] border border-gray-100 overflow-hidden group hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-500">
                            <div className="relative aspect-[4/3] overflow-hidden">
                                <img
                                    src={image}
                                    alt={title}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                                />
                                <div className="absolute top-5 right-5 bg-white/90 backdrop-blur-md px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-[#0A1128] shadow-sm">
                                    {property.status || 'Active'}
                                </div>
                            </div>

                            <div className="p-8">
                                <h3 className="text-2xl font-bold font-playfair text-[#0A1128] mb-3 truncate" title={title}>
                                    {title}
                                </h3>
                                <div className="flex items-center gap-2.5 text-gray-500 text-sm mb-6">
                                    <div className="size-6 rounded-full bg-gray-50 flex items-center justify-center text-[#C5A059]">
                                        <MapPin className="size-3.5" />
                                    </div>
                                    <span className="font-medium">{city}</span>
                                </div>

                                <div className="flex items-center justify-between py-6 border-t border-gray-50">
                                    <div className="flex items-center gap-6 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                                        <div className="flex items-center gap-2" title="Guests">
                                            <Users className="size-4 text-[#0A1128]" />
                                            <span className="text-[#0A1128]">{property.max_guests || 0}</span>
                                        </div>
                                        <div className="flex items-center gap-2" title="Bedrooms">
                                            <Bed className="size-4 text-[#0A1128]" />
                                            <span className="text-[#0A1128]">{property.bedrooms || 0}</span>
                                        </div>
                                        <div className="flex items-center gap-2" title="Bathrooms">
                                            <Bath className="size-4 text-[#0A1128]" />
                                            <span className="text-[#0A1128]">{property.bathrooms || 0}</span>
                                        </div>
                                    </div>
                                </div>

                                <Link
                                    href={`/properties/${property.slug}`}
                                    target="_blank"
                                    className="flex items-center justify-between w-full px-6 py-4 bg-[#0A1128] rounded-2xl text-[11px] font-black text-white uppercase tracking-[0.2em] hover:bg-[#C5A059] transition-all transform active:scale-95 shadow-lg shadow-navy-100 group/btn"
                                >
                                    View Live Page
                                    <ArrowRight className="size-4 group-hover/btn:translate-x-1 transition-transform" />
                                </Link>
                            </div>
                        </div>
                    );
                })}

                {(!properties || properties.length === 0) && (
                    <div className="col-span-full py-20 text-center bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                        <p className="text-gray-400 font-medium">No properties assigned yet.</p>
                        <p className="text-sm text-gray-400 mt-1">Contact your administrator to assign properties to your account.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
