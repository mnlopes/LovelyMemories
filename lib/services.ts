import { supabase } from './supabase';
import { Property, ConciergeService, PROPERTIES } from './data';

// Helper to safely extract string from potential localized object
const getLocalizedStr = (val: any): string => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
        const preferred = val['en'] || val['pt'] || Object.values(val)[0];
        return typeof preferred === 'string' ? preferred : '';
    }
    return '';
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
    // 1. Fetch property to check limits
    console.log('[DEBUG] checkPropertyAvailability:', { propertyId, from: from.toISOString(), to: to.toISOString(), guests });

    // TODO: [RESERVATION-LOGIC] Review this fallback.
    // This allows continuing even if blocked_dates schema is missing, but once the booking
    // system is fully functional, we should enforce strict checking to avoid overlapping stays.
    let { data: property, error: propError } = await supabase
        .from('properties')
        .select('id, max_guests, blocked_dates, slug')
        .eq('id', propertyId)
        .single();

    // If it fails because blocked_dates is missing, try without it
    if (propError && (propError.code === '42703' || propError.message.includes('blocked_dates'))) {
        console.warn('[DEBUG] checkPropertyAvailability - Falling back (blocked_dates column missing)');
        const fallback = await supabase
            .from('properties')
            .select('id, max_guests, slug')
            .eq('id', propertyId)
            .single();

        if (fallback.data) {
            property = fallback.data as any;
        } else {
            return { available: false, error: 'Property not found' };
        }
    } else if (propError) {
        console.error('[DEBUG] checkPropertyAvailability - Error:', propError);
        return { available: false, error: 'Property not found' };
    }

    if (!property) return { available: false, error: 'Property not found' };

    console.log('[DEBUG] checkPropertyAvailability - Found Property:', {
        id: property.id,
        slug: property.slug,
        maxGuests: property.max_guests
    });

    // 2. Check guest capacity
    // max_guests can be a number or a JSON object depending on the migration state
    const maxGuestsVal = typeof property.max_guests === 'object' ?
        (property.max_guests.en || property.max_guests.pt || 0) :
        property.max_guests;

    const maxGuests = parseInt(String(maxGuestsVal)) || 0;

    if (guests > maxGuests) {
        return { available: false, error: 'Exceeds maximum guests' };
    }

    // 3. Check blocked dates (Mock logic for now using JSONB field if available)
    const blockedDates: string[] = property.blocked_dates || [];
    const requestedStart = from.getTime();
    const requestedEnd = to.getTime();

    // SIMPLE CHECK: If any blocked date is between requestedStart and requestedEnd
    const isBlocked = blockedDates.some(dateStr => {
        const blockedTime = new Date(dateStr).getTime();
        return blockedTime >= requestedStart && blockedTime <= requestedEnd;
    });

    if (isBlocked) {
        return { available: false, error: 'Dates no longer available' };
    }

    return { available: true };
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

    // VISUAL ABSORPTION: If building has exactly 1 unit, 
    // we show the unit's information (title, images, etc) but keep the identity.
    const visualData = (unitsCount === 1 && !p.parent_id) ? units[0] : p;

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
    const city = visualData.locations?.name_en || visualData.city || p.locations?.name_en || p.city || actualParent?.locations?.name_en || actualParent?.city || units[0]?.locations?.name_en || '';
    const region = visualData.region || p.region || city;

    const getDesc = (record: any, lang: string) => record.description?.[lang] ? record.description[lang].split('\n').filter((line: string) => line.trim() !== '') : [];

    // Coordinate validation
    const isValidCoord = (c: number) => typeof c === 'number' && !isNaN(c) && Math.abs(c) < 500;
    const safeCoords = (lat: any, lng: any, fallbackLat = 0, fallbackLng = 0): [number, number] => {
        const cLat = parseFloat(lat);
        const cLng = parseFloat(lng);
        return [
            isValidCoord(cLat) ? cLat : fallbackLat,
            isValidCoord(cLng) ? cLng : fallbackLng
        ];
    };

    // Helper to extract number from potential JSON object (legacy data fix)
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

    return {
        ...p,
        id: p.id,
        slug: visualData.slug || p.slug, // Crucial for booking correct unit
        title: visualData.title || p.title || '',
        title_en: visualData.title?.en || p.title?.en || '',
        title_pt: visualData.title?.pt || p.title?.pt || '',
        subtitle: visualData.subtitle || p.subtitle || '',
        subtitle_en: visualData.subtitle?.en || p.subtitle?.en || '',
        subtitle_pt: visualData.subtitle?.pt || p.subtitle?.pt || '',
        description: visualData.description || p.description || [],
        description_en: getDesc(visualData, 'en'),
        description_pt: getDesc(visualData, 'pt'),
        guests: getNumber(visualData.max_guests || p.max_guests),
        area: getNumber(visualData.area || p.area),
        bedrooms: getNumber(visualData.bedrooms || p.bedrooms),
        beds: getNumber(visualData.beds || p.beds),
        bathrooms: getNumber(visualData.bathrooms || p.bathrooms),
        location: {
            city: city,
            region: region,
            country: 'Portugal',
            address: visualData.address || p.address || actualParent?.address || units[0]?.address || '',
            coordinates: safeCoords(visualData.lat || p.lat, visualData.lng || p.lng, actualParent?.lat || 0, actualParent?.lng || 0)
        },
        image: (typeof visualData.images?.[0] === 'string' ? visualData.images[0] : visualData.images?.find((img: any) => img.is_main)?.url) || visualData.property_images?.find((img: any) => img.is_main)?.url || propertyImages[0],
        images: propertyImages,
        price: {
            perNight: getNumber(visualData.price_per_night || p.price_per_night),
            originalPrice: getNumber(visualData.original_price || p.original_price),
            discount: getNumber(visualData.discount_percentage || p.discount_percentage)
        },
        servicesPrice: {
            breakfast: 15,
            transfer: 55
        },
        types: visualData.types || p.types || [],
        highlights: visualData.highlights || p.highlights || legacyProperty?.highlights || [],
        rooms: (visualData.rooms || visualData.room_config || p.rooms || p.room_config || legacyProperty?.rooms || []).map((room: any, idx: number) => ({
            ...room,
            image: room.image || legacyProperty?.rooms?.find((lr: any) => lr.name === room.name)?.image || legacyProperty?.rooms?.[idx]?.image || propertyImages[idx % propertyImages.length] || 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=1200&q=80'
        })),
        nearbyPlaces: (visualData.nearby_places && visualData.nearby_places.length > 0) || actualParent?.nearby_places
            ? mergeNearbyPlaces(visualData.nearby_places || [], actualParent?.nearby_places || []).map((cat: any) => ({
                ...cat,
                items: cat.items?.map((item: any) => ({
                    ...item,
                    coordinates: item.coordinates ? [isValidCoord(item.coordinates[0]) ? item.coordinates[0] : 0, isValidCoord(item.coordinates[1]) ? item.coordinates[1] : 0] : null
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
        policies: {
            houseRules: visualData.house_rules || p.house_rules || {
                childrenAllowed: true,
                infantsAllowed: true,
                petsAllowed: false,
                partiesAllowed: false,
                smokingAllowed: false
            },
            checkIn: visualData.check_in || p.check_in || { arrivalStart: '15:00', departureEnd: '11:00' },
            cancellation: visualData.cancellation || p.cancellation || {
                text: "Moderate",
                refundText: "50% refund",
                deadline: "7 days"
            }
        },
        homeTruths: visualData.home_truths || p.home_truths || visualData.good_to_know || p.good_to_know || [],
        amenities: visualData.amenities || p.amenities || [],
        isComingSoon
    };
}
