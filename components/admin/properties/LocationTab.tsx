"use client";

import { useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";
import { FormInput } from "@/components/admin/ui/FormInput";
import { FormSelect } from "@/components/admin/ui/FormSelect";
import { PropertyFormData } from "./PropertyFormSchema";
import NearbyPlacesManager from "./NearbyPlacesManager";
import { MapPin } from "lucide-react";

interface LocationTabProps {
    activeLang: string;
}

export default function LocationTab({ activeLang }: LocationTabProps) {
    const t = useTranslations('PropertyEditor');
    const { register, formState: { errors } } = useFormContext<PropertyFormData>();

    return (
        <div className="space-y-12 animate-in fade-in duration-500">
            {/* Address Info */}
            <div className="space-y-6">
                <div className="flex items-center gap-2 mb-2">
                    <MapPin className="size-5 text-[#171717] dark:text-admin-dark-text-primary" />
                    <h3 className="text-lg font-bold text-[#171717] dark:text-admin-dark-text-primary">
                        {t('location.addressTitle')}
                    </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormInput
                        label={t('location.streetAddress')}
                        placeholder="e.g. Rua de Cedofeita, 123"
                        {...register("address")}
                        error={errors.address?.message}
                    />
                    <FormSelect
                        label={t('location.cityRegion')}
                        {...register("city")}
                        options={[
                            { label: "Porto", value: "Porto" },
                            { label: "Gaia", value: "Gaia" },
                            { label: "Lisboa", value: "Lisboa" },
                            { label: "Algarve", value: "Algarve" },
                            { label: "Mykonos", value: "Mykonos" },
                        ]}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-[#fafafa] dark:bg-admin-dark-bg rounded-xl border border-[#f5f5f5] dark:border-admin-dark-border transition-colors">
                    <div>
                        <FormInput
                            label={t('location.latitude')}
                            placeholder="e.g. 41.1579"
                            type="text"
                            {...register("lat")}
                            error={errors.lat?.message}
                        />
                    </div>
                    <div>
                        <FormInput
                            label={t('location.longitude')}
                            placeholder="e.g. -8.6291"
                            type="text"
                            {...register("lng")}
                            error={errors.lng?.message}
                        />
                    </div>
                    <p className="col-span-1 md:col-span-2 text-[10px] text-[#a3a3a3] font-medium uppercase tracking-wider">
                        {t('location.coordinatesDesc')}
                    </p>
                </div>
            </div>

            <hr className="border-[#f5f5f5] dark:border-admin-dark-border transition-colors" />

            {/* Nearby Places Section */}
            <NearbyPlacesManager activeLang={activeLang} />
        </div>
    );
}
