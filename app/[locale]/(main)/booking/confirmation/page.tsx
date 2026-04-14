"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { BookingSuccessInvoice } from "@/components/booking/BookingSuccessInvoice";
import { getPaymentIntentDetails } from "@/app/actions/stripe";
import { Loader2 } from "lucide-react";

export default function BookingConfirmationPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = React.use(params);
    const t = useTranslations("Checkout");
    const searchParams = useSearchParams();
    
    const piParam = searchParams.get("payment_intent") || searchParams.get("pi");
    const reference = searchParams.get("ref") || (piParam ? `LM-${piParam.split('_')[1]?.toUpperCase().substring(0, 8) || "PENDING"}` : "LM-PENDING");

    const [loading, setLoading] = useState(!!piParam);
    const [invoiceData, setInvoiceData] = useState<any>(null);

    useEffect(() => {
        if (!piParam) return;
        const fetchDetails = async () => {
            const res = await getPaymentIntentDetails(piParam);
            if (res.success && res.metadata) {
                setInvoiceData({
                    property: res.property || { title: res.metadata.ps }, // fallback
                    reservationRef: reference,
                    formData: {
                        fullName: res.metadata.fn,
                        email: res.metadata.em,
                        phone: res.metadata.ph,
                        address: res.metadata.ba || "",
                        city: res.metadata.bc || "",
                        zip: res.metadata.bz || "",
                        country: res.metadata.bk || "",
                        vat: res.metadata.bv || "",
                        paymentMethod: res.paymentMethod || 'card',
                    },
                    total: parseFloat(res.metadata.tp || '0'),
                    showBilling: res.metadata.is_billing === 'true',
                    checkIn: res.metadata.ci,
                    checkOut: res.metadata.co,
                    nights: Math.ceil((new Date(res.metadata.co).getTime() - new Date(res.metadata.ci).getTime()) / (1000 * 3600 * 24)),
                    adults: parseInt(res.metadata.ad || '1'),
                    children: parseInt(res.metadata.ch || '0'),
                    infants: parseInt(res.metadata.inf || '0'),
                    basePrice: parseFloat(res.metadata.bp || '0'),
                    cleaningFee: parseFloat(res.metadata.cf || '0'),
                    discountAmount: parseFloat(res.metadata.da || '0'),
                    cityTaxTotal: parseFloat(res.metadata.ct || '0'),
                    breakfastTotal: parseFloat(res.metadata.bt || '0'),
                    transferTotal: parseFloat(res.metadata.tt || '0'),
                    couponDiscount: parseFloat(res.metadata.cd || '0'),
                    appliedCoupon: res.metadata.cc ? { code: res.metadata.cc } : undefined
                });
            }
            setLoading(false);
        };
        fetchDetails();
    }, [piParam, reference]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
                <Loader2 className="w-12 h-12 animate-spin text-[#B08D4A]" />
            </div>
        );
    }

    if (invoiceData) {
        return <BookingSuccessInvoice {...invoiceData} locale={locale} t={t} />;
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
            <Loader2 className="w-12 h-12 animate-spin text-[#B08D4A]" />
        </div>
    );
}
