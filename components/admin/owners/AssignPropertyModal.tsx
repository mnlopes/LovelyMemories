
"use client";

import { useEffect, useState } from 'react';
import { X, Search, Check, Building2, Loader2, MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { assignPropertiesToOwner, getAvailableProperties } from '@/app/actions/property';
import { toast } from 'sonner';

interface Property {
    id: string;
    title: any;
    slug: string;
    address: string;
    owner_id: string | null;
    images?: any[];
}

interface AssignPropertyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    ownerId: string;
}

export function AssignPropertyModal({ isOpen, onClose, onSuccess, ownerId }: AssignPropertyModalProps) {
    const t = useTranslations('AdminUsers.AdminOwners'); // Reuse existing keys or add new ones
    const [loading, setLoading] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [properties, setProperties] = useState<Property[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPropertyIds, setSelectedPropertyIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (isOpen) {
            fetchProperties();
            setSelectedPropertyIds(new Set());
            setSearchTerm('');
        }
    }, [isOpen]);

    const fetchProperties = async () => {
        setLoading(true);
        try {
            const data = await getAvailableProperties();
            setProperties(data || []);
        } catch (error) {
            console.error('Failed to fetch properties', error);
            toast.error("Failed to load properties");
        } finally {
            setLoading(false);
        }
    };

    const toggleProperty = (id: string) => {
        const newSelected = new Set(selectedPropertyIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedPropertyIds(newSelected);
    };

    const handleAssign = async () => {
        if (selectedPropertyIds.size === 0) return;
        setAssigning(true);
        try {
            const result = await assignPropertiesToOwner(ownerId, Array.from(selectedPropertyIds));
            if (result.success) {
                toast.success("Properties assigned successfully");
                onSuccess();
                onClose();
            } else {
                toast.error(result.error || "Failed to assign properties");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setAssigning(false);
        }
    };

    const filteredProperties = properties.filter(p => {
        const title = (p.title as any)?.en || (p.title as any)?.pt || p.slug;
        const search = searchTerm.toLowerCase();
        return title.toLowerCase().includes(search) ||
            (p.address && p.address.toLowerCase().includes(search));
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="bg-white dark:bg-admin-dark-surface w-full max-w-lg rounded-2xl shadow-xl border border-[#f5f5f5] dark:border-admin-dark-border overflow-hidden flex flex-col max-h-[85vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-[#f5f5f5] dark:border-admin-dark-border flex items-center justify-between sticky top-0 bg-white dark:bg-admin-dark-surface z-10">
                    <div>
                        <h3 className="text-xl font-bold text-[#171717] dark:text-admin-dark-text-primary">
                            Assign Properties
                        </h3>
                        <p className="text-sm text-[#a3a3a3] mt-1">
                            Select properties to assign to this owner
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-[#fafafa] dark:hover:bg-admin-dark-bg rounded-full transition-colors text-[#a3a3a3]"
                    >
                        <X className="size-5" />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-[#f5f5f5] dark:border-admin-dark-border bg-[#fafafa]/50 dark:bg-admin-dark-bg/50">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#a3a3a3]" />
                        <input
                            type="text"
                            placeholder="Search properties..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white dark:bg-admin-dark-surface border border-[#f5f5f5] dark:border-admin-dark-border pl-10 pr-4 py-2.5 rounded-xl text-sm focus:ring-1 focus:ring-[#171717] outline-none transition-all"
                            autoFocus
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
                    {loading ? (
                        <div className="py-10 flex justify-center">
                            <Loader2 className="size-8 animate-spin text-[#a3a3a3]" />
                        </div>
                    ) : filteredProperties.length === 0 ? (
                        <div className="py-12 text-center text-[#a3a3a3]">
                            <Building2 className="size-8 mx-auto mb-3 opacity-30" />
                            <p>No available properties found</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {filteredProperties.map(property => {
                                const isSelected = selectedPropertyIds.has(property.id);
                                const mainImage = property.images?.find((img: any) => img.is_main)?.url || property.images?.[0]?.url;

                                return (
                                    <div
                                        key={property.id}
                                        onClick={() => toggleProperty(property.id)}
                                        className={`p-3 rounded-xl cursor-pointer flex items-center justify-between group transition-colors ${isSelected
                                            ? 'bg-[#171717]/5 dark:bg-white/10 border border-[#171717]/10 dark:border-white/10'
                                            : 'hover:bg-[#fafafa] dark:hover:bg-admin-dark-bg border border-transparent'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`size-12 rounded-lg flex items-center justify-center transition-colors bg-cover bg-center overflow-hidden shrink-0 ${isSelected ? 'shadow-sm' : ''} ${!mainImage ? (isSelected ? 'bg-[#171717] text-white dark:bg-white dark:text-[#171717]' : 'bg-[#f5f5f5] dark:bg-admin-dark-bg text-[#a3a3a3]') : ''}`}
                                                style={mainImage ? { backgroundImage: `url(${mainImage})` } : {}}
                                            >
                                                {!mainImage && <Building2 className="size-5" />}
                                            </div>
                                            <div>
                                                <p className={`font-bold text-sm ${isSelected ? 'text-[#171717] dark:text-white' : 'text-[#171717] dark:text-admin-dark-text-primary'}`}>
                                                    {(property.title as any)?.en || (property.title as any)?.pt || property.slug}
                                                </p>
                                                <div className="flex items-center gap-1 text-xs text-[#a3a3a3]">
                                                    <MapPin className="size-3" />
                                                    {property.address || property.slug}
                                                </div>
                                            </div>
                                        </div>

                                        <div className={`size-5 rounded-full border flex items-center justify-center transition-all ${isSelected
                                            ? 'bg-[#171717] border-[#171717] dark:bg-white dark:border-white text-white dark:text-[#171717]'
                                            : 'border-[#e5e5e5] dark:border-admin-dark-border text-transparent group-hover:border-[#d4d4d4]'
                                            }`}>
                                            <Check className="size-3" strokeWidth={3} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-[#f5f5f5] dark:border-admin-dark-border bg-white dark:bg-admin-dark-surface sticky bottom-0">
                    <button
                        onClick={handleAssign}
                        disabled={selectedPropertyIds.size === 0 || assigning}
                        className="w-full bg-[#171717] dark:bg-white text-white dark:text-[#171717] font-bold py-3.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:bg-black dark:hover:bg-gray-200 transition-all shadow-lg shadow-[#171717]/10"
                    >
                        {assigning ? (
                            <Loader2 className="size-5 animate-spin" />
                        ) : (
                            <>
                                Assign {selectedPropertyIds.size > 0 ? `${selectedPropertyIds.size} ` : ''}Properties
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
