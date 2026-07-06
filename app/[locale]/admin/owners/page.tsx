"use client";

import { useTranslations } from 'next-intl';
import { useEffect, useState, use } from 'react';
import { getOwnersWithPropertyCounts, getCurrentUserRole, resendOwnerInvite, deleteOwner, setOwnerPassword } from '@/app/actions/user';
import { startImpersonation } from '@/app/actions/impersonation';
import { Loader2, Plus, Search, User, Phone, Mail, Home, Send, Check, MoreVertical, Trash2, KeyRound, Eye, EyeOff, Copy } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
    units_count: number;
}

export default function AdminOwnersPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = use(params);
    const router = useRouter();
    const t = useTranslations('AdminUsers.AdminOwners');
    const [owners, setOwners] = useState<OwnerWithCount[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [currentUserRole, setCurrentUserRole] = useState<AppRole | null>(null);
    const [resendState, setResendState] = useState<Record<string, 'loading' | 'done'>>({});

    const handleResend = async (owner: OwnerWithCount) => {
        if (!owner.email || resendState[owner.id]) return;
        setResendState((s) => ({ ...s, [owner.id]: 'loading' }));
        try {
            const res = await resendOwnerInvite(owner.email, locale);
            if (res.success) {
                setResendState((s) => ({ ...s, [owner.id]: 'done' }));
                toast.success(locale === 'en' ? 'Invite resent' : 'Convite reenviado');
                setTimeout(() => setResendState((s) => { const n = { ...s }; delete n[owner.id]; return n; }), 2500);
            } else {
                setResendState((s) => { const n = { ...s }; delete n[owner.id]; return n; });
                toast.error(res.error || (locale === 'en' ? 'Failed to resend' : 'Falha ao reenviar'));
            }
        } catch (err: any) {
            setResendState((s) => { const n = { ...s }; delete n[owner.id]; return n; });
            toast.error(err.message || (locale === 'en' ? 'Failed to resend' : 'Falha ao reenviar'));
        }
    };

    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<OwnerWithCount | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Reset-password modal state
    const [pwTarget, setPwTarget] = useState<OwnerWithCount | null>(null);
    const [pwValue, setPwValue] = useState('');
    const [pwConfirm, setPwConfirm] = useState('');
    const [pwShow, setPwShow] = useState(false);
    const [pwSaving, setPwSaving] = useState(false);
    const [pwDone, setPwDone] = useState(false);

    const pwHasMin = pwValue.length >= 8;
    const pwHasNum = /\d/.test(pwValue);
    const pwHasLetter = /[a-zA-Z]/.test(pwValue);
    const pwValid = pwHasMin && pwHasNum && pwHasLetter && pwValue === pwConfirm;

    const openPasswordModal = (owner: OwnerWithCount) => {
        setPwTarget(owner);
        setPwValue('');
        setPwConfirm('');
        setPwShow(false);
        setPwDone(false);
    };

    const generatePassword = () => {
        const digits = Math.floor(1000 + Math.random() * 9000);
        const suffix = Math.random().toString(36).slice(2, 6);
        const pw = `Lovely-${digits}-${suffix}`;
        setPwValue(pw);
        setPwConfirm(pw);
        setPwShow(true);
    };

    const [viewingAsId, setViewingAsId] = useState<string | null>(null);
    const handleViewAs = async (owner: OwnerWithCount) => {
        setViewingAsId(owner.id);
        try {
            await startImpersonation(owner.id);
            toast.success(locale === 'en' ? `Opening ${owner.full_name || owner.email}'s portal…` : `A abrir o portal de ${owner.full_name || owner.email}…`);
            router.push(`/${locale}/owner`);
            router.refresh();
        } catch (err: any) {
            toast.error(err.message || (locale === 'en' ? 'Failed to open portal' : 'Falha ao abrir o portal'));
            setViewingAsId(null);
        }
    };

    const handleSetPassword = async () => {
        if (!pwTarget || !pwValid) return;
        setPwSaving(true);
        try {
            const res = await setOwnerPassword(pwTarget.id, pwValue);
            if (res?.success) {
                setPwDone(true);
                toast.success(locale === 'en' ? 'Password updated' : 'Password atualizada');
            } else {
                toast.error(res?.error || (locale === 'en' ? 'Failed to set password' : 'Falha ao definir password'));
            }
        } catch (err: any) {
            toast.error(err.message || (locale === 'en' ? 'Failed to set password' : 'Falha ao definir password'));
        } finally {
            setPwSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            const res = await deleteOwner(deleteTarget.id, locale);
            if (res?.success) {
                toast.success(locale === 'en' ? 'Owner deleted' : 'Proprietário eliminado');
                setDeleteTarget(null);
                fetchOwners();
            }
        } catch (err: any) {
            toast.error(err.message || (locale === 'en' ? 'Failed to delete' : 'Falha ao eliminar'));
        } finally {
            setDeleting(false);
        }
    };

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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-playfair font-bold text-[#171717] dark:text-admin-dark-text-primary">
                        {t('title')}
                    </h1>
                    <p className="text-[#a3a3a3] mt-1">{t('subtitle')}</p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    {/* Search */}
                    <div className="relative flex-1 md:flex-none md:w-72">
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
                        className="bg-[#171717] dark:bg-white text-white dark:text-[#171717] px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-black/90 dark:hover:bg-white/90 transition-colors shadow-sm inline-flex items-center justify-center gap-2 shrink-0"
                    >
                        <Plus className="size-4" />
                        {t('addOwner')}
                    </button>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="bg-white dark:bg-admin-dark-surface rounded-2xl border border-[#f5f5f5] dark:border-admin-dark-border shadow-sm overflow-hidden py-20 flex justify-center">
                    <Loader2 className="size-8 animate-spin text-[#a3a3a3]" />
                </div>
            ) : filteredOwners.length === 0 ? (
                <div className="bg-white dark:bg-admin-dark-surface rounded-2xl border border-[#f5f5f5] dark:border-admin-dark-border shadow-sm overflow-hidden py-20 flex flex-col items-center justify-center text-center px-4">
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
                <>
                <div className="hidden md:block bg-white dark:bg-admin-dark-surface rounded-2xl border border-[#f5f5f5] dark:border-admin-dark-border shadow-sm overflow-hidden">
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
                                                {owner.units_count > 0 ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20" title="Properties">
                                                        <Home className="size-3" />
                                                        {owner.units_count}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-gray-50 dark:bg-admin-dark-bg text-gray-400 dark:text-gray-500 border border-gray-100 dark:border-admin-dark-border">
                                                        <Home className="size-3" />
                                                        0
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <div className="inline-flex items-center gap-2 justify-end">
                                                <Link
                                                    href={`/${locale}/admin/owners/${owner.id}`}
                                                    className="inline-flex items-center text-xs font-bold text-[#171717] dark:text-admin-dark-text-primary hover:underline"
                                                >
                                                    {t('actions.manage')}
                                                </Link>

                                                <div className="relative">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            if (openMenuId === owner.id) {
                                                                setOpenMenuId(null);
                                                            } else {
                                                                const r = e.currentTarget.getBoundingClientRect();
                                                                setMenuPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
                                                                setOpenMenuId(owner.id);
                                                            }
                                                        }}
                                                        aria-label={locale === 'en' ? 'More actions' : 'Mais ações'}
                                                        className="size-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-[#171717] dark:hover:text-admin-dark-text-primary hover:bg-gray-100 dark:hover:bg-admin-dark-bg transition-colors"
                                                    >
                                                        <MoreVertical className="size-4" />
                                                    </button>

                                                    {openMenuId === owner.id && (
                                                        <>
                                                            <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                                                            <div
                                                                className="fixed w-56 bg-white dark:bg-admin-dark-surface rounded-xl shadow-xl border border-gray-100 dark:border-admin-dark-border p-1.5 z-50 text-left"
                                                                style={{ top: menuPos?.top, right: menuPos?.right }}
                                                            >
                                                                {currentUserRole === 'super_admin' && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => { setOpenMenuId(null); handleViewAs(owner); }}
                                                                        disabled={viewingAsId === owner.id}
                                                                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-[#171717] dark:text-admin-dark-text-primary hover:bg-gray-50 dark:hover:bg-admin-dark-bg transition-colors disabled:opacity-50"
                                                                    >
                                                                        {viewingAsId === owner.id ? <Loader2 className="size-4 animate-spin text-gray-400" /> : <Eye className="size-4 text-gray-400" />}
                                                                        {locale === 'en' ? 'View as owner (read-only)' : 'Ver como owner (só leitura)'}
                                                                    </button>
                                                                )}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => { setOpenMenuId(null); handleResend(owner); }}
                                                                    disabled={!owner.email}
                                                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-[#171717] dark:text-admin-dark-text-primary hover:bg-gray-50 dark:hover:bg-admin-dark-bg transition-colors disabled:opacity-50"
                                                                >
                                                                    <Send className="size-4 text-gray-400" />
                                                                    {locale === 'en' ? 'Resend invite' : 'Reenviar convite'}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => { setOpenMenuId(null); openPasswordModal(owner); }}
                                                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-[#171717] dark:text-admin-dark-text-primary hover:bg-gray-50 dark:hover:bg-admin-dark-bg transition-colors"
                                                                >
                                                                    <KeyRound className="size-4 text-gray-400" />
                                                                    {locale === 'en' ? 'Reset password' : 'Repor password'}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => { setOpenMenuId(null); setDeleteTarget(owner); }}
                                                                    disabled={owner.units_count > 0}
                                                                    title={owner.units_count > 0 ? (locale === 'en' ? 'Remove properties first' : 'Remova os imóveis primeiro') : undefined}
                                                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                                                >
                                                                    <Trash2 className="size-4" />
                                                                    {locale === 'en' ? 'Delete owner' : 'Eliminar proprietário'}
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                    {filteredOwners.map((owner) => (
                        <div key={owner.id} className="bg-white dark:bg-admin-dark-surface rounded-2xl border border-[#f5f5f5] dark:border-admin-dark-border shadow-sm overflow-hidden">
                            <div className="flex items-start gap-3 p-4">
                                <div className="size-10 rounded-full bg-[#171717] text-white flex items-center justify-center font-bold text-sm shrink-0">
                                    {(owner.full_name || owner.email || '?').charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-bold text-[#171717] dark:text-admin-dark-text-primary text-sm truncate">{owner.full_name || t('unnamed')}</p>
                                    <p className="text-xs text-[#a3a3a3]">{owner.created_at && !isNaN(new Date(owner.created_at).getTime()) ? new Date(owner.created_at).toLocaleDateString() : 'N/A'}</p>
                                    <div className="flex items-center gap-2 text-xs text-[#a3a3a3] mt-1.5"><Mail className="size-3 shrink-0" /><span className="truncate">{owner.email}</span></div>
                                    {owner.phone && <div className="flex items-center gap-2 text-xs text-[#a3a3a3] mt-0.5"><Phone className="size-3 shrink-0" />{owner.phone}</div>}
                                </div>
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 ${owner.units_count > 0 ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20' : 'bg-gray-50 dark:bg-admin-dark-bg text-gray-400 dark:text-gray-500 border border-gray-100 dark:border-admin-dark-border'}`}>
                                    <Home className="size-3" />{owner.units_count}
                                </span>
                            </div>
                            <div className="flex items-center justify-between px-4 py-2.5 border-t border-[#f5f5f5] dark:border-admin-dark-border">
                                <Link href={`/${locale}/admin/owners/${owner.id}`} className="text-xs font-bold text-[#171717] dark:text-admin-dark-text-primary hover:underline">{t('actions.manage')}</Link>
                                <button type="button" onClick={() => setOpenMenuId(owner.id)} className="p-2 rounded-xl text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-all" aria-label={locale === 'en' ? 'More actions' : 'Mais ações'}>
                                    <MoreVertical className="size-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                </>
            )}

            {/* Mobile actions bottom sheet */}
            {openMenuId && (() => {
                const owner = filteredOwners.find(o => o.id === openMenuId);
                if (!owner) return null;
                return (
                    <div className="md:hidden fixed inset-0 z-[120] flex items-end animate-in fade-in duration-200">
                        <div className="absolute inset-0 bg-black/50" onClick={() => setOpenMenuId(null)} />
                        <div className="relative w-full bg-white dark:bg-admin-dark-surface rounded-t-3xl border-t border-[#f5f5f5] dark:border-admin-dark-border p-2 pb-6 animate-in slide-in-from-bottom duration-300">
                            <div className="mx-auto mt-2 mb-3 h-1.5 w-10 rounded-full bg-gray-200 dark:bg-white/10" />
                            <p className="px-4 pb-2 text-xs font-bold text-[#a3a3a3] uppercase tracking-widest truncate">{owner.full_name || owner.email}</p>
                            {currentUserRole === 'super_admin' && (
                                <button onClick={() => { setOpenMenuId(null); handleViewAs(owner); }} disabled={viewingAsId === owner.id} className="w-full text-left px-4 py-3 text-sm font-medium text-[#171717] dark:text-admin-dark-text-primary hover:bg-gray-50 dark:hover:bg-admin-dark-bg rounded-xl flex items-center gap-3 disabled:opacity-50">
                                    {viewingAsId === owner.id ? <Loader2 className="size-5 animate-spin text-gray-400" /> : <Eye className="size-5 text-gray-400" />}
                                    {locale === 'en' ? 'View as owner (read-only)' : 'Ver como owner (só leitura)'}
                                </button>
                            )}
                            <button onClick={() => { setOpenMenuId(null); handleResend(owner); }} disabled={!owner.email} className="w-full text-left px-4 py-3 text-sm font-medium text-[#171717] dark:text-admin-dark-text-primary hover:bg-gray-50 dark:hover:bg-admin-dark-bg rounded-xl flex items-center gap-3 disabled:opacity-50">
                                <Send className="size-5 text-gray-400" />{locale === 'en' ? 'Resend invite' : 'Reenviar convite'}
                            </button>
                            <button onClick={() => { setOpenMenuId(null); openPasswordModal(owner); }} className="w-full text-left px-4 py-3 text-sm font-medium text-[#171717] dark:text-admin-dark-text-primary hover:bg-gray-50 dark:hover:bg-admin-dark-bg rounded-xl flex items-center gap-3">
                                <KeyRound className="size-5 text-gray-400" />{locale === 'en' ? 'Reset password' : 'Repor password'}
                            </button>
                            <button onClick={() => { setOpenMenuId(null); setDeleteTarget(owner); }} disabled={owner.units_count > 0} className="w-full text-left px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl flex items-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed">
                                <Trash2 className="size-5" />{locale === 'en' ? 'Delete owner' : 'Eliminar proprietário'}
                            </button>
                        </div>
                    </div>
                );
            })()}

            {/* Modal */}
            <InviteUserModal
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
                onSuccess={fetchOwners}
                currentUserRole={currentUserRole || 'user'}
                initialRole="owner"
                allowedRoles={['owner']}
            />

            {/* Delete confirmation */}
            {deleteTarget && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-[#0a1128]/40 backdrop-blur-sm"
                        onClick={() => !deleting && setDeleteTarget(null)}
                    />
                    <div className="relative w-full max-w-sm bg-white dark:bg-admin-dark-surface rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in duration-200">
                        <div className="size-12 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-4">
                            <Trash2 className="size-6 text-red-600" />
                        </div>
                        <h3 className="text-lg font-bold text-[#171717] dark:text-admin-dark-text-primary">
                            {locale === 'en' ? 'Delete owner?' : 'Eliminar proprietário?'}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            {locale === 'en'
                                ? `This permanently removes ${deleteTarget.full_name || deleteTarget.email}. This action cannot be undone.`
                                : `Isto remove permanentemente ${deleteTarget.full_name || deleteTarget.email}. Esta ação não pode ser desfeita.`}
                        </p>
                        <div className="flex gap-3 mt-6">
                            <button
                                type="button"
                                onClick={() => setDeleteTarget(null)}
                                disabled={deleting}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-admin-dark-border text-sm font-bold text-gray-500 hover:bg-gray-50 dark:hover:bg-admin-dark-bg transition-colors disabled:opacity-50"
                            >
                                {locale === 'en' ? 'Cancel' : 'Cancelar'}
                            </button>
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={deleting}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                            >
                                {deleting && <Loader2 className="size-4 animate-spin" />}
                                {locale === 'en' ? 'Delete' : 'Eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reset password modal */}
            {pwTarget && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-[#0a1128]/40 backdrop-blur-sm"
                        onClick={() => !pwSaving && setPwTarget(null)}
                    />
                    <div className="relative w-full max-w-md bg-white dark:bg-admin-dark-surface rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in duration-200">
                        <div className="size-12 rounded-full bg-[#171717]/5 dark:bg-white/10 flex items-center justify-center mb-4">
                            <KeyRound className="size-6 text-[#171717] dark:text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-[#171717] dark:text-admin-dark-text-primary">
                            {locale === 'en' ? 'Reset password' : 'Repor password'}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            {locale === 'en'
                                ? `Set a new password for ${pwTarget.full_name || pwTarget.email}. Share it with the owner — they can change it after logging in.`
                                : `Define uma nova password para ${pwTarget.full_name || pwTarget.email}. Partilha-a com o proprietário — ele pode alterá-la após entrar.`}
                        </p>

                        {pwDone ? (
                            <div className="mt-5 space-y-4">
                                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
                                    <p className="text-[10px] uppercase tracking-widest font-bold text-emerald-600/70 mb-1">
                                        {locale === 'en' ? 'Password set' : 'Password definida'}
                                    </p>
                                    <div className="flex items-center justify-between gap-2">
                                        <code className="text-sm font-bold text-[#171717] dark:text-white break-all">{pwValue}</code>
                                        <button
                                            type="button"
                                            onClick={() => { navigator.clipboard.writeText(pwValue); toast.success(locale === 'en' ? 'Copied' : 'Copiado'); }}
                                            className="shrink-0 size-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-[#171717] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-admin-dark-bg transition-colors"
                                            aria-label={locale === 'en' ? 'Copy' : 'Copiar'}
                                        >
                                            <Copy className="size-4" />
                                        </button>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setPwTarget(null)}
                                    className="w-full px-4 py-2.5 rounded-xl bg-[#171717] dark:bg-white text-white dark:text-[#171717] text-sm font-bold hover:opacity-90 transition-opacity"
                                >
                                    {locale === 'en' ? 'Done' : 'Concluir'}
                                </button>
                            </div>
                        ) : (
                            <div className="mt-5 space-y-4">
                                <div className="relative">
                                    <input
                                        type={pwShow ? 'text' : 'password'}
                                        value={pwValue}
                                        onChange={(e) => setPwValue(e.target.value)}
                                        placeholder={locale === 'en' ? 'New password' : 'Nova password'}
                                        className="w-full bg-white dark:bg-admin-dark-bg border border-gray-200 dark:border-admin-dark-border rounded-xl pl-4 pr-11 py-3 text-sm focus:border-[#171717] dark:focus:border-white transition-all outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setPwShow(!pwShow)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#171717] dark:hover:text-white transition-colors"
                                    >
                                        {pwShow ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                    </button>
                                </div>
                                <input
                                    type={pwShow ? 'text' : 'password'}
                                    value={pwConfirm}
                                    onChange={(e) => setPwConfirm(e.target.value)}
                                    placeholder={locale === 'en' ? 'Confirm password' : 'Confirmar password'}
                                    className="w-full bg-white dark:bg-admin-dark-bg border border-gray-200 dark:border-admin-dark-border rounded-xl px-4 py-3 text-sm focus:border-[#171717] dark:focus:border-white transition-all outline-none"
                                />

                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                                    <span className={pwHasMin ? 'text-emerald-600' : 'text-gray-400'}>{locale === 'en' ? '8+ chars' : '8+ caracteres'}</span>
                                    <span className={pwHasLetter ? 'text-emerald-600' : 'text-gray-400'}>{locale === 'en' ? '1 letter' : '1 letra'}</span>
                                    <span className={pwHasNum ? 'text-emerald-600' : 'text-gray-400'}>{locale === 'en' ? '1 number' : '1 número'}</span>
                                    {pwConfirm.length > 0 && (
                                        <span className={pwValue === pwConfirm ? 'text-emerald-600' : 'text-red-500'}>{locale === 'en' ? 'match' : 'coincide'}</span>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    onClick={generatePassword}
                                    className="text-xs font-bold text-[#171717] dark:text-admin-dark-text-primary hover:underline"
                                >
                                    {locale === 'en' ? 'Generate a strong password' : 'Gerar password forte'}
                                </button>

                                <div className="flex gap-3 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => setPwTarget(null)}
                                        disabled={pwSaving}
                                        className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-admin-dark-border text-sm font-bold text-gray-500 hover:bg-gray-50 dark:hover:bg-admin-dark-bg transition-colors disabled:opacity-50"
                                    >
                                        {locale === 'en' ? 'Cancel' : 'Cancelar'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSetPassword}
                                        disabled={pwSaving || !pwValid}
                                        className="flex-1 px-4 py-2.5 rounded-xl bg-[#171717] dark:bg-white text-white dark:text-[#171717] text-sm font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {pwSaving && <Loader2 className="size-4 animate-spin" />}
                                        {locale === 'en' ? 'Set password' : 'Definir password'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div >
    );
}
