import { supabase } from './supabase';
import { Property, ConciergeService, PROPERTIES } from './data';
import { format } from 'date-fns';

// Helper to safely extract string from potential localized object
const getLocalizedStr = (val: any, lang: string = 'en'): string => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
        return val[lang] || val['en'] || val['pt'] || Object.values(val)[0] || '';
    }
    return '';
};

// Helper to safely extract number from potential localized object
const getNumber = (val: any) => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') return parseFloat(val) || 0;
    if (typeof val === 'object' && val !== null) {
        // Try known language keys or just take the first value
        const num = val.en || val.pt || val.he || Object.values(val)[0] || '0';
        return typeof num === 'number' ? num : parseFloat(String(num)) || 0;
    }
    return 0;
};

export async function getLocations() {
    const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('is_active', true);

    if (error) {
        console.error('Error fetching locations:', error);
        return [];
    }
    return data;
}

export async function getProperties(buildingSlug?: string) {
    const query = supabase
        .from('properties')
        .select(`
          *,
          locations (*),
          property_images (*),
          parent:parent_id (id, title, slug)
        `)
        .order('created_at', { ascending: false });

    // Try to filter by status if the column exists
    const { data, error } = await query.neq('status', 'hidden');

    if (error) {
        console.warn('Status filtering failed (column might be missing), falling back to is_active:', error);
        // Fallback to legacy is_active filter if status column doesn't exist
        const fallback = await supabase
            .from('properties')
            .select(`
              *,
              locations (*),
              property_images (*)
            `)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (fallback.error) {
            console.error('Fallback error fetching properties:', fallback.error);
            return [];
        }

        const transformed = fallback.data.map((p: any) => transformProperty(p, fallback.data));

        if (buildingSlug) {
            const building = transformed.find(p => p.slug === buildingSlug);
            if (!building) return [];
            return transformed.filter(p => p.parent_id === building.id);
        }

        return transformed.filter((p: any) => !p.parent_id);
    }

    // Transform to match existing Property interface
    const transformed = data.map((p: any) => transformProperty(p, data));

    if (buildingSlug) {
        const building = transformed.find(p => p.slug === buildingSlug);
        if (!building) return [];
        return transformed.filter(p => p.parent_id === building.id);
    }

    // Only return root properties (buildings or standalone houses) for the main grid
    return transformed.filter((p: any) => !p.parent_id);
}

export async function getPropertyBySlug(slug: string) {
    const { data: propData, error } = await supabase
        .from('properties')
        .select(`
          *,
          locations (*),
          property_images (*),
          pricing_rules (*),
          parent:parent_id (*, locations (*))
        `)
        .eq('slug', slug)
        .single();

    if (error || !propData) {
        console.error('Error fetching property by slug:', slug, error);
        return null;
    }

    // If it's a building, we need to know how many units it has for "Visual Absorption"
    let allData = [];
    if (propData.is_multi_unit && !propData.parent_id) {
        const unitsQuery = supabase
            .from('properties')
            .select(`
              *,
              locations (*),
              property_images (*)
            `)
            .eq('parent_id', propData.id);

        const { data: unitsData, error: unitsError } = await unitsQuery.neq('status', 'hidden');

        if (!unitsError && unitsData) {
            allData = unitsData;
        } else {
            // Fallback for units if status is missing
            const fallbackUnits = await supabase
                .from('properties')
                .select(`
                  *,
                  locations (*),
                  property_images (*)
                `)
                .eq('parent_id', propData.id)
                .eq('is_active', true);
            if (fallbackUnits.data) allData = fallbackUnits.data;
        }
    }

    return transformProperty(propData, allData);
}

