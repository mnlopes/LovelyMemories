"use client";

import { useFormContext, useWatch, useFieldArray, Controller } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Euro, Calendar, Trash2, Plus, Info, Percent, Moon, Sparkles, Coffee, Plane } from "lucide-react";
import { PropertyFormData } from "./PropertyFormSchema";
import { useState } from "react";
import { BlockedDatesSheet } from "./BlockedDatesSheet";
import { useParams } from "next/navigation";
import { BlockedDatesList } from "./BlockedDatesList";
import { getUnavailableDates, deleteBlockedDate, BlockedDate, ReservationDate } from "@/app/actions/blocked-dates";
import { useEffect } from "react";
import { toast } from "sonner";

import { StatusModal } from "@/components/admin/ui/StatusModal";

export default function PricingAvailabilityTab() {
    const t = useTranslations('PropertyEditor');
    const { register, control, formState: { errors } } = useFormContext<PropertyFormData>();
    const params = useParams();
    const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
    const [reservations, setReservations] = useState<ReservationDate[]>([]);
    const [isFetching, setIsFetching] = useState(true);
    const [deleteModalConfig, setDeleteModalConfig] = useState<{
        isOpen: boolean;
        blockId: string | null;
    }>({
        isOpen: false,
        blockId: null
    });

    const fetchData = async () => {
        setIsFetching(true);
        const { blockedDates: blocks, reservations: res } = await getUnavailableDates(params.id as string);
        setBlockedDates(blocks);
        setReservations(res);
        setIsFetching(false);
    };

    useEffect(() => {
        if (params.id) {
            fetchData();
        }
    }, [params.id]);

    const handleDeleteBlock = (id: string) => {
        setDeleteModalConfig({
            isOpen: true,
            blockId: id
        });
    };

    const confirmDelete = async () => {
        if (!deleteModalConfig.blockId) return;

        const result = await deleteBlockedDate(deleteModalConfig.blockId);

        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success(t('pricing.blockRemoved'));
            fetchData();
        }

        setDeleteModalConfig({ isOpen: false, blockId: null });
    };

    return (
        <div className="space-y-12 animate-in fade-in duration-500">
            {/* Top Section: Pricing, Discounts & Fees */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-12">

                {/* Column 1: Pricing & Discounts (Financial Strategy) */}
                <div className="flex flex-col space-y-10">
                    {/* Base Pricing Section */}
                    <div className="space-y-6">
                        <h3 className="text-lg font-bold text-[#171717] dark:text-admin-dark-text-primary pb-2 border-b border-[#f5f5f5] dark:border-admin-dark-border flex items-center gap-2">
                            <Euro className="size-4" />
                            {t('pricing.basePricing')}
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-[#a3a3a3] uppercase tracking-wider">
                                    {t('pricing.pricePerNight')}
                                </label>
                                <input
                                    type="number"
                                    {...register("price_per_night")}
                                    className="w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f5f5f5] dark:border-admin-dark-border rounded-xl px-4 py-3 text-[#171717] dark:text-admin-dark-text-primary text-sm focus:bg-white dark:focus:bg-admin-dark-surface focus:border-[#171717] transition-all outline-none"
                                />
                                {errors.price_per_night && <p className="text-xs text-red-500 font-bold">{errors.price_per_night.message}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-[#a3a3a3] uppercase tracking-wider">
                                    {t('pricing.originalPrice')}
                                </label>
                                <input
                                    type="number"
                                    {...register("original_price")}
                                    className="w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f5f5f5] dark:border-admin-dark-border rounded-xl px-4 py-3 text-[#171717] dark:text-admin-dark-text-primary text-sm focus:bg-white dark:focus:bg-admin-dark-surface focus:border-[#171717] transition-all outline-none"
                                />
                                <p className="text-[10px] text-[#a3a3a3]">{t('pricing.optionalSimulate')}</p>
                            </div>
                        </div>
                    </div>

                    {/* Standard Discounts Section */}
                    <div className="space-y-6">
                        <h3 className="text-lg font-bold text-[#171717] dark:text-admin-dark-text-primary pb-2 border-b border-[#f5f5f5] dark:border-admin-dark-border flex items-center gap-2">
                            <Percent className="size-4" />
                            {t('pricing.standardDiscounts')}
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-[#a3a3a3] uppercase tracking-wider">
                                    {t('pricing.weeklyDiscount')}
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        {...register("weekly_discount_percent" as any)}
                                        className="w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f5f5f5] dark:border-admin-dark-border rounded-xl px-4 py-3 text-[#171717] dark:text-admin-dark-text-primary text-sm focus:bg-white transition-all outline-none pl-10"
                                    />
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#a3a3a3] font-bold">%</span>
                                </div>
                                <p className="text-[10px] text-[#a3a3a3]">{t('pricing.weeklyDesc')}</p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-[#a3a3a3] uppercase tracking-wider">
                                    {t('pricing.monthlyDiscount')}
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        {...register("monthly_discount_percent" as any)}
                                        className="w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f5f5f5] dark:border-admin-dark-border rounded-xl px-4 py-3 text-[#171717] dark:text-admin-dark-text-primary text-sm focus:bg-white transition-all outline-none pl-10"
                                    />
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#a3a3a3] font-bold">%</span>
                                </div>
                                <p className="text-[10px] text-[#a3a3a3]">{t('pricing.monthlyDesc')}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Column 2: Mandatory Fees & Rules */}
                <div className="flex flex-col space-y-6 h-full">
                    <h3 className="text-lg font-bold text-[#171717] dark:text-admin-dark-text-primary pb-2 border-b border-[#f5f5f5] dark:border-admin-dark-border flex items-center gap-2">
                        <Info className="size-4" />
                        {t('pricing.feesAndRules')}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-[#a3a3a3] uppercase tracking-wider flex items-center gap-2">
                                <Trash2 className="size-3" />
                                {t('pricing.cleaningFee')}
                            </label>
                            <input
                                type="number"
                                {...register("cleaning_fee" as any)}
                                className="w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f5f5f5] dark:border-admin-dark-border rounded-xl px-4 py-3 text-[#171717] dark:text-admin-dark-text-primary text-sm focus:bg-white dark:focus:bg-admin-dark-surface focus:border-[#171717] transition-all outline-none"
                            />
                            <p className="text-[10px] text-[#a3a3a3]">{t('pricing.cleaningFeeDesc')}</p>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-[#a3a3a3] uppercase tracking-wider flex items-center gap-2">
                                <Moon className="size-3" />
                                {t('pricing.minNights')}
                            </label>
                            <input
                                type="number"
                                {...register("min_nights" as any)}
                                className="w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f5f5f5] dark:border-admin-dark-border rounded-xl px-4 py-3 text-[#171717] dark:text-admin-dark-text-primary text-sm focus:bg-white dark:focus:bg-admin-dark-surface focus:border-[#171717] transition-all outline-none"
                            />
                            <p className="text-[10px] text-[#a3a3a3]">{t('pricing.minNightsDesc')}</p>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[#a3a3a3] uppercase tracking-wider flex items-center gap-2">
                            <Percent className="size-3" />
                            {t('pricing.cityTax')}
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.5"
                                    {...register("city_tax_per_night" as any)}
                                    className="w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f5f5f5] dark:border-admin-dark-border rounded-xl px-4 py-3 text-[#171717] dark:text-admin-dark-text-primary text-sm focus:bg-white dark:focus:bg-admin-dark-surface focus:border-[#171717] transition-all outline-none pl-10"
                                />
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#a3a3a3] font-bold">€</span>
                            </div>
                            <p className="text-[10px] text-[#a3a3a3] flex items-center">{t('pricing.cityTaxDesc')}</p>
                        </div>
                    </div>

                    {/* Visual spacer to align with left column if needed, or just a nice card-like box */}
                    <div className="mt-auto p-6 bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f5f5f5] border-dashed dark:border-admin-dark-border rounded-2xl">
                        <p className="text-[10px] text-[#a3a3a3] italic uppercase tracking-widest font-bold">{t('pricing.noteTitle')}</p>
                        <p className="text-[11px] text-[#a3a3a3] mt-2 leading-relaxed">
                            {t('pricing.noteDesc')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Third Section: Extra Services */}
            <div className="border-t border-[#f5f5f5] dark:border-admin-dark-border pt-12">
                <div className="space-y-8">
                    <h3 className="text-lg font-bold text-[#171717] dark:text-admin-dark-text-primary flex items-center gap-2">
                        <Sparkles className="size-5" />
                        {t('pricing.extraServices')}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Breakfast Service */}
                        <div className="bg-white dark:bg-admin-dark-surface p-6 rounded-2xl border border-[#f5f5f5] dark:border-admin-dark-border space-y-4 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-600">
                                        <Coffee className="size-5" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-[#171717] dark:text-admin-dark-text-primary">{t('pricing.breakfastService')}</p>
                                        <p className="text-[10px] text-[#a3a3a3] uppercase tracking-wider font-bold">{t('pricing.dailyOptional')}</p>
                                    </div>
                                </div>
                                <Controller
                                    control={control}
                                    name="has_breakfast"
                                    render={({ field }) => (
                                        <button
                                            type="button"
                                            onClick={() => field.onChange(!field.value)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${field.value ? 'bg-[#171717] dark:bg-admin-dark-accent' : 'bg-[#e5e5e5] dark:bg-admin-dark-bg'}`}
                                        >
                                            <span className={`inline-block size-4 transform rounded-full bg-white transition-transform ${field.value ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    )}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-[#a3a3a3] uppercase tracking-wider">{t('pricing.pricePerPerson')}</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        {...register("breakfast_price")}
                                        className="w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f5f5f5] dark:border-admin-dark-border rounded-xl px-4 py-3 text-[#171717] dark:text-admin-dark-text-primary text-sm focus:bg-white transition-all outline-none pl-10"
                                    />
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#a3a3a3] font-bold">€</span>
                                </div>
                            </div>
                        </div>

                        {/* Airport Transfer */}
                        <div className="bg-white dark:bg-admin-dark-surface p-6 rounded-2xl border border-[#f5f5f5] dark:border-admin-dark-border space-y-4 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600">
                                        <Plane className="size-5" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-[#171717] dark:text-admin-dark-text-primary">{t('pricing.airportTransfer')}</p>
                                        <p className="text-[10px] text-[#a3a3a3] uppercase tracking-wider font-bold">{t('pricing.oneWayService')}</p>
                                    </div>
                                </div>
                                <Controller
                                    control={control}
                                    name="has_transfer"
                                    render={({ field }) => (
                                        <button
                                            type="button"
                                            onClick={() => field.onChange(!field.value)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${field.value ? 'bg-[#171717] dark:bg-admin-dark-accent' : 'bg-[#e5e5e5] dark:bg-admin-dark-bg'}`}
                                        >
                                            <span className={`inline-block size-4 transform rounded-full bg-white transition-transform ${field.value ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    )}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-[#a3a3a3] uppercase tracking-wider">{t('pricing.pricePerWay')}</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        {...register("transfer_price")}
                                        className="w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f5f5f5] dark:border-admin-dark-border rounded-xl px-4 py-3 text-[#171717] dark:text-admin-dark-text-primary text-sm focus:bg-white transition-all outline-none pl-10"
                                    />
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#a3a3a3] font-bold">€</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Section: Manual Blocking */}
            <div className="border-t border-[#f5f5f5] dark:border-admin-dark-border pt-12">
                <div className="space-y-8 max-w-2xl">
                    <h3 className="text-lg font-bold text-[#171717] dark:text-admin-dark-text-primary flex items-center gap-2">
                        <Calendar className="size-5" />
                        {t('pricing.manualBlocking')}
                    </h3>

                    <div className="p-8 bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f5f5f5] dark:border-admin-dark-border rounded-3xl flex flex-col space-y-8">
                        <div className="flex flex-col items-center justify-center text-center space-y-4">
                            <div className="size-12 rounded-2xl bg-white dark:bg-admin-dark-surface border border-[#f5f5f5] dark:border-admin-dark-border flex items-center justify-center shadow-sm">
                                <Calendar className="size-6 text-[#a3a3a3]" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-[#171717] dark:text-admin-dark-text-primary tracking-tight">{t('pricing.advancedManagement')}</p>
                                <p className="text-xs text-[#a3a3a3] mt-1 max-w-[240px] leading-relaxed mx-auto">
                                    {t('pricing.advancedDesc')}
                                </p>
                            </div>
                            <BlockedDatesSheet
                                propertyId={params.id as string}
                                blockedDates={blockedDates}
                                reservations={reservations}
                                onUpdate={fetchData}
                            />
                        </div>

                        {/* Active Blocks List */}
                        <div className="pt-8 border-t border-[#f5f5f5] dark:border-admin-dark-border w-full">
                            <h4 className="text-sm font-bold text-[#171717] dark:text-admin-dark-text-primary uppercase tracking-wider mb-4">
                                {t('pricing.activeBlocks')}
                            </h4>
                            <BlockedDatesList
                                blockedDates={blockedDates}
                                isLoading={isFetching}
                                onDelete={handleDeleteBlock}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <StatusModal
                isOpen={deleteModalConfig.isOpen}
                onClose={() => setDeleteModalConfig({ isOpen: false, blockId: null })}
                type="warning"
                title={t('pricing.removeBlockTitle')}
                message={t('pricing.removeBlockConfirm')}
                actionLabel={t('pricing.removeBlockAction')}
                onAction={confirmDelete}
            />
        </div>
    );
}
