'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Calendar, CreditCard, AlertCircle, ArrowLeft, Shield, Cookie, UserCheck, Mail, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getPageSections } from '@/app/actions/cms';
import { CmsPageSection } from '@/lib/types';

const iconMap = {
    Shield,
    Cookie,
    UserCheck,
    Mail,
    FileText,
    Calendar,
    CreditCard,
    AlertCircle
};

export default function TermsConditionsPage() {
    const params = useParams();
    const locale = (params?.locale as string) || 'en';
    const [sections, setSections] = useState<CmsPageSection[]>([]);

    const getFallbackSections = (lang: string): CmsPageSection[] => {
        if (lang === 'pt') {
            return [
                {
                    page_slug: 'terms-conditions',
                    display_order: 1,
                    locale: 'pt',
                    icon: 'FileText',
                    title: "1. Aceitação dos Termos",
                    content: "Ao aceder e utilizar os serviços da Lovely Memories, concorda em ficar vinculado a estes termos e condições. Estes termos aplicam-se a todos os visitantes, utilizadores e outros que acedam ou utilizem os nossos serviços de gestão de propriedades de luxo.",
                    list_items: []
                },
                {
                    page_slug: 'terms-conditions',
                    display_order: 2,
                    locale: 'pt',
                    icon: 'Calendar',
                    title: "2. Reservas & Marcações",
                    content: "Todas as reservas estão sujeitas a disponibilidade e confirmação. Reservamos o direito de recusar qualquer pedido de reserva ao nosso critério. As regras específicas da propriedade e os procedimentos de check-in serão fornecidos após a confirmação.",
                    list_items: [
                        { label: "Check-in", desc: "O check-in padrão é a partir das 15:00." },
                        { label: "Check-out", desc: "O check-out padrão é antes das 11:00." },
                        { label: "Ocupação", desc: "O número de hóspedes não deve exceder o limite da propriedade." }
                    ]
                },
                {
                    page_slug: 'terms-conditions',
                    display_order: 3,
                    locale: 'pt',
                    icon: 'CreditCard',
                    title: "3. Pagamentos & Cancelamentos",
                    content: "Os termos de pagamento variam dependendo da propriedade e do tipo de reserva. Geralmente, é necessário um depósito para garantir a reserva. As políticas de cancelamento são rigorosamente aplicadas e dependem do período de aviso prévio fornecido.",
                    list_items: [
                        { label: "Reembolsos", desc: "Sujeito à política de cancelamento específica da propriedade." },
                        { label: "Depósito de Segurança", desc: "Pode ser exigido para cobrir danos ou encargos imprevistos." }
                    ]
                },
                {
                    page_slug: 'terms-conditions',
                    display_order: 4,
                    locale: 'pt',
                    icon: 'AlertCircle',
                    title: "4. Responsabilidade & Obrigações",
                    content: "A Lovely Memories atua como intermediária ou gestora de propriedades de alto padrão. Embora garantamos os mais elevados padrões, os hóspedes são responsáveis pela manutenção da propriedade e por seguir os regulamentos locais durante a sua estadia.",
                    list_items: []
                }
            ];
        }
        return [
            {
                page_slug: 'terms-conditions',
                display_order: 1,
                locale: 'en',
                icon: 'FileText',
                title: "1. Acceptance of Terms",
                content: "By accessing and using the services of Lovely Memories, you agree to be bound by these terms and conditions. These terms apply to all visitors, users, and others who access or use our luxury property management services.",
                list_items: []
            },
            {
                page_slug: 'terms-conditions',
                display_order: 2,
                locale: 'en',
                icon: 'Calendar',
                title: "2. Bookings & Reservations",
                content: "All bookings are subject to availability and confirmation. We reserve the right to refuse any booking request at our discretion. Specific property rules and check-in procedures will be provided upon confirmation.",
                list_items: [
                    { label: "Check-in", desc: "Standard check-in is from 15:00 onwards." },
                    { label: "Check-out", desc: "Standard check-out is before 11:00." },
                    { label: "Occupancy", desc: "The number of guests must not exceed the property limit." }
                ]
            },
            {
                page_slug: 'terms-conditions',
                display_order: 3,
                locale: 'en',
                icon: 'CreditCard',
                title: "3. Payments & Cancellations",
                content: "Payment terms vary depending on the property and booking type. Generally, a deposit is required to secure a reservation. Cancellation policies are strictly enforced and depend on the notice period provided.",
                list_items: [
                    { label: "Refunds", desc: "Subject to the specific cancellation policy of the property." },
                    { label: "Security Deposit", desc: "May be required for damages or incidental charges." }
                ]
            },
            {
                page_slug: 'terms-conditions',
                display_order: 4,
                locale: 'en',
                icon: 'AlertCircle',
                title: "4. Liability & Responsibilities",
                content: "Lovely Memories acts as an intermediary or manager for high-end properties. While we ensure the highest standards, guests are responsible for maintaining the property and following local regulations during their stay.",
                list_items: []
            }
        ];
    };

    useEffect(() => {
        const fetchSections = async () => {
            const dbSections = await getPageSections("terms-conditions", locale);
            if (dbSections && dbSections.length > 0) {
                setSections(dbSections);
            } else {
                setSections(getFallbackSections(locale));
            }
        };
        fetchSections();
    }, [locale]);

    return (
        <main className="relative min-h-screen bg-[#0a1118] pt-32 pb-24 overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-[#a39076]/5 rounded-full blur-[120px] -translate-y-1/2 -translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#a39076]/5 rounded-full blur-[120px] translate-y-1/2 translate-x-1/2 pointer-events-none" />

            <div className="container mx-auto max-w-4xl px-6 relative z-10">
                {/* Header */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-20"
                >
                    <Link 
                        href={`/${locale}`}
                        className="inline-flex items-center gap-2 text-[#a39076] hover:text-white transition-colors mb-8 text-sm font-medium"
                    >
                        <ArrowLeft size={16} />
                        {locale === 'pt' ? 'Voltar ao Início' : 'Back to Home'}
                    </Link>
                    <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight">
                        {locale === 'pt' ? (
                            <>Termos <span className="text-[#a39076]">&</span> Condições</>
                        ) : (
                            <>Terms <span className="text-[#a39076]">&</span> Conditions</>
                        )}
                    </h1>
                    <div className="w-24 h-1 bg-[#a39076] mx-auto rounded-full opacity-50" />
                </motion.div>

                {/* Content Sections */}
                <div className="space-y-12">
                    {sections.map((section, index) => {
                        const IconComponent = iconMap[section.icon as keyof typeof iconMap] || HelpCircle;
                        return (
                            <motion.section
                                key={index}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-[32px] p-8 md:p-12 hover:border-[#a39076]/30 transition-all duration-500"
                            >
                                <div className="flex flex-col md:flex-row gap-8">
                                    <div className="shrink-0">
                                        <div className="w-14 h-14 bg-[#a39076]/10 rounded-2xl flex items-center justify-center border border-[#a39076]/20">
                                            <IconComponent className="w-6 h-6 text-[#a39076]" />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <h2 className="text-2xl font-bold text-white tracking-wide">
                                            {section.title}
                                        </h2>
                                        <p className="text-gray-400 leading-relaxed text-lg">
                                            {section.content}
                                        </p>
                                        
                                        {section.list_items && section.list_items.length > 0 && (
                                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                                                {section.list_items.map((item, i) => (
                                                    <li key={i} className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                                        <span className="block font-bold text-[#a39076] mb-1">{item.label}</span>
                                                        <span className="text-sm text-gray-500">{item.desc}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                            </motion.section>
                        );
                    })}
                </div>

                {/* Footer Note */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    className="mt-20 text-center text-gray-500 text-sm"
                >
                    <p>
                        {locale === 'pt' 
                            ? '© 2026 Lovely Memories Gestão de Propriedades de Luxo • Termos de Serviço' 
                            : '© 2026 Lovely Memories Luxury Property Management • Terms of Service'
                        }
                    </p>
                </motion.div>
            </div>
        </main>
    );
}
