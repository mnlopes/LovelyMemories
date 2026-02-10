"use client";

import { use, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import {
    ChevronLeft, Printer, FileText, Download, User,
    Mail, Phone, Home, Calendar, Clock, Receipt,
    CreditCard, Info, AlertTriangle, CheckCircle2, X, ExternalLink, ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

export default function ReservationDetailPage({ params }: { params: Promise<{ locale: string, id: string }> }) {
    const resolvedParams = use(params);
    const locale = resolvedParams.locale;
    const reservationId = resolvedParams.id;
    const router = useRouter();

    const [reservation, setReservation] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [generatingPdf, setGeneratingPdf] = useState(false);

    useEffect(() => {
        const fetchReservation = async () => {
            const { data, error } = await supabase
                .from('reservations')
                .select('*, properties:property_id(*)')
                .eq('id', reservationId)
                .single();

            if (error || !data) {
                toast.error("Erro ao carregar reserva");
                router.push(`/${locale}/admin/reservations`);
                return;
            }
            setReservation(data);
            setLoading(false);
        };

        fetchReservation();
    }, [reservationId]);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'N/A';
        try {
            return format(new Date(dateStr), "dd MMMM yyyy", { locale: locale === 'pt' ? pt : undefined });
        } catch (e) {
            return dateStr;
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat(locale === 'pt' ? 'pt-PT' : 'en-US', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount);
    };

    const generatePDF = async () => {
        setGeneratingPdf(true);
        const element = document.getElementById('reservation-content');
        if (!element) return;

        try {
            // Fix for html2canvas not supporting modern color functions (oklch, oklab)
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                onclone: (clonedDoc: Document) => {
                    const el = clonedDoc.documentElement;
                    el.classList.remove('dark');
                    clonedDoc.body.classList.remove('dark');
                    clonedDoc.body.style.backgroundColor = '#ffffff';

                    // Remove all external styles immediately
                    const styles = clonedDoc.querySelectorAll('style, link[rel="stylesheet"]');
                    styles.forEach(s => s.remove());

                    const content = clonedDoc.getElementById('reservation-content');
                    if (content) {
                        // AGGRESSIVE SANITATION: Remove all SVGs and Buttons
                        const junk = content.querySelectorAll('svg, button, nav, .lucide');
                        junk.forEach(j => j.remove());

                        // Recursively clean ALL remaining elements
                        const allNodes = content.querySelectorAll('*');
                        allNodes.forEach((node: any) => {
                            if (node instanceof HTMLElement || node instanceof SVGElement) {
                                // Strip inline styles
                                node.removeAttribute('style');

                                // Strip attributes that might contain modern CSS colors
                                const attrs = ['fill', 'stroke', 'color', 'background-color', 'border-color'];
                                attrs.forEach(attr => {
                                    const val = node.getAttribute(attr);
                                    if (val && (val.includes('oklch') || val.includes('lab') || val.includes('oklab'))) {
                                        node.removeAttribute(attr);
                                    }
                                });

                                if (node instanceof HTMLElement) {
                                    node.style.color = '#171717';
                                    node.style.fontFamily = 'sans-serif';
                                }
                            }
                        });
                    }
                    const style = clonedDoc.createElement('style');
                    style.innerHTML = `
                        /* Final High-Fidelity PDF Layout - Refined & Nítid */
                        * { 
                            box-sizing: border-box !important; 
                            -webkit-print-color-adjust: exact !important;
                            letter-spacing: 0 !important;
                        }
                        
                        body { 
                            font-family: 'Helvetica', 'Arial', sans-serif !important; 
                            background: white !important; 
                            color: #111111 !important;
                            line-height: 1.2 !important;
                            margin: 0 !important;
                        }
                        
                        #reservation-content {
                            padding: 60px 80px !important;
                            width: 1000px !important;
                            background: white !important;
                            margin: 0 auto !important;
                            display: block !important;
                        }

                        /* Header */
                        .flex.justify-between.items-start {
                            display: table !important;
                            width: 100% !important;
                            padding-bottom: 40px !important;
                            margin-bottom: 60px !important;
                            border-bottom: 3px solid #000 !important;
                        }
                        .flex.justify-between.items-start > div { display: table-cell !important; vertical-align: top !important; }
                        .flex.justify-between.items-start > div:last-child { text-align: right !important; }
                        
                        h2 { font-size: 32px !important; font-weight: 900 !important; margin: 0 0 5px 0 !important; color: #000 !important; }
                        [class*="tracking-[0.3em]"] { font-size: 11px !important; color: #999 !important; letter-spacing: 3px !important; text-transform: uppercase; }

                        /* Main Layout Grid */
                        .grid.md\\:grid-cols-2 {
                            display: table !important;
                            width: 100% !important;
                            border-collapse: separate !important;
                            border-spacing: 80px 0 !important;
                            margin-left: -80px !important;
                        }
                        .grid.md\\:grid-cols-2 > div { 
                            display: table-cell !important; 
                            width: 50% !important; 
                            vertical-align: top !important; 
                        }

                        /* Section Headers */
                        section { margin-bottom: 45px !important; display: block !important; clear: both !important; }
                        h3 {
                            display: block !important;
                            font-size: 11px !important;
                            text-transform: uppercase !important;
                            color: #999 !important;
                            margin: 0 0 25px 0 !important;
                            padding-bottom: 10px !important;
                            border-bottom: 1px solid #eee !important;
                            font-weight: 900 !important;
                        }

                        /* Labels and Values */
                        p, span { margin: 0 !important; padding: 0 !important; }
                        
                        /* Tiny Labels (Tailwind text-[10px]) */
                        [class*="text-[10px]"] { 
                            font-size: 10px !important; 
                            color: #888 !important; 
                            font-weight: 900 !important; 
                            text-transform: uppercase !important;
                            display: block !important;
                            margin-bottom: 6px !important;
                            line-height: 1 !important;
                        }
                        
                        /* Regular Text / Values */
                        .text-base.font-bold, .text-sm.font-bold, .text-sm.font-medium, p.text-base, p.text-sm { 
                            font-size: 17px !important; 
                            color: #000 !important; 
                            font-weight: 700 !important;
                            display: block !important;
                            line-height: 1.3 !important;
                        }
                        
                        /* Stay details stack fix */
                        .grid.grid-cols-2.gap-6 > div { margin-bottom: 25px !important; display: block !important; }

                        /* Service Cards Fix */
                        .grid.grid-cols-2.gap-4 { display: table !important; width: 100% !important; border-spacing: 12px 0 !important; margin-left: -12px !important; }
                        .grid.grid-cols-2.gap-4 > div { 
                            display: table-cell !important; 
                            width: 50% !important; 
                            border: 1px solid #eee !important; 
                            padding: 20px !important;
                            border-radius: 12px !important;
                            background: #fafafa !important;
                            vertical-align: middle !important;
                        }
                        /* Hide the icon dot in PDF */
                        .size-2.rounded-full { display: none !important; }
                        
                        /* Force show service texts */
                        .grid.grid-cols-2.gap-4 span.text-sm { 
                            display: inline-block !important; 
                            font-size: 14px !important; 
                            font-weight: 900 !important; 
                            color: #000 !important; 
                            float: left !important;
                        }
                        .grid.grid-cols-2.gap-4 span.text-\\[10px\\] { 
                            display: inline-block !important; 
                            font-size: 11px !important; 
                            float: right !important; 
                            color: #666 !important; 
                        }

                        /* Costs Breakdown Fix */
                        .divide-y > div {
                            display: table !important;
                            width: 100% !important;
                            padding: 15px 0 !important;
                            border-bottom: 1px solid #f2f2f2 !important;
                        }
                        .divide-y > div > span:first-child, .divide-y > div > div:first-child { 
                            display: table-cell !important; 
                            text-align: left !important; 
                            font-size: 14px !important; 
                            color: #666 !important; 
                            vertical-align: middle !important;
                        }
                        .divide-y > div > span:last-child { 
                            display: table-cell !important; 
                            text-align: right !important; 
                            font-size: 16px !important; 
                            font-weight: 900 !important; 
                            color: #000 !important;
                            vertical-align: middle !important;
                        }

                        /* Total Box */
                        .bg-\\[\\#fafafa\\].p-8 {
                            background: #000 !important;
                            color: #fff !important;
                            margin-top: 30px !important;
                            padding: 30px 40px !important;
                            border-radius: 12px !important;
                            display: table !important;
                            width: 100% !important;
                        }
                        .bg-\\[\\#fafafa\\].p-8 span:first-child { display: table-cell !important; font-size: 13px !important; font-weight: 900 !important; color: #fff !important; opacity: 0.7; }
                        .bg-\\[\\#fafafa\\].p-8 span:last-child { display: table-cell !important; text-align: right !important; font-size: 32px !important; font-weight: 900 !important; color: #fff !important; }

                        /* Payment & Observations */
                        .bg-emerald-50\\/20 { 
                            background: #f0fdf4 !important; 
                            padding: 25px !important; 
                            border: 1px solid #dcfce7 !important; 
                            margin-top: 40px !important; 
                            display: block !important;
                        }
                        .bg-emerald-50\\/20 h3, .bg-emerald-50\\/20 p { color: #065f46 !important; }
                        
                        .italic.text-sm { 
                            background: #fffbeb !important; 
                            padding: 25px !important; 
                            border: 1px solid #fef3c7 !important; 
                            margin-top: 15px !important; 
                            color: #92400e !important; 
                            display: block !important; 
                            font-family: serif !important;
                        }

                        /* Footer */
                        .mt-20.pt-8 { 
                            margin-top: 100px !important; 
                            border-top: 1px solid #eee !important; 
                            display: table !important; 
                            width: 100% !important; 
                            opacity: 0.5 !important;
                        }
                        .mt-20.pt-8 p { display: table-cell !important; font-size: 9px !important; font-weight: 900 !important; }
                        .mt-20.pt-8 p:last-child { text-align: right !important; }
                        
                        svg, button, nav { display: none !important; }
                    `;
                    clonedDoc.head.appendChild(style);
                }
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Reserva_${reservation.reference_id || 'LM'}.pdf`);
            toast.success("PDF gerado com sucesso");
        } catch (err) {
            console.error("PDF Error:", err);
            toast.error("Erro ao gerar PDF");
        } finally {
            setGeneratingPdf(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#fafafa] dark:bg-admin-dark-bg flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fafafa] dark:bg-admin-dark-bg pb-20">
            {/* Top Bar */}
            <div className="bg-white dark:bg-admin-dark-surface border-b border-[#f5f5f5] dark:border-admin-dark-border sticky top-0 z-10 transition-colors">
                <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href={`/${locale}/admin/reservations`}
                            className="p-2 hover:bg-[#fafafa] dark:hover:bg-white/5 rounded-xl text-[#a3a3a3] transition-colors"
                        >
                            <ChevronLeft className="size-5" />
                        </Link>
                        <h1 className="font-black text-lg text-[#171717] dark:text-admin-dark-text-primary uppercase tracking-tight">
                            Detalhes da Reserva
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={generatePDF}
                            disabled={generatingPdf}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/5 border border-[#eeeeee] dark:border-admin-dark-border rounded-xl text-xs font-bold text-[#171717] dark:text-white hover:bg-[#fafafa] dark:hover:bg-white/10 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                        >
                            <Download className="size-4" />
                            {generatingPdf ? 'A Gerar...' : 'Baixar PDF'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 mt-8">
                <div id="reservation-content" className="bg-white dark:bg-admin-dark-surface rounded-3xl border border-[#f5f5f5] dark:border-admin-dark-border shadow-sm overflow-hidden p-8 px-10">

                    {/* Brand Header (Print/PDF only visible) */}
                    <div className="flex justify-between items-start mb-12">
                        <div>
                            <h2 className="text-2xl font-black text-[#171717] dark:text-white uppercase tracking-tighter mb-1">LOVELY MEMORIES</h2>
                            <p className="text-[10px] text-[#a3a3a3] uppercase font-bold tracking-[0.3em]">Luxury Property Management</p>
                        </div>
                        <div className="text-right">
                            <span className="inline-block px-3 py-1 rounded bg-[#171717] text-white text-[10px] font-black uppercase tracking-widest mb-2">
                                {reservation.reference_id}
                            </span>
                            <p className="text-xs text-[#a3a3a3] font-bold uppercase">{formatDate(reservation.created_at)}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        {/* Left Side: Guest & Stay Details */}
                        <div className="space-y-10">
                            {/* Guest Details */}
                            <section>
                                <h3 className="text-xs font-bold text-[#a3a3a3] uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                    <User className="size-3" /> Detalhes do Hóspede
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-[10px] text-[#a3a3a3] uppercase font-bold mb-1">Nome Completo</p>
                                        <p className="text-base font-bold text-[#171717] dark:text-white">{reservation.guest_name}</p>
                                    </div>
                                    <div className="flex flex-col sm:flex-row sm:gap-12 gap-4">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[10px] text-[#a3a3a3] uppercase font-bold mb-1">Email</p>
                                            <p className="text-sm font-medium text-[#171717] dark:text-gray-300 break-all">{reservation.guest_email}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-[#a3a3a3] uppercase font-bold mb-1">Telefone</p>
                                            <p className="text-sm font-medium text-[#171717] dark:text-gray-300 whitespace-nowrap">{reservation.guest_phone}</p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Extras/Services indicators */}
                            <section>
                                <h3 className="text-xs font-bold text-[#a3a3a3] uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                    <Info className="size-3" /> Serviços Contratados
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className={`p-4 rounded-2xl border flex items-center justify-between ${reservation.breakfast_total > 0 ? 'bg-gold-50/20 border-gold-200' : 'bg-gray-50/50 border-gray-100 dark:bg-white/5 dark:border-white/10'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`size-2 rounded-full ${reservation.breakfast_total > 0 ? 'bg-gold-500' : 'bg-gray-300 dark:bg-white/20'}`} />
                                            <span className="text-sm font-bold text-[#171717] dark:text-white">Pequeno Almoço</span>
                                        </div>
                                        <span className="text-[10px] font-black uppercase text-[#a3a3a3]">
                                            {reservation.breakfast_total > 0 ? 'Sim' : 'Não'}
                                        </span>
                                    </div>
                                    <div className={`p-4 rounded-2xl border flex items-center justify-between ${reservation.transfer_total > 0 ? 'bg-sky-50/20 border-sky-200' : 'bg-gray-50/50 border-gray-100 dark:bg-white/5 dark:border-white/10'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`size-2 rounded-full ${reservation.transfer_total > 0 ? 'bg-sky-500' : 'bg-gray-300 dark:bg-white/20'}`} />
                                            <span className="text-sm font-bold text-[#171717] dark:text-white">Transfer</span>
                                        </div>
                                        <span className="text-[10px] font-black uppercase text-[#a3a3a3]">
                                            {reservation.transfer_total > 0 ? 'Sim' : 'Não'}
                                        </span>
                                    </div>
                                </div>
                            </section>

                            {/* Stay Details */}
                            <section>
                                <h3 className="text-xs font-bold text-[#a3a3a3] uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                    <Calendar className="size-3" /> Detalhes da Estadia
                                </h3>
                                <div className="p-6 rounded-2xl bg-[#fafafa]/50 dark:bg-admin-dark-bg/50 border border-[#f5f5f5] dark:border-admin-dark-border space-y-6">
                                    <div>
                                        <p className="text-[10px] text-[#a3a3a3] uppercase font-bold mb-2">Propriedade</p>
                                        <div className="flex items-center gap-3">
                                            <div className="size-10 rounded-xl bg-white dark:bg-admin-dark-surface border border-[#eeeeee] dark:border-admin-dark-border flex items-center justify-center text-[#171717] dark:text-white shadow-sm">
                                                <Home className="size-5" />
                                            </div>
                                            <p className="text-base font-black text-[#171717] dark:text-white">
                                                {(reservation.properties?.title?.[locale] || reservation.properties?.title?.en || reservation.properties?.title?.pt || 'Unknown Property')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <p className="text-[10px] text-[#a3a3a3] uppercase font-bold mb-1">Check-in</p>
                                            <p className="text-sm font-bold text-[#171717] dark:text-white">{formatDate(reservation.check_in)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-[#a3a3a3] uppercase font-bold mb-1">Check-out</p>
                                            <p className="text-sm font-bold text-[#171717] dark:text-white">{formatDate(reservation.check_out)}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <p className="text-[10px] text-[#a3a3a3] uppercase font-bold mb-1">Hóspedes</p>
                                            <p className="text-sm font-medium text-[#171717] dark:text-gray-300">
                                                {[
                                                    reservation.adults > 0 && `${reservation.adults} Adulto${reservation.adults > 1 ? 's' : ''} `,
                                                    reservation.children > 0 && `${reservation.children} Criança${reservation.children > 1 ? 's' : ''} `,
                                                    reservation.infants > 0 && `${reservation.infants} Bebé${reservation.infants > 1 ? 's' : ''} `
                                                ].filter(Boolean).join(', ')}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-[#a3a3a3] uppercase font-bold mb-1">Chegada</p>
                                            <p className="text-sm font-bold text-[#171717] dark:text-white flex items-center gap-1">
                                                <Clock className="size-3" /> {reservation.arrival_time || 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Billing Address */}
                            {(reservation.billing_address || reservation.billing_vat) && (
                                <section>
                                    <h3 className="text-xs font-bold text-[#a3a3a3] uppercase tracking-[0.2em] mb-4">Dados de Faturação</h3>
                                    <div className="p-4 bg-gray-50 dark:bg-admin-dark-bg/30 rounded-2xl text-xs space-y-1">
                                        <p className="font-bold">{reservation.guest_name}</p>
                                        <p>{reservation.billing_address}</p>
                                        <p>{reservation.billing_zip} {reservation.billing_city}</p>
                                        <p>{reservation.billing_country}</p>
                                        {reservation.billing_vat && (
                                            <p className="font-bold mt-2">NIF: <span className="font-mono text-sm">{reservation.billing_vat}</span></p>
                                        )}
                                    </div>
                                </section>
                            )}
                        </div>

                        {/* Right Side: Financials & Extras */}
                        <div className="space-y-10">
                            {/* Costs Breakdown */}
                            <section>
                                <h3 className="text-xs font-bold text-[#a3a3a3] uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                    <Receipt className="size-3" /> Detalhamento de Custos
                                </h3>
                                <div className="rounded-3xl border border-[#f5f5f5] dark:border-admin-dark-border divide-y divide-[#f5f5f5] dark:divide-admin-dark-border">
                                    <div className="p-6 flex justify-between items-center text-sm">
                                        <span className="text-[#a3a3a3] font-medium">Noites de Estadia</span>
                                        <span className="font-bold text-[#171717] dark:text-white">{formatCurrency(reservation.base_price || 0)}</span>
                                    </div>
                                    <div className="p-6 flex justify-between items-center text-sm">
                                        <span className="text-[#a3a3a3] font-medium">Taxa de Limpeza</span>
                                        <span className="font-bold text-[#171717] dark:text-white">{formatCurrency(reservation.cleaning_fee || 0)}</span>
                                    </div>
                                    {reservation.city_tax_total > 0 && (
                                        <div className="p-6 flex justify-between items-center text-sm">
                                            <span className="text-[#a3a3a3] font-medium">Taxa Municipal (City Tax)</span>
                                            <span className="font-bold text-[#171717] dark:text-white">{formatCurrency(reservation.city_tax_total)}</span>
                                        </div>
                                    )}
                                    {reservation.breakfast_total > 0 && (
                                        <div className="p-6 flex justify-between items-center text-sm bg-gold-50/5">
                                            <div className="flex items-center gap-2">
                                                <span className="size-2 rounded-full bg-gold-500"></span>
                                                <span className="text-[#a3a3a3] font-medium">Serviço de Pequeno Almoço</span>
                                            </div>
                                            <span className="font-bold text-[#171717] dark:text-white">{formatCurrency(reservation.breakfast_total)}</span>
                                        </div>
                                    )}
                                    {reservation.transfer_total > 0 && (
                                        <div className="p-6 flex justify-between items-center text-sm bg-sky-50/5">
                                            <div className="flex items-center gap-2">
                                                <span className="size-2 rounded-full bg-sky-500"></span>
                                                <span className="text-[#a3a3a3] font-medium">Serviço de Transfer</span>
                                            </div>
                                            <span className="font-bold text-[#171717] dark:text-white">{formatCurrency(reservation.transfer_total)}</span>
                                        </div>
                                    )}
                                    <div className="p-8 bg-[#fafafa] dark:bg-admin-dark-bg/20 flex justify-between items-center">
                                        <span className="text-xs font-black text-[#171717] dark:text-white uppercase tracking-[0.2em]">Total da Reserva</span>
                                        <span className="text-3xl font-black text-[#171717] dark:text-gold-500">{formatCurrency(reservation.total_price || 0)}</span>
                                    </div>
                                </div>
                            </section>

                            {/* Payment Method */}
                            <section>
                                <div className="p-6 rounded-3xl bg-emerald-50/20 dark:bg-emerald-500/5 border border-emerald-100/50 dark:border-emerald-500/10 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="size-10 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                            <CreditCard className="size-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-emerald-600/60 dark:text-emerald-400/60 uppercase font-black tracking-widest">Método de Pagamento</p>
                                            <p className="text-sm font-bold text-emerald-900 dark:text-emerald-300">
                                                {reservation.payment_method === 'wire' ? 'Transferência Bancária' : reservation.payment_method}
                                            </p>
                                        </div>
                                    </div>
                                    <CheckCircle2 className="size-6 text-emerald-500" />
                                </div>
                            </section>

                            {/* Special Requests */}
                            {reservation.special_requests && (
                                <section>
                                    <h3 className="text-xs font-bold text-[#a3a3a3] uppercase tracking-[0.2em] mb-4">Observações do Cliente</h3>
                                    <div className="p-6 rounded-3xl bg-gold-50/20 dark:bg-gold-500/5 border border-gold-100/20 dark:border-gold-500/10 italic text-sm text-[#171717] dark:text-admin-dark-text-primary leading-relaxed">
                                        "{reservation.special_requests}"
                                    </div>
                                </section>
                            )}
                        </div>
                    </div>

                    {/* Footer Info (Legal/Notice) */}
                    <div className="mt-20 pt-8 border-t border-[#f5f5f5] dark:border-admin-dark-border flex justify-between items-center opacity-50">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-[#a3a3a3]">© 2026 Lovely Memories - Documento Gerado Automaticamente</p>
                        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#a3a3a3]">lovelymemories.office@gmail.com</p>
                    </div>
                </div>

                {/* Bottom navigation */}
                <div className="mt-8 flex justify-center">
                    <Link
                        href={`/ ${locale} /admin/reservations`}
                        className="text-xs font-bold text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white uppercase tracking-widest flex items-center gap-2 transition-colors"
                    >
                        <ChevronLeft className="size-4" /> Voltar para a Lista
                    </Link>
                </div>
            </div>
        </div>
    );
}
