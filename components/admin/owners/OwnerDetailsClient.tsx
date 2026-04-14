"use client";

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { getOwnerWithProperties } from '@/app/actions/user';
import { removePropertyFromOwner } from '@/app/actions/property';
import { Loader2, ArrowLeft, Home, MapPin, Trash2, Plus, Eye, ExternalLink, Building2 } from 'lucide-react';
import { startImpersonation } from '@/app/actions/impersonation';
import Link from 'next/link';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { AssignPropertyModal } from '@/components/admin/owners/AssignPropertyModal';
import { StatusModal } from '@/components/admin/ui/StatusModal';
import { EditUserSidebar } from '@/components/admin/users/EditUserSidebar';
import { Pencil } from 'lucide-react';
import { Profile, AppRole } from '@/lib/types';

interface Property {
    id: string;
    title: any;
    slug: string;
    address: string;
    city?: string;
    owner_id: string | null;
    images?: any[];
    status?: string;
    is_active?: boolean;
    is_multi_unit?: boolean;
    type?: string;
    bedrooms?: number;
    max_guests?: number;
    price_per_night?: number;
}

interface OwnerDetails {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    created_at?: string;
    properties: Property[];
}

interface OwnerDetailsClientProps {
    id: string;
    locale: string;
    currentUserRole: string | null;
}

