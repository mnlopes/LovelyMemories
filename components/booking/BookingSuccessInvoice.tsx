"use client";

import React from "react";
import { Link } from "@/i18n/routing";
import { motion } from "framer-motion";
import { CheckCircle2, FileText, Euro } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { BookingInvoice } from "@/components/booking/BookingInvoice";
import { Button } from "@/components/ui/Button";

interface BookingSuccessInvoiceProps {
    reservationRef: string;
    locale: string;
    t: any; // next-intl translation function
    property: any; // The property object
    formData: any; // The checkout form data
    total: number;
    showBilling: boolean;
    // Invoice details for the PDF generator
    checkIn: string;
    checkOut: string;
    nights: number;
    adults: number;
    children: number;
    infants: number;
    basePrice: number;
    cleaningFee: number;
    discountAmount: number;
    cityTaxTotal: number;
    breakfastTotal: number;
    transferTotal: number;
    appliedCoupon?: any;
    couponDiscount: number;
}

export function BookingSuccessInvoice({
    reservationRef,
    locale,
    t,
    property,
    formData,
    total,
    showBilling,
    checkIn,
    checkOut,
    nights,
    adults,
    children,
    infants,
    basePrice,
    cleaningFee,
    discountAmount,
    cityTaxTotal,
    breakfastTotal,
    transferTotal,
    appliedCoupon,
    couponDiscount
}: BookingSuccessInvoiceProps) {

    const handleDownloadPDF = async () => {
        const element = document.getElementById('booking-invoice');
        if (!element) return;

        // Ensure it's visible for capture but behind everything
        element.style.opacity = '1';

        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: "#ffffff"
        });

        element.style.opacity = '0';

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const imgWidth = 210; // A4 width in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        pdf.save(`LovelyMemories_Reserva_${reservationRef}.pdf`);
    };

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 bg-gradient-to-b from-gray-50 to-white text-navy-950">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-4xl mx-auto w-full pt-12 md:pt-16 pb-16 px-0 md:px-6"
            >
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-[#2d8653] text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl shadow-[#2d8653]/20">
                        <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold font-montserrat text-navy-950 mb-1">{t('success.title')}</h1>
                    <p className="text-navy-900/60 text-base">{t('success.subtitle', { email: formData.email })}</p>
                </div>

                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    {/* Order Summary Header */}
                    <div className="flex flex-col md:flex-row gap-4 md:gap-0 justify-between py-4 px-4 md:px-8 border-b border-gray-100 bg-gray-50/30">
                        <div className="space-y-0.5">
                            <p className="text-[9px] uppercase font-bold tracking-widest text-[#B08D4A]">{t('success.reference')}</p>
                            <p className="text-base font-mono font-bold tracking-tighter text-navy-950">{reservationRef}</p>
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-[9px] uppercase font-bold tracking-widest text-[#B08D4A]">{t('success.date')}</p>
                            <p className="text-base font-bold text-navy-950">{new Date().toLocaleDateString(locale)}</p>
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-[9px] uppercase font-bold tracking-widest text-[#B08D4A]">{t('sidebar.total')}</p>
                            <p className="text-base font-bold text-navy-950">€{total}</p>
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-[10px] uppercase font-bold tracking-widest text-[#B08D4A]">{t('success.paymentMethod')}</p>
                            <p className="text-base font-bold text-navy-950 capitalize">{formData.paymentMethod === 'wire' ? t('success.bankTransfer') : formData.paymentMethod}</p>
                        </div>
                    </div>

                    {/* Order Details Body */}
                    <div className="p-4 sm:p-6 md:p-8 space-y-4">
                        <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                            <h2 className="text-xl font-bold font-montserrat text-navy-950">{t('success.orderDetails')}</h2>
                            <button
                                onClick={handleDownloadPDF}
                                className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#B08D4A] hover:text-[#967840] transition-colors cursor-pointer"
                            >
                                <FileText className="w-3.5 h-3.5" />
                                {t('success.downloadPdf')}
                            </button>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 py-2 border-b border-gray-100">
                            <div className="space-y-0.5">
                                <span className="font-bold text-navy-950 text-base leading-tight block">
                                    {t('success.bookingOf')} <span className="text-[#B08D4A]">{property.title?.[locale] || property.title?.en || property.title || 'Untitled'}</span>
                                </span>
                                <p className="text-navy-900/40 text-[10px] font-medium uppercase tracking-widest">{property.location?.city || property.city || ''}, Portugal</p>
                            </div>
                        </div>

                        {/* Stay Details Grid */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 py-4 border-b border-gray-100">
                            <div className="space-y-0.5">
                                <p className="text-[9px] uppercase font-bold tracking-widest text-[#B08D4A]">{t('sidebar.checkIn')}</p>
                                <p className="text-xs font-bold text-navy-950">{new Date(checkIn).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-[9px] uppercase font-bold tracking-widest text-[#B08D4A]">{t('sidebar.checkOut')}</p>
                                <p className="text-xs font-bold text-navy-950">{new Date(checkOut).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-[9px] uppercase font-bold tracking-widest text-[#B08D4A]">{t('success.duration')}</p>
                                <p className="text-xs font-bold text-navy-950">{t('sidebar.nights', { count: nights })}</p>
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-[9px] uppercase font-bold tracking-widest text-[#B08D4A]">{t('success.guests')}</p>
                                <p className="text-xs font-bold text-navy-950">
                                    {[
                                        t('sidebar.adults', { count: adults }),
                                        children > 0 ? t('sidebar.children', { count: children }) : null,
                                        infants > 0 ? t('sidebar.infants', { count: infants }) : null
                                    ].filter(Boolean).join(', ')}
                                </p>
                            </div>
                        </div>

                        {/* Financial Summary Table */}
                        <div className="pt-2">
                            <p className="text-[9px] uppercase font-bold tracking-[0.2em] text-[#B08D4A] mb-3">{t('success.financialSummary')}</p>
                            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/50">
                                            <th className="px-4 py-2.5 text-[9px] uppercase font-bold tracking-widest text-navy-900/40 border-b border-gray-100">{t('success.description')}</th>
                                            <th className="px-4 py-2.5 text-[9px] uppercase font-bold tracking-widest text-navy-900/40 border-b border-gray-100 text-right">{t('success.value')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        <tr>
                                            <td className="px-4 py-2 text-[13px] font-bold text-navy-950">Subtotal ({t('sidebar.nights', { count: nights })})</td>
                                            <td className="px-4 py-2 text-[13px] font-bold text-navy-950 text-right">€{basePrice}</td>
                                        </tr>
                                        {cleaningFee > 0 && (
                                            <tr>
                                                <td className="px-4 py-2 text-[13px] font-bold text-navy-950">{t('sidebar.cleaningFee')}</td>
                                                <td className="px-4 py-2 text-[13px] font-bold text-navy-950 text-right">€{cleaningFee}</td>
                                            </tr>
                                        )}
                                        {cityTaxTotal > 0 && (
                                            <tr>
                                                <td className="px-4 py-2 text-[13px] font-bold text-navy-950">{t('sidebar.cityTax')}</td>
                                                <td className="px-4 py-2 text-[13px] font-bold text-navy-950 text-right">€{cityTaxTotal}</td>
                                            </tr>
                                        )}
                                        {breakfastTotal > 0 && (
                                            <tr>
                                                <td className="px-4 py-2 text-[13px] font-bold text-navy-950">{t('sidebar.breakfast')}</td>
                                                <td className="px-4 py-2 text-[13px] font-bold text-navy-950 text-right">€{breakfastTotal}</td>
                                            </tr>
                                        )}
                                        {transferTotal > 0 && (
                                            <tr>
                                                <td className="px-4 py-2 text-[13px] font-bold text-navy-950">{t('sidebar.transfer')}</td>
                                                <td className="px-4 py-2 text-[13px] font-bold text-navy-950 text-right">€{transferTotal}</td>
                                            </tr>
                                        )}
                                        {couponDiscount > 0 && (
                                            <tr>
                                                <td className="px-4 py-2 text-[13px] font-bold text-[#2d8653]">{t('sidebar.discount')} ({appliedCoupon?.code})</td>
                                                <td className="px-4 py-2 text-[13px] font-bold text-[#2d8653] text-right">-€{couponDiscount}</td>
                                            </tr>
                                        )}
                                        <tr className="bg-gray-50/30">
                                            <td className="px-4 py-4 border-t border-gray-100">
                                                <p className="text-base font-bold font-montserrat text-navy-950">TOTAL</p>
                                                <p className="text-[9px] text-navy-900/40 font-bold uppercase tracking-widest">{t('success.vatRate')}</p>
                                            </td>
                                            <td className="px-4 py-4 text-right border-t border-gray-100">
                                                <p className="text-2xl font-bold font-montserrat text-navy-950">€{total}</p>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Bank Transfer Instructions (Conditional) */}
                        {formData.paymentMethod === 'wire' && (
                            <div className="pt-2">
                                <div className="bg-[#B08D4A]/5 border border-[#B08D4A]/20 rounded-2xl p-5 space-y-4">
                                    <div className="flex items-center gap-3 text-[#B08D4A]">
                                        <div className="w-8 h-8 rounded-full bg-[#B08D4A] text-white flex items-center justify-center shadow-lg shadow-[#B08D4A]/20">
                                            <Euro className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold uppercase tracking-widest text-[#B08D4A] text-[10px]">{t('step3.wire')}</h3>
                                            <p className="text-[9px] font-medium text-[#B08D4A]/60 uppercase tracking-widest">{t('step3.instructions').split('.')[0]}.</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-0.5">
                                            <p className="text-[9px] uppercase font-bold tracking-widest text-[#B08D4A]/60">{t('step3.holder')}</p>
                                            <p className="text-[13px] font-bold text-navy-950">Lovely Memories Ltd.</p>
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="text-[9px] uppercase font-bold tracking-widest text-[#B08D4A]/60">{t('step3.bankName')}</p>
                                            <p className="text-[13px] font-bold text-navy-950">Millennium BCP</p>
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="text-[9px] uppercase font-bold tracking-widest text-[#B08D4A]/60">{t('step3.iban')}</p>
                                            <p className="text-[13px] font-mono font-bold tracking-tighter text-navy-950">PT50 0033 0000 1234 5678 9012 3</p>
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="text-[9px] uppercase font-bold tracking-widest text-[#B08D4A]/60">{t('step3.swift')}</p>
                                            <p className="text-[13px] font-bold text-navy-950">BCPTPLLX</p>
                                        </div>
                                        <div className="md:col-span-2 p-3 bg-white/50 rounded-xl border border-[#B08D4A]/10">
                                            <p className="text-[9px] uppercase font-bold tracking-widest text-[#B08D4A]/60 mb-0.5">{t('step3.reference')}</p>
                                            <p className="text-lg font-mono font-bold tracking-tighter text-[#B08D4A]">{reservationRef}</p>
                                            <p className="text-[8px] text-navy-900/40 mt-0.5">{t('step3.instructions').split('.')[1]}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Guest Details */}
                        <div className="pt-2">
                            <p className="text-[9px] uppercase font-bold tracking-[0.2em] text-[#B08D4A] mb-3">{t('success.guestInfo')}</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
                                    <p className="text-[8px] uppercase font-bold tracking-widest text-navy-900/30 mb-0.5">{t('step1.fullName')}</p>
                                    <p className="text-[13px] font-bold text-navy-950">{formData.fullName}</p>
                                </div>
                                <div className="p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
                                    <p className="text-[8px] uppercase font-bold tracking-widest text-navy-900/30 mb-0.5">{t('step1.email')}</p>
                                    <p className="text-[13px] font-bold text-navy-950">{formData.email}</p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Billing Address Card */}
                {showBilling && formData.address && ( // Only show if address is filled
                    <div className="mt-8 bg-white border border-gray-100 rounded-3xl p-4 sm:p-6 md:p-12 shadow-sm">
                        <h2 className="text-2xl font-bold font-montserrat text-navy-950 mb-6">{t('step1.billingTitle')}</h2>
                        <address className="not-italic space-y-1 text-navy-900/70">
                            <p className="font-bold text-navy-950">{formData.fullName}</p>
                            <p>{formData.address}</p>
                            <p>{formData.zip} {formData.city}</p>
                            <p>{formData.country}</p>
                            {formData.vat && <p className="text-navy-900/40 text-xs mt-2 uppercase tracking-wider font-bold">{t('step1.vat').split(' - ')[0]}: {formData.vat}</p>}
                            <p className="pt-2">{formData.email}</p>
                            <p>{formData.phoneCode} {formData.phone}</p>
                        </address>
                    </div>
                )}

                <div className="mt-8 flex justify-center w-full">
                    <Link href="/">
                        <Button variant="luxury" className="px-10 h-12 rounded-full text-sm">{t('success.returnHome')}</Button>
                    </Link>
                </div>
            </motion.div>

            {/* Hidden Invoice for PDF Generation */}
            <div style={{ position: 'fixed', opacity: 0, pointerEvents: 'none', top: 0, left: 0, zIndex: -1 }}>
                <BookingInvoice
                    reservationRef={reservationRef}
                    date={new Date().toLocaleDateString(locale)}
                    propertyTitle={property.title?.[locale] || property.title?.en || property.title || 'Untitled'}
                    propertyLocation={`${property.location?.city || property.city || ''}, Portugal`}
                    checkIn={new Date(checkIn).toLocaleDateString(locale)}
                    checkOut={new Date(checkOut).toLocaleDateString(locale)}
                    nights={nights}
                    guests={`${t('sidebar.adults', { count: adults })}${children > 0 ? `, ${t('sidebar.children', { count: children })}` : ''}${infants > 0 ? `, ${t('sidebar.infants', { count: infants })}` : ''}`}
                    basePrice={basePrice}
                    cleaningFee={cleaningFee}
                    discountAmount={discountAmount}
                    cityTaxTotal={cityTaxTotal}
                    breakfastTotal={breakfastTotal}
                    transferTotal={transferTotal}
                    total={total}
                    paymentMethod={formData.paymentMethod}
                    customerName={formData.fullName}
                    customerEmail={formData.email}
                    customerPhone={formData.phone}
                    couponCode={appliedCoupon?.code || ""}
                    couponDiscount={couponDiscount}
                    t={t}
                />
            </div>
        </div>
    );
}
