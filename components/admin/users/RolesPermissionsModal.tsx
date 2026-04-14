'use client';

import { useState, useEffect } from 'react';
import { X, ShieldAlert, Loader2, Check, X as XIcon } from 'lucide-react';
import { toast } from 'sonner';
import { RolePermission, AppRole } from '@/lib/types';
import { getRolePermissions, updateRolePermission } from '@/app/actions/permissions';

interface RolesPermissionsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const MODULES = [
    { id: 'properties', label: 'Properties Management' },
    { id: 'bookings', label: 'Bookings Management' },
    { id: 'owners', label: 'Property Owners' },
    { id: 'concierge', label: 'Concierge Management' },
    { id: 'coupons', label: 'Coupons Management' },
    { id: 'imports', label: 'Airbnb Imports' },
    { id: 'team', label: 'Team & Access' },
];

const ROLES: { id: AppRole, label: string, color: string, description: string }[] = [
    { 
        id: 'admin', 
        label: 'Administrator', 
        color: 'text-blue-600 bg-blue-50 dark:bg-blue-500/10',
        description: 'Highest level of access. Can manage users, global settings, and has full operational control.'
    },
    { 
        id: 'editor', 
        label: 'Editor', 
        color: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10',
        description: 'Standard team member. Handles day-to-day operations like bookings and property updates.'
    },
    { 
        id: 'owner', 
        label: 'Owner', 
        color: 'text-[#C5A059] bg-[#FDFBF7] border border-[#C5A059]/20',
        description: 'Property investor. Has restricted access tailored specifically for viewing their own portfolio.'
    }
];

