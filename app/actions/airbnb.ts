"use server";

import { PropertyFormData } from "../../components/admin/properties/PropertyFormSchema";
import { 
    ITEM_TRANSLATIONS, 
    SUGGESTED_CATEGORIES, 
    DEFAULT_ICONS 
} from "../../lib/amenityConstants";

/**
 * Scrapes an Airbnb listing and returns data mapped to PropertyFormData
 * Using forced English locale to match the system's primary language requirement.
 */
export async function scrapeAirbnbListing(url: string): Promise<{ success: boolean; data?: Partial<PropertyFormData>; error?: string }> {
    try {
        // 1. Normalize and Fetch
        let targetUrlStr = url;
        try {
            const targetUrl = new URL(url);
            // Force English locale
            targetUrl.searchParams.set('locale', 'en'); 
            targetUrlStr = targetUrl.toString();
        } catch (e) {
            throw new Error("Invalid URL provided.");
        }
        
        const response = await fetch(targetUrlStr, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cache-Control': 'no-cache'
            },
            next: { revalidate: 0 }
        });

        if (!response.ok) {
            throw new Error(`Airbnb returned status ${response.status}. The listing might be private or blocked.`);
        }

        const html = await response.text();

        // 2. Extract JSON from script tags
        // Look for data-deferred-state-0 or niobe-shell-props
        const scriptMatch = html.match(/<script id="data-deferred-state-0"[^>]*>([\s\S]*?)<\/script>/) || 
                            html.match(/<script id="niobe-shell-props"[^>]*>([\s\S]*?)<\/script>/) ||
                            html.match(/<script id="data-state"[^>]*>([\s\S]*?)<\/script>/);

        if (!scriptMatch) {
            throw new Error("Could not find property data on the page. Airbnb might be using a different layout.");
        }

        let jsonData;
        try {
            jsonData = JSON.parse(scriptMatch[1]);
        } catch (e) {
            throw new Error("Failed to parse the data block from Airbnb.");
        }
        
        // Helper to recursively find stayProductDetailPage
        const findNiobeData = (obj: any): any => {
            if (!obj || typeof obj !== 'object') return null;
            if (obj.stayProductDetailPage) return obj.stayProductDetailPage;
            for (const key in obj) {
                const found = findNiobeData(obj[key]);
                if (found) return found;
            }
            return null;
        };

        const niobeData = findNiobeData(jsonData);

        if (!niobeData) {
            // Fallback: look for generic metadata if niobe fails
            const ogTitle = html.match(/<meta property="og:title" content="(.*?)"/)?.[1] || "";
            const ogDesc = html.match(/<meta property="og:description" content="(.*?)"/)?.[1] || "";
            const ogImage = html.match(/<meta property="og:image" content="(.*?)"/)?.[1] || "";

            return {
                success: true,
                data: {
                    title: { en: ogTitle, pt: "", he: "" },
                    description: { en: ogDesc, pt: "", he: "" },
                    images: ogImage ? [{ url: ogImage, alt: { en: "Main Image", pt: "Imagem Principal", he: "" }, is_main: true, order: 0 }] : [],
                    status: 'active',
                    type: 'apartment',
                    slug: ogTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
                }
            };
        }

        // Helper to recursively list all sections in the niobe data
        const allSections: any[] = [];
        const extractSections = (obj: any) => {
            if (!obj || typeof obj !== 'object') return;
            if (obj.sectionId || (obj.__typename && obj.__typename.includes('Section'))) {
                // Return section + actual data
                allSections.push(obj);
            }
            for (const key in obj) {
                extractSections(obj[key]);
            }
        };
        extractSections(niobeData);

        const findSection = (id: string) => allSections.find(s => s.sectionId === id);
        const findSectionByType = (type: string) => allSections.find(s => s.__typename === type);

        // Map Data
        const titleSecObj = findSection("TITLE_DEFAULT") || findSection("TITLE_DEFAULT_V2");
        const titleSection = titleSecObj?.section?.title || titleSecObj?.section?.titleText || titleSecObj?.sectionData?.title || "";
        
        const descSection = findSection("DESCRIPTION_DEFAULT")?.section || findSection("DESCRIPTION_DEFAULT")?.sectionData;
        const photosSection = findSection("PHOTO_TOUR_DEFAULT") || findSection("HERO_DEFAULT") || findSection("PHOTO_TOUR_SCROLLABLE");
        const detailsSection = findSection("OVERVIEW_DEFAULT_V2")?.section?.items || 
                               findSection("GUEST_STAY_OVERVIEW_DEFAULT")?.section?.items || [];

        // Capacity parsing
        let guests = 0, bedrooms = 0, beds = 0, bathrooms = 0;
        
        // Try detailsSection (classic) or overviewItems (new)
        const capacityItems = detailsSection.length > 0 ? detailsSection : 
                             (findSection("OVERVIEW_DEFAULT_V2")?.sectionData?.overviewItems || []);

        capacityItems.forEach((item: any) => {
            const label = (item.title || item.label || item.text || "").toLowerCase();
            if (label.includes("guest")) guests = parseInt(label) || guests;
            if (label.includes("bedroom")) bedrooms = parseInt(label) || bedrooms;
            if (label.includes("bed") && !label.includes("bedroom")) beds = parseInt(label) || beds;
            if (label.includes("bath")) bathrooms = parseFloat(label.replace(',', '.')) || bathrooms;
        });

        // Photos extraction
        const images: any[] = [];
        if (photosSection) {
            const mediaItems = photosSection.section?.mediaItems || 
                               photosSection.section?.photos || 
                               photosSection.sectionData?.photos || 
                               photosSection.section?.previewImages || [];
            
            mediaItems.forEach((img: any, index: number) => {
                const url = img.baseUrl || img.picture || img.largeUrl || img.originalUrl;
                if (url) {
                    images.push({
                        url: url.split('?')[0], // Get high-res version without query params
                        alt: { 
                            en: img.caption || `Property Image ${index + 1}`, 
                            pt: img.caption || `Imagem da Propriedade ${index + 1}`, 
                            he: "" 
                        },
                        is_main: index === 0,
                        order: index
                    });
                }
            });
        }

        // Amenities extraction
        const amenities: any[] = [];
        const amenitiesSecObj = findSection("AMENITIES_DEFAULT") || findSectionByType("StayPdpAmenitiesSection");
        
        if (amenitiesSecObj) {
            const groups = (amenitiesSecObj.section?.seeAllAmenitiesGroups || 
                          amenitiesSecObj.sectionData?.seeAllAmenitiesGroups || 
                          amenitiesSecObj.sectionData?.amenitiesGroups || []);
            
            groups.forEach((group: any) => {
                const airbnbGroupTitle = group.title || "Other";
                
                // Map Airbnb group to our suggested categories if possible
                let category = SUGGESTED_CATEGORIES.find(cat => 
                    cat.toLowerCase().includes(airbnbGroupTitle.toLowerCase()) || 
                    airbnbGroupTitle.toLowerCase().includes(cat.toLowerCase())
                ) || airbnbGroupTitle;

                const items: any[] = [];
                (group.amenities || []).forEach((amenity: any) => {
                    if (amenity.available === false) return;
                    
                    const title = amenity.title || "";
                    if (!title) return;

                    // Match with our internal translations
                    const matchedItem = ITEM_TRANSLATIONS[title] || 
                                      Object.values(ITEM_TRANSLATIONS).find(t => t.en === title);
                    
                    if (matchedItem) {
                        items.push({
                            en: matchedItem.en,
                            pt: matchedItem.pt,
                            he: matchedItem.he || ""
                        });
                    } else {
                        items.push({
                            en: title,
                            pt: "",
                            he: ""
                        });
                    }
                });

                if (items.length > 0) {
                    // Check if category already exists in our array
                    const existingCat = amenities.find(a => a.category === category);
                    if (existingCat) {
                        // Merge items but avoid duplicates
                        items.forEach(newItem => {
                            if (!existingCat.items.some((i: any) => i.en === newItem.en)) {
                                existingCat.items.push(newItem);
                            }
                        });
                    } else {
                        amenities.push({
                            category,
                            icon: DEFAULT_ICONS[category] || "/icons/outdoor_navy.png",
                            items
                        });
                    }
                }
            });
        }

        // Policies, House Rules & Safety extraction
        const house_rules: any = {
            childrenAllowed: true,
            infantsAllowed: true,
            petsAllowed: false,
            partiesAllowed: false,
            smokingAllowed: false,
            custom: []
        };
        const check_in_info = { arrivalStart: "15:00", departureEnd: "11:00" };
        const cancellation_info = { 
            text: { en: "Moderate", pt: "Moderada", he: "מתון" },
            refundText: { en: "50% refund", pt: "50% de reembolso", he: "50% de reembolso" },
            deadline: { en: "7 days", pt: "7 dias", he: "7 ימים" }
        };
        const home_truths: any[] = [];

        const policiesSecObj = findSectionByType("PoliciesSection");
        if (policiesSecObj) {
            const section = policiesSecObj.sectionData || policiesSecObj.section;
            
            // House Rules Parsing
            const airbnbRules = section?.houseRules || [];
            airbnbRules.forEach((rule: any) => {
                const title = rule.title || "";
                const lowerTitle = title.toLowerCase();

                if (lowerTitle.includes("check-in after")) {
                    const match = title.match(/(\d{1,2}:\d{2})/);
                    if (match) check_in_info.arrivalStart = match[1];
                } else if (lowerTitle.includes("checkout before")) {
                    const match = title.match(/(\d{1,2}:\d{2})/);
                    if (match) check_in_info.departureEnd = match[1];
                } else if (lowerTitle.includes("pets allowed")) {
                    house_rules.petsAllowed = !lowerTitle.includes("no ");
                } else if (lowerTitle.includes("smoking")) {
                    house_rules.smokingAllowed = !lowerTitle.includes("no ");
                } else if (lowerTitle.includes("parties")) {
                    house_rules.partiesAllowed = !lowerTitle.includes("no ");
                } else if (lowerTitle.includes("children")) {
                    house_rules.childrenAllowed = !lowerTitle.includes("not suitable");
                } else if (lowerTitle.includes("infants")) {
                    house_rules.infantsAllowed = !lowerTitle.includes("not suitable");
                } else {
                    house_rules.custom.push({
                        label: { en: title, pt: "", he: "" },
                        allowed: !lowerTitle.includes("no ") && !lowerTitle.includes("not ")
                    });
                }
            });

            // Cancellation Policy
            if (section?.cancellationPolicyTitle) {
                cancellation_info.text = { 
                    en: section.cancellationPolicyTitle, 
                    pt: section.cancellationPolicyTitle === "Moderate" ? "Moderada" : section.cancellationPolicyTitle, 
                    he: "" 
                };
            }

            // Safety & Property Info (Home Truths)
            const safetyItems = section?.previewSafetyAndProperties || [];
            safetyItems.forEach((item: any) => {
                if (item.title) {
                    home_truths.push({
                        en: item.title + (item.subtitle ? `: ${item.subtitle}` : ""),
                        pt: "",
                        he: ""
                    });
                }
            });
        }

        // Description extraction - handle HTML, plain text, or the new htmlDescription.htmlText
        const rawDesc = descSection?.htmlDescription?.html || 
                        descSection?.htmlDescription?.htmlText ||
                        descSection?.description?.text || 
                        descSection?.description || "";
        
        const cleanDescription = (typeof rawDesc === 'string' ? rawDesc : (rawDesc?.text || ""))
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<[^>]*>?/gm, '')
            .trim();

        const result: Partial<PropertyFormData> = {
            title: { en: titleSection, pt: "", he: "" },
            description: { en: cleanDescription, pt: "", he: "" },
            max_guests: guests || 2,
            bedrooms: bedrooms || 1,
            beds: beds || 1,
            bathrooms: bathrooms || 1,
            images: images,
            amenities: amenities,
            house_rules: house_rules,
            check_in: check_in_info,
            cancellation: cancellation_info,
            home_truths: home_truths,
            status: 'active',
            type: 'apartment',
            slug: titleSection.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
            ical_import_urls: [url] 
        };

        return { success: true, data: result };

    } catch (err: any) {
        console.error("Airbnb Scraper Error:", err);
        return { success: false, error: err.message };
    }
}

