"use client";

import { useState, useEffect } from 'react';
import { Plus, Search, Pencil, Trash } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import ServiceModal from '@/components/admin/concierge/ServiceModal';
import DeleteModal from '@/components/admin/concierge/DeleteModal';

interface Service {
    id: string;
    name_en: string;
    name_pt: string;
    name_he: string;
    description_en: string;
    description_pt: string;
    description_he: string;
    image: string;
    is_active: boolean;
    created_at: string;
    link_url?: string;
}

export default function AdminConciergePage() {
    const locale = useLocale();
    const t = useTranslations('AdminConcierge');
    const [services, setServices] = useState<Service[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);

    const fetchServices = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('concierge_services')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setServices(data || []);
        } catch (error) {
            console.error('Error fetching services:', error);
            toast.error(t('notifications.fetchError'));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchServices();
    }, []);

    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [serviceToDelete, setServiceToDelete] = useState<string | null>(null);

    const handleDeleteClick = (id: string) => {
        setServiceToDelete(id);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!serviceToDelete) return;

        try {
            const { error } = await supabase
                .from('concierge_services')
                .delete()
                .eq('id', serviceToDelete);

            if (error) throw error;
            toast.success(t('notifications.deleteSuccess'));
            fetchServices();
        } catch (error) {
            console.error('Error deleting service:', error);
            toast.error(t('notifications.deleteError'));
        } finally {
            setDeleteModalOpen(false);
            setServiceToDelete(null);
        }
    };

    const handleEdit = (service: Service) => {
        setEditingService(service);
        setIsModalOpen(true);
    };

    const handleAddNew = () => {
        setEditingService(null);
        setIsModalOpen(true);
    };

    const filteredServices = services.filter(service =>
        service.name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.name_pt?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.name_he?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="max-w-[1600px] mx-auto">
            {/* Header Section */}
            <section className="flex flex-col gap-4 md:flex-row md:justify-between md:items-end mb-8 md:mb-10">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-[#171717] dark:text-admin-dark-text-primary">{t('title')}</h2>
                    <p className="text-[#a3a3a3] mt-2 font-medium text-sm md:text-base">{t('description')}</p>
                </div>
                <button
                    onClick={handleAddNew}
                    className="px-5 py-2.5 bg-[#171717] dark:bg-white text-white dark:text-black rounded text-sm font-semibold hover:bg-black dark:hover:bg-gray-200 transition-all flex items-center justify-center gap-2 shrink-0"
                >
                    <Plus className="size-4" />
                    {t('addService')}
                </button>
            </section>

            {/* Filters & Search */}
            <section className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-admin-dark-surface p-4 rounded-xl border border-[#f5f5f5] dark:border-admin-dark-border transition-colors duration-300 mb-10">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a3a3a3] size-4" />
                    <input
                        type="text"
                        placeholder={t('searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#eeeeee] dark:border-admin-dark-border pl-10 pr-4 py-2 rounded-lg text-sm focus:ring-1 focus:ring-[#171717] dark:focus:ring-white outline-none dark:text-admin-dark-text-primary transition-colors"
                    />
                </div>
            </section>

            {/* Services Grid */}
            {isLoading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#171717] dark:border-white"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                    {filteredServices.map((service) => (
                        <div key={service.id} className="bg-white dark:bg-admin-dark-surface rounded-2xl border border-[#f5f5f5] dark:border-admin-dark-border overflow-hidden group shadow-sm hover:shadow-md transition-all duration-300">
                            <div className="h-56 bg-cover bg-center relative" style={{ backgroundImage: `url(${service.image || 'https://images.unsplash.com/photo-1544161515-4af6b1d4640b?q=80&w=2070&auto=format&fit=crop'})` }}>
                                <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors"></div>
                                <div className="absolute top-4 right-4">
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${service.is_active
                                        ? 'bg-white/90 dark:bg-black/90 text-[#171717] dark:text-white border-white/50'
                                        : 'bg-red-500/90 text-white border-red-400'
                                        }`}>
                                        {service.is_active ? t('active') : t('inactive')}
                                    </span>
                                </div>
                            </div>
                            <div className="p-5">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="font-bold text-[#171717] dark:text-admin-dark-text-primary text-lg">
                                            {locale === 'pt' ? service.name_pt : locale === 'he' ? (service.name_he || service.name_en) : service.name_en}
                                        </h3>
                                        <div className="flex flex-col gap-0.5 mt-0.5 text-[#a3a3a3]">
                                            <p className="text-[10px] font-medium uppercase tracking-wider flex items-center gap-1.5" dir={locale === 'he' ? 'rtl' : 'ltr'}>
                                                <span>{locale === 'en' ? '🇬🇧' : locale === 'pt' ? '🇵🇹' : '🇮🇱'}</span>
                                                <span>{locale === 'pt' ? 'PT' : locale === 'he' ? 'HE' : 'EN'}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => handleEdit(service)}
                                            className="p-2 text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white hover:bg-[#fafafa] dark:hover:bg-admin-dark-bg rounded-lg transition-all"
                                        >
                                            <Pencil className="size-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteClick(service.id!)}
                                            className="p-2 text-[#a3a3a3] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                                        >
                                            <Trash className="size-4" />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-xs text-[#a3a3a3] line-clamp-2 leading-relaxed h-8">
                                    {locale === 'pt' ? service.description_pt : locale === 'he' ? (service.description_he || service.description_en) : service.description_en}
                                </p>
                                <div className="mt-5 pt-4 border-t border-[#f5f5f5] dark:border-admin-dark-border flex justify-between items-center transition-colors">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-[#a3a3a3] uppercase font-bold tracking-wider">{t('status')}</span>
                                        <span className={`text-xs font-bold ${service.is_active ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                                            {service.is_active ? t('online') : t('offline')}
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-bold text-[#a3a3a3] uppercase bg-[#fafafa] dark:bg-admin-dark-bg px-2 py-1 rounded">
                                        {t('tag')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <ServiceModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                service={editingService}
                onSave={fetchServices}
            />

            <DeleteModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                isLoading={isLoading}
            />
        </div>
    );
}
