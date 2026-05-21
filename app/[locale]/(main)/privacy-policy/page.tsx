'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Cookie, UserCheck, Mail, ArrowLeft, FileText, Calendar, CreditCard, AlertCircle, HelpCircle } from 'lucide-react';
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

export default function PrivacyPolicyPage() {
    const params = useParams();
    const locale = (params?.locale as string) || 'en';
    const [sections, setSections] = useState<CmsPageSection[]>([]);

    const getFallbackSections = (lang: string): CmsPageSection[] => {
        if (lang === 'pt') {
            return [
                {
                    page_slug: 'privacy-policy',
                    display_order: 1,
                    locale: 'pt',
                    icon: 'Shield',
                    title: "1. Introdução",
                    content: "Bem-vindo à Lovely Memories. Valorizamos a sua privacidade e estamos empenhados em proteger os seus dados pessoais. Esta política explica como recolhemos, utilizamos e salvaguardamos as suas informações quando visita o nosso website.",
                    list_items: []
                },
                {
                    page_slug: 'privacy-policy',
                    display_order: 2,
                    locale: 'pt',
                    icon: 'Cookie',
                    title: "2. Cookies que Utilizámos",
                    content: "Utilizámos cookies para melhorar a sua experiência. Os cookies são pequenos ficheiros de texto guardados no seu dispositivo que nos ajudam a prestar um melhor serviço.",
                    list_items: [
                        { label: "Cookies Necessários", desc: "Essenciais para o funcionamento seguro e correto do website." },
                        { label: "Cookies de Análise", desc: "Ajudam-nos a compreender o comportamento dos visitantes para melhorar os nossos serviços." },
                        { label: "Cookies de Marketing", desc: "Utilizados para apresentar anúncios relevantes e acompanhar o desempenho." }
                    ]
                },
                {
                    page_slug: 'privacy-policy',
                    display_order: 3,
                    locale: 'pt',
                    icon: 'UserCheck',
                    title: "3. Os Seus Direitos",
                    content: "Ao abrigo do RGPD, tem o direito de aceder, retificar ou eliminar os seus dados pessoais. Pode também retirar o seu consentimento para cookies a qualquer momento utilizando o painel de preferências de cookies abaixo.",
                    list_items: []
                },
                {
                    page_slug: 'privacy-policy',
                    display_order: 4,
                    locale: 'pt',
                    icon: 'Mail',
                    title: "4. Contacte-nos",
                    content: "Se tiver alguma dúvida sobre esta política ou sobre as nossas práticas de tratamento de dados, não hesite em contactar a nossa equipa através do email info@lovelymemories.pt.",
                    list_items: []
                }
            ];
        }
        return [
            {
                page_slug: 'privacy-policy',
                display_order: 1,
                locale: 'en',
                icon: 'Shield',
                title: "1. Introduction",
                content: "Welcome to Lovely Memories. We value your privacy and are committed to protecting your personal data. This policy explains how we collect, use, and safeguard your information when you visit our website.",
                list_items: []
            },
            {
                page_slug: 'privacy-policy',
                display_order: 2,
                locale: 'en',
                icon: 'Cookie',
                title: "2. Cookies We Use",
                content: "We use cookies to enhance your experience. Cookies are small text files stored on your device that help us provide a better service.",
                list_items: [
                    { label: "Necessary Cookies", desc: "Essential for the website to function securely and correctly." },
                    { label: "Analytics Cookies", desc: "Help us understand visitor behavior to improve our services." },
                    { label: "Marketing Cookies", desc: "Used to deliver relevant advertisements and track performance." }
                ]
            },
            {
                page_slug: 'privacy-policy',
                display_order: 3,
                locale: 'en',
                icon: 'UserCheck',
                title: "3. Your Rights",
                content: "Under GDPR, you have the right to access, rectify, or delete your personal data. You can also withdraw your consent for cookies at any time using the cookie preferences panel below.",
                list_items: []
            },
            {
                page_slug: 'privacy-policy',
                display_order: 4,
                locale: 'en',
                icon: 'Mail',
                title: "4. Contact Us",
                content: "If you have any questions about this policy or our data practices, please don't hesitate to reach out to our team at info@lovelymemories.pt.",
                list_items: []
            }
        ];
    };

    useEffect(() => {
        const fetchSections = async () => {
            const dbSections = await getPageSections("privacy-policy", locale);
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
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#a39076]/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#a39076]/5 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

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
                            <>Privacidade <span className="text-[#a39076]">&</span> Cookies</>
                        ) : (
                            <>Privacy <span className="text-[#a39076]">&</span> Cookies</>
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

                    {/* Dedicated Cookie Preferences Manager Card */}
                    <motion.section
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: sections.length * 0.1 }}
                        className="bg-white/5 backdrop-blur-sm border border-[#a39076]/30 rounded-[32px] p-8 md:p-12 hover:border-[#a39076]/50 transition-all duration-500 flex flex-col md:flex-row items-center justify-between gap-6"
                    >
                        <div className="flex items-center gap-6 flex-1 text-left">
                            <div className="w-14 h-14 bg-[#a39076]/10 rounded-2xl flex items-center justify-center border border-[#a39076]/30 shrink-0">
                                <Cookie className="w-6 h-6 text-[#a39076]" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white tracking-wide mb-2">
                                    {locale === 'pt' ? 'Preferências de Cookies' : 'Cookie Preferences'}
                                </h3>
                                <p className="text-gray-400 text-base leading-relaxed">
                                    {locale === 'pt' 
                                        ? 'Pode gerir, aceitar ou rejeitar os cookies utilizados neste website a qualquer momento.'
                                        : 'You can manage, accept or reject cookies used on this website at any time.'
                                    }
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => window.dispatchEvent(new CustomEvent('open-cookie-settings'))}
                            className="w-full md:w-auto px-8 py-4 bg-[#a39076] hover:bg-[#8e7d65] text-white rounded-full text-base font-bold shadow-lg shadow-[#a39076]/10 transition-all duration-300 whitespace-nowrap active:scale-95 cursor-pointer"
                        >
                            {locale === 'pt' ? 'Gerir Consentimento' : 'Manage Consent'}
                        </button>
                    </motion.section>
                </div>

                {/* Footer Note */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    className="mt-20 text-center text-gray-500 text-sm"
                >
                    <p>
                        {locale === 'pt' 
                            ? 'Última atualização: Maio 2026 • Lovely Memories Gestão de Propriedades de Luxo' 
                            : 'Last updated: May 2026 • Lovely Memories Luxury Property Management'
                        }
                    </p>
                </motion.div>
            </div>
        </main>
    );
}
