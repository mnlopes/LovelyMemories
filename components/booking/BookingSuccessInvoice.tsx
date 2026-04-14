"use client";

import React from "react";
import { Link } from "@/i18n/routing";
import { motion } from "framer-motion";
import { CheckCircle2, FileText } from "lucide-react";
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
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 md:p-6 bg-gradient-to-b from-gray-50 to-white text-navy-950">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-4xl mx-auto w-full pt-20 md:pt-28 pb-24 px-0 md:px-6"
            >
                <div className="text-center mb-12">
                    <div className="w-20 h-20 bg-[#2d8653] text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-[#2d8653]/20">
                        <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold font-montserrat text-navy-950 mb-2">{t('success.title')}</h1>
                    <p className="text-navy-900/60 text-lg">{t('success.subtitle', { email: formData.email })}</p>
                </div>

                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    {/* Order Summary Header */}
                    <div className="flex flex-col md:flex-row gap-6 md:gap-0 justify-between py-6 px-4 md:px-8 border-b border-gray-100 bg-gray-50/30">
                        <div className="space-y-1">
                            <p className="text-[10px] uppercase font-bold tracking-widest text-[#B08D4A]">{t('success.reference')}</p>
                            <p className="text-lg font-mono font-bold tracking-tighter text-navy-950">{reservationRef}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] uppercase font-bold tracking-widest text-[#B08D4A]">{t('success.date')}</p>
                            <p className="text-lg font-bold text-navy-950">{new Date().toLocaleDateString(locale)}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] uppercase font-bold tracking-widest text-[#B08D4A]">{t('sidebar.total')}</p>
                            <p className="text-lg font-bold text-navy-950">€{total}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] uppercase font-bold tracking-widest text-[#B08D4A]">{t('success.paymentMethod')}</p>
                            <p className="text-lg font-bold text-navy-950 capitalize">{formData.paymentMethod === 'wire' ? t('success.bankTransfer') : formData.paymentMethod}</p>
                        </div>
                    </div>

                    {/* Order Details Body */}
                    <div className="p-4 sm:p-6 md:p-8 space-y-6">
                        <div className="flex justify-between items-center pb-6 border-b border-gray-100">
                            <h2 className="text-2xl font-bold font-montserrat text-navy-950">{t('success.orderDetails')}</h2>
                            <button
                                onClick={handleDownloadPDF}
                                className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#B08D4A] hover:text-[#967840] transition-colors cursor-pointer"
                            >
                                <FileText className="w-4 h-4" />
                                {t('success.downloadPdf')}
                            </button>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 py-4 border-b border-gray-100">
                            <span className="font-bold text-navy-950 text-lg leading-tight">
                                {t('success.bookingOf')} <span className="text-[#B08D4A]">{property.title?.[locale] || property.title?.en || property.title || 'Untitled'}</span>
                            </span>
                        </div>

                        <div className="space-y-4 pt-4">
                            <div className="flex justify-between gap-4">
                                <span className="text-navy-900/60 shrink-0">{t('step1.fullName')}:</span>
                                <span className="font-bold text-navy-950 text-right">{formData.fullName}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                                <span className="text-navy-900/60 shrink-0">{t('step1.email')}:</span>
                                <span className="font-bold text-navy-950 text-right">{formData.email}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                                <span className="font-bold text-navy-950 shrink-0">{t('success.paymentMethod')}:</span>
                                <span className="font-bold text-navy-950 capitalize text-right">{formData.paymentMethod === 'wire' ? t('success.bankTransfer') : formData.paymentMethod}</span>
                            </div>
                            <div className="flex justify-between gap-4 text-lg pt-4 border-t border-gray-100">
                                <span className="font-bold text-navy-950 shrink-0">{t('sidebar.total')}:</span>
                                <span className="font-bold text-navy-950">€{total}</span>
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

                <div className="mt-12 flex justify-center w-full">
                    <Link href="/">
                        <Button variant="luxury" className="px-12 h-14 rounded-full">{t('success.returnHome')}</Button>
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