export function RolesPermissionsModal({ isOpen, onClose }: RolesPermissionsModalProps) {
    const [permissions, setPermissions] = useState<RolePermission[]>([]);
    const [loading, setLoading] = useState(true);
    const [toggling, setToggling] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadPermissions();
        }
    }, [isOpen]);

    const loadPermissions = async () => {
        try {
            setLoading(true);
            const data = await getRolePermissions();
            setPermissions(data);
        } catch (error: any) {
            toast.error(error.message || 'Failed to load permissions');
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (perm: RolePermission, field: 'can_view' | 'can_edit', val: boolean) => {
        setToggling(`${perm.id}-${field}`);
        
        // Optimistic update
        const previousPermissions = [...permissions];
        setPermissions(prev => prev.map(p => p.id === perm.id ? { ...p, [field]: val } : p));
        
        try {
            await updateRolePermission(perm.id, field, val);
            toast.success('Permission updated');
        } catch (error: any) {
            // Revert on error
            setPermissions(previousPermissions);
            toast.error('Failed to update permission: ' + error.message);
        } finally {
            setToggling(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
            
            <div className="relative w-full max-w-5xl bg-white dark:bg-admin-dark-surface rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[#f5f5f5] dark:border-admin-dark-border bg-white dark:bg-admin-dark-surface sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-50 dark:bg-red-500/10 rounded-xl">
                            <ShieldAlert className="size-6 text-red-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-[#171717] dark:text-admin-dark-text-primary">Roles & Permissions</h2>
                            <p className="text-sm text-[#a3a3a3] mt-1">Manage access control and permission matrices for the entire organization.</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white transition-colors rounded-xl hover:bg-[#f5f5f5] dark:hover:bg-admin-dark-bg"
                    >
                        <X className="size-5" />
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-6 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                    {loading ? (
                         <div className="py-20 flex flex-col items-center justify-center gap-4 text-[#a3a3a3]">
                            <Loader2 className="size-8 animate-spin" />
                            <p className="text-sm font-medium">Loading permission matrix...</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {/* Role Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {ROLES.map(role => (
                                    <div key={role.id} className="p-5 rounded-2xl border border-[#f5f5f5] dark:border-admin-dark-border bg-[#fafafa]/50 dark:bg-admin-dark-bg/50">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <div className={`size-8 rounded-full flex items-center justify-center font-bold text-xs ${role.color}`}>
                                                    {role.label.charAt(0)}
                                                </div>
                                                <h3 className="font-bold text-[#171717] dark:text-admin-dark-text-primary">{role.label}</h3>
                                            </div>
                                        </div>
                                        <p className="text-xs text-[#a3a3a3] leading-relaxed">{role.description}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Permission Matrix */}
                            <div className="rounded-2xl border border-[#f5f5f5] dark:border-admin-dark-border overflow-hidden outline outline-1 outline-[#f5f5f5] dark:outline-admin-dark-border bg-white dark:bg-admin-dark-surface shadow-sm">
                                <div className="px-6 py-4 bg-[#fafafa]/50 dark:bg-admin-dark-bg/50 border-b border-[#f5f5f5] dark:border-admin-dark-border">
                                    <h3 className="text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest">PERMISSION MATRIX</h3>
                                </div>
                                
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-[#f5f5f5] dark:border-admin-dark-border">
                                                <th className="px-6 py-5 text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest w-1/4">Module / Feature</th>
                                                {ROLES.map(role => (
                                                    <th key={role.id} className="px-6 py-5 text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest text-center border-l border-[#f5f5f5] dark:border-admin-dark-border w-1/4">
                                                        {role.label}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#f5f5f5] dark:divide-admin-dark-border">
                                            {MODULES.map(module => (
                                                <tr key={module.id} className="hover:bg-[#fafafa]/50 dark:hover:bg-admin-dark-bg/50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <span className="font-semibold text-sm text-[#171717] dark:text-admin-dark-text-primary">
                                                            {module.label}
                                                        </span>
                                                    </td>
                                                    {ROLES.map(role => {
                                                        const perm = permissions.find(p => p.role_name === role.id && p.module_name === module.id);
                                                        if (!perm) return <td key={role.id} className="border-l border-[#f5f5f5] dark:border-admin-dark-border"></td>;

                                                        return (
                                                            <td key={role.id} className="px-2 py-4 border-l border-[#f5f5f5] dark:border-admin-dark-border">
                                                                <div className="flex items-center justify-center gap-4">
                                                                    
                                                                    {/* View Toggle */}
                                                                    <label className="flex flex-col items-center gap-1.5 cursor-pointer opacity-90 hover:opacity-100">
                                                                        <span className="text-[9px] font-bold uppercase tracking-wider text-[#a3a3a3]">View</span>
                                                                        <div 
                                                                            onClick={(e) => { e.preventDefault(); !toggling && handleToggle(perm, 'can_view', !perm.can_view); }}
                                                                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 border ${
                                                                                perm.can_view 
                                                                                    ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30' 
                                                                                    : 'bg-[#fafafa] dark:bg-admin-dark-bg border-[#f5f5f5] dark:border-admin-dark-border'
                                                                            } ${toggling === `${perm.id}-can_view` ? 'opacity-50 pointer-events-none' : ''}`}
                                                                        >
                                                                            {toggling === `${perm.id}-can_view` ? (
                                                                                <Loader2 className="size-4 animate-spin text-[#a3a3a3]" />
                                                                            ) : perm.can_view ? (
                                                                                <Check className="size-4 text-emerald-600 dark:text-emerald-400" />
                                                                            ) : (
                                                                                <XIcon className="size-4 text-[#a3a3a3]" />
                                                                            )}
                                                                        </div>
                                                                    </label>

                                                                    {/* Edit Toggle */}
                                                                    <label className="flex flex-col items-center gap-1.5 cursor-pointer opacity-90 hover:opacity-100">
                                                                        <span className="text-[9px] font-bold uppercase tracking-wider text-[#a3a3a3]">Edit</span>
                                                                        <div 
                                                                            onClick={(e) => { e.preventDefault(); !toggling && handleToggle(perm, 'can_edit', !perm.can_edit); }}
                                                                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 border ${
                                                                                perm.can_edit 
                                                                                    ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30' 
                                                                                    : 'bg-[#fafafa] dark:bg-admin-dark-bg border-[#f5f5f5] dark:border-admin-dark-border'
                                                                            } ${toggling === `${perm.id}-can_edit` ? 'opacity-50 pointer-events-none' : ''}`}
                                                                        >
                                                                            {toggling === `${perm.id}-can_edit` ? (
                                                                                <Loader2 className="size-4 animate-spin text-[#a3a3a3]" />
                                                                            ) : perm.can_edit ? (
                                                                                <Check className="size-4 text-blue-600 dark:text-blue-400" />
                                                                            ) : (
                                                                                <XIcon className="size-4 text-[#a3a3a3]" />
                                                                            )}
                                                                        </div>
                                                                    </label>

                                                                </div>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
