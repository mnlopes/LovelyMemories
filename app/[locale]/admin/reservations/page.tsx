"use client";

import { Search, Filter, MoreHorizontal, User, Mail, Phone, Home, Trash2, ArrowUpDown, Check, Ban, Globe, ChevronDown } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { deleteReservation } from "@/app/actions/reservation";
import { getBeds24CalendarPreview, type Beds24CalendarPreviewResult } from "@/app/actions/beds24";
import { deleteBlockedDate } from "@/app/actions/blocked-dates";
import { updateReservationStatus, finishReservationEarly } from "@/app/actions/admin-reservation-actions";
import { StatusModal } from "@/components/admin/ui/StatusModal";
import { DateRangePicker } from "@/components/admin/ui/DateRangePicker";
import { DateRange } from "react-day-picker";
import { isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";

import { ActivityTimeline } from "@/components/admin/ActivityTimeline";
import { ReservationDetailSheet } from "@/components/admin/ReservationDetailSheet";
import { MultiCalendarView } from "@/components/admin/reservations/MultiCalendarView";
import { ReservationListCard } from "@/components/admin/reservations/ReservationListCard";
import { History } from "lucide-react";

export default function AdminReservationsPage() {
    const params = useParams();
    const t = useTranslations('AdminReservations');
    const locale = (params?.locale as string) || 'en';
    const [view, setView] = useState<'calendar' | 'list'>('list');
    type TabOption = 'upcoming' | 'completed' | 'canceled' | 'owners' | 'all';
    const [activeTab, setActiveTab] = useState<TabOption>('upcoming');
    const [reservations, setReservations] = useState<any[]>([]);
    const [blockedDates, setBlockedDates] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [role, setRole] = useState<string | null>(null);

    // New filters states
    const [showAirbnb, setShowAirbnb] = useState(true);
    const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);
    const [showPropertyDropdown, setShowPropertyDropdown] = useState(false);
    const [propertySearchQuery, setPropertySearchQuery] = useState("");
    const [showFiltersBar, setShowFiltersBar] = useState(false);

    // Multi-Calendar Data
    const [propertiesMap, setPropertiesMap] = useState<{ [key: string]: any }>({});
    const [propertyImagesMap, setPropertyImagesMap] = useState<{ [key: string]: string }>({});

    // History Modal State
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);

    // Detail Sheet State
    const [detailSheetReservation, setDetailSheetReservation] = useState<any | null>(null);

    // Preview Beds24 no calendário (super_admin; lente local, não persiste)
    const [beds24Preview, setBeds24Preview] = useState(false);
    const [beds24Data, setBeds24Data] = useState<Extract<Beds24CalendarPreviewResult, { ok: true }> | null>(null);
    const [beds24Loading, setBeds24Loading] = useState(false);

    const toggleBeds24Preview = async () => {
        if (beds24Preview) { setBeds24Preview(false); setBeds24Data(null); return; }
        setBeds24Loading(true);
        try {
            const r = await getBeds24CalendarPreview();
            if (!r.ok) { toast.error(t('beds24PreviewError')); return; }
            setBeds24Data(r);
            setBeds24Preview(true);
        } catch {
            toast.error(t('beds24PreviewError'));
        } finally {
            setBeds24Loading(false);
        }
    };

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
    const propertyDropdownRef = useRef<HTMLDivElement>(null);

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
                .select('id, title, subtitle, images, city, address, bedrooms, bathrooms, max_guests, is_multi_unit'),
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

        const enhancedBlockedDates = (blockedDatesResult.data || []).map((bd: any) => {
            const isAirbnb = bd.source === 'airbnb_booking';
            return {
                id: `block-${bd.id}`,
                original_id: bd.id,
                is_manual_block: !isAirbnb,
                is_airbnb: isAirbnb,
                property_id: bd.property_id,
                property_name: newPropertiesMap[bd.property_id]?.title || 'Unknown Property',
                guest_name: isAirbnb ? 'Airbnb' : t('table.ownerBooking'),
                reason: bd.reason,
                check_in: bd.start_date,
                check_out: bd.end_date,
                created_at: bd.created_at || bd.start_date,
                status: isAirbnb ? 'airbnb' : 'owner_block',
                properties: (propertiesResult.data || []).find((p: any) => p.id === bd.property_id)
            };
        });

        setReservations([...enhancedReservations, ...enhancedBlockedDates].sort((a, b) => {
            const dateA = new Date(a.created_at).getTime();
            const dateB = new Date(b.created_at).getTime();
            return dateB - dateA; // default sort descending
        }));
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
            if (propertyDropdownRef.current && !propertyDropdownRef.current.contains(event.target as Node)) {
                setShowPropertyDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const confirmDelete = (id: string, isManualBlock: boolean = false) => {
        setOpenMenuId(null);
        setModalConfig({
            isOpen: true,
            type: 'error',
            title: t('modals.deleteTitle'),
            message: t('modals.deleteMessage'),
            actionLabel: t('modals.deleteConfirm'),
            onAction: () => handleDelete(id, isManualBlock)
        });
    };

    const handleDelete = async (id: string, isManualBlock: boolean = false) => {
        setModalConfig(prev => ({ ...prev, type: 'loading', title: t('modals.deleting'), message: t('modals.removing') }));

        try {
            if (isManualBlock) {
                const blockId = id.startsWith('block-') ? id.replace('block-', '') : id;
                await deleteBlockedDate(blockId);
            } else {
                await deleteReservation(id);
            }
            
            setReservations(prev => prev.filter(r => r.id !== id));
            setModalConfig({
                isOpen: true,
                type: 'success',
                title: t('modals.deletedTitle'),
                message: t('modals.deletedMessage'),
                actionLabel: t('modals.done'),
                onAction: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
            });
            fetchData();
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

    const confirmFinishEarly = (id: string, isManualBlock: boolean = false) => {
        setOpenMenuId(null);
        setModalConfig({
            isOpen: true,
            type: 'warning',
            title: t('actions.finishBooking'),
            message: t('modals.finishMessage') || 'Are you sure you want to finish this booking today? This will free the calendar for upcoming days.',
            actionLabel: t('actions.finishBooking'),
            onAction: async () => {
                const toastId = toast.loading(t('modals.updating') || 'Updating...');
                try {
                    await finishReservationEarly(id, isManualBlock);
                    toast.success(t('modals.successApprove') || 'Booking finished!', { id: toastId });
                    setModalConfig(prev => ({ ...prev, isOpen: false }));
                    fetchData();
                } catch (error: any) {
                    toast.error(`${t('modals.unexpectedError') || 'Error'}: ${error.message}`, { id: toastId });
                    setModalConfig(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
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

    // Cancel a CONFIRMED reservation (distinct from rejecting a pending request): frees the
    // dates and moves it to the "Canceled" tab. The payment refund is done manually in Stripe
    // (we don't store the full payment_intent id), so the modal reminds the operator of that.
    const confirmCancelReservation = (id: string) => {
        setOpenMenuId(null);
        setModalConfig({
            isOpen: true,
            type: 'warning',
            title: t('modals.cancelTitle'),
            message: t('modals.cancelMessage'),
            actionLabel: t('modals.confirmCancel'),
            onAction: async () => {
                const toastId = toast.loading(t('modals.updating'));
                try {
                    await updateReservationStatus(id, 'cancelled');
                    toast.success(t('modals.successReject'), { id: toastId });
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
            const end = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
            matchesDate = isWithinInterval(checkIn, { start, end });
        }

        const today = startOfDay(new Date());
        let matchesTab = true;
        const resCheckOutDate = startOfDay(new Date(res.check_out));

        if (activeTab === 'upcoming') {
            matchesTab = res.status !== 'cancelled' && res.status !== 'completed' && res.status !== 'checked-out' && resCheckOutDate.getTime() > today.getTime() && !res.is_manual_block;
        } else if (activeTab === 'completed') {
            matchesTab = res.status !== 'cancelled' && (res.status === 'completed' || res.status === 'checked-out' || resCheckOutDate.getTime() <= today.getTime()) && !res.is_manual_block;
        } else if (activeTab === 'canceled') {
            matchesTab = res.status === 'cancelled' && !res.is_manual_block;
        } else if (activeTab === 'owners') {
            matchesTab = res.is_manual_block;
        } else if (activeTab === 'all') {
            matchesTab = true;
        }

        const matchesProperty = selectedPropertyIds.length === 0 || selectedPropertyIds.includes(res.property_id);
        const matchesAirbnb = showAirbnb || !res.is_airbnb;

        return matchesSearch && matchesDate && matchesTab && matchesProperty && matchesAirbnb;
    }).sort((a, b) => {
        if (sortConfig.key === 'check_in') {
            const dateA = new Date(a.check_in).getTime();
            const dateB = new Date(b.check_in).getTime();
            return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
        }
        if (sortConfig.key === 'check_out') {
            const dateA = new Date(a.check_out).getTime();
            const dateB = new Date(b.check_out).getTime();
            return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
        }
        if (sortConfig.key === 'created_at') {
            const dateA = new Date(a.created_at).getTime();
            const dateB = new Date(b.created_at).getTime();
            return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
        }
        return 0; // Default no sort if needed
    });

    // Com o preview ligado: nas propriedades ligadas ao Beds24, as barras iCal
    // (blocked_dates airbnb_booking / booking_com) saem e entram as reservas Beds24 ricas.
    // Diretas do site e bloqueios manuais ficam. Só afeta a vista Calendar.
    const previewPropertyIds = beds24Preview && beds24Data ? new Set(beds24Data.internalPropertyIds) : null;
    const calendarBlockedDates = previewPropertyIds
        ? blockedDates.filter((b: any) => !(['airbnb_booking', 'booking_com'].includes(b.source) && previewPropertyIds.has(b.property_id)))
        : blockedDates;
    const calendarReservations = previewPropertyIds
        ? [
            ...reservations.filter((r: any) => !(r.is_airbnb && previewPropertyIds.has(r.property_id))),
            ...beds24Data!.bookings.map((b) => ({ ...b, property_name: propertiesMap[b.property_id]?.title || 'Unknown Property' })),
        ]
        : reservations;

    return (
        <div className="space-y-10 pb-20">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-end">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-[#171717] dark:text-admin-dark-text-primary">{t('title')}</h2>
                    <p className="text-[#a3a3a3] mt-2 font-medium text-sm md:text-base">{t('subtitle')}</p>
                </div>
                <div className="flex gap-3">
                    {view === 'calendar' && role === 'super_admin' && (
                        <div className="flex items-center gap-2 bg-white dark:bg-admin-dark-surface border border-[#f5f5f5] dark:border-admin-dark-border rounded-lg p-1 transition-colors duration-300">
                            <span className="pl-2 text-[9px] font-bold uppercase tracking-widest text-[#a3a3a3]">{t('dataSource')}</span>
                            <button
                                onClick={() => { if (beds24Preview) void toggleBeds24Preview(); }}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${!beds24Preview ? 'bg-[#171717] dark:bg-white text-white dark:text-black shadow-sm' : 'text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white'}`}
                            >
                                iCal
                            </button>
                            <button
                                onClick={() => { if (!beds24Preview) void toggleBeds24Preview(); }}
                                disabled={beds24Loading}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all disabled:opacity-60 ${beds24Preview ? 'bg-rose-500 text-white shadow-sm' : 'text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white'}`}
                            >
                                <span className={`size-1.5 rounded-full ${beds24Preview ? 'bg-white' : 'bg-rose-400'} ${beds24Loading ? 'animate-pulse' : ''}`} />
                                Beds24
                            </button>
                        </div>
                    )}
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

            {/* Search Bar & Tabs */}
            {view === 'list' && (
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-[#e5e5e5] dark:border-admin-dark-border gap-4">
                        {/* Tabs */}
                        <div className="flex overflow-x-auto no-scrollbar -mb-px">
                            {(['upcoming', 'completed', 'canceled', 'owners', 'all'] as const).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={cn(
                                        "px-4 py-3 text-[15px] whitespace-nowrap font-medium transition-all relative",
                                        activeTab === tab 
                                            ? "text-[#171717] dark:text-white border-b-2 border-[#171717] dark:border-white" 
                                            : "text-[#717171] border-b-2 border-transparent hover:text-[#171717] hover:border-[#dddddd] dark:text-[#a3a3a3] dark:hover:text-white dark:hover:border-[#555]"
                                    )}
                                >
                                    {t(`table.tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`)}
                                </button>
                            ))}
                        </div>

                        {/* Filters Toggle Button */}
                        <div className="flex items-center gap-3 pb-2 w-full md:w-auto justify-end">
                            <button
                                type="button"
                                onClick={() => setShowFiltersBar(!showFiltersBar)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 bg-white dark:bg-admin-dark-surface border rounded-lg text-sm font-semibold transition-all hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer shadow-sm text-gray-700 dark:text-admin-dark-text-primary",
                                    showFiltersBar 
                                        ? "border-[#171717] dark:border-white text-[#171717] dark:text-white" 
                                        : "border-[#e5e5e5] dark:border-admin-dark-border text-gray-700 dark:text-admin-dark-text-primary"
                                )}
                            >
                                <Filter className={cn("size-4 shrink-0 transition-colors", showFiltersBar ? "text-[#171717] dark:text-white" : "text-[#a3a3a3]")} />
                                <span className="text-xs">{t('filters')}</span>
                                {(() => {
                                    const activeFiltersCount = [
                                        searchQuery.trim().length > 0,
                                        selectedPropertyIds.length > 0,
                                        !showAirbnb,
                                        !!dateRange?.from
                                    ].filter(Boolean).length;
                                    
                                    if (activeFiltersCount > 0) {
                                        return (
                                            <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-[#c5a059] text-white rounded-full min-w-4 h-4 flex items-center justify-center">
                                                {activeFiltersCount}
                                            </span>
                                        );
                                    }
                                    return null;
                                })()}
                            </button>
                        </div>
                    </div>

                    {/* Collapsible Filters Row */}
                    {showFiltersBar && (
                        <div className="flex flex-wrap items-center gap-3 p-4 bg-gray-50/50 dark:bg-white/5 border border-[#e5e5e5]/80 dark:border-admin-dark-border/40 rounded-xl animate-in fade-in slide-in-from-top-2 duration-200">
                            {/* Search input */}
                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a3a3a3] size-4" />
                                <input
                                    type="text"
                                    placeholder={t('searchPlaceholder')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-white dark:bg-admin-dark-surface border border-[#e5e5e5] dark:border-admin-dark-border pl-10 pr-4 py-2 rounded-lg text-sm focus:ring-1 focus:ring-[#171717] dark:focus:ring-white outline-none shadow-sm dark:text-admin-dark-text-primary transition-colors"
                                />
                            </div>

                            {/* Property Multi-Select Dropdown */}
                            <div className="relative" ref={propertyDropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => setShowPropertyDropdown(!showPropertyDropdown)}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-admin-dark-surface border border-[#e5e5e5] dark:border-admin-dark-border rounded-lg text-sm font-semibold transition-all hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer text-left focus:outline-none shadow-sm text-gray-700 dark:text-admin-dark-text-primary"
                                >
                                    <Home className="size-4 text-[#a3a3a3] shrink-0" />
                                    <span className="truncate max-w-[150px] text-xs">
                                        {selectedPropertyIds.length === 0
                                            ? "All Properties"
                                            : selectedPropertyIds.length === 1
                                                ? propertiesMap[selectedPropertyIds[0]]?.title || "1 Property"
                                                : `${selectedPropertyIds.length} Properties`}
                                    </span>
                                    <ChevronDown className="size-3.5 text-gray-400 shrink-0 ml-1" />
                                </button>

                                {showPropertyDropdown && (
                                    <div className="absolute left-0 md:right-0 md:left-auto mt-2 w-72 bg-white dark:bg-[#1a2331] border border-[#e5e5e5] dark:border-[#2a3547] rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 flex flex-col max-h-[350px]">
                                        {/* Search Input inside Dropdown */}
                                        <div className="p-3 border-b border-[#f5f5f5] dark:border-white/5 bg-[#fafafa] dark:bg-admin-dark-bg/50">
                                            <div className="relative">
                                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 size-3.5" />
                                                <input
                                                    type="text"
                                                    placeholder="Search properties..."
                                                    value={propertySearchQuery}
                                                    onChange={(e) => setPropertySearchQuery(e.target.value)}
                                                    className="w-full bg-white dark:bg-admin-dark-surface border border-[#e5e5e5] dark:border-white/10 pl-8 pr-3 py-1.5 rounded-md text-xs outline-none focus:ring-1 focus:ring-admin-accent transition-all dark:text-admin-dark-text-primary"
                                                />
                                            </div>
                                        </div>

                                        {/* Options List */}
                                        <div className="flex-1 overflow-y-auto py-1 custom-scrollbar max-h-[220px]">
                                            {(() => {
                                                const propertiesList = Object.values(propertiesMap);
                                                const filteredPropertiesList = propertiesList.filter(p => 
                                                    (p.title || "").toLowerCase().includes(propertySearchQuery.toLowerCase()) ||
                                                    (p.city || "").toLowerCase().includes(propertySearchQuery.toLowerCase())
                                                );
                                                
                                                if (filteredPropertiesList.length === 0) {
                                                    return (
                                                        <div className="px-4 py-3 text-center text-xs text-gray-400 italic">
                                                            No properties found
                                                        </div>
                                                    );
                                                }

                                                return filteredPropertiesList.map((prop) => {
                                                    const isChecked = selectedPropertyIds.includes(prop.id);
                                                    return (
                                                        <button
                                                            key={prop.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedPropertyIds(prev => 
                                                                    isChecked 
                                                                        ? prev.filter(id => id !== prop.id) 
                                                                        : [...prev, prop.id]
                                                                );
                                                            }}
                                                            className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-[#fafafa] dark:hover:bg-white/5 transition-colors group"
                                                        >
                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                <div className="size-7 rounded bg-gray-100 overflow-hidden shrink-0 border border-black/5 dark:border-white/5">
                                                                    {prop.mainImage ? (
                                                                        <img src={prop.mainImage} alt="" className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">
                                                                            <Home className="size-3" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="text-xs font-bold text-gray-700 dark:text-admin-dark-text-primary truncate">{prop.title}</p>
                                                                    {prop.city && <p className="text-[10px] text-gray-400 truncate">{prop.city}</p>}
                                                                </div>
                                                            </div>
                                                            <div className={cn(
                                                                "size-4 rounded border flex items-center justify-center shrink-0 transition-all",
                                                                isChecked 
                                                                    ? "border-[#c5a059] bg-[#c5a059] text-white" 
                                                                    : "border-gray-300 dark:border-white/10 group-hover:border-gray-400"
                                                            )}>
                                                                {isChecked && <Check className="size-2.5 stroke-[3px]" />}
                                                            </div>
                                                        </button>
                                                    );
                                                });
                                            })()}
                                        </div>

                                        {/* Footer Actions */}
                                        <div className="p-2.5 border-t border-[#f5f5f5] dark:border-white/5 bg-[#fafafa] dark:bg-admin-dark-bg/50 flex items-center justify-between text-[10px] font-black uppercase tracking-wider shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedPropertyIds([])}
                                                className="text-gray-500 hover:text-gray-700 dark:hover:text-white transition-colors px-2 py-1"
                                            >
                                                Clear
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const propertiesList = Object.values(propertiesMap);
                                                    setSelectedPropertyIds(propertiesList.map(p => p.id));
                                                }}
                                                className="text-[#c5a059] hover:opacity-80 transition-colors px-2 py-1"
                                            >
                                                Select All
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Airbnb Visibility Toggle */}
                            <button
                                type="button"
                                onClick={() => setShowAirbnb(!showAirbnb)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-semibold transition-all cursor-pointer shadow-sm",
                                    showAirbnb 
                                        ? "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400"
                                        : "bg-white dark:bg-admin-dark-surface border-[#e5e5e5] dark:border-admin-dark-border text-[#a3a3a3] hover:bg-gray-50 dark:hover:bg-white/5"
                                )}
                            >
                                <Globe className={cn("size-4 shrink-0 transition-all", showAirbnb ? "text-rose-500" : "text-[#a3a3a3]")} />
                                <span className="text-xs font-semibold">
                                    Airbnb: {showAirbnb ? "ON" : "OFF"}
                                </span>
                            </button>

                            {/* Date Range Picker */}
                            <DateRangePicker date={dateRange} setDate={setDateRange} />

                            {/* Clear All Filters Button */}
                            {(() => {
                                const activeFiltersCount = [
                                    searchQuery.trim().length > 0,
                                    selectedPropertyIds.length > 0,
                                    !showAirbnb,
                                    !!dateRange?.from
                                ].filter(Boolean).length;

                                if (activeFiltersCount > 0) {
                                    return (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSearchQuery("");
                                                setSelectedPropertyIds([]);
                                                setShowAirbnb(true);
                                                setDateRange(undefined);
                                            }}
                                            className="text-xs font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors px-2.5 py-1.5 border border-dashed border-gray-300 dark:border-white/10 rounded-lg hover:border-gray-400 dark:hover:border-white/20 ml-auto"
                                        >
                                            {t('clearFilters')}
                                        </button>
                                    );
                                }
                                return null;
                            })()}
                        </div>
                    )}
                </div>
            )}

            {view === 'calendar' ? (
                /* Calendar View */
                <MultiCalendarView
                    reservations={calendarReservations}
                    properties={propertiesMap}
                    propertyImages={propertyImagesMap}
                    locale={locale}
                    blockedDates={calendarBlockedDates}
                    onRefresh={fetchData}
                />
            ) : (
                /* List View */
                <>
                <div className="hidden md:block bg-white dark:bg-admin-dark-surface rounded-2xl border border-[#f5f5f5] dark:border-admin-dark-border overflow-visible shadow-sm min-h-[400px] transition-colors duration-300">
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
                                        {t('table.checkIn')}
                                        <ArrowUpDown className={`size-3 transition-colors ${sortConfig.key === 'check_in' ? 'text-[#171717] dark:text-white' : 'text-[#a3a3a3] group-hover/header:text-[#171717] dark:group-hover/header:text-white'}`} />
                                    </div>
                                </th>
                                <th className="px-8 py-5 text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest cursor-pointer group/header" onClick={() => handleSort('check_out')}>
                                    <div className="flex items-center gap-2">
                                        {t('table.checkOut')}
                                        <ArrowUpDown className={`size-3 transition-colors ${sortConfig.key === 'check_out' ? 'text-[#171717] dark:text-white' : 'text-[#a3a3a3] group-hover/header:text-[#171717] dark:group-hover/header:text-white'}`} />
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
                                    <td colSpan={7} className="px-8 py-10 text-center text-[#a3a3a3] text-sm italic">{t('table.loading')}</td>
                                </tr>
                            ) : filteredReservations.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-8 py-10 text-center text-[#a3a3a3] text-sm">
                                        {t('table.empty', { query: searchQuery })}
                                    </td>
                                </tr>
                            ) : filteredReservations.map((reservation) => {
                                const today = startOfDay(new Date());
                                
                                // Determine effective status purely for UI
                                let effectiveStatus = reservation.status;
                                if (!reservation.is_manual_block && reservation.status === 'confirmed') {
                                    const checkInDate = startOfDay(new Date(reservation.check_in));
                                    const checkOutDate = startOfDay(new Date(reservation.check_out));
                                    
                                    if (today.getTime() >= checkInDate.getTime() && today.getTime() < checkOutDate.getTime()) {
                                        effectiveStatus = 'checked-in';
                                    } else if (today.getTime() >= checkOutDate.getTime()) {
                                        effectiveStatus = 'completed';
                                    }
                                }

                                return (
                                <tr
                                    key={reservation.id}
                                    onClick={() => {
                                        if (!reservation.is_manual_block) {
                                            setDetailSheetReservation(reservation);
                                        }
                                    }}
                                    className={cn(
                                        "group transition-all border-b border-[#f5f5f5] dark:border-admin-dark-border relative",
                                        !reservation.is_manual_block && "cursor-pointer",
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
                                                    {reservation.is_manual_block && (
                                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20 uppercase tracking-wide">{t('table.ownerBooking')}</span>
                                                    )}
                                                    {reservation.is_airbnb && (
                                                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 uppercase tracking-wide">
                                                            <Globe className="size-2.5" />
                                                            Airbnb
                                                        </div>
                                                    )}
                                                    {!reservation.is_manual_block && !reservation.is_airbnb && reservation.payment_method && (
                                                        <>
                                                            {reservation.payment_method === 'klarna' && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-pink-100 text-pink-700 dark:bg-pink-500/10 dark:text-pink-400 border border-pink-200 dark:border-pink-500/20 uppercase tracking-wide">Klarna</span>}
                                                            {reservation.payment_method === 'card' && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 uppercase tracking-wide">Stripe</span>}
                                                            {reservation.payment_method === 'link' && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 uppercase tracking-wide">Wallet</span>}
                                                            {reservation.payment_method === 'wire' && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 uppercase tracking-wide">Transfer</span>}
                                                        </>
                                                    )}
                                                    {isNew(reservation.created_at) && !reservation.is_manual_block && !reservation.is_airbnb && (
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
                                            <span className="text-[10px] text-[#a3a3a3] uppercase font-bold tracking-tighter">{t('table.checkIn')}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-sm font-bold text-[#171717] dark:text-admin-dark-text-primary">{formatDate(reservation.check_out)}</span>
                                            <span className="text-[10px] text-[#a3a3a3] uppercase font-bold tracking-tighter">{t('table.checkOut')}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col gap-1.5">
                                            {reservation.is_manual_block ? (
                                                <span className="text-xs text-[#a3a3a3] italic">{reservation.reason || t('table.noContact')}</span>
                                            ) : (
                                                <>
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
                                                </>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        {effectiveStatus === 'airbnb' ? (
                                            <span className="text-[#a3a3a3] dark:text-admin-dark-text-secondary font-semibold text-xs px-3">-</span>
                                        ) : (
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                effectiveStatus === 'confirmed'
                                                    ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/30'
                                                    : effectiveStatus === 'checked-in'
                                                        ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-500/30'
                                                        : effectiveStatus === 'completed' || effectiveStatus === 'checked-out'
                                                            ? 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/20'
                                                            : effectiveStatus === 'pending'
                                                                ? 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-100 dark:border-yellow-500/30'
                                                                : effectiveStatus === 'owner_block'
                                                                    ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-100 dark:border-purple-500/30'
                                                                    : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-500/30'
                                                }`}>
                                                {effectiveStatus ? t(`status.${effectiveStatus}`) : t('status.pending')}
                                            </span>
                                        )}
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
                                                    {!reservation.is_manual_block && (
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
                                                    )}

                                                    {reservation.status === 'pending' && !reservation.is_manual_block && (
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

                                                    {(activeTab === 'upcoming' || activeTab === 'all') && new Date(reservation.check_in).getTime() <= startOfDay(new Date()).getTime() && (
                                                        <>
                                                            <div className="h-px bg-gray-100 dark:bg-white/10 my-1" />
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); confirmFinishEarly(reservation.id, reservation.is_manual_block); }}
                                                                className="w-full text-left px-3 py-2.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg flex items-center gap-2 transition-colors"
                                                            >
                                                                <Check className="size-4" />
                                                                {t('actions.finishBooking')}
                                                            </button>
                                                        </>
                                                    )}

                                                    {reservation.status === 'confirmed' && !reservation.is_manual_block && !reservation.is_airbnb && new Date(reservation.check_in).getTime() > startOfDay(new Date()).getTime() && (
                                                        <>
                                                            <div className="h-px bg-gray-100 dark:bg-white/10 my-1" />
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); confirmCancelReservation(reservation.id); }}
                                                                className="w-full text-left px-3 py-2.5 text-xs font-medium text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-500/10 rounded-lg flex items-center gap-2 transition-colors"
                                                            >
                                                                <Ban className="size-4" />
                                                                {t('actions.cancelReservation')}
                                                            </button>
                                                        </>
                                                    )}

                                                    <div className="h-px bg-gray-100 dark:bg-white/10 my-1" />

                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); confirmDelete(reservation.id, reservation.is_manual_block); }}
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
                            )})}
                        </tbody>
                    </table>
                </div>

                {/* Mobile card list */}
                <div className="md:hidden space-y-3 min-h-[300px]">
                    {isLoading ? (
                        <p className="py-10 text-center text-[#a3a3a3] text-sm italic">{t('table.loading')}</p>
                    ) : filteredReservations.length === 0 ? (
                        <p className="py-10 text-center text-[#a3a3a3] text-sm">{t('table.empty', { query: searchQuery })}</p>
                    ) : filteredReservations.map((reservation) => (
                        <ReservationListCard
                            key={reservation.id}
                            reservation={reservation}
                            t={t}
                            formatDate={formatDate}
                            isNew={isNew}
                            onOpenDetail={() => setDetailSheetReservation(reservation)}
                            onOpenMenu={() => setOpenMenuId(openMenuId === reservation.id ? null : reservation.id)}
                        />
                    ))}
                </div>
                </>
            )}

            {/* Mobile actions bottom sheet */}
            {openMenuId && (role === 'admin' || role === 'super_admin') && (() => {
                const reservation = filteredReservations.find(r => r.id === openMenuId);
                if (!reservation) return null;
                const canFinish = (activeTab === 'upcoming' || activeTab === 'all') && new Date(reservation.check_in).getTime() <= startOfDay(new Date()).getTime();
                return (
                    <div className="md:hidden fixed inset-0 z-[120] flex items-end animate-in fade-in duration-200">
                        <div className="absolute inset-0 bg-black/50" onClick={() => setOpenMenuId(null)} />
                        <div className="relative w-full bg-white dark:bg-admin-dark-surface rounded-t-3xl border-t border-[#f5f5f5] dark:border-admin-dark-border p-2 pb-6 animate-in slide-in-from-bottom duration-300">
                            <div className="mx-auto mt-2 mb-3 h-1.5 w-10 rounded-full bg-gray-200 dark:bg-white/10" />
                            <p className="px-4 pb-2 text-xs font-bold text-[#a3a3a3] uppercase tracking-widest truncate">{reservation.guest_name || 'Guest'}</p>
                            {!reservation.is_manual_block && (
                                <button onClick={() => { setOpenMenuId(null); setSelectedReservationId(reservation.id); setHistoryModalOpen(true); }} className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl flex items-center gap-3">
                                    <History className="size-5" />{t('actions.viewHistory')}
                                </button>
                            )}
                            {reservation.status === 'pending' && !reservation.is_manual_block && (
                                <>
                                    <button onClick={() => handleStatusUpdate(reservation.id, 'confirmed')} className="w-full text-left px-4 py-3 text-sm font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-xl flex items-center gap-3">
                                        <Check className="size-5" />{t('actions.approve')}
                                    </button>
                                    <button onClick={() => handleStatusUpdate(reservation.id, 'cancelled')} className="w-full text-left px-4 py-3 text-sm font-medium text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-500/10 rounded-xl flex items-center gap-3">
                                        <Ban className="size-5" />{t('actions.reject')}
                                    </button>
                                </>
                            )}
                            {canFinish && (
                                <button onClick={() => confirmFinishEarly(reservation.id, reservation.is_manual_block)} className="w-full text-left px-4 py-3 text-sm font-medium text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl flex items-center gap-3">
                                    <Check className="size-5" />{t('actions.finishBooking')}
                                </button>
                            )}
                            {reservation.status === 'confirmed' && !reservation.is_manual_block && !reservation.is_airbnb && new Date(reservation.check_in).getTime() > startOfDay(new Date()).getTime() && (
                                <button onClick={() => confirmCancelReservation(reservation.id)} className="w-full text-left px-4 py-3 text-sm font-medium text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-500/10 rounded-xl flex items-center gap-3">
                                    <Ban className="size-5" />{t('actions.cancelReservation')}
                                </button>
                            )}
                            <button onClick={() => confirmDelete(reservation.id, reservation.is_manual_block)} className="w-full text-left px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl flex items-center gap-3">
                                <Trash2 className="size-5" />{t('actions.delete')}
                            </button>
                        </div>
                    </div>
                );
            })()}

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
