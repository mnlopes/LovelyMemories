import { useFieldArray, useFormContext } from "react-hook-form";
import { Plus, Trash2, Clock, Info, ShieldCheck, Ban, CheckCircle2, XCircle, Sparkles } from "lucide-react";
import { PropertyFormData } from "./PropertyFormSchema";
import { useState } from "react";

interface PoliciesTabProps {
    activeLang: string;
    dir: 'ltr' | 'rtl';
}

export default function PoliciesTab({ activeLang, dir }: PoliciesTabProps) {
    const { control, register, watch, getValues, setValue } = useFormContext<PropertyFormData>();

    // Home Truths
    const { fields: truthFields, append: appendTruth, remove: removeTruth, update: updateTruth } = useFieldArray({
        control,
        name: "home_truths",
    });

    // House Rules: Custom
    const { fields: customFields, append: appendCustom, remove: removeCustom } = useFieldArray({
        control,
        name: "house_rules.custom" as any,
    });

    const removedRules = watch("house_rules.removed_rules") || [];

    const removeStandardRule = (fieldName: string) => {
        const current = getValues("house_rules.removed_rules") || [];
        if (!current.includes(fieldName)) {
            setValue("house_rules.removed_rules", [...current, fieldName], { shouldDirty: true });
        }
    };

    const standardRules = [
        { id: 'childrenAllowed', label: "Children Allowed", name: "house_rules.childrenAllowed" },
        { id: 'infantsAllowed', label: "Infants Allowed", name: "house_rules.infantsAllowed" },
        { id: 'petsAllowed', label: "Pets Allowed", name: "house_rules.petsAllowed" },
        { id: 'partiesAllowed', label: "Parties/Events Allowed", name: "house_rules.partiesAllowed" },
        { id: 'smokingAllowed', label: "Smoking Allowed", name: "house_rules.smokingAllowed" },
    ];

    const [newTruth, setNewTruth] = useState("");

    const addTruth = () => {
        if (!newTruth.trim()) return;

        // Add as Localized Object
        const payload = { en: "", pt: "", he: "" };
        (payload as any)[activeLang] = newTruth.trim();

        appendTruth(payload);
        setNewTruth("");
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Left Column: Rules & Times */}
            <div className="space-y-8">
                {/* House Rules Section */}
                <div className="bg-white dark:bg-admin-dark-surface rounded-[32px] border border-[#eaeaea] dark:border-admin-dark-border p-8 shadow-sm space-y-6 transition-colors">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-2xl bg-[#fafafa] dark:bg-admin-dark-bg flex items-center justify-center text-[#171717] dark:text-admin-dark-text-primary border border-[#f5f5f5] dark:border-admin-dark-border">
                                <ShieldCheck className="size-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-[#171717] dark:text-admin-dark-text-primary">House Rules</h3>
                                <p className="text-xs text-[#a3a3a3] dark:text-admin-dark-text-secondary uppercase tracking-wider font-bold">What is allowed?</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => appendCustom({ label: { en: "", pt: "", he: "" }, allowed: true })}
                            className="p-2 bg-[#171717] dark:bg-white text-white dark:text-black rounded-lg hover:bg-black dark:hover:bg-gray-200 transition-all shadow-sm"
                        >
                            <Plus className="size-4" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {standardRules.filter(r => !removedRules.includes(r.id)).map(rule => (
                            <RuleToggle
                                key={rule.id}
                                label={rule.label}
                                name={rule.name}
                                register={register}
                                watch={watch}
                                onRemove={() => removeStandardRule(rule.id)}
                            />
                        ))}

                        {/* Custom Rules */}
                        {customFields.map((field, index) => (
                            <DynamicRuleToggle
                                key={field.id}
                                index={index}
                                activeLang={activeLang}
                                dir={dir}
                                register={register}
                                watch={watch}
                                onRemove={() => removeCustom(index)}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Column: Cancellation */}
            <div className="space-y-8">
                {/* Cancellation Policy */}
                <div className="bg-white dark:bg-admin-dark-surface rounded-[32px] border border-[#eaeaea] dark:border-admin-dark-border p-8 shadow-sm space-y-6 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-2xl bg-[#fafafa] dark:bg-admin-dark-bg flex items-center justify-center text-[#171717] dark:text-admin-dark-text-primary border border-[#f5f5f5] dark:border-admin-dark-border">
                            <Ban className="size-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-[#171717] dark:text-admin-dark-text-primary">Cancellation</h3>
                            <p className="text-xs text-[#a3a3a3] dark:text-admin-dark-text-secondary uppercase tracking-wider font-bold">Refund Policy ({activeLang.toUpperCase()})</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-[#a3a3a3] dark:text-admin-dark-text-secondary uppercase tracking-wider">Policy Title</label>
                            {(() => {
                                const val = getValues('cancellation.text');
                                const isString = typeof val === 'string';
                                const displayVal = isString && val === '[object Object]' ? 'Moderate' : val;

                                if (isString) {
                                    return (
                                        <div className="flex">
                                            <input
                                                {...register("cancellation.text")}
                                                value={displayVal as string}
                                                className="w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f5f5f5] dark:border-admin-dark-border rounded-xl px-4 py-3 text-[#171717] dark:text-admin-dark-text-primary text-sm opacity-70"
                                                readOnly
                                            />
                                            <button
                                                type="button"
                                                className="ml-2 p-2 bg-gray-100 dark:bg-admin-dark-bg rounded-lg hover:bg-gray-200 dark:hover:bg-admin-dark-surface text-gray-500 dark:text-admin-dark-text-secondary transition-colors"
                                                onClick={() => {
                                                    const valToSet = displayVal as string;
                                                    setValue('cancellation.text', { en: valToSet, pt: valToSet, he: valToSet });
                                                }}
                                            >
                                                <Sparkles className="size-4" />
                                            </button>
                                        </div>
                                    );
                                } else {
                                    return (
                                        <input
                                            {...register(`cancellation.text.${activeLang}` as any)}
                                            dir={dir}
                                            placeholder="e.g. Moderate"
                                            className={`w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f5f5f5] dark:border-admin-dark-border rounded-xl px-4 py-3 text-[#171717] dark:text-admin-dark-text-primary text-sm focus:border-[#171717] dark:focus:border-white outline-none transition-all ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
                                        />
                                    );
                                }
                            })()}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-[#a3a3a3] dark:text-admin-dark-text-secondary uppercase tracking-wider">Refund Details</label>
                                {(() => {
                                    const val = getValues('cancellation.refundText');
                                    const isString = typeof val === 'string';
                                    const displayVal = isString && val === '[object Object]' ? '50% refund' : val;

                                    if (isString) {
                                        return (
                                            <div className="flex">
                                                <input
                                                    {...register("cancellation.refundText")}
                                                    value={displayVal as string}
                                                    className="w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f5f5f5] dark:border-admin-dark-border rounded-xl px-4 py-3 text-[#171717] dark:text-admin-dark-text-primary text-sm opacity-70"
                                                    readOnly
                                                />
                                                <button
                                                    type="button"
                                                    className="ml-2 p-2 bg-gray-100 dark:bg-admin-dark-bg rounded-lg hover:bg-gray-200 dark:hover:bg-admin-dark-surface text-gray-500 dark:text-admin-dark-text-secondary transition-colors"
                                                    onClick={() => {
                                                        const valToSet = displayVal as string;
                                                        setValue('cancellation.refundText', { en: valToSet, pt: valToSet, he: valToSet });
                                                    }}
                                                >
                                                    <Sparkles className="size-4" />
                                                </button>
                                            </div>
                                        );
                                    } else {
                                        return (
                                            <input
                                                {...register(`cancellation.refundText.${activeLang}` as any)}
                                                dir={dir}
                                                placeholder="e.g. 50% refund"
                                                className={`w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f5f5f5] dark:border-admin-dark-border rounded-xl px-4 py-3 text-[#171717] dark:text-admin-dark-text-primary text-sm focus:border-[#171717] dark:focus:border-white outline-none transition-all ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
                                            />
                                        );
                                    }
                                })()}
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-[#a3a3a3] dark:text-admin-dark-text-secondary uppercase tracking-wider">Deadline</label>
                                {(() => {
                                    const val = getValues('cancellation.deadline');
                                    const isString = typeof val === 'string';
                                    const displayVal = isString && val === '[object Object]' ? '7 days' : val;

                                    if (isString) {
                                        return (
                                            <div className="flex">
                                                <input
                                                    {...register("cancellation.deadline")}
                                                    value={displayVal as string}
                                                    className="w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f5f5f5] dark:border-admin-dark-border rounded-xl px-4 py-3 text-[#171717] dark:text-admin-dark-text-primary text-sm opacity-70"
                                                    readOnly
                                                />
                                                <button
                                                    type="button"
                                                    className="ml-2 p-2 bg-gray-100 dark:bg-admin-dark-bg rounded-lg hover:bg-gray-200 dark:hover:bg-admin-dark-surface text-gray-500 dark:text-admin-dark-text-secondary transition-colors"
                                                    onClick={() => {
                                                        const valToSet = displayVal as string;
                                                        setValue('cancellation.deadline', { en: valToSet, pt: valToSet, he: valToSet });
                                                    }}
                                                >
                                                    <Sparkles className="size-4" />
                                                </button>
                                            </div>
                                        );
                                    } else {
                                        return (
                                            <input
                                                {...register(`cancellation.deadline.${activeLang}` as any)}
                                                dir={dir}
                                                placeholder="e.g. 7 days"
                                                className={`w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f5f5f5] dark:border-admin-dark-border rounded-xl px-4 py-3 text-[#171717] dark:text-admin-dark-text-primary text-sm focus:border-[#171717] dark:focus:border-white outline-none transition-all ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
                                            />
                                        );
                                    }
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function RuleToggle({ label, name, register, watch, onRemove }: { label: string, name: any, register: any, watch: any, onRemove: () => void }) {
    const value = watch(name);
    return (
        <div className="relative group">
            <button
                type="button"
                onClick={onRemove}
                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-sm z-10"
            >
                <Trash2 className="size-3" />
            </button>
            <label className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${value ? 'bg-[#171717]/[0.02] dark:bg-[#B08D4A]/5 border-[#171717] dark:border-[#B08D4A] text-[#171717] dark:text-[#B08D4A]' : 'bg-white dark:bg-admin-dark-surface border-[#eaeaea] dark:border-admin-dark-border text-[#a3a3a3]'}`}>
                <div className="flex items-center gap-3">
                    {value ? <CheckCircle2 className="size-4 text-[#171717] dark:text-[#B08D4A]" /> : <XCircle className="size-4 opacity-20" />}
                    <span className="text-sm font-bold">{label}</span>
                </div>
                <input type="checkbox" {...register(name)} className="hidden" />
                <div className={`w-10 h-6 rounded-full relative transition-all ${value ? 'bg-[#171717] dark:bg-[#B08D4A]' : 'bg-[#f5f5f5] dark:bg-admin-dark-bg'}`}>
                    <div className={`absolute top-1 size-4 rounded-full bg-white dark:bg-admin-dark-surface shadow-sm transition-all ${value ? 'left-5' : 'left-1'}`} />
                </div>
            </label>
        </div>
    );
}

function DynamicRuleToggle({ index, activeLang, dir, register, watch, onRemove }: { index: number, activeLang: string, dir: string, register: any, watch: any, onRemove: () => void }) {
    const name = `house_rules.custom.${index}.allowed`;
    const value = watch(name);
    return (
        <div className={`flex items-center justify-between p-4 rounded-2xl border transition-all relative group ${value ? 'bg-[#171717]/[0.02] dark:bg-[#B08D4A]/5 border-[#171717] dark:border-[#B08D4A] text-[#171717] dark:text-[#B08D4A]' : 'bg-white dark:bg-admin-dark-surface border-[#eaeaea] dark:border-admin-dark-border text-[#a3a3a3]'}`}>
            <button
                type="button"
                onClick={onRemove}
                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-sm z-10"
            >
                <Trash2 className="size-3" />
            </button>
            <div className="flex items-center gap-3 flex-1">
                {value ? <CheckCircle2 className="size-4 text-[#171717] dark:text-[#B08D4A]" /> : <XCircle className="size-4 opacity-20" />}
                <input
                    {...register(`house_rules.custom.${index}.label.${activeLang}` as any)}
                    dir={dir}
                    placeholder="New Rule..."
                    className="bg-transparent border-none p-0 text-sm font-bold focus:ring-0 outline-none w-full placeholder:text-[#a3a3a3] dark:placeholder:text-admin-dark-text-secondary"
                />
            </div>
            <div className="flex items-center ml-4">
                <input type="checkbox" {...register(name)} className="hidden" id={`custom-${index}`} />
                <label htmlFor={`custom-${index}`} className={`w-10 h-6 rounded-full relative transition-all cursor-pointer ${value ? 'bg-[#171717] dark:bg-[#B08D4A]' : 'bg-[#f5f5f5] dark:bg-admin-dark-bg'}`}>
                    <div className={`absolute top-1 size-4 rounded-full bg-white dark:bg-admin-dark-surface shadow-sm transition-all ${value ? 'left-5' : 'left-1'}`} />
                </label>
            </div>
        </div>
    );
}
