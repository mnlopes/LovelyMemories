"use client";

import { Ticket, Plus, Trash2, Power, PowerOff, Calendar, Percent, Euro, Search, MoreHorizontal } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getCoupons, saveCoupon, deleteCoupon, toggleCouponActive } from "@/app/actions/coupons";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import DeleteConfirmModal from "@/components/admin/ui/DeleteConfirmModal";

export const CouponManager = () => {
    const t = useTranslations('AdminCoupons');
    const [coupons, setCoupons] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [editingCoupon, setEditingCoupon] = useState<any | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchCoupons = async () => {
        setIsLoading(true);
        const result = await getCoupons();
        if (result.success) {
            setCoupons(result.coupons || []);
        } else {
            toast.error(result.error);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchCoupons();
    }, []);

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        const result = await deleteCoupon(deleteTarget);
        setIsDeleting(false);
        if (result.success) {
            toast.success(t('messages.deleteSuccess'));
            setDeleteTarget(null);
            fetchCoupons();
        } else {
            toast.error(result.error);
        }
    };

    const handleToggleActive = async (id: string, currentStatus: boolean) => {
        const result = await toggleCouponActive(id, !currentStatus);
        if (result.success) {
            const statusLabel = !currentStatus ? t('messages.statusActive') : t('messages.statusInactive');
            toast.success(t('messages.statusSuccess', { status: statusLabel }));
            fetchCoupons();
        } else {
            toast.error(result.error);
        }
    };

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = {
            id: editingCoupon?.id,
            code: formData.get('code') as string,
            discount_type: formData.get('discount_type') as string,
            discount_value: parseFloat(formData.get('discount_value') as string),
            max_uses: formData.get('max_uses') ? parseInt(formData.get('max_uses') as string) : null,
            expires_at: formData.get('expires_at') ? new Date(formData.get('expires_at') as string).toISOString() : null,
            active: editingCoupon ? editingCoupon.active : true
        };

        const result = await saveCoupon(data);
        if (result.success) {
            toast.success(editingCoupon ? t('messages.updateSuccess') : t('messages.createSuccess'));
            setIsModalOpen(false);
            setEditingCoupon(null);
            fetchCoupons();
        } else {
            toast.error(result.error);
        }
    };

    const filteredCoupons = coupons.filter(c => 
        c.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="relative w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder={t('searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-admin-dark-surface border border-gray-200 dark:border-admin-dark-border rounded-lg text-sm focus:ring-2 focus:ring-admin-accent outline-none"
                    />
                </div>
                <button 
                    onClick={() => { setEditingCoupon(null); setIsModalOpen(true); }}
                    className="flex items-center gap-2 bg-admin-accent hover:bg-admin-accent/90 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm"
                >
                    <Plus className="size-4" />
                    {t('newButton')}
                </button>
            </div>

            <div className="bg-white dark:bg-admin-dark-surface border border-gray-200 dark:border-admin-dark-border rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-50 dark:bg-admin-dark-bg/50 border-b border-gray-200 dark:border-admin-dark-border">
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{t('table.code')}</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{t('table.discount')}</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{t('table.uses')}</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{t('table.expiration')}</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{t('table.status')}</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">{t('table.actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-admin-dark-border">
                        {isLoading ? (
                            <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-500 italic">{t('table.loading')}</td></tr>
                        ) : filteredCoupons.length === 0 ? (
                            <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-500">{t('table.empty')}</td></tr>
                        ) : filteredCoupons.map((coupon) => (
                            <tr key={coupon.id} className="hover:bg-gray-50 dark:hover:bg-admin-dark-bg/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="size-8 rounded-lg bg-admin-accent/10 flex items-center justify-center text-admin-accent">
                                            <Ticket className="size-4" />
                                        </div>
                                        <span className="font-bold text-gray-900 dark:text-white uppercase tracking-wider">{coupon.code}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-300">
                                        {coupon.discount_type === 'percentage' ? (
                                            <><Percent className="size-3 text-emerald-500" /> {coupon.discount_value}%</>
                                        ) : (
                                            <><Euro className="size-3 text-blue-500" /> {coupon.discount_value}€</>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                    {coupon.used_count} / {coupon.max_uses || '∞'}
                                </td>
                                <td className="px-6 py-4 text-sm">
                                    {coupon.expires_at ? (
                                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                            <Calendar className="size-3" />
                                            {format(new Date(coupon.expires_at), 'dd/MM/yyyy')}
                                        </div>
                                    ) : (
                                        <span className="text-gray-400">{t('table.noExpiration')}</span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={cn(
                                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                        coupon.active 
                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                                            : "bg-gray-100 text-gray-600 border border-gray-200"
                                    )}>
                                        {coupon.active ? t('table.active') : t('table.inactive')}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button 
                                            onClick={() => handleToggleActive(coupon.id, coupon.active)}
                                            className={cn(
                                                "p-1.5 rounded-lg transition-colors",
                                                coupon.active ? "text-amber-600 hover:bg-amber-50" : "text-emerald-600 hover:bg-emerald-50"
                                            )}
                                            title={coupon.active ? t('modal.cancel') : t('table.active')}
                                        >
                                            {coupon.active ? <PowerOff className="size-4" /> : <Power className="size-4" />}
                                        </button>
                                        <button 
                                            onClick={() => { setEditingCoupon(coupon); setIsModalOpen(true); }}
                                            className="p-1.5 text-gray-400 hover:text-admin-accent hover:bg-admin-bg rounded-lg transition-colors"
                                        >
                                            <Search className="size-4" />
                                        </button>
                                        <button
                                            onClick={() => setDeleteTarget(coupon.id)}
                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="size-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-admin-dark-surface w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-admin-dark-border flex justify-between items-center bg-gray-50/50">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                {editingCoupon ? t('modal.editTitle') : t('modal.newTitle')}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-900 transition-colors">
                                <Plus className="size-5 rotate-45" />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('modal.codeLabel')}</label>
                                <input 
                                    name="code"
                                    defaultValue={editingCoupon?.code}
                                    placeholder={t('modal.codePlaceholder')}
                                    required
                                    className="w-full px-4 py-2 border border-gray-200 dark:border-admin-dark-border rounded-lg text-sm bg-white dark:bg-admin-dark-bg focus:ring-2 focus:ring-admin-accent outline-none uppercase"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('modal.typeLabel')}</label>
                                    <select 
                                        name="discount_type"
                                        defaultValue={editingCoupon?.discount_type || 'percentage'}
                                        required
                                        className="w-full px-4 py-2 border border-gray-200 dark:border-admin-dark-border rounded-lg text-sm bg-white dark:bg-admin-dark-bg focus:ring-2 focus:ring-admin-accent outline-none"
                                    >
                                        <option value="percentage">{t('modal.typePercentage')}</option>
                                        <option value="fixed">{t('modal.typeFixed')}</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('modal.valueLabel')}</label>
                                    <input 
                                        name="discount_value"
                                        type="number"
                                        step="0.01"
                                        defaultValue={editingCoupon?.discount_value}
                                        required
                                        className="w-full px-4 py-2 border border-gray-200 dark:border-admin-dark-border rounded-lg text-sm bg-white dark:bg-admin-dark-bg focus:ring-2 focus:ring-admin-accent outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('modal.maxUsesLabel')}</label>
                                    <input 
                                        name="max_uses"
                                        type="number"
                                        placeholder={t('modal.maxUsesPlaceholder')}
                                        defaultValue={editingCoupon?.max_uses}
                                        className="w-full px-4 py-2 border border-gray-200 dark:border-admin-dark-border rounded-lg text-sm bg-white dark:bg-admin-dark-bg focus:ring-2 focus:ring-admin-accent outline-none"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('modal.expiryLabel')}</label>
                                    <input 
                                        name="expires_at"
                                        type="date"
                                        defaultValue={editingCoupon?.expires_at ? format(new Date(editingCoupon.expires_at), 'yyyy-MM-dd') : ''}
                                        className="w-full px-4 py-2 border border-gray-200 dark:border-admin-dark-border rounded-lg text-sm bg-white dark:bg-admin-dark-bg focus:ring-2 focus:ring-admin-accent outline-none"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button 
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all"
                                >
                                    {t('modal.cancel')}
                                </button>
                                <button 
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-admin-accent text-white rounded-lg text-sm font-bold shadow-md hover:brightness-110 transition-all font-premium"
                                >
                                    {editingCoupon ? t('modal.save') : t('modal.create')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <DeleteConfirmModal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={confirmDelete}
                isLoading={isDeleting}
                title={t('messages.deleteTitle')}
                message={t('messages.deleteConfirm')}
                confirmLabel={t('messages.deleteConfirmCta')}
                cancelLabel={t('modal.cancel')}
            />
        </div>
    );
};