export function OwnerDetailsClient({ id, locale, currentUserRole }: OwnerDetailsClientProps) {
    const t = useTranslations('AdminUsers.AdminOwners');
    const router = useRouter();
    const [owner, setOwner] = useState<OwnerDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [isImpersonating, setIsImpersonating] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        type: 'success' | 'error' | 'loading' | 'warning';
        title: string;
        message: string;
        actionLabel?: string;
        onAction?: () => void;
    }>({
        isOpen: false,
        type: 'success',
        title: '',
        message: ''
    });

    const fetchOwner = async () => {
        try {
            const data = await getOwnerWithProperties(id);
            setOwner(data);
        } catch (error) {
            console.error('Failed to fetch owner', error);
            toast.error("Failed to load owner details");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOwner();
    }, [id]);

    const handleAssignSuccess = () => {
        fetchOwner();
        router.refresh();
    };

    const confirmRemove = (propertyId: string) => {
        setModalConfig({
            isOpen: true,
            type: 'warning',
            title: "Remove Property",
            message: "Are you sure you want to remove this property from the owner?",
            actionLabel: "Remove",
            onAction: () => handleRemove(propertyId)
        });
    };

    const handleRemove = async (propertyId: string) => {
        setModalConfig(prev => ({ ...prev, type: 'loading', title: "Removing...", message: "Please wait while we remove the property." }));

        try {
            const result = await removePropertyFromOwner(propertyId);
            if (result.success) {
                setModalConfig({
                    isOpen: true,
                    type: 'success',
                    title: "Success",
                    message: "Property removed successfully",
                    actionLabel: "Close",
                    onAction: () => {
                        setModalConfig(prev => ({ ...prev, isOpen: false }));
                        fetchOwner();
                        router.refresh();
                    }
                });
            } else {
                setModalConfig({
                    isOpen: true,
                    type: 'error',
                    title: "Error",
                    message: result.error || "Failed to remove property",
                    actionLabel: "Close",
                    onAction: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
                });
            }
        } catch (error) {
            setModalConfig({
                isOpen: true,
                type: 'error',
                title: "Error",
                message: "An unexpected error occurred",
                actionLabel: "Close",
                onAction: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
            });
        }
    };

    const handleImpersonate = async () => {
        setIsImpersonating(true);
        try {
            await startImpersonation(id);
            toast.success(`Redirecting to ${owner?.full_name}'s portal...`);
            router.push('/owner');
            router.refresh();
        } catch (error: any) {
            toast.error(error.message || 'Failed to start impersonation');
            setIsImpersonating(false);
        }
    };

    if (loading) {
        return (
            <div className="py-20 flex justify-center">
                <Loader2 className="size-8 animate-spin text-[#a3a3a3]" />
            </div>
        );
    }

    if (!owner) {
        return (
            <div className="py-20 text-center">
                <h3 className="text-lg font-bold">Owner not found</h3>
                <Link href={`/${locale}/admin/owners`} className="text-blue-500 hover:underline mt-4 inline-block">
                    Go back to list
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 relative">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                    <Link
                        href={`/${locale}/admin/owners`}
                        className="inline-flex items-center gap-2 text-sm text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white transition-colors mb-4"
                    >
                        <ArrowLeft className="size-4" />
                        Back to Owners
                    </Link>
                    <h1 className="text-3xl font-playfair font-bold text-[#171717] dark:text-admin-dark-text-primary">
                        {owner.full_name || owner.email}
                    </h1>
                    <p className="text-[#a3a3a3] mt-1">{owner.email} • {owner.phone || "No phone"}</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="bg-white dark:bg-admin-dark-surface text-[#171717] dark:text-admin-dark-text-primary border border-[#f5f5f5] dark:border-admin-dark-border px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-[#fafafa] dark:hover:bg-admin-dark-bg transition-colors shadow-sm"
                    >
                        <Pencil className="size-4" />
                        Edit details
                    </button>
                    <div className="flex items-center gap-3">
                        {currentUserRole === 'super_admin' && (
                            <button
                                onClick={handleImpersonate}
                                disabled={isImpersonating}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#171717] dark:bg-white text-white dark:text-[#171717] border border-[#171717] dark:border-white hover:opacity-90 transition-all font-bold shadow-sm disabled:opacity-50"
                            >
                                {isImpersonating ? (
                                    <Loader2 className="size-4 animate-spin" />
                                ) : (
                                    <Eye className="size-4" />
                                )}
                                View as Owner
                            </button>
                        )}
                        <button
                            onClick={() => setIsAssignModalOpen(true)}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white dark:bg-admin-dark-bg text-[#171717] dark:text-white border border-[#eeeeee] dark:border-white/10 hover:bg-[#fafafa] dark:hover:bg-white/5 transition-all font-bold shadow-sm"
                        >
                            <Plus className="size-4" />
                            Assign Property
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8">
                {/* Properties List */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-[#171717] dark:text-admin-dark-text-primary">
                            Assigned Properties ({owner.properties?.length || 0})
                        </h2>
                    </div>

                    <div className="bg-white dark:bg-admin-dark-surface rounded-2xl border border-[#f5f5f5] dark:border-admin-dark-border overflow-hidden">
                        {owner.properties && owner.properties.length > 0 ? (
                            <div className="divide-y divide-[#f5f5f5] dark:divide-admin-dark-border">
                                {owner.properties.map((property) => {
                                    const mainImage = property.images?.find((img: any) => img.is_main)?.url || property.images?.[0]?.url;
                                    const status = property.status || (property.is_active ? 'active' : 'hidden');

                                    // Status Badge Config
                                    const statusConfig = {
                                        active: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500', label: 'Active' },
                                        coming_soon: { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500', label: 'Coming Soon' },
                                        hidden: { bg: 'bg-gray-50 dark:bg-gray-500/10', text: 'text-gray-400 dark:text-gray-400', dot: 'bg-gray-400', label: 'Hidden' }
                                    }[status as 'active' | 'coming_soon' | 'hidden'] || { bg: 'bg-gray-50', text: 'text-gray-400', dot: 'bg-gray-400', label: 'Unknown' };

                                    return (
                                        <div key={property.id} className="p-4 flex items-center justify-between group hover:bg-[#fafafa] dark:hover:bg-admin-dark-bg transition-colors">
                                            <div className="flex items-center gap-4">
                                                {/* Image or Icon */}
                                                <div
                                                    className="size-16 rounded-xl bg-[#f5f5f5] dark:bg-admin-dark-bg flex items-center justify-center text-[#a3a3a3] bg-cover bg-center border border-[#eeeeee] dark:border-white/5 overflow-hidden shrink-0"
                                                    style={mainImage ? { backgroundImage: `url(${mainImage})` } : {}}
                                                >
                                                    {!mainImage && <Home className="size-6" />}
                                                </div>

                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <p className="font-bold text-[#171717] dark:text-admin-dark-text-primary text-base">
                                                            {(property.title as any)?.en || (property.title as any)?.pt || "Untitled Property"}
                                                        </p>
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${statusConfig.bg} ${statusConfig.text}`}>
                                                            <span className={`size-1 rounded-full ${statusConfig.dot}`}></span>
                                                            {statusConfig.label}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-3 text-xs text-[#a3a3a3]">
                                                        <div className="flex items-center gap-1">
                                                            <MapPin className="size-3" />
                                                            {property.city || property.address || property.slug}
                                                        </div>
                                                        <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700"></span>
                                                        <span>
                                                            {property.bedrooms || 0} Beds • {property.max_guests || 0} Guests
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => confirmRemove(property.id)}
                                                className="text-red-500 opacity-0 group-hover:opacity-100 transition-all p-2 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg flex items-center gap-2 text-xs font-bold"
                                                title="Remove from owner"
                                            >
                                                <Trash2 className="size-4" />
                                                Remove
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="py-20 flex flex-col items-center justify-center text-center text-[#a3a3a3]">
                                <div className="size-16 bg-[#fafafa] dark:bg-admin-dark-bg rounded-full flex items-center justify-center mb-4">
                                    <Building2 className="size-8 text-[#a3a3a3]" />
                                </div>
                                <p className="text-sm font-medium">No properties assigned to this owner yet.</p>
                                <button
                                    onClick={() => setIsAssignModalOpen(true)}
                                    className="mt-4 text-[#171717] dark:text-white text-sm font-bold hover:underline"
                                >
                                    Assign a property now
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <AssignPropertyModal
                isOpen={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                onSuccess={handleAssignSuccess}
                ownerId={id}
            />

            <StatusModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                type={modalConfig.type}
                title={modalConfig.title}
                message={modalConfig.message}
                actionLabel={modalConfig.actionLabel}
                onAction={modalConfig.onAction}
            />

            <EditUserSidebar
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSuccess={() => {
                    fetchOwner();
                    router.refresh();
                }}
                userToEdit={owner as unknown as Profile}
            />
        </div>
    );
}
