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
            locations (*),
            property_images (*)
        `)
        .eq('owner_id', user?.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-[#192537]">
                        My Properties
                    </h1>
                    <p className="text-gray-500 mt-2">
                        Manage and view details of your assigned properties.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties?.map((property) => {
                    const title = (property.title as any)?.en || property.slug;
                    const image = property.property_images?.[0]?.url || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80';
                    const city = property.locations?.name_en || property.city || 'Portugal';

                    return (
                        <div key={property.id} className="bg-white rounded-3xl border border-gray-100 overflow-hidden group hover:shadow-lg transition-all duration-300">
                            <div className="relative h-48 overflow-hidden">
                                <img
                                    src={image}
                                    alt={title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-[#192537]">
                                    {property.status === 'active' ? 'Active' : property.status}
                                </div>
                            </div>

                            <div className="p-6">
                                <h3 className="text-xl font-bold text-[#192537] mb-2 truncate" title={title}>
                                    {title}
                                </h3>
                                <div className="flex items-center gap-2 text-gray-500 text-sm mb-4">
                                    <MapPin className="size-4" />
                                    {city}
                                </div>

                                <div className="flex items-center justify-between py-4 border-t border-gray-100">
                                    <div className="flex items-center gap-4 text-sm text-gray-600">
                                        <div className="flex items-center gap-1.5" title="Guests">
                                            <Users className="size-4" />
                                            <span>{property.max_guests || 0}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5" title="Bedrooms">
                                            <Bed className="size-4" />
                                            <span>{property.bedrooms || 0}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5" title="Bathrooms">
                                            <Bath className="size-4" />
                                            <span>{property.bathrooms || 0}</span>
                                        </div>
                                    </div>
                                </div>

                                <Link
                                    href={`/properties/${property.slug}`}
                                    target="_blank"
                                    className="flex items-center justify-between w-full p-4 bg-gray-50 rounded-xl text-sm font-bold text-[#192537] hover:bg-[#192537] hover:text-white transition-all group/btn"
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
