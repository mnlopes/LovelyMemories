"use client";

import { useForm, FormProvider, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { ArrowLeft, Save, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { PropertyFormData, propertySchema } from "./PropertyFormSchema";
import BasicInfoTab from "./BasicInfoTab";
import LocationTab from "./LocationTab";
import MediaTab from "./MediaTab";
import RoomsTab from "./RoomsTab";
import HierarchyTab from "./HierarchyTab";
import AmenitiesTab from "./AmenitiesTab";
import PoliciesTab from "./PoliciesTab";
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
    const [activeTab, setActiveTab] = useState('basic');
    const [activeLang, setActiveLang] = useState('en');
    const [isSaving, setIsSaving] = useState(false);
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        type: 'success' | 'error' | 'loading';
        title: string;
        message: string;
    }>({
        isOpen: false,
        type: 'loading',
        title: '',
        message: ''
    });

    const languages = [
        { id: 'en', label: 'English', flag: '🇬🇧', dir: 'ltr' },
        { id: 'pt', label: 'Português', flag: '🇵🇹', dir: 'ltr' },
        { id: 'he', label: 'Hebrew', flag: '🇮🇱', dir: 'rtl' },
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
            amenities: initialData?.amenities || [],
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
                    he: "מיטת תינוק וכיסא אוכל זמינים לפי בקשה ללא עלות נוספת."
                }
            }
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
        setIsSaving(true);
        setModalConfig({
            isOpen: true,
            type: 'loading',
            title: 'Gravando...',
            message: 'Estamos a guardar as alterações na base de dados.'
        });

        try {
            const result = await upsertProperty(data);
            if (result.success) {
                setModalConfig({
                    isOpen: true,
                    type: 'success',
                    title: 'Sucesso!',
                    message: result.message || 'Dados guardados com sucesso.'
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
                    title: 'Erro ao Gravar',
                    message: result.error || 'Não foi possível guardar as alterações.'
                });
            }
        } catch (error) {
            console.error("Submit Error:", error);
            setModalConfig({
                isOpen: true,
                type: 'error',
                title: 'Erro Inesperado',
                message: 'Ocorreu um erro no servidor ao tentar gravar.'
            });
        } finally {
            setIsSaving(false);
        }
    };

    const onInvalid = (errors: any) => {
        console.error("❌ Validation Failed:", errors);

        // Log individual field errors for better visibility in user screenshots
        Object.entries(errors).forEach(([field, error]: [string, any]) => {
            console.error(`- Error in ${field}:`, error.message, error.type);
        });

        const errorFields = Object.keys(errors).join(", ");
        setModalConfig({
            isOpen: true,
            type: 'error',
            title: 'Dados Incompletos',
            message: `Por favor, verifica os seguintes campos: [${errorFields}].`
        });
    };

    const tabs = [
        { id: 'media', label: 'Media' },
        { id: 'basic', label: effectiveMode === 'building' ? 'Building Info' : 'Basic Info' },
        { id: 'hierarchy', label: 'Hierarchy', hideForUnits: true },
        { id: 'amenities', label: 'Amenities', hideForBuildings: true },
        { id: 'units', label: 'Rooms & Spaces', hideForBuildings: true },
        { id: 'location', label: 'Location' },
        { id: 'policies', label: 'Policies', hideForBuildings: true },
        { id: 'pricing', label: 'Pricing & Availability', hideForBuildings: true },
        // Only show history if not creating new property
        ...(isEditing ? [{ id: 'history', label: 'History' }] : [])
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
            alert("Slug is required to preview the page.");
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
                            <h1 className="text-2xl font-bold text-[#171717] dark:text-admin-dark-text-primary uppercase tracking-tight">
                                {isEditing ? `Edit ${effectiveMode === 'building' ? 'Building' : 'Property'}` : `Create New ${effectiveMode === 'building' ? 'Building' : 'Property'}`}
                            </h1>
                            <p className="text-[#a3a3a3] text-sm font-medium">
                                {isEditing
                                    ? `Editing ${(initialData?.title as any)?.en || (effectiveMode === 'building' ? 'Building' : 'Property')}`
                                    : `Fill in the details to list a new ${effectiveMode === 'building' ? 'building' : 'home'}.`}
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
                            Preview Page
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="px-6 py-2 bg-[#171717] dark:bg-white text-white dark:text-black rounded-lg text-sm font-bold hover:bg-black dark:hover:bg-gray-200 transition-all flex items-center gap-2 disabled:opacity-50 min-w-[160px] justify-center shadow-lg shadow-black/5"
                        >
                            {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                            {isSaving ? 'Saving...' : `Save ${effectiveMode === 'building' ? 'Building' : 'Property'}`}
                        </button>
                    </div>
                </div>

                {/* Language Switcher & Tabs */}
                <div className="border-b border-[#eaeaea] dark:border-admin-dark-border transition-colors">
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
                                            <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#171717] dark:bg-white rounded-t-full"></span>
                                        )}
                                        {hasError && <span className="ml-1.5 text-red-500 text-[10px] align-top">●</span>}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Language Selector */}
                        <div className="flex items-center gap-2 pb-3">
                            <span className="text-[10px] font-bold text-[#a3a3a3] uppercase tracking-wider mr-2 hidden md:block">Editing in:</span>
                            <div className="flex p-1 bg-[#f5f5f5] dark:bg-admin-dark-bg rounded-xl border border-[#f0f0f0] dark:border-admin-dark-border transition-colors">
                                {languages.map((lang) => (
                                    <button
                                        key={lang.id}
                                        type="button"
                                        onClick={() => setActiveLang(lang.id)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeLang === lang.id
                                            ? 'bg-white dark:bg-admin-dark-surface text-[#171717] dark:text-admin-dark-text-primary shadow-sm'
                                            : 'text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white'
                                            }`}
                                    >
                                        <span>{lang.flag}</span>
                                        <span>{lang.id.toUpperCase()}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
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
                        {activeTab === 'location' && <LocationTab />}
                        {activeTab === 'media' && <MediaTab />}
                        {activeTab === 'hierarchy' && initialData?.id && (
                            <HierarchyTab propertyId={initialData.id as string} />
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

                        {activeTab === 'history' && initialData?.id && (
                            <div className="max-w-3xl">
                                <h3 className="text-lg font-bold mb-6 text-gray-900 dark:text-gray-100">Property Audit Log</h3>
                                <ActivityTimeline
                                    resourceType="PROPERTY"
                                    resourceId={initialData.id as string}
                                    limit={50}
                                />
                            </div>
                        )}

                        {!['basic', 'location', 'media', 'units', 'amenities', 'policies', 'history'].includes(activeTab) && (
                            <div className="flex flex-col items-center justify-center h-64 text-[#a3a3a3]">
                                <p className="text-lg font-bold dark:text-admin-dark-text-primary">Coming Soon: {tabs.find(t => t.id === activeTab)?.label} Editor</p>
                                <p className="text-sm mt-2">This module is part of the next update.</p>
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
            />
        </FormProvider>
    );
}
