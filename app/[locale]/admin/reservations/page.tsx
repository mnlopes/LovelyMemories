"use client";

import { Calendar, Search, Filter, Plus, ChevronLeft, ChevronRight, MoreHorizontal, User, Mail, Phone, Home, Trash2, ArrowUpDown, Check, Ban } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { deleteReservation } from "@/app/actions/reservation";
import { updateReservationStatus } from "@/app/actions/admin-reservation-actions";
import { StatusModal } from "@/components/admin/ui/StatusModal";
import { DateRangePicker } from "@/components/admin/ui/DateRangePicker";
import { DateRange } from "react-day-picker";
import { isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";

import { ActivityTimeline } from "@/components/admin/ActivityTimeline";
import { ReservationDetailSheet } from "@/components/admin/ReservationDetailSheet";
import { MultiCalendarView } from "@/components/admin/reservations/MultiCalendarView";
import { History } from "lucide-react";

export default function AdminReservationsPage() {
    const params = useParams();
    const t = useTranslations('AdminReservations');
    const locale = (params?.locale as string) || 'en';
    const [view, setView] = useState<'calendar' | 'list'>('list');
    const [reservations, setReservations] = useState<any[]>([]);
    const [blockedDates, setBlockedDates] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [role, setRole] = useState<string | null>(null);

    // Multi-Calendar Data
    const [propertiesMap, setPropertiesMap] = useState<{ [key: string]: any }>({});
    const [propertyImagesMap, setPropertyImagesMap] = useState<{ [key: string]: string }>({});

    // History Modal State
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);

    // Detail Sheet State
    const [detailSheetReservation, setDetailSheetReservation] = useState<any | null>(null);

    // Fetch user role
    useEffect(() => {
        const fetchRole = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();
                if (profile) setRole(profile.role);
            }
        };
        fetchRole();
    }, []);

    // Sorting State
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'created_at', direction: 'desc' });

    // Search
    const [searchQuery, setSearchQuery] = useState("");
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Modal State
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

    const isNew = (createdAt: string) => {
        if (!createdAt) return false;
        const created = new Date(createdAt);
        const now = new Date();
        const diffInHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
        return diffInHours <= 24;
    };

    const handleSort = (key: string) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const fetchData = async () => {
        // Fetch reservations, properties, and blocked dates
        const [reservationsResult, propertiesResult, blockedDatesResult] = await Promise.all([
            supabase
                .from('reservations')
                .select('*, properties:property_id(*)')
                .order('created_at', { ascending: false }),
            supabase
                .from('properties')
                .select('id, title, subtitle, images, city, address, bedrooms, bathrooms, max_guests'),
            supabase
                .from('blocked_dates')
                .select('*')
        ]);

        if (reservationsResult.error) {
            console.error("Error fetching reservations:", reservationsResult.error);
            return;
        }

        if (propertiesResult.error) {
            console.error("Error fetching properties:", propertiesResult.error);
        }

        if (blockedDatesResult.error) {
            console.error("Error fetching blocked dates:", blockedDatesResult.error);
        }

        const newPropertiesMap: { [key: string]: any } = {};
        const newPropertyImagesMap: { [key: string]: string } = {};

        const getTranslation = (field: any, currentLocale: string) => {
            if (!field) return '';
            if (typeof field === 'string') return field;
            if (typeof field === 'object') {
                return field[currentLocale] || field.en || Object.values(field)[0] || '';
            }
            return '';
        };

        (propertiesResult.data || []).forEach((prop: any) => {
            const title = getTranslation(prop.title, locale) || 'Untitled Property';
            const subtitle = getTranslation(prop.subtitle, locale);
            const city = getTranslation(prop.city, locale);
            const mainImage = prop.images?.[0]?.url || (typeof prop.images?.[0] === 'string' ? prop.images[0] : "");

            newPropertiesMap[prop.id] = {
                ...prop,
                title,
                subtitle,
                city,
                mainImage
            };

            if (mainImage && mainImage.trim().length > 0) {
                newPropertyImagesMap[prop.id] = mainImage;
            }
        });

        setPropertiesMap(newPropertiesMap);
        setPropertyImagesMap(newPropertyImagesMap);
        setBlockedDates(blockedDatesResult.data || []);

        const enhancedReservations = (reservationsResult.data || []).map((res: any) => ({
            ...res,
            property_name: newPropertiesMap[res.property_id]?.title || 'Unknown Property',
            properties: (propertiesResult.data || []).find((p: any) => p.id === res.property_id) || res.properties
        }));

        setReservations(enhancedReservations);
        setIsLoading(false);
    };

    useEffect(() => {
        fetchData();

        // Set up real-time subscription
        const channel = supabase
            .channel('reservations-realtime')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'reservations'
                },
                (payload) => {
                    console.log('Real-time insertion:', payload);
                    toast.info(t('notifications.newReservation'), {
                        description: t('notifications.listUpdated'),
                        duration: 5000,
                    });
                    fetchData();
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*', // Catch other events like Update/Delete without toast
                    schema: 'public',
                    table: 'reservations'
                },
                (payload) => {
                    if (payload.eventType !== 'INSERT') {
                        console.log('Real-time update:', payload);
                        fetchData();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
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

    const confirmDelete = (id: string) => {
        setOpenMenuId(null);
        setModalConfig({
            isOpen: true,
            type: 'error',
            title: t('modals.deleteTitle'),
            message: t('modals.deleteMessage'),
            actionLabel: t('modals.deleteConfirm'),
            onAction: () => handleDelete(id)
        });
    };

    const handleDelete = async (id: string) => {
        setModalConfig(prev => ({ ...prev, type: 'loading', title: t('modals.deleting'), message: t('modals.removing') }));

        try {
            await deleteReservation(id);
            setReservations(prev => prev.filter(r => r.id !== id));
            setModalConfig({
                isOpen: true,
                type: 'success',
                title: t('modals.deletedTitle'),
                message: t('modals.deletedMessage'),
                actionLabel: t('modals.done'),
                onAction: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
            });
        } catch (error: any) {
            setModalConfig({
                isOpen: true,
                type: 'error',
                title: t('modals.errorDeleting'),
                message: error.message || t('modals.unexpectedError'),
                actionLabel: t('AdminProperties.modals.close'),
                onAction: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
            });
        }
    };

    const handleStatusUpdate = async (id: string, newStatus: 'confirmed' | 'cancelled') => {
        setOpenMenuId(null);
        setModalConfig({
            isOpen: true,
            type: newStatus === 'confirmed' ? 'success' : 'warning',
            title: newStatus === 'confirmed' ? t('modals.approveTitle') : t('modals.rejectTitle'),
            message: newStatus === 'confirmed'
                ? t('modals.approveMessage')
                : t('modals.rejectMessage'),
            actionLabel: newStatus === 'confirmed' ? t('modals.confirmApprove') : t('modals.confirmReject'),
            onAction: async () => {
                const toastId = toast.loading(t('modals.updating'));
                try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) throw new Error("Não autenticado");

                    await updateReservationStatus(id, newStatus);
                    toast.success(newStatus === 'confirmed' ? t('modals.successApprove') : t('modals.successReject'), { id: toastId });
                    setModalConfig(prev => ({ ...prev, isOpen: false }));
                    fetchData();
                } catch (error: any) {
                    toast.error(`${t('modals.unexpectedError')}: ${error.message}`, { id: toastId });
                }
            }
        });
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString();
    };

    // Filter Logic
    const filteredReservations = reservations.filter(res => {
        const query = searchQuery.toLowerCase();
        const guestName = (res.guest_name || '').toLowerCase();
        const guestEmail = (res.guest_email || '').toLowerCase();
        const propName = (res.property_name || '').toLowerCase();

        const matchesSearch = guestName.includes(query) || guestEmail.includes(query) || propName.includes(query);

        let matchesDate = true;
        if (dateRange?.from && res.check_in) {
            const checkIn = new Date(res.check_in);
            const start = startOfDay(dateRange.from);
            const end = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from); // Allow single date selection
            matchesDate = isWithinInterval(checkIn, { start, end });
        }

        return matchesSearch && matchesDate;
    }).sort((a, b) => {
        if (sortConfig.key === 'check_in') {
            const dateA = new Date(a.check_in).getTime();
            const dateB = new Date(b.check_in).getTime();
            return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
        }
        if (sortConfig.key === 'created_at') {
            const dateA = new Date(a.created_at).getTime();
            const dateB = new Date(b.created_at).getTime();
            return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
        }
        return 0; // Default no sort if needed
    });

    return (
        <div className="space-y-10 pb-20">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-[#171717] dark:text-admin-dark-text-primary">{t('title')}</h2>
                    <p className="text-[#a3a3a3] mt-2 font-medium">{t('subtitle')}</p>
                </div>
                <div className="flex gap-3">
                    <div className="bg-white dark:bg-admin-dark-surface border border-[#f5f5f5] dark:border-admin-dark-border rounded-lg p-1 flex transition-colors duration-300">
                        <button
                            onClick={() => setView('calendar')}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${view === 'calendar' ? 'bg-[#171717] dark:bg-white text-white dark:text-black shadow-sm' : 'text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white'}`}
                        >
                            {t('calendar')}
                        </button>
                        <button
                            onClick={() => setView('list')}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${view === 'list' ? 'bg-[#171717] dark:bg-white text-white dark:text-black shadow-sm' : 'text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white'}`}
                        >
                            {t('list')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            {view === 'list' && (
                <div className="flex items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a3a3a3] size-4" />
                        <input
                            type="text"
                            placeholder={t('searchPlaceholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white dark:bg-admin-dark-surface border border-[#f5f5f5] dark:border-admin-dark-border pl-10 pr-4 py-2 rounded-lg text-sm focus:ring-1 focus:ring-[#8ca38c] outline-none shadow-sm dark:text-admin-dark-text-primary transition-colors"
                        />
                    </div>
                    <DateRangePicker date={dateRange} setDate={setDateRange} />
                </div>
            )}

            {view === 'calendar' ? (
                /* Calendar View */
                <MultiCalendarView
                    reservations={reservations}
                    properties={propertiesMap}
                    propertyImages={propertyImagesMap}
                    locale={locale}
                    blockedDates={blockedDates}
                    onRefresh={fetchData}
                />
            ) : (
                /* List View */
                <div className="bg-white dark:bg-admin-dark-surface rounded-2xl border border-[#f5f5f5] dark:border-admin-dark-border overflow-visible shadow-sm min-h-[400px] transition-colors duration-300">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-[#f5f5f5] dark:border-admin-dark-border">
                                <th className="px-8 py-5 text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest">{t('table.guestProperty')}</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest cursor-pointer group/header" onClick={() => handleSort('created_at')}>
                                    <div className="flex items-center gap-2">
                                        {t('table.bookingDate')}
                                        <ArrowUpDown className={`size-3 transition-colors ${sortConfig.key === 'created_at' ? 'text-[#171717] dark:text-white' : 'text-[#a3a3a3] group-hover/header:text-[#171717] dark:group-hover/header:text-white'}`} />
                                    </div>
                                </th>
                                <th className="px-8 py-5 text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest cursor-pointer group/header" onClick={() => handleSort('check_in')}>
                                    <div className="flex items-center gap-2">
                                        {t('table.stayDates')}
                                        <ArrowUpDown className={`size-3 transition-colors ${sortConfig.key === 'check_in' ? 'text-[#171717] dark:text-white' : 'text-[#a3a3a3] group-hover/header:text-[#171717] dark:group-hover/header:text-white'}`} />
                                    </div>
                                </th>
                                <th className="px-8 py-5 text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest">{t('table.contact')}</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest">{t('table.status')}</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest text-right">{t('table.action')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#f5f5f5] dark:divide-admin-dark-border">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-10 text-center text-[#a3a3a3] text-sm italic">{t('table.loading')}</td>
                                </tr>
                            ) : filteredReservations.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-10 text-center text-[#a3a3a3] text-sm">
                                        {t('table.empty', { query: searchQuery })}
                                    </td>
                                </tr>
                            ) : filteredReservations.map((reservation) => (
                                <tr
                                    key={reservation.id}
                                    onClick={() => setDetailSheetReservation(reservation)}
                                    className={cn(
                                        "group transition-all cursor-pointer border-b border-[#f5f5f5] dark:border-admin-dark-border relative",
                                        detailSheetReservation?.id === reservation.id
                                            ? "bg-gold-100/50 dark:bg-gold-500/10 shadow-[inset_4px_0_0_0_#c5a059]"
                                            : "hover:bg-[#fafafa]/50 dark:hover:bg-admin-dark-bg/50"
                                    )}
                                >
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="size-10 rounded-full bg-[#f5f5f5] dark:bg-admin-dark-bg flex items-center justify-center text-[#171717] dark:text-admin-dark-text-primary shadow-sm border border-[#eeeeee] dark:border-admin-dark-border relative">
                                                <User className="size-5 stroke-[1.5px]" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold text-[#171717] dark:text-admin-dark-text-primary">{reservation.guest_name || 'Guest'}</p>
                                                    {isNew(reservation.created_at) && (
                                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400 border border-sky-200 dark:border-sky-500/20 uppercase tracking-wide">{t('table.new')}</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1 mt-0.5 text-xs text-[#a3a3a3]">
                                                    <Home className="size-3" />
                                                    {reservation.property_name || 'Unknown Property'}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-sm font-bold text-[#171717] dark:text-admin-dark-text-primary">{formatDate(reservation.created_at)}</span>
                                            <span className="text-[10px] text-[#a3a3a3] uppercase font-bold tracking-tighter">{t('table.reservedAt')}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-sm font-bold text-[#171717] dark:text-admin-dark-text-primary">{formatDate(reservation.check_in)}</span>
                                            <span className="text-xs text-[#a3a3a3] font-medium">{t('table.to')} {formatDate(reservation.check_out)}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col gap-1.5">
                                            {reservation.guest_email && (
                                                <div className="flex items-center gap-2 text-xs text-[#171717] dark:text-admin-dark-text-primary">
                                                    <Mail className="size-3 text-[#a3a3a3]" />
                                                    {reservation.guest_email}
                                                </div>
                                            )}
                                            {reservation.guest_phone && (
                                                <div className="flex items-center gap-2 text-xs text-[#171717] dark:text-admin-dark-text-primary">
                                                    <Phone className="size-3 text-[#a3a3a3]" />
                                                    {reservation.guest_phone}
                                                </div>
                                            )}
                                            {!reservation.guest_email && !reservation.guest_phone && (
                                                <span className="text-xs text-[#a3a3a3] italic">{t('table.noContact')}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${reservation.status === 'confirmed'
                                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/30'
                                            : reservation.status === 'pending'
                                                ? 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-100 dark:border-yellow-500/30'
                                                : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-500/30'
                                            }`}>
                                            {reservation.status ? t(`status.${reservation.status}`) : t('status.pending')}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-right font-medium relative" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            id={`menu-trigger-${reservation.id}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenMenuId(openMenuId === reservation.id ? null : reservation.id);
                                            }}
                                            className="text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white transition-colors p-2 hover:bg-gray-100 dark:hover:bg-admin-dark-bg rounded-lg"
                                        >
                                            <MoreHorizontal className="size-5" />
                                        </button>

                                        {/* Dropdown Menu */}
                                        {openMenuId === reservation.id && (role === 'admin' || role === 'super_admin') && (
                                            <div
                                                ref={menuRef}
                                                className="absolute right-8 top-12 w-48 bg-white dark:bg-admin-dark-surface rounded-xl shadow-xl border border-[#f5f5f5] dark:border-admin-dark-border z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
                                            >
                                                <div className="p-1">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenMenuId(null);
                                                            setSelectedReservationId(reservation.id);
                                                            setHistoryModalOpen(true);
                                                        }}
                                                        className="w-full text-left px-3 py-2.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg flex items-center gap-2 transition-colors"
                                                    >
                                                        <History className="size-4" />
                                                        {t('actions.viewHistory')}
                                                    </button>

                                                    {reservation.status === 'pending' && (
                                                        <>
                                                            <div className="h-px bg-gray-100 dark:bg-white/10 my-1" />
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleStatusUpdate(reservation.id, 'confirmed'); }}
                                                                className="w-full text-left px-3 py-2.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg flex items-center gap-2 transition-colors"
                                                            >
                                                                <Check className="size-4" />
                                                                {t('actions.approve')}
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleStatusUpdate(reservation.id, 'cancelled'); }}
                                                                className="w-full text-left px-3 py-2.5 text-xs font-medium text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-500/10 rounded-lg flex items-center gap-2 transition-colors"
                                                            >
                                                                <Ban className="size-4" />
                                                                {t('actions.reject')}
                                                            </button>
                                                        </>
                                                    )}

                                                    <div className="h-px bg-gray-100 dark:bg-white/10 my-1" />

                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); confirmDelete(reservation.id); }}
                                                        className="w-full text-left px-3 py-2.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg flex items-center gap-2 transition-colors"
                                                    >
                                                        <Trash2 className="size-4" />
                                                        {t('actions.delete')}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <StatusModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                type={modalConfig.type as any}
                title={modalConfig.title}
                message={modalConfig.message}
                actionLabel={modalConfig.actionLabel}
                onAction={modalConfig.onAction}
            />

            {/* History Modal */}
            {historyModalOpen && selectedReservationId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-admin-dark-surface w-full max-w-2xl max-h-[80vh] rounded-2xl shadow-xl flex flex-col">
                        <div className="p-6 border-b border-gray-100 dark:border-admin-dark-border flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('detail.history')}</h3>
                            <button
                                onClick={() => setHistoryModalOpen(false)}
                                className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                            >
                                <span className="sr-only">Close</span>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <ActivityTimeline
                                resourceType="RESERVATION"
                                resourceId={selectedReservationId}
                                limit={20}
                            />
                        </div>
                    </div>
                </div>
            )}
            {/* Detail Sheet */}
            <ReservationDetailSheet
                reservation={detailSheetReservation}
                onClose={() => setDetailSheetReservation(null)}
                onRefresh={fetchData}
            />
        </div>
    );
}