export async function getBuildingWithUnits(slug: string) {
    const { data: buildingData, error: buildingError } = await supabase
        .from('properties')
        .select(`
          *,
          locations (*),
          property_images (*)
        `)
        .eq('slug', slug)
        .single();

    if (buildingError || !buildingData) {
        console.error('Error fetching building:', buildingError);
        return null;
    }

    const unitsQuery = supabase
        .from('properties')
        .select(`
          *,
          locations (*),
          property_images (*)
        `)
        .eq('parent_id', buildingData.id)
        .order('created_at', { ascending: false });

    // Try status filter
    const { data: unitsData, error: unitsError } = await unitsQuery.neq('status', 'hidden');

    if (unitsError) {
        // Fallback
        const fallback = await supabase
            .from('properties')
            .select(`
              *,
              locations (*),
              property_images (*)
            `)
            .eq('parent_id', buildingData.id)
            .order('created_at', { ascending: false });

        const transformedBuilding = transformProperty(buildingData, fallback.data || []);
        const transformedUnits = (fallback.data || []).map((u: any) => transformProperty(u, [], buildingData));

        return {
            building: transformedBuilding,
            units: transformedUnits
        };
    }

    const transformedBuilding = transformProperty(buildingData, unitsData);
    const transformedUnits = unitsData.map((u: any) => transformProperty(u, [], buildingData));

    return {
        building: transformedBuilding,
        units: transformedUnits
    };
}

export async function searchProperties(params: {
    location?: string,
    guests: number,
    from?: Date,
    to?: Date,
    buildingSlug?: string
}) {
    const { location, guests, from, to, buildingSlug } = params;

    // 1. Fetch ALL active properties (raw) to handle unit-level logic
    const { data: allProps, error } = await supabase
        .from('properties')
        .select('*, locations(*), property_images(*)')
        .eq('is_active', true)
        .neq('status', 'hidden');

    if (error || !allProps) {
        console.error('Error searching properties:', error);
        return [];
    }

    // Identify the building if filtering by building
    let targetBuildingId: string | null = null;
    if (buildingSlug) {
        const building = allProps.find(p => p.slug === buildingSlug);
        if (building) targetBuildingId = building.id;
    }

    // 2. Identify Bookable Candidates (Leaf Nodes)
    // - Units (parent_id != null)
    // - Standalone (parent_id == null && is_multi_unit == false)
    let candidates = allProps.filter(p => {
        // If we are in "Building Mode", we ONLY want units from that specific building
        if (targetBuildingId) {
            return p.parent_id === targetBuildingId;
        }

        // Generic search: only bookable leaves
        if (p.parent_id) return true; // It's a unit
        if (!p.is_multi_unit) return true; // It's a standalone house
        return false; // It's a building container (not directly bookable)
    });

    // 3. Filter by Location
    if (location && location.trim()) {
        const locLower = location.toLowerCase().trim();
        candidates = candidates.filter(p => {
            const l = p.locations;
            const cityEn = (l?.name_en || p.city || '').toLowerCase();
            const cityPt = (l?.name_pt || '').toLowerCase();
            const cityHe = (l?.name_he || '').toLowerCase();
            const region = (p.region || '').toLowerCase();
            
            return cityEn.includes(locLower) || 
                   cityPt.includes(locLower) || 
                   cityHe.includes(locLower) || 
                   region.includes(locLower);
        });
    }

    // 4. Filter by Capacity
    candidates = candidates.filter(p => {
        const maxGuests = getNumber(p.max_guests);
        return maxGuests >= guests;
    });

    // 5. Check Availability (if dates provided)
    // Instead of filtering out unavailable, we flag them.
    // We resolve every source (blocked_dates, reservations, locked_dates) in a
    // single SECURITY DEFINER RPC so the public/anon client can also see paid
    // website reservations, which RLS hides from a direct anon read.
    if (from && to) {
        const fromStr = format(from, 'yyyy-MM-dd');
        const toStr = format(to, 'yyyy-MM-dd');

        const { data: unavailable, error: availError } = await supabase
            .rpc('get_unavailable_property_ids', { p_check_in: fromStr, p_check_out: toStr });

        if (availError) {
            console.error('Error checking availability:', availError);
        }

        const unavailableIds = new Set((unavailable || []).map((r: any) => r.property_id));

        // We keep ALL candidates, but flag the unavailable ones as reserved.
        candidates.forEach(p => {
            if (unavailableIds.has(p.id)) {
                p.isReserved = true;
            }
        });
    }

    // 6. Map back to Display Properties (Root Nodes) or return units directly
    if (buildingSlug) {
        return candidates.map(p => {
            const transformed = transformProperty(p, allProps);
            transformed.isReserved = p.isReserved || false;
            return transformed;
        }).sort((a, b) => {
            if (a.isReserved && !b.isReserved) return 1;
            if (!a.isReserved && b.isReserved) return -1;
            return 0;
        });
    }

    // 7. Show each bookable unit on its own: standalone houses + the individual
    // apartments inside buildings. Building containers are NOT shown as cards in
    // search — only the units they contain appear (each with its own availability).
    return candidates.map(p => {
        const transformed = transformProperty(p, allProps);
        transformed.isReserved = p.isReserved || false;
        return transformed;
    }).sort((a, b) => {
        // Sort: Available first, Reserved last
        if (a.isReserved && !b.isReserved) return 1;
        if (!a.isReserved && b.isReserved) return -1;
        return 0;
    });
}

