"use client";

import { useTranslations } from 'next-intl';
import { useEffect, useState, use } from 'react';
import { getOwnersWithPropertyCounts, getCurrentUserRole } from '@/app/actions/user';
import { Loader2, Plus, Search, Building2, User, Phone, Mail, ArrowRight, Home } from 'lucide-react';
import Link from 'next/link';
import { InviteUserModal } from '@/components/admin/users/InviteUserModal';
import { AppRole } from '@/lib/types';
import { toast } from 'sonner';

interface OwnerWithCount {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    created_at: string;
    property_count: number;
    buildings_count: number;
    units_count: number;
}

export default function AdminOwnersPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = use(params);
    const t = useTranslations('AdminUsers.AdminOwners');
    const [owners, setOwners] = useState<OwnerWithCount[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [currentUserRole, setCurrentUserRole] = useState<AppRole | null>(null);

    const fetchOwners = async () => {
        try {
            const [ownersData, role] = await Promise.all([
                getOwnersWithPropertyCounts(),
                getCurrentUserRole()
            ]);
            setOwners(ownersData);
            if (role) setCurrentUserRole(role as AppRole);
        } catch (error) {
            console.error('Failed to fetch owners', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOwners();
    }, []);

    const filteredOwners = owners.filter(owner =>
        (owner.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (owner.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-playfair font-bold text-[#171717] dark:text-admin-dark-text-primary">
                        {t('title')}
                    </h1>
                    <p className="text-[#a3a3a3] mt-1">{t('subtitle')}</p>
                </div>

                <div className="flex flex-col items-end gap-3 w-full md:w-auto">
                    {/* Search */}
                    <div className="relative w-full md:w-auto min-w-[300px]">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-[#a3a3a3]" />
                        <input
                            type="text"
                            placeholder={t('searchPlaceholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white dark:bg-admin-dark-surface border border-[#f5f5f5] dark:border-admin-dark-border rounded-xl pl-11 pr-4 py-3 text-sm focus:border-[#171717] dark:focus:border-white transition-all outline-none"
                        />
                    </div>

                    <button
                        onClick={() => setIsInviteModalOpen(true)}
                        className="bg-[#171717] dark:bg-white text-white dark:text-[#171717] px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-black/90 dark:hover:bg-white/90 transition-colors shadow-sm inline-flex items-center gap-2"
                    >
                        <Plus className="size-4" />
                        {t('addOwner')}
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="bg-white dark:bg-admin-dark-surface rounded-2xl border border-[#f5f5f5] dark:border-admin-dark-border shadow-sm overflow-hidden">
                {loading ? (
                    <div className="py-20 flex justify-center">
                        <Loader2 className="size-8 animate-spin text-[#a3a3a3]" />
                    </div>
                ) : filteredOwners.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-center px-4">
                        <div className="size-16 bg-[#fafafa] dark:bg-admin-dark-bg rounded-full flex items-center justify-center mb-4">
                            <User className="size-8 text-[#a3a3a3]" />
                        </div>
                        <h3 className="text-lg font-bold text-[#171717] dark:text-admin-dark-text-primary mb-1">
                            {searchTerm ? t('noResultsTitle') : t('emptyTitle')}
                        </h3>
                        <p className="text-[#a3a3a3] text-sm max-w-sm mb-6">
                            {searchTerm ? t('noResultsDesc') : t('emptyDesc')}
                        </p>
                        {!searchTerm && (
                            <button
                                onClick={() => setIsInviteModalOpen(true)}
                                className="bg-[#171717] dark:bg-white text-white dark:text-[#171717] px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-black/90 dark:hover:bg-white/90 transition-colors shadow-sm inline-flex items-center gap-2"
                            >
                                <Plus className="size-4" />
                                {t('createOwner')}
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[#fafafa] dark:bg-admin-dark-bg border-b border-[#f5f5f5] dark:border-admin-dark-border">
                                <tr>
                                    <th className="text-left py-4 px-6 text-[10px] font-bold text-[#a3a3a3] uppercase tracking-wider">{t('columns.owner')}</th>
                                    <th className="text-left py-4 px-6 text-[10px] font-bold text-[#a3a3a3] uppercase tracking-wider">{t('columns.contact')}</th>
                                    <th className="text-center py-4 px-6 text-[10px] font-bold text-[#a3a3a3] uppercase tracking-wider">{t('columns.properties')}</th>
                                    <th className="text-right py-4 px-6 text-[10px] font-bold text-[#a3a3a3] uppercase tracking-wider">{t('columns.actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#f5f5f5] dark:divide-admin-dark-border">
                                {filteredOwners.map((owner) => (
                                    <tr key={owner.id} className="group hover:bg-[#fafafa] dark:hover:bg-admin-dark-bg transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="size-10 rounded-full bg-[#171717] text-white flex items-center justify-center font-bold text-sm">
                                                    {(owner.full_name || owner.email || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-[#171717] dark:text-admin-dark-text-primary text-sm">
                                                        {owner.full_name || t('unnamed')}
                                                    </p>
                                                    <p className="text-xs text-[#a3a3a3]">
                                                        {owner.created_at && !isNaN(new Date(owner.created_at).getTime())
                                                            ? new Date(owner.created_at).toLocaleDateString()
                                                            : 'N/A'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-xs text-[#a3a3a3]">
                                                    <Mail className="size-3" />
                                                    {owner.email}
                                                </div>
                                                {owner.phone && (
                                                    <div className="flex items-center gap-2 text-xs text-[#a3a3a3]">
                                                        <Phone className="size-3" />
                                                        {owner.phone}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {owner.buildings_count > 0 && (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20" title="Buildings">
                                                        <Building2 className="size-3" />
                                                        {owner.buildings_count}
                                                    </span>
                                                )}
                                                {owner.units_count > 0 && (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20" title="Properties">
                                                        <Home className="size-3" />
                                                        {owner.units_count}
                                                    </span>
                                                )}
                                                {owner.property_count === 0 && (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-gray-50 dark:bg-admin-dark-bg text-gray-400 dark:text-gray-500 border border-gray-100 dark:border-admin-dark-border">
                                                        <Home className="size-3" />
                                                        0
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <Link
                                                href={`/${locale}/admin/owners/${owner.id}`}
                                                className="inline-flex items-center gap-2 text-xs font-bold text-[#171717] dark:text-admin-dark-text-primary hover:underline"
                                            >
                                                {t('actions.manage')}
                                                <ArrowRight className="size-3" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            {/* Modal */}
            <InviteUserModal
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
                onSuccess={fetchOwners}
                currentUserRole={currentUserRole || 'user'}
                initialRole="owner"
                allowedRoles={['owner']}
            />
        </div >
    );
}
