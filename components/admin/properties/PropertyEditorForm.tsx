"use client";

import { useForm, FormProvider, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { ArrowLeft, Save, Eye, Loader2, Globe } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { PropertyFormData, propertySchema } from "./PropertyFormSchema";
import BasicInfoTab from "./BasicInfoTab";
import LocationTab from "./LocationTab";
import MediaTab from "./MediaTab";
import RoomsTab from "./RoomsTab";
import HierarchyTab from "./HierarchyTab";
import AmenitiesTab from "./AmenitiesTab";
import PoliciesTab from "./PoliciesTab";
import PricingAvailabilityTab from "./PricingAvailabilityTab";
import SyncTab from "./SyncTab";
import { upsertProperty } from "@/app/actions/property";
import { StatusModal } from "@/components/admin/ui/StatusModal";
import { ActivityTimeline } from "@/components/admin/ActivityTimeline";

interface PropertyEditorFormProps {
    initialData?: Partial<PropertyFormData>;
    isEditing: boolean;
    mode?: 'building';
}

export default function PropertyEditorForm({ initialData, isEditing, mode }: PropertyEditorFormProps) {
    const router = useRouter();
    const t = useTranslations('PropertyEditor');
    const [activeTab, setActiveTab] = useState('basic');
    const [activeLang, setActiveLang] = useState('en');
    const [isSaving, setIsSaving] = useState(false);
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        type: 'success' | 'error' | 'loading' | 'warning';
        title: string;
        message: string;
        actionLabel?: string;
        onAction?: () => void;
        cancelLabel?: string;
    }>({
        isOpen: false,
        type: 'loading',
        title: '',
        message: ''
    });

    const languages = [
        { id: 'en', label: 'English', flag: '🇬🇧', dir: 'ltr' },
        { id: 'pt', label: 'Português', flag: '🇵🇹', dir: 'ltr' },
    ];

    const formMethods = useForm<PropertyFormData>({
        resolver: zodResolver(propertySchema) as any,
        values: {
            ...initialData,
            slug: initialData?.slug || "",
            status: initialData?.status || "active",
            title: typeof initialData?.title === 'object' ? {
                en: initialData.title?.en || "",
                pt: initialData.title?.pt || "",
                he: initialData.title?.he || ""
            } : { en: "", pt: "", he: "" },
            subtitle: typeof initialData?.subtitle === 'object' ? {
                en: initialData.subtitle?.en || "",
                pt: initialData.subtitle?.pt || "",
                he: initialData.subtitle?.he || ""
            } : { en: "", pt: "", he: "" },
            description: typeof initialData?.description === 'object' ? {
                en: initialData.description?.en || "",
                pt: initialData.description?.pt || "",
                he: initialData.description?.he || ""
            } : { en: "", pt: "", he: "" },
            highlights_intro: typeof initialData?.highlights_intro === 'object' ? {
                en: initialData.highlights_intro?.en || "",
                pt: initialData.highlights_intro?.pt || "",
                he: initialData.highlights_intro?.he || ""
            } : { en: "", pt: "", he: "" },
            house_rules: {
                childrenAllowed: true,
                infantsAllowed: true,
                petsAllowed: false,
                partiesAllowed: false,
                smokingAllowed: false,
                ...initialData?.house_rules
            },
            check_in: {
                arrivalStart: "15:00",
                departureEnd: "11:00",
                ...initialData?.check_in
            },
            cancellation: {
                text: "Moderate",
                refundText: "50% refund",
                deadline: "7 days",
                ...initialData?.cancellation
            },
            nearby_places: initialData?.nearby_places?.length ? initialData.nearby_places : [
                { category: 'essentials', items: [] },
                { category: 'localAttractions', items: [] }
            ],
            highlights: initialData?.highlights || [],
            vip_services: initialData?.vip_services || [],
            home_truths: (initialData as any)?.home_truths || (initialData as any)?.good_to_know || [],
            bed_sizes: initialData?.bed_sizes || {
                single: "90 x 190 cm",
                double: "140 x 190 cm",
                king: "160 x 200 cm",
                superKing: "180 x 200 cm"
            },
            baby_equipment: initialData?.baby_equipment || {
                available: true,
                text: {
                    en: "Baby cot and high chair are available on request at no extra cost.",
                    pt: "Berço e cadeira alta estão disponíveis mediante pedido, sem custo extra.",
                    he: "מיטת תינוק וכיסא אוכל זמינים לפי בקשה ללא עלות."
                }
            },
            parking: initialData?.parking || {
                available: false,
                size: {
                    en: "Suitable for most standard cars (e.g. Sedans, compact SUVs)",
                    pt: "Adequado para a maioria dos carros standard (ex. Sedans, SUVs compactos)",
                    he: "מתאים לרוב המכוניות הרגילות (למשל סדאן, רכבי שטח קומפקטיים)"
                },
                hasElectricCharger: false
            },
            price_per_night: initialData?.price_per_night ?? 0,
            original_price: initialData?.original_price ?? null,
            min_nights: (initialData as any)?.min_nights ?? 2,
            cleaning_fee: (initialData as any)?.cleaning_fee ?? 85,
            weekly_discount_percent: (initialData as any)?.weekly_discount_percent ?? 5,
            monthly_discount_percent: (initialData as any)?.monthly_discount_percent ?? 15,
            city_tax_per_night: (initialData as any)?.city_tax_per_night ?? 2,

            // Fix: Initialize hierarchy and type fields to prevent validation errors
            is_multi_unit: initialData?.is_multi_unit ?? (mode === 'building'),
            parent_id: initialData?.parent_id ?? null,
            type: initialData?.type ?? 'apartment',
            ical_import_urls: initialData?.ical_import_urls ?? [],
            airbnb_listing_name: initialData?.airbnb_listing_name ?? null,

            // Extra Flags
            has_breakfast: initialData?.has_breakfast ?? false,
            has_transfer: initialData?.has_transfer ?? false,
            breakfast_price: initialData?.breakfast_price ?? 15,
            transfer_price: initialData?.transfer_price ?? 55,

            // Capacity
            max_guests: initialData?.max_guests ?? 0,
            max_infants: initialData?.max_infants ?? 0,
            bedrooms: initialData?.bedrooms ?? 0,
            beds: initialData?.beds ?? 0,
            bathrooms: initialData?.bathrooms ?? 0,
            area: initialData?.area ?? null,

            // Status
            status: initialData?.status ?? 'coming_soon',
            is_active: initialData?.is_active ?? false,
        } as any
    });

    const isMultiUnit = useWatch({
        control: formMethods.control,
        name: 'is_multi_unit'
    });

    // Effective mode based on either the prop or the form state
    const effectiveMode = isMultiUnit ? 'building' : mode;

    const { formState: { errors } } = formMethods;

    const onSubmit = async (data: PropertyFormData) => {
        console.log("🚀 Submit trigger - data:", data);

        // Warning check for Coming Soon without price (only for individual units, not buildings)
        if (!data.is_multi_unit && data.status === 'coming_soon' && (!data.price_per_night || data.price_per_night <= 0)) {
            setModalConfig({
                isOpen: true,
                type: 'warning',
                title: t('system.noPriceWarningTitle'),
                message: t('system.noPriceWarningMessage'),
                actionLabel: t('system.noPriceWarningAction'),
                cancelLabel: t('system.noPriceWarningCancel'),
                onAction: () => {
                    setModalConfig(prev => ({ ...prev, isOpen: false }));
                    performSave(data);
                }
            });
            return;
        }

        performSave(data);
    };

    const performSave = async (data: PropertyFormData) => {
        setIsSaving(true);
        setModalConfig({
            isOpen: true,
            type: 'loading',
            title: t('system.saving'),
            message: t('system.savingDesc')
        });

        try {
            const result = await upsertProperty(data);
            if (result.success) {
                setModalConfig({
                    isOpen: true,
                    type: 'success',
                    title: t('system.success'),
                    message: result.message || t('system.saveSuccess')
                });

                setTimeout(() => {
                    const currentLocale = window.location.pathname.split('/')[1] || 'en';

                    if (isEditing) {
                        // Stay on page, just refresh data
                        setModalConfig(prev => ({ ...prev, isOpen: false }));
                        router.refresh();
                    } else if (result.id) {
                        // Redirect to the new edit page
                        router.push(`/${currentLocale}/admin/properties/${result.id}`);
                        router.refresh();
                    } else {
                        // Fallback
                        router.push(`/${currentLocale}/admin/properties`);
                        router.refresh();
                    }
                }, 1500);
            } else {
                setModalConfig({
                    isOpen: true,
                    type: 'error',
                    title: t('system.errorSaving'),
                    message: result.error || t('system.saveError')
                });
            }
        } catch (error) {
            console.error("Submit Error:", error);
            setModalConfig({
                isOpen: true,
                type: 'error',
                title: t('system.unexpectedError'),
                message: t('system.unexpectedDesc')
            });
        } finally {
            setIsSaving(false);
        }
    };

    const onInvalid = (errors: any) => {
        console.warn("⚠️ Validation Failed:", errors);

        // Log individual field errors in console for debugging but don't burst red overlay
        Object.entries(errors).forEach(([field, error]: [string, any]) => {
            console.warn(`- Field ${field}:`, error.message, error.type);
        });

        const errorFields = Object.keys(errors).join(", ");
        setModalConfig({
            isOpen: true,
            type: 'error',
            title: t('system.incompleteData'),
            message: t('system.incompleteDesc', { fields: errorFields })
        });
    };

    const tabs = [
        { id: 'media', label: t('tabs.media') },
        { id: 'basic', label: effectiveMode === 'building' ? t('tabs.building') : t('tabs.basic') },
        { id: 'hierarchy', label: t('tabs.hierarchy'), hideForUnits: true },
        { id: 'amenities', label: t('tabs.amenities'), hideForBuildings: true },
        { id: 'units', label: t('tabs.units'), hideForBuildings: true },
        { id: 'location', label: t('tabs.location') },
        { id: 'policies', label: t('tabs.policies'), hideForBuildings: true },
        { id: 'pricing', label: t('tabs.pricing'), hideForBuildings: true },
        { id: 'sync', label: t('tabs.sync'), hideForBuildings: true },
        // Only show history if not creating new property
        ...(isEditing ? [{ id: 'history', label: t('tabs.history') }] : [])
    ].filter(tab => {
        if (effectiveMode === 'building') {
            return !tab.hideForBuildings;
        }
        return !tab.hideForUnits;
    });

    const handlePreview = () => {
        const slug = formMethods.getValues('slug');
        if (slug) {
            window.open(`/${activeLang}/properties/${slug}`, '_blank');
        } else {
            toast.error(t('system.slugRequired'));
        }
    };




    return (
        <FormProvider {...formMethods}>
            <form onSubmit={formMethods.handleSubmit(onSubmit as any, onInvalid)} className="space-y-8 pb-20">
                {/* Header */}
                <div className="flex items-center justify-between sticky top-[96px] bg-white/80 dark:bg-admin-dark-surface/80 backdrop-blur-xl transition-all px-10 py-6 z-20 border border-[#f5f5f5] dark:border-white/10 rounded-[32px] shadow-2xl shadow-black/5 dark:shadow-none">
                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="size-10 rounded-full bg-white dark:bg-admin-dark-surface border border-[#f5f5f5] dark:border-admin-dark-border flex items-center justify-center text-[#171717] dark:text-admin-dark-text-primary hover:bg-[#fafafa] dark:hover:bg-admin-dark-bg transition-all shadow-sm"
                        >
                            <ArrowLeft className="size-5" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold text-[#171717] dark:text-admin-dark-text-primary uppercase tracking-tight">
                                    {isEditing
                                        ? t('header.editTitle', { type: t(`types.${effectiveMode === 'building' ? 'building' : 'property'}`) })
                                        : t('header.createTitle', { type: t(`types.${effectiveMode === 'building' ? 'building' : 'property'}`) })
                                    }
                                </h1>
                                {!isEditing && initialData && (
                                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 text-[10px] font-bold rounded flex items-center gap-1 border border-slate-200 dark:border-white/10">
                                        <Globe className="size-3" />
                                        Airbnb Import
                                    </span>
                                )}
                            </div>
                            <p className="text-[#a3a3a3] text-sm font-medium">
                                {isEditing
                                    ? t('header.editDesc', { name: (initialData?.title as any)?.en || t(`types.${effectiveMode === 'building' ? 'building' : 'property'}`) })
                                    : t('header.createDesc', { type: t(`types.${effectiveMode === 'building' ? 'building' : 'property'}`) })}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handlePreview}
                            className="px-4 py-2 bg-white dark:bg-admin-dark-surface border border-[#f5f5f5] dark:border-admin-dark-border text-[#171717] dark:text-admin-dark-text-primary rounded-lg text-sm font-bold hover:bg-[#fafafa] dark:hover:bg-admin-dark-bg transition-all flex items-center gap-2 shadow-sm"
                        >
                            <Eye className="size-4" />
                            {t('header.preview')}
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="px-6 py-2 bg-[#171717] dark:bg-white text-white dark:text-black rounded-lg text-sm font-bold hover:bg-black dark:hover:bg-gray-200 transition-all flex items-center gap-2 disabled:opacity-50 min-w-[160px] justify-center shadow-lg shadow-black/5"
                        >
                            {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                            {isSaving
                                ? t('header.saving')
                                : t('header.save', { type: t(`types.${effectiveMode === 'building' ? 'building' : 'property'}`) })
                            }
                        </button>
                    </div>
                </div>

                {/* Language Switcher & Tabs */}
                <div className="border-b border-[#eaeaea] dark:border-admin-dark-border transition-colors px-10">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="flex items-center gap-8 overflow-x-auto no-scrollbar">
                            {tabs.map((tab) => {
                                // Check if tab has errors
                                let hasError = false;
                                if (tab.id === 'basic') {
                                    hasError = !!(errors.title || errors.slug || errors.description);
                                } else if (tab.id === 'location') {
                                    hasError = !!(errors.address || errors.city || errors.lat || errors.lng || errors.nearby_places);
                                } else if (tab.id === 'units') {
                                    hasError = !!(errors.rooms);
                                } else if (tab.id === 'pricing') {
                                    hasError = !!(errors.price_per_night || errors.max_guests);
                                }

                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`pb-4 text-sm font-bold transition-all relative whitespace-nowrap ${activeTab === tab.id
                                            ? 'text-[#171717] dark:text-admin-dark-text-primary'
                                            : hasError ? 'text-red-500' : 'text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white'
                                            }`}
                                    >
                                        {tab.label}
                                        {activeTab === tab.id && (
                                            <span className="absolute bottom-0 left-0 w-full h-[3px] bg-[#171717] dark:bg-white rounded-t-full z-10"></span>
                                        )}
                                        {hasError && <span className="ml-1.5 text-red-500 text-[10px] align-top">●</span>}
                                    </button>
                                );
                            })}
                        </div>

                        {isEditing && (
                            <div className="flex flex-wrap items-center gap-3 p-1.5 bg-[#f5f5f5] dark:bg-admin-dark-bg rounded-2xl border border-[#f0f0f0] dark:border-admin-dark-border mb-3 transition-colors">
                                {/* View Selector */}
                                <div className="flex items-center gap-2 px-1.5">
                                    <span className="text-[10px] font-black text-[#a3a3a3] uppercase tracking-wider">{t('magicTranslate.view')}</span>
                                    <div className="flex gap-1">
                                        {languages.map((lang) => (
                                            <button
                                                key={lang.id}
                                                type="button"
                                                onClick={() => setActiveLang(lang.id)}
                                                className={`h-7 px-2.5 rounded-lg text-[10px] font-black transition-all flex items-center gap-1.5 ${activeLang === lang.id
                                                    ? 'bg-white dark:bg-admin-dark-surface text-[#171717] dark:text-admin-dark-text-primary shadow-sm'
                                                    : 'text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white'
                                                    }`}
                                            >
                                                <span className="text-xs">{lang.flag}</span>
                                                <span className="hidden sm:inline">{lang.id.toUpperCase()}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                            </div>
                        )}
                    </div>
                </div>

                {/* Content Area */}
                <div className="bg-white dark:bg-admin-dark-surface rounded-2xl border border-[#eaeaea] dark:border-admin-dark-border p-8 min-h-[500px] shadow-sm transition-colors duration-300">
                    <div>
                        {activeTab === 'basic' && (
                            <BasicInfoTab
                                mode={effectiveMode}
                                activeLang={activeLang}
                                dir={languages.find(l => l.id === activeLang)?.dir as 'ltr' | 'rtl'}
                            />
                        )}
                        {activeTab === 'location' && <LocationTab activeLang={activeLang} />}
                        {activeTab === 'media' && <MediaTab />}
                        {activeTab === 'hierarchy' && initialData?.id && (
                            <HierarchyTab propertyId={initialData.id as string} />
                        )}
                        {activeTab === 'hierarchy' && !initialData?.id && (
                            <div className="flex flex-col items-center justify-center py-20 bg-[#fafafa] dark:bg-admin-dark-bg rounded-2xl border-2 border-dashed border-[#eaeaea] dark:border-admin-dark-border">
                                <div className="size-16 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-500 dark:text-amber-400 flex items-center justify-center mb-4">
                                    <Save className="size-8" />
                                </div>
                                <h4 className="text-[17px] font-bold text-[#171717] dark:text-admin-dark-text-primary">
                                    {t('system.saveFirstTitle', { fallback: 'Save Building First' })}
                                </h4>
                                <p className="text-sm text-[#a3a3a3] mt-2 text-center max-w-md">
                                    {t('system.saveFirstDesc', { fallback: 'Before you can view or add units to this building, please fill in the basic information and save it.' })}
                                </p>
                            </div>
                        )}
                        {activeTab === 'units' && (
                            <RoomsTab
                                activeLang={activeLang}
                                dir={languages.find(l => l.id === activeLang)?.dir as 'ltr' | 'rtl'}
                            />
                        )}
                        {activeTab === 'amenities' && (
                            <AmenitiesTab
                                activeLang={activeLang}
                                dir={languages.find(l => l.id === activeLang)?.dir as 'ltr' | 'rtl'}
                            />
                        )}

                        {activeTab === 'policies' && (
                            <PoliciesTab
                                activeLang={activeLang}
                                dir={languages.find(l => l.id === activeLang)?.dir as 'ltr' | 'rtl'}
                            />
                        )}

                        {activeTab === 'pricing' && <PricingAvailabilityTab />}

                        {activeTab === 'sync' && <SyncTab propertyId={initialData?.id as string | undefined} />}

                        {activeTab === 'history' && initialData?.id && (
                            <div className="max-w-3xl">
                                <h3 className="text-lg font-bold mb-6 text-gray-900 dark:text-gray-100">{t('system.auditLog')}</h3>
                                <ActivityTimeline
                                    resourceType="PROPERTY"
                                    resourceId={initialData.id as string}
                                    limit={50}
                                />
                            </div>
                        )}

                        {!['basic', 'location', 'media', 'units', 'amenities', 'policies', 'pricing', 'history', 'hierarchy', 'sync'].includes(activeTab) && (
                            <div className="flex flex-col items-center justify-center h-64 text-[#a3a3a3]">
                                <p className="text-lg font-bold dark:text-admin-dark-text-primary">
                                    {t('system.comingSoon', { tab: tabs.find(t => t.id === activeTab)?.label ?? "" })}
                                </p>
                                <p className="text-sm mt-2">{t('system.nextUpdate')}</p>
                            </div>
                        )}
                    </div>
                </div>
            </form>

            <StatusModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                type={modalConfig.type}
                title={modalConfig.title}
                message={modalConfig.message}
                actionLabel={modalConfig.actionLabel}
                onAction={modalConfig.onAction}
                cancelLabel={modalConfig.cancelLabel}
            />

        </FormProvider>
    );
}