export async function getConciergeServices() {
    const { data, error } = await supabase
        .from('concierge_services')
        .select('*')
        .eq('is_active', true);

    if (error) {
        console.error('Error fetching concierge services:', error);
        return [];
    }
    return data;
}

export async function checkPropertyAvailability(propertyId: string, from: Date, to: Date, guests: number = 1) {
    console.log('[DEBUG] checkPropertyAvailability:', { propertyId, from: from.toISOString(), to: to.toISOString(), guests });

    // 1. Procurar propriedade para verificar limites
    const { data: property, error: propError } = await supabase
        .from('properties')
        .select('id, max_guests, slug')
        .eq('id', propertyId)
        .single();

    if (propError || !property) {
        console.error('[DEBUG] checkPropertyAvailability - Error:', propError);
        return { available: false, error: 'Property not found' };
    }

    // 2. Verificar capacidade de hóspedes
    const maxGuestsVal = typeof property.max_guests === 'object' ?
        (property.max_guests.en || property.max_guests.pt || 0) :
        property.max_guests;

    const maxGuests = parseInt(String(maxGuestsVal)) || 0;

    if (guests > maxGuests) {
        return { available: false, error: 'errorMaxGuests' };
    }

    // 3. Verificar bloqueios na nova tabela blocked_dates
    const { verifyAvailability } = await import("./pricing");
    const availability = await verifyAvailability(propertyId, from, to);

    return availability;
}

// Helper to merge nearby places from child and parent
function mergeNearbyPlaces(childPOI: any[], parentPOI: any[]) {
    const merged: any[] = [];
    const allCategories = Array.from(new Set([
        ...(childPOI || []).map(c => c.category),
        ...(parentPOI || []).map(c => c.category)
    ])).filter(Boolean); // Filter out null/undefined categories

    for (const cat of allCategories) {
        const childCat = (childPOI || []).find(c => c.category === cat);
        const parentCat = (parentPOI || []).find(c => c.category === cat);

        // Combine items, avoiding duplicates by name
        const itemMap = new Map();
        [...(parentCat?.items || []), ...(childCat?.items || [])].forEach(item => {
            if (item && item.name) {
                itemMap.set(item.name, item);
            }
        });

        if (itemMap.size > 0) {
            merged.push({
                category: cat,
                items: Array.from(itemMap.values())
            });
        }
    }

    return merged;
}

