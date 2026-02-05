"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, MoreHorizontal, Search, Filter, Building2, Home, Trash2, Eye, EyeOff } from "lucide-react";
import { useParams } from "next/navigation";
import { StatusModal } from "@/components/admin/ui/StatusModal";

export default function AdminProperties() {
    const params = useParams();
    const locale = (params?.locale as string) || 'en';
    const [properties, setProperties] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [role, setRole] = useState<string | null>(null);

    // Search & Filter
    const [searchQuery, setSearchQuery] = useState("");
    const [showBuildingsOnly, setShowBuildingsOnly] = useState(false);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    // Modal State
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        type: 'success' | 'error' | 'loading' | 'warning'; // Warning reused as error style mostly or custom
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

    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        async function fetchData() {
            // Fetch Properties
            const { data } = await supabase
                .from('properties')
                .select('*')
                .order('created_at', { ascending: false });

            if (data) setProperties(data);

            // Fetch user role
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();
                if (profile) setRole(profile.role);
            }

            setIsLoading(false);
        }
        fetchData();
    }, []);

    // Close menu on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenuId(null);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Handlers
    const updateStatus = async (id: string, newStatus: string) => {
        const property = properties.find(p => p.id === id);
        if (!property) return;

        const oldStatus = property.status || (property.is_active ? 'active' : 'hidden');

        // Optimistic Update
        setProperties(prev => prev.map(p => p.id === id ? { ...p, status: newStatus, is_active: newStatus === 'active' } : p));
        setOpenMenuId(null);

        // Server Action
        const { updatePropertyStatus } = await import("@/app/actions/property");
        const res = await updatePropertyStatus(id, newStatus);

        if (!res.success) {
            // Revert on error
            setProperties(prev => prev.map(p => p.id === id ? { ...p, status: oldStatus, is_active: oldStatus === 'active' } : p));
            console.error('Error updating status:', res.error);
            setModalConfig({
                isOpen: true,
                type: 'error',
                title: 'Update Failed',
                message: res.error || 'Failed to update status',
                actionLabel: 'Close',
                onAction: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
            });
        }
    };

    const confirmDelete = (id: string) => {
        setOpenMenuId(null);
        setModalConfig({
            isOpen: true,
            type: 'error',
            title: 'Delete Property?',
            message: 'Are you sure you want to delete this property? This action cannot be undone.',
            actionLabel: 'Yes, Delete',
            onAction: () => handleDelete(id)
        });
    };

    const handleDelete = async (id: string) => {
        setModalConfig(prev => ({ ...prev, type: 'loading', title: 'Deleting...', message: 'Removing property...' }));

        const { deleteProperty } = await import("@/app/actions/property");
        const res = await deleteProperty(id);

        if (!res.success) {
            // Check for Foreign Key Constraint code if passed
            if (res.code === '23503') {
                setModalConfig({
                    isOpen: true,
                    type: 'error',
                    title: 'Cannot Delete Property',
                    message: 'This property has associated reservations or booking data. Please archive/hide it instead of deleting.',
                    actionLabel: 'Close',
                    onAction: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
                });
            } else {
                setModalConfig({
                    isOpen: true,
                    type: 'error',
                    title: 'Error Deleting',
                    message: res.error || 'An unexpected error occurred.',
                    actionLabel: 'Close',
                    onAction: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
                });
            }
        } else {
            // Success
            setProperties(prev => prev.filter(p => p.id !== id));
            setModalConfig({
                isOpen: true,
                type: 'success',
                title: 'Property Deleted',
                message: 'The property has been successfully removed.',
                actionLabel: 'Done',
                onAction: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
            });
        }
    };

    // Filter Logic
    const filteredProperties = properties.filter(property => {
        const title = property.title?.[locale] || property.title?.en || 'Untitled';
        const location = property.city || property.address || '';
        const search = searchQuery.toLowerCase();

        const matchesSearch = title.toLowerCase().includes(search) || location.toLowerCase().includes(search);
        const matchesType = showBuildingsOnly ? property.is_multi_unit : true;

        return matchesSearch && matchesType;
    });

    return (
        <div className="space-y-10 pb-20">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-[#171717] dark:text-admin-dark-text-primary">Properties</h2>
                    <p className="text-[#a3a3a3] mt-2 font-medium">Manage your portfolio of {properties.length} estates</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => window.location.href = `/${locale}/admin/properties/new?mode=building`}
                        className="px-5 py-2.5 bg-white dark:bg-admin-dark-surface border border-[#eaeaea] dark:border-admin-dark-border text-[#171717] dark:text-admin-dark-text-primary rounded text-sm font-semibold hover:bg-[#fafafa] dark:hover:bg-admin-dark-bg transition-all flex items-center gap-2"
                    >
                        <Building2 className="size-4" />
                        Add Building
                    </button>
                    <button
                        onClick={() => window.location.href = `/${locale}/admin/properties/new`}
                        className="px-5 py-2.5 bg-[#171717] dark:bg-white text-white dark:text-black rounded text-sm font-semibold hover:bg-black dark:hover:bg-gray-200 transition-all flex items-center gap-2"
                    >
                        <Home className="size-4" />
                        Add Property
                    </button>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md group">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a3a3a3] size-4 group-focus-within:text-[#171717] dark:group-focus-within:text-white transition-colors" />
                    <input
                        type="text"
                        placeholder="Search by name or location..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white dark:bg-white/5 border border-[#f5f5f5] dark:border-white/10 pl-11 pr-4 py-2.5 rounded-xl text-sm focus:ring-1 focus:ring-gold-400 dark:focus:ring-white/20 outline-none shadow-sm dark:text-admin-dark-text-primary transition-all placeholder:text-[#a3a3a3] font-medium"
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowBuildingsOnly(!showBuildingsOnly)}
                        className={`flex items-center gap-2 px-5 py-2.5 border rounded-xl text-xs font-bold transition-all ${showBuildingsOnly
                            ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-400 shadow-sm shadow-blue-500/10'
                            : 'bg-white dark:bg-white/5 border-[#f5f5f5] dark:border-white/10 text-[#171717] dark:text-admin-dark-text-primary hover:bg-[#fafafa] dark:hover:bg-white/10'
                            }`}
                    >
                        <Building2 className="size-4" />
                        Buildings Only
                    </button>
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-white/5 border border-[#f5f5f5] dark:border-white/10 rounded-xl text-xs font-bold text-[#171717] dark:text-admin-dark-text-primary hover:bg-[#fafafa] dark:hover:bg-white/10 transition-all shadow-sm">
                        <Filter className="size-4" />
                        Filters
                    </button>
                </div>
            </div>

            {/* Properties Table */}
            <div className="bg-white dark:bg-white/5 rounded-2xl border border-[#f5f5f5] dark:border-white/10 overflow-visible shadow-sm dark:shadow-2xl dark:shadow-black/50 min-h-[400px] transition-all duration-500 premium-glow-dark">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-[#f5f5f5] dark:border-admin-dark-border">
                            <th className="px-8 py-5 text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest">Property Details</th>
                            <th className="px-8 py-5 text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest">Location</th>
                            <th className="px-8 py-5 text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest">Pricing</th>
                            <th className="px-8 py-5 text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest">Status</th>
                            <th className="px-8 py-5 text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f5f5f5] dark:divide-admin-dark-border">
                        {isLoading ? (
                            <tr>
                                <td colSpan={5} className="px-8 py-10 text-center text-[#a3a3a3] text-sm italic">Loading properties...</td>
                            </tr>
                        ) : filteredProperties.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-8 py-10 text-center text-[#a3a3a3] text-sm">No properties found.</td>
                            </tr>
                        ) : filteredProperties.map((property) => {
                            const title = property.title?.[locale] || property.title?.en || 'Untitled';
                            const mainImage = property.images?.find((img: any) => img.is_main)?.url || property.images?.[0]?.url;
                            const subtitle = property.is_multi_unit ? 'Building' : `${property.type || 'Standard'} • ${property.bedrooms || 0} BR`;

                            return (
                                <tr key={property.id} className="group hover:bg-[#fafafa]/50 dark:hover:bg-white/[0.02] transition-all duration-300">
                                    <td className="px-8 py-6 cursor-pointer" onClick={() => window.location.href = `/${locale}/admin/properties/${property.id}`}>
                                        <div className="flex items-center gap-4">
                                            <div
                                                className="size-14 rounded-xl bg-[#f5f5f5] dark:bg-admin-dark-bg bg-cover bg-center shrink-0 border border-[#eeeeee] dark:border-white/10 shadow-sm transition-all group-hover:scale-105 duration-500"
                                                style={{ backgroundImage: `url(${mainImage || '/placeholder-property.jpg'})` }}
                                            ></div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold text-[#171717] dark:text-admin-dark-text-primary group-hover:text-gold-400 dark:group-hover:text-white transition-colors">{title}</p>
                                                    {property.is_multi_unit && (
                                                        <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 text-[9px] font-bold uppercase tracking-wider border border-blue-200 dark:border-blue-500/30">
                                                            Building
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-[#a3a3a3] dark:text-admin-dark-text-secondary mt-0.5 font-medium">{subtitle}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <p className="text-sm font-semibold text-[#171717] dark:text-admin-dark-text-primary">{property.city || property.address || 'N/A'}</p>
                                    </td>
                                    <td className="px-8 py-6">
                                        <p className="text-sm font-bold text-[#171717] dark:text-admin-dark-text-primary whitespace-nowrap">
                                            €{property.price_per_night || 0}
                                            <span className="text-[10px] text-[#a3a3a3] dark:text-admin-dark-text-secondary font-normal ml-1 italic">/ night</span>
                                        </p>
                                    </td>
                                    <td className="px-8 py-6">
                                        {(() => {
                                            const status = property.status || (property.is_active ? 'active' : 'hidden');
                                            const config = {
                                                active: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-500/30', dot: 'bg-emerald-500', label: 'Active' },
                                                coming_soon: { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-500/30', dot: 'bg-amber-500', label: 'Coming Soon' },
                                                hidden: { bg: 'bg-gray-50 dark:bg-gray-500/10', text: 'text-gray-400 dark:text-admin-dark-text-secondary', border: 'border-gray-100 dark:border-white/10', dot: 'bg-gray-400', label: 'Hidden' }
                                            }[status as 'active' | 'coming_soon' | 'hidden'] || { bg: 'bg-gray-50', text: 'text-gray-400', border: 'border-gray-100', dot: 'bg-gray-400', label: 'Unknown' };

                                            return (
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.05em] ${config.bg} ${config.text} border ${config.border} shadow-sm transition-all duration-300`}>
                                                    <span className={`size-1.5 rounded-full ${config.dot} shadow-[0_0_8px_currentColor]`}></span>
                                                    {config.label}
                                                </span>
                                            );
                                        })()}
                                    </td>
                                    <td className="px-8 py-6 text-right relative">
                                        <button
                                            id={`menu-trigger-${property.id}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenMenuId(openMenuId === property.id ? null : property.id);
                                            }}
                                            className="text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white transition-all p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl"
                                        >
                                            <MoreHorizontal className="size-5" />
                                        </button>

                                        {/* Dropdown Menu */}
                                        {openMenuId === property.id && (
                                            <div
                                                ref={menuRef}
                                                className="absolute right-8 top-12 w-48 bg-white dark:bg-admin-dark-surface rounded-xl shadow-xl border border-[#f5f5f5] dark:border-admin-dark-border z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
                                            >
                                                <div className="p-1">
                                                    {(() => {
                                                        const status = property.status || (property.is_active ? 'active' : 'hidden');
                                                        return (
                                                            <>
                                                                {status !== 'active' && (
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); updateStatus(property.id, 'active'); }}
                                                                        className="w-full text-left px-3 py-2 text-xs font-medium text-[#171717] dark:text-admin-dark-text-primary hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg flex items-center gap-2 transition-colors"
                                                                    >
                                                                        <Eye className="size-4 text-emerald-500" />
                                                                        Set as Active
                                                                    </button>
                                                                )}
                                                                {status !== 'coming_soon' && (
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); updateStatus(property.id, 'coming_soon'); }}
                                                                        className="w-full text-left px-3 py-2 text-xs font-medium text-[#171717] dark:text-admin-dark-text-primary hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg flex items-center gap-2 transition-colors"
                                                                    >
                                                                        <Eye className="size-4 text-amber-500" />
                                                                        Set as Coming Soon
                                                                    </button>
                                                                )}
                                                                {status !== 'hidden' && (
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); updateStatus(property.id, 'hidden'); }}
                                                                        className="w-full text-left px-3 py-2 text-xs font-medium text-[#171717] dark:text-admin-dark-text-primary hover:bg-gray-50 dark:hover:bg-admin-dark-bg rounded-lg flex items-center gap-2 transition-colors"
                                                                    >
                                                                        <EyeOff className="size-4 text-gray-400" />
                                                                        Hide Property
                                                                    </button>
                                                                )}
                                                            </>
                                                        );
                                                    })()}
                                                    {(role === 'admin' || role === 'super_admin') && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); confirmDelete(property.id); }}
                                                            className="w-full text-left px-3 py-2.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg flex items-center gap-2 transition-colors"
                                                        >
                                                            <Trash2 className="size-4" />
                                                            Delete Property
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <StatusModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                type={modalConfig.type as any}
                title={modalConfig.title}
                message={modalConfig.message}
                actionLabel={modalConfig.actionLabel}
                onAction={modalConfig.onAction}
            />
        </div>
    );
}
