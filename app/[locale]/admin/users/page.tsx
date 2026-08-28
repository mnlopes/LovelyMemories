"use client";

import { useEffect, useState } from "react";
import { Users, Search, Mail, Loader2, UserPlus, MoreHorizontal, Phone, ShieldAlert, KeyRound, Eye, EyeOff, Copy, CheckCircle2 } from "lucide-react";
import { getProfiles, updateUserRole, setTeamMemberPassword } from "@/app/actions/user";
import { toast } from "sonner";
import { Profile, AppRole } from "@/lib/types";
import { InviteUserModal } from "@/components/admin/users/InviteUserModal";
import { DeleteUserModal } from "@/components/admin/users/DeleteUserModal";
import { supabase } from "@/lib/supabase";
import { Trash2, Pencil } from "lucide-react";
import { EditUserSidebar } from "@/components/admin/users/EditUserSidebar";
import { RolesPermissionsModal } from "@/components/admin/users/RolesPermissionsModal";
import { useTranslations, useLocale } from "next-intl";
import { checkPermission } from "@/app/actions/permissions";

export default function AdminUsersPage() {
    const t = useTranslations("AdminUsers");
    const locale = useLocale();
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
    const [canEditTeam, setCanEditTeam] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isRolesModalOpen, setIsRolesModalOpen] = useState(false);
    const [userForAction, setUserForAction] = useState<Profile | null>(null);
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

    // Reset-password modal state (mirrors the owners page flow)
    const [pwTarget, setPwTarget] = useState<Profile | null>(null);
    const [pwValue, setPwValue] = useState("");
    const [pwConfirm, setPwConfirm] = useState("");
    const [pwShow, setPwShow] = useState(false);
    const [pwSaving, setPwSaving] = useState(false);
    const [pwDone, setPwDone] = useState(false);
    const [pwCopied, setPwCopied] = useState(false);

    const pwHasMin = pwValue.length >= 8;
    const pwHasLetter = /[a-zA-Z]/.test(pwValue);
    const pwHasNum = /\d/.test(pwValue);
    const pwValid = pwHasMin && pwHasLetter && pwHasNum && pwValue === pwConfirm;

    const openPasswordModal = (profile: Profile) => {
        setPwTarget(profile);
        setPwValue("");
        setPwConfirm("");
        setPwShow(false);
        setPwDone(false);
        setPwCopied(false);
    };

    const generatePassword = () => {
        const digits = Math.floor(1000 + Math.random() * 9000);
        const suffix = Math.random().toString(36).slice(2, 6);
        const pw = `Lovely-${digits}-${suffix}`;
        setPwValue(pw);
        setPwConfirm(pw);
        setPwShow(true);
    };

    const handleSetPassword = async () => {
        if (!pwTarget || !pwValid || pwSaving) return;
        setPwSaving(true);
        try {
            const res = await setTeamMemberPassword(pwTarget.id, pwValue);
            if (res?.success) {
                setPwDone(true);
                toast.success(t('passwordModal.success'));
            } else {
                toast.error(res?.error || t('passwordModal.error'));
            }
        } catch (err: any) {
            toast.error(err?.message || t('passwordModal.error'));
        } finally {
            setPwSaving(false);
        }
    };

    const fetchProfiles = async () => {
        try {
            const data = await getProfiles();
            // Filter out owners from the Team page
            const profilesList = (data as Profile[]).filter(p => p.role !== 'owner') || [];
            setProfiles(profilesList);

            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const myProfile = profilesList.find(p => p.id === user.id);
                if (myProfile) {
                    setCurrentUserProfile(myProfile);
                    if (myProfile.role === 'super_admin') {
                        setCanEditTeam(true);
                    } else {
                        const canEdit = await checkPermission('team', 'can_edit');
                        setCanEditTeam(canEdit);
                    }
                }
            }
        } catch (error: any) {
            toast.error(t('notifications.fetchError', { error: error.message }));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfiles();
    }, []);

    const handleRoleChange = async (userId: string, newRole: string) => {
        try {
            await updateUserRole(userId, newRole);
            setProfiles(profiles.map(p => p.id === userId ? { ...p, role: newRole as AppRole } : p));
            toast.success(t('notifications.roleSuccess'));
        } catch (error: any) {
            toast.error(t('notifications.roleError', { error: error.message }));
        }
    };

    const canManageTarget = (targetProfile: Profile) => {
        if (!currentUserProfile || !canEditTeam) return false;
        if (targetProfile.id === currentUserProfile.id) return false; // Cannot manage self
        if (currentUserProfile.role === 'super_admin') return true;
        if (currentUserProfile.role === 'admin') {
            return targetProfile.role !== 'super_admin';
        }
        return false;
    };

    const getAvailableRolesForCurrent = () => {
        if (!currentUserProfile) return [];
        // Only allow Team roles (no owners)
        if (currentUserProfile.role === 'super_admin') return ['super_admin', 'admin', 'editor'];
        if (currentUserProfile.role === 'admin') return ['admin', 'editor'];
        return [];
    };

    const getRoleBadge = (role: string) => {
        const styles: Record<string, string> = {
            super_admin: "bg-red-50 text-red-700 border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30",
            admin: "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30",
            editor: "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30",
            user: "bg-gray-50 text-gray-600 border-gray-100 dark:bg-gray-500/10 dark:text-gray-400 dark:border-gray-500/30",
            owner: "bg-[#FDFBF7] text-[#C5A059] border-[#C5A059]/20" // Premium gold for owner
        };
        return styles[role] || styles.user;
    };

    const filteredProfiles = profiles.filter(profile => {
        // Text Search
        const matchesSearch = profile.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            profile.email?.toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;

        return true;
    });

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-[#171717] dark:text-admin-dark-text-primary">{t('title')}</h2>
                    <p className="text-[#a3a3a3] mt-2 font-medium">{t('description')}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {(currentUserProfile?.role === 'super_admin' || currentUserProfile?.role === 'admin') && (
                        <button
                            onClick={() => setIsRolesModalOpen(true)}
                            className="px-5 py-2.5 bg-white dark:bg-admin-dark-bg text-[#171717] dark:text-admin-dark-text-primary border border-[#f5f5f5] dark:border-admin-dark-border rounded-lg text-sm font-semibold hover:bg-[#fafafa] dark:hover:bg-admin-dark-surface transition-all flex items-center gap-2 shadow-sm"
                        >
                            <ShieldAlert className="size-4 text-red-500" />
                            Roles & Permissions
                        </button>
                    )}
                    {canEditTeam && (
                        <button
                            onClick={() => setIsInviteModalOpen(true)}
                            className="px-5 py-2.5 bg-[#171717] dark:bg-white text-white dark:text-black rounded-lg text-sm font-semibold hover:bg-black dark:hover:bg-gray-200 transition-all flex items-center gap-2 shadow-sm"
                        >
                            <UserPlus className="size-4" />
                            {t('inviteButton')}
                        </button>
                    )}
                </div>
            </div>

            {/* Search Only (Tabs Removed) */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="relative w-full md:w-auto md:min-w-[300px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a3a3a3] size-4" />
                    <input
                        type="text"
                        placeholder={t('searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white dark:bg-admin-dark-surface border border-[#f5f5f5] dark:border-admin-dark-border pl-10 pr-4 py-2.5 rounded-xl text-sm focus:ring-1 focus:ring-[#8ca38c] outline-none shadow-sm placeholder:text-[#a3a3a3] text-[#171717] dark:text-admin-dark-text-primary transition-colors"
                    />
                </div>
            </div>

            {/* Users list */}
            {loading ? (
                <div className="bg-white dark:bg-admin-dark-surface rounded-2xl border border-[#f5f5f5] dark:border-admin-dark-border shadow-sm py-20 flex flex-col items-center justify-center gap-4 text-[#a3a3a3]">
                    <Loader2 className="size-8 animate-spin" />
                    <p className="text-sm font-medium">{t('loadingMembers')}</p>
                </div>
            ) : filteredProfiles.length === 0 ? (
                <div className="bg-white dark:bg-admin-dark-surface rounded-2xl border border-[#f5f5f5] dark:border-admin-dark-border shadow-sm py-20 flex flex-col items-center justify-center gap-4 text-[#a3a3a3]">
                    <Users className="size-12 opacity-20" />
                    <p className="text-sm font-medium">{t('noMembersFound')}</p>
                </div>
            ) : (
                <>
                <div className="hidden md:block bg-white dark:bg-admin-dark-surface rounded-2xl border border-[#f5f5f5] dark:border-admin-dark-border shadow-sm transition-colors duration-300">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-[#f5f5f5] dark:border-admin-dark-border bg-[#fafafa]/50 dark:bg-admin-dark-bg/50">
                                <th className="px-8 py-5 text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest">{t('table.userDetails')}</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest">{t('table.contact')}</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest">{t('table.account')}</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest">{t('table.accessRole')}</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest text-right">{t('table.action')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#f5f5f5] dark:divide-admin-dark-border">
                            {filteredProfiles.map((profile) => (
                                <tr key={profile.id} className="group hover:bg-[#fafafa]/50 dark:hover:bg-admin-dark-bg/50 transition-colors">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="size-10 rounded-full bg-[#f5f5f5] dark:bg-admin-dark-bg flex items-center justify-center text-[#171717] dark:text-admin-dark-text-primary font-bold text-sm border border-transparent dark:border-admin-dark-border overflow-hidden">
                                                {profile.avatar_url ? (
                                                    <img src={profile.avatar_url} alt="" className="size-full object-cover" />
                                                ) : (
                                                    (profile.full_name || profile.email || "?").charAt(0).toUpperCase()
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-bold text-[#171717] dark:text-admin-dark-text-primary leading-tight">
                                                    {profile.full_name || t('newUser')}
                                                </p>
                                                <p className="text-xs text-[#a3a3a3] mt-0.5">{profile.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        {profile.phone ? (
                                            <div className="flex items-center gap-2 text-xs text-[#171717] dark:text-admin-dark-text-primary font-medium">
                                                <Phone className="size-3 text-[#a3a3a3]" />
                                                {profile.phone}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-[#a3a3a3] italic">{t('noPhone')}</span>
                                        )}
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2 text-xs text-[#171717] dark:text-admin-dark-text-primary font-medium">
                                                <Mail className="size-3 text-[#a3a3a3]" />
                                                {profile.email}
                                            </div>
                                            <div className="text-[10px] text-[#a3a3a3] flex items-center gap-1">
                                                <span>ID:</span>
                                                <span className="font-mono">{profile.id.substring(0, 8)}...</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <select
                                            value={profile.role}
                                            disabled={!canManageTarget(profile)}
                                            onChange={(e) => handleRoleChange(profile.id, e.target.value)}
                                            className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg border outline-none transition-all ${!canManageTarget(profile) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                                                } ${getRoleBadge(profile.role)}`}
                                        >
                                            {getAvailableRolesForCurrent().map(r => (
                                                <option key={r} value={r}>{t(`inviteModal.roles.${r}` as any)}</option>
                                            ))}
                                            {!getAvailableRolesForCurrent().includes(profile.role) && (
                                                <option value={profile.role}>{t(`inviteModal.roles.${profile.role}` as any)}</option>
                                            )}
                                        </select>
                                    </td>
                                    <td className="px-8 py-6 text-right relative">
                                        <div className="flex justify-end items-center gap-2">
                                            <button
                                                onClick={() => setActiveMenuId(activeMenuId === profile.id ? null : profile.id)}
                                                disabled={!canManageTarget(profile)}
                                                className={`text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white transition-colors p-2 hover:bg-gray-100 dark:hover:bg-admin-dark-bg rounded-lg ${!canManageTarget(profile) ? 'opacity-0 cursor-default' : ''}`}
                                            >
                                                <MoreHorizontal className="size-5" />
                                            </button>

                                            {activeMenuId === profile.id && (
                                                <>
                                                    <div
                                                        className="fixed inset-0 z-10"
                                                        onClick={() => setActiveMenuId(null)}
                                                    />
                                                    <div className="absolute right-8 top-16 bg-white dark:bg-admin-dark-surface border border-[#f5f5f5] dark:border-admin-dark-border rounded-xl shadow-xl z-20 overflow-hidden min-w-[160px] animate-in fade-in zoom-in duration-200">
                                                        <button
                                                            onClick={() => {
                                                                setUserForAction(profile);
                                                                setIsEditModalOpen(true);
                                                                setActiveMenuId(null);
                                                            }}
                                                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-[#171717] dark:text-admin-dark-text-primary hover:bg-[#fafafa] dark:hover:bg-admin-dark-bg transition-colors"
                                                        >
                                                            <Pencil className="size-4" />
                                                            {t('editMember')}
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                openPasswordModal(profile);
                                                                setActiveMenuId(null);
                                                            }}
                                                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-[#171717] dark:text-admin-dark-text-primary hover:bg-[#fafafa] dark:hover:bg-admin-dark-bg transition-colors"
                                                        >
                                                            <KeyRound className="size-4" />
                                                            {t('resetPassword')}
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setUserForAction(profile);
                                                                setIsDeleteModalOpen(true);
                                                                setActiveMenuId(null);
                                                            }}
                                                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                                        >
                                                            <Trash2 className="size-4" />
                                                            {t('deleteMember')}
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                    {filteredProfiles.map((profile) => (
                        <div key={profile.id} className="bg-white dark:bg-admin-dark-surface rounded-2xl border border-[#f5f5f5] dark:border-admin-dark-border shadow-sm overflow-hidden">
                            <div className="flex items-center gap-3 p-4">
                                <div className="size-11 rounded-full bg-[#f5f5f5] dark:bg-admin-dark-bg flex items-center justify-center text-[#171717] dark:text-admin-dark-text-primary font-bold text-sm border border-transparent dark:border-admin-dark-border overflow-hidden shrink-0">
                                    {profile.avatar_url ? (
                                        <img src={profile.avatar_url} alt="" className="size-full object-cover" />
                                    ) : (
                                        (profile.full_name || profile.email || "?").charAt(0).toUpperCase()
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-bold text-[#171717] dark:text-admin-dark-text-primary leading-tight truncate">{profile.full_name || t('newUser')}</p>
                                    <p className="text-xs text-[#a3a3a3] mt-0.5 truncate">{profile.email}</p>
                                    {profile.phone && (
                                        <p className="flex items-center gap-1 text-xs text-[#a3a3a3] mt-1"><Phone className="size-3" />{profile.phone}</p>
                                    )}
                                </div>
                                {canManageTarget(profile) && (
                                    <button onClick={() => setActiveMenuId(activeMenuId === profile.id ? null : profile.id)} className="p-2 rounded-xl text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-all shrink-0" aria-label="More actions">
                                        <MoreHorizontal className="size-5" />
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center justify-between px-4 py-2.5 border-t border-[#f5f5f5] dark:border-admin-dark-border">
                                <span className="text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest">{t('table.accessRole')}</span>
                                <select
                                    value={profile.role}
                                    disabled={!canManageTarget(profile)}
                                    onChange={(e) => handleRoleChange(profile.id, e.target.value)}
                                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg border outline-none transition-all ${!canManageTarget(profile) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${getRoleBadge(profile.role)}`}
                                >
                                    {getAvailableRolesForCurrent().map(r => (
                                        <option key={r} value={r}>{t(`inviteModal.roles.${r}` as any)}</option>
                                    ))}
                                    {!getAvailableRolesForCurrent().includes(profile.role) && (
                                        <option value={profile.role}>{t(`inviteModal.roles.${profile.role}` as any)}</option>
                                    )}
                                </select>
                            </div>
                        </div>
                    ))}
                </div>
                </>
            )}

            {/* Mobile actions bottom sheet */}
            {activeMenuId && (() => {
                const profile = filteredProfiles.find(p => p.id === activeMenuId);
                if (!profile || !canManageTarget(profile)) return null;
                return (
                    <div className="md:hidden fixed inset-0 z-[120] flex items-end animate-in fade-in duration-200">
                        <div className="absolute inset-0 bg-black/50" onClick={() => setActiveMenuId(null)} />
                        <div className="relative w-full bg-white dark:bg-admin-dark-surface rounded-t-3xl border-t border-[#f5f5f5] dark:border-admin-dark-border p-2 pb-6 animate-in slide-in-from-bottom duration-300">
                            <div className="mx-auto mt-2 mb-3 h-1.5 w-10 rounded-full bg-gray-200 dark:bg-white/10" />
                            <p className="px-4 pb-2 text-xs font-bold text-[#a3a3a3] uppercase tracking-widest truncate">{profile.full_name || profile.email}</p>
                            <button onClick={() => { setUserForAction(profile); setIsEditModalOpen(true); setActiveMenuId(null); }} className="w-full text-left px-4 py-3 text-sm font-medium text-[#171717] dark:text-admin-dark-text-primary hover:bg-[#fafafa] dark:hover:bg-admin-dark-bg rounded-xl flex items-center gap-3">
                                <Pencil className="size-5" />{t('editMember')}
                            </button>
                            <button onClick={() => { openPasswordModal(profile); setActiveMenuId(null); }} className="w-full text-left px-4 py-3 text-sm font-medium text-[#171717] dark:text-admin-dark-text-primary hover:bg-[#fafafa] dark:hover:bg-admin-dark-bg rounded-xl flex items-center gap-3">
                                <KeyRound className="size-5" />{t('resetPassword')}
                            </button>
                            <button onClick={() => { setUserForAction(profile); setIsDeleteModalOpen(true); setActiveMenuId(null); }} className="w-full text-left px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl flex items-center gap-3">
                                <Trash2 className="size-5" />{t('deleteMember')}
                            </button>
                        </div>
                    </div>
                );
            })()}

            {/* Invitation Modal */}
            <InviteUserModal
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
                onSuccess={fetchProfiles}
                currentUserRole={currentUserProfile?.role || 'user'}
                allowedRoles={['super_admin', 'admin', 'editor']}
            />

            {/* Delete Confirmation Modal */}
            <DeleteUserModal
                isOpen={isDeleteModalOpen}
                userToDelete={userForAction}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setUserForAction(null);
                }}
                onSuccess={fetchProfiles}
            />

            <EditUserSidebar
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setUserForAction(null);
                }}
                onSuccess={fetchProfiles}
                userToEdit={userForAction}
            />

            <RolesPermissionsModal
                isOpen={isRolesModalOpen}
                onClose={() => setIsRolesModalOpen(false)}
            />

            {/* Reset password modal */}
            {pwTarget && (
                <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setPwTarget(null)} />
                    <div className="relative w-full max-w-md bg-white dark:bg-admin-dark-surface rounded-2xl border border-[#f5f5f5] dark:border-admin-dark-border shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3">
                            <KeyRound className="size-5 text-[#171717] dark:text-admin-dark-text-primary" />
                            <h3 className="text-lg font-bold text-[#171717] dark:text-admin-dark-text-primary">{t('passwordModal.title')}</h3>
                        </div>
                        <p className="mt-2 text-sm text-[#a3a3a3] leading-relaxed">
                            {t('passwordModal.description', { name: pwTarget.full_name || pwTarget.email || '' })}
                        </p>

                        {pwDone ? (
                            <div className="mt-5 space-y-4">
                                <div className="flex items-center gap-2 text-sm font-bold text-emerald-600">
                                    <CheckCircle2 className="size-5" />
                                    {t('passwordModal.done')}
                                </div>
                                <div className="flex items-center gap-2 bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f5f5f5] dark:border-admin-dark-border rounded-xl px-4 py-3">
                                    <code className="flex-1 text-sm font-mono text-[#171717] dark:text-admin-dark-text-primary break-all">{pwValue}</code>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            navigator.clipboard.writeText(pwValue);
                                            setPwCopied(true);
                                            toast.success(t('passwordModal.copied'));
                                        }}
                                        aria-label={t('passwordModal.copy')}
                                        className="text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white transition-colors shrink-0"
                                    >
                                        {pwCopied ? <CheckCircle2 className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                                    </button>
                                </div>
                                <p className="text-xs text-[#a3a3a3] leading-relaxed">{t('passwordModal.shareHint')}</p>
                                <button
                                    type="button"
                                    onClick={() => setPwTarget(null)}
                                    className="w-full px-4 py-2.5 rounded-xl bg-[#171717] dark:bg-white text-white dark:text-[#171717] text-sm font-bold hover:opacity-90 transition-opacity"
                                >
                                    {t('passwordModal.finish')}
                                </button>
                            </div>
                        ) : (
                            <div className="mt-5 space-y-4">
                                <div className="relative">
                                    <input
                                        type={pwShow ? 'text' : 'password'}
                                        value={pwValue}
                                        onChange={(e) => setPwValue(e.target.value)}
                                        placeholder={t('passwordModal.newPlaceholder')}
                                        autoComplete="new-password"
                                        className="w-full bg-white dark:bg-admin-dark-bg border border-gray-200 dark:border-admin-dark-border rounded-xl pl-4 pr-11 py-3 text-sm focus:border-[#171717] dark:focus:border-white transition-all outline-none dark:text-admin-dark-text-primary"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setPwShow(!pwShow)}
                                        aria-label={pwShow ? t('passwordModal.hide') : t('passwordModal.show')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#171717] dark:hover:text-white transition-colors"
                                    >
                                        {pwShow ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                    </button>
                                </div>
                                <input
                                    type={pwShow ? 'text' : 'password'}
                                    value={pwConfirm}
                                    onChange={(e) => setPwConfirm(e.target.value)}
                                    placeholder={t('passwordModal.confirmPlaceholder')}
                                    autoComplete="new-password"
                                    className="w-full bg-white dark:bg-admin-dark-bg border border-gray-200 dark:border-admin-dark-border rounded-xl px-4 py-3 text-sm focus:border-[#171717] dark:focus:border-white transition-all outline-none dark:text-admin-dark-text-primary"
                                />

                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                                    <span className={pwHasMin ? 'text-emerald-600' : 'text-gray-400'}>{t('passwordModal.ruleMin')}</span>
                                    <span className={pwHasLetter ? 'text-emerald-600' : 'text-gray-400'}>{t('passwordModal.ruleLetter')}</span>
                                    <span className={pwHasNum ? 'text-emerald-600' : 'text-gray-400'}>{t('passwordModal.ruleNumber')}</span>
                                    {pwConfirm.length > 0 && (
                                        <span className={pwValue === pwConfirm ? 'text-emerald-600' : 'text-red-500'}>
                                            {pwValue === pwConfirm ? t('passwordModal.ruleMatch') : t('passwordModal.ruleMismatch')}
                                        </span>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    onClick={generatePassword}
                                    className="text-xs font-bold text-[#171717] dark:text-admin-dark-text-primary hover:underline"
                                >
                                    {t('passwordModal.generate')}
                                </button>

                                <div className="flex gap-3 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => setPwTarget(null)}
                                        disabled={pwSaving}
                                        className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-admin-dark-border text-sm font-bold text-gray-500 hover:bg-gray-50 dark:hover:bg-admin-dark-bg transition-colors disabled:opacity-50"
                                    >
                                        {t('passwordModal.cancel')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSetPassword}
                                        disabled={!pwValid || pwSaving}
                                        className="flex-[2] px-4 py-2.5 rounded-xl bg-[#171717] dark:bg-white text-white dark:text-[#171717] text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {pwSaving && <Loader2 className="size-4 animate-spin" />}
                                        {t('passwordModal.submit')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