// Internal Helper for Mapping
function transformProperty(p: any, allData: any[] = [], parentData?: any) {
    const isComingSoon = p.status === 'coming_soon' || p.is_active === false;
    const legacyProperty = PROPERTIES.find(lp => lp.slug === p.slug);

    // For units count (only relevant for buildings)
    const units = allData.filter((item: any) => String(item.parent_id) === String(p.id));
    const unitsCount = units.length;
    const singleUnitSlug = unitsCount === 1 ? units[0].slug : null;

    // VISUAL ABSORPTION is disabled as per user request to always show Building details
    const visualData = p;

    // Support both joined property_images and JSONB images column
    // MIGRATION NOTE: Prioritize JSONB 'images' as it contains the freshest data from the editor
    let rawImages = [];
    if (visualData.images?.length > 0) {
        rawImages = visualData.images.map((img: any) => typeof img === 'string' ? img : img.url);
    } else if (visualData.property_images?.length > 0) {
        rawImages = visualData.property_images.map((img: any) => img.url);
    }

    const propertyImages = rawImages.length > 0
        ? rawImages
        : ['https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop'];

    const actualParent = parentData || p.parent;

    // Location fallback
    const cityValue = visualData.locations?.name_en || visualData.city || p.locations?.name_en || p.city || actualParent?.locations?.name_en || actualParent?.city || units[0]?.locations?.name_en || '';
    const city = getLocalizedStr(cityValue);
    const region = getLocalizedStr(visualData.region || p.region || city);

    const getLines = (val: any, lang: string) => {
        const content = val?.[lang] || val?.['en'] || val?.['pt'] || '';
        return typeof content === 'string' ? content.split('\n').filter((line: string) => line.trim() !== '') : [];
    };

    // Coordinate validation
    const isValidCoord = (c: number) => typeof c === 'number' && !isNaN(c) && Math.abs(c) < 500;
    const normalize = (val: any) => {
        if (typeof val === 'string') return val.replace(',', '.');
        return val;
    };
    const safeCoords = (lat: any, lng: any, fallbackLat = 0, fallbackLng = 0): [number, number] => {
        const cLat = parseFloat(normalize(lat));
        const cLng = parseFloat(normalize(lng));
        return [
            isValidCoord(cLat) ? cLat : fallbackLat,
            isValidCoord(cLng) ? cLng : fallbackLng
        ];
    };
    // Returns valid coordinates or null — never a fake fallback location.
    // Missing/invalid coordinates must NOT default to Porto (was causing wrong map pins).
    const safeCoordsOrNull = (lat: any, lng: any): [number, number] | null => {
        const cLat = parseFloat(normalize(lat));
        const cLng = parseFloat(normalize(lng));
        return (isValidCoord(cLat) && isValidCoord(cLng)) ? [cLat, cLng] : null;
    };

    // Multilingual helpers
    const t = (val: any) => ({
        en: getLocalizedStr(val, 'en'),
        pt: getLocalizedStr(val, 'pt'),
        he: getLocalizedStr(val, 'he'),
    });

    return {
        ...p,
        id: p.id,
        slug: visualData.slug || p.slug, // Crucial for booking correct unit
        title: t(visualData.title || p.title),
        subtitle: t(visualData.subtitle || p.subtitle),
        description: {
            en: getLines(visualData.description || p.description, 'en'),
            pt: getLines(visualData.description || p.description, 'pt'),
            he: getLines(visualData.description || p.description, 'he'),
        },
        highlights_intro: t(visualData.highlights_intro || p.highlights_intro),
        guests: getNumber(visualData.max_guests || p.max_guests),
        area: getNumber(visualData.area || p.area),
        bedrooms: getNumber(visualData.bedrooms || p.bedrooms),
        beds: getNumber(visualData.beds || p.beds),
        bathrooms: getNumber(visualData.bathrooms || p.bathrooms),
        region: region,
        location: {
            city: city,
            region: region,
            country: 'Portugal',
            address: getLocalizedStr(visualData.address || p.address || actualParent?.address || units[0]?.address || ''),
            coordinates: safeCoordsOrNull(visualData.lat || p.lat, visualData.lng || p.lng) || safeCoordsOrNull(actualParent?.lat, actualParent?.lng)
        },
        image: (typeof visualData.images?.[0] === 'string' ? visualData.images[0] : visualData.images?.find((img: any) => img.is_main)?.url) || visualData.property_images?.find((img: any) => img.is_main)?.url || propertyImages[0],
        images: propertyImages,
        price: {
            perNight: getNumber(visualData.price_per_night || p.price_per_night),
            originalPrice: getNumber(visualData.original_price || p.original_price),
            discount: getNumber(visualData.discount_percentage || p.discount_percentage)
        },
        servicesPrice: {
            breakfast: getNumber(visualData.breakfast_price || p.breakfast_price || 15),
            transfer: getNumber(visualData.transfer_price || p.transfer_price || 55)
        },
        concierge: {
            ...(visualData.concierge || p.concierge || {}),
            breakfast: visualData.has_breakfast ?? p.has_breakfast ?? false,
            transfer: visualData.has_transfer ?? p.has_transfer ?? false,
        },
        types: visualData.types || p.types || [],
        highlights: (visualData.highlights || p.highlights || legacyProperty?.highlights || []).map((h: any) => ({
            ...h,
            text: t(h.text)
        })),
        rooms: (visualData.rooms || visualData.room_config || p.rooms || p.room_config || legacyProperty?.rooms || []).map((room: any, idx: number) => ({
            ...room,
            image: room.image || legacyProperty?.rooms?.find((lr: any) => lr.name === room.name)?.image || legacyProperty?.rooms?.[idx]?.image || propertyImages[idx % propertyImages.length] || 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=1200&q=80'
        })),
        nearbyPlaces: (visualData.nearby_places && visualData.nearby_places.length > 0) || actualParent?.nearby_places
            ? mergeNearbyPlaces(visualData.nearby_places || [], actualParent?.nearby_places || []).map((cat: any) => ({
                ...cat,
                items: cat.items?.map((item: any) => ({
                    ...item,
                    coordinates: safeCoordsOrNull(item.coordinates?.[0], item.coordinates?.[1])
                }))
            }))
            : (legacyProperty?.nearbyPlaces || []),
        unitsCount,
        singleUnitSlug,
        parent: actualParent ? {
            id: actualParent.id,
            title: getLocalizedStr(actualParent.title),
            slug: actualParent.slug
        } : null,
        parking: visualData.parking || p.parking || {
            available: (visualData.amenities || p.amenities || []).some((cat: any) => 
                (cat.items || []).some((item: any) => 
                    JSON.stringify(item).toLowerCase().includes('parking') || 
                    JSON.stringify(item).toLowerCase().includes('estacionamento') ||
                    JSON.stringify(item).toLowerCase().includes('garage') ||
                    JSON.stringify(item).toLowerCase().includes('garagem')
                )
            ),
            size: {
                en: "Suitable for most standard cars (e.g. Sedans, compact SUVs)",
                pt: "Adequado para a maioria dos carros standard (ex. Sedans, SUVs compactos)",
                he: "מתאים לרוב המכוניות הרגילות (למשל סדאן, רכבי שטח קומפקטיים)"
            },
            hasElectricCharger: false
        },
        policies: {
            houseRules: visualData.house_rules || p.house_rules || {
                childrenAllowed: true,
                infantsAllowed: true,
                petsAllowed: false,
                partiesAllowed: false,
                smokingAllowed: false
            },
            checkIn: visualData.check_in || p.check_in || { arrivalStart: '15:00', departureEnd: '11:00' },
            cancellation: {
                text: t(visualData.cancellation?.text || p.cancellation?.text || { en: "Moderate", pt: "Moderada", he: "מתון" }),
                refundText: t(visualData.cancellation?.refundText || p.cancellation?.refundText || { en: "50% refund", pt: "50% reembolso", he: "50% החזר" }),
                deadline: t(visualData.cancellation?.deadline || p.cancellation?.deadline || { en: "7 days", pt: "7 dias", he: "7 ימים" })
            },
            pricing: p.pricing_rules?.[0] || p.pricing_rules || {
                min_nights: 2,
                cleaning_fee: 85,
                weekly_discount_percent: 5,
                monthly_discount_percent: 15
            }
        },
        homeTruths: (() => {
            const raw = visualData.good_to_know || p.good_to_know || visualData.home_truths || p.home_truths || [];
            return Array.isArray(raw) ? raw.map(t) : [];
        })(),
        amenities: (() => {
            const raw = visualData.amenities || p.amenities || [];
            return Array.isArray(raw) ? raw.map((cat: any) => ({
                ...cat,
                items: Array.isArray(cat.items) ? cat.items.map(t) : []
            })) : [];
        })(),
        isComingSoon
    };
}
