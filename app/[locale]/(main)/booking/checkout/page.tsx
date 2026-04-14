"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter, Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from "framer-motion";
import {
    ChevronLeft,
    ChevronDown,
    ShieldCheck,
    Shield,
    CreditCard,
    User,
    Calendar,
    ArrowRight,
    Loader2,
    CheckCircle2,
    AlertCircle,
    FileText,
    MapPin,
    Euro,
    Users,
    Clock,
    Ticket
} from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { BookingInvoice } from "@/components/booking/BookingInvoice";
import { BookingSuccessInvoice } from "@/components/booking/BookingSuccessInvoice";
import { Button } from "@/components/ui/Button";
import { ADDRESS_DATA, COUNTRY_CODES as PHONE_CODES } from "@/lib/address-data";
import { processReservation } from "@/app/actions/reservation";
import { getBookingSession, BookingSessionData } from "@/lib/booking-session";
import { getPropertyBySlug } from "@/lib/services";
import { toast } from "sonner";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { createPaymentIntent, confirmStripePaymentIntent } from "@/app/actions/stripe";
import CheckoutTimer from "@/components/booking/CheckoutTimer";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function CheckoutPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = React.use(params);
    const t = useTranslations("Checkout");
    const searchParams = useSearchParams();
    const router = useRouter();

    // State management
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [reservationRef, setReservationRef] = useState("");
    const [error, setError] = useState("");
    const [bookingData, setBookingData] = useState<BookingSessionData | null>(null);
    const [property, setProperty] = useState<any | null>(null);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [zipError, setZipError] = useState<string>("");
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [isInitializingStripe, setIsInitializingStripe] = useState(false);
    const [isStripeValid, setIsStripeValid] = useState(false);
    const [bookingStatus, setBookingStatus] = useState<"idle" | "processing" | "confirming">("idle");
    const [sessionId] = useState(() => {
        const urlCode = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('code') : null;
        if (urlCode) return `sess_${urlCode}`;
        
        // Persistir ID aleatório em cookie para evitar 409 no refresh
        const existing = Cookies.get('booking_session_id');
        if (existing) return existing;
        
        const newSess = `sess_tmp_${Math.random().toString(36).substring(2, 9)}`;
        Cookies.set('booking_session_id', newSess, { expires: 1/96 }); // 15 mins
        return newSess;
    });

    // Helper to translate errors even if i18n is unstable, respecting the current locale
    const translateError = (errCode: string) => {
        const translated = t(errCode);
        
        // If translation is successful (doesn't return the raw key), use it
        if (translated && !translated.includes(errCode)) {
            return translated;
        }
        
        // Manual fallbacks for safety during dev/cache issues
        const fallbacks: Record<string, Record<string, string>> = {
            pt: {
                'errorTemporarilyLocked': "Estas datas estão temporariamente reservadas por outro utilizador. Aguarde 15 minutos ou escolha outro período.",
                'errorAlreadyBooked': "Infelizmente, estas datas acabaram de ser reservadas.",
                'errorGeneric': "Ocorreu um erro no processamento. Tente novamente.",
                'errorServer': "Erro de ligação ao servidor.",
                'datesSecured': "Datas seguras! Tem 15 minutos para completar a sua reserva."
            },
            en: {
                'errorTemporarilyLocked': "These dates are temporarily reserved by another user. Please wait 15 minutes or choose another period.",
                'errorAlreadyBooked': "Unfortunately, these dates have just been booked.",
                'errorGeneric': "An error occurred while processing. Please try again.",
                'errorServer': "Server connection error.",
                'datesSecured': "Dates secured! You have 15 minutes to complete your booking."
            }
        };

        const currentLocale = (locale as string) === 'en' ? 'en' : 'pt';
        return fallbacks[currentLocale][errCode] || errCode;
    };

    const handlePaymentSuccess = async (paymentIntentId: string) => {
        setBookingStatus("confirming");
        try {
            console.log("Finalizing booking for PaymentIntent:", paymentIntentId);
            const result = await confirmStripePaymentIntent(paymentIntentId);
            
            if (result.success && 'ref' in result && result.ref) {
                console.log("Stripe booking finalized successfully. Ref:", result.ref);
                setReservationRef(result.ref);
                setIsFinished(true);
            } else {
                console.error("Failed to finalize booking manually:", result.error);
                setError(result.error || "Ocorreu um erro ao finalizar a sua reserva. Por favor contacte o suporte.");
                setBookingStatus("idle");
                setIsSubmitting(false);
            }
        } catch (err) {
            console.error("Error in handlePaymentSuccess:", err);
            setError("Erro inesperado ao confirmar o pagamento.");
            setBookingStatus("idle");
            setIsSubmitting(false);
        }
    };

    const code = searchParams.get("code") || "";
    const paymentReference = code ? `LM-${code.toUpperCase()}` : "LM-PENDING";

    // Load booking and property data from session code
    useEffect(() => {
        const fetchData = async () => {
            const data = getBookingSession(code);
            if (data) {
                setBookingData(data);
                // Fetch property from Supabase
                const propData = await getPropertyBySlug(data.slug);
                if (propData) {
                    setProperty(propData);

                    // SECURITY CHECK: Re-verify availability
                    const { checkPropertyAvailability } = await import("@/lib/services");
                    const availability = await checkPropertyAvailability(
                        propData.id,
                        new Date(data.checkIn),
                        new Date(data.checkOut),
                        data.adults + (data.children || 0)
                    );

                    if (!availability.available) {
                        setError(availability.error || "This property is no longer available for these dates.");
                        // Optional: Redirect back if unavailable
                        // setTimeout(() => router.push(`/${locale}/properties/${data.slug}`), 3000);
                    }
                }
            }

            // Artificial delay for luxury feel
            setTimeout(() => {
                setIsLoadingData(false);
            }, 1200);
        };

        fetchData();
    }, [code, locale]);

    // Initial lock creation
    useEffect(() => {
        if (property && bookingData && sessionId) {
            console.log("🔒 Creating initial 15min lock for session:", sessionId);
            fetch('/api/bookings/lock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    propertyId: property.id,
                    checkIn: bookingData.checkIn,
                    checkOut: bookingData.checkOut,
                    sessionId
                })
            }).then(async res => {
                if (!res.ok) {
                    const data = await res.json();
                    if (data.error) {
                        setError(translateError(data.error));
                    }
                } else {
                    // Se teve sucesso, limpamos qualquer erro de bloqueio anterior
                    if (error?.includes("temporariamente") || error?.includes("temporarily")) {
                        setError("");
                    }
                }
            }).catch(err => console.error("Lock error:", err));
        }

        // Cleanup lock on unmount (only if not finished successfully)
        return () => {
            // We can't use async here, so we use sendBeacon for more reliability on tab close
            // But for now, just skip auto-cleanup on simple unmount to avoid accidental releases on step changes
        };
    }, [property, bookingData, sessionId]);

    // Form state
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        phone: "",
        arrivalTime: "",
        couponCode: "",
        address: "",
        city: "",
        zip: "",
        country: "Portugal",
        vat: "",
        website: "", // Honeypot
        paymentMethod: "wire", // Default to wire for now
        phoneCode: "+351",
    });

    const [appliedCoupon, setAppliedCoupon] = useState<{
        code: string;
        discount_type: 'percentage' | 'fixed';
        discount_value: number;
    } | null>(null);

    const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

    const [isPhoneCodeOpen, setIsPhoneCodeOpen] = useState(false);
    const [isCountryOpen, setIsCountryOpen] = useState(false);
    const [isCityOpen, setIsCityOpen] = useState(false);
    const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
    const [showBilling, setShowBilling] = useState(false);
    const [isArrivalOpen, setIsArrivalOpen] = useState(false);

    const arrivalOptions = [
        { value: "unknown", label: t('step2.unknown') },
        { value: "15-16", label: "15:00 - 16:00" },
        { value: "16-17", label: "16:00 - 17:00" },
        { value: "17-18", label: "17:00 - 18:00" },
        { value: "after-18", label: t('step2.after18') }
    ];

    const COUNTRY_CODES = PHONE_CODES;

    const shakeVariants = {
        shake: {
            x: [0, -4, 4, -4, 4, 0],
            transition: { duration: 0.4 }
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // Clear field-specific error when user typing
        if (fieldErrors[name]) {
            const newErrors = { ...fieldErrors };
            delete newErrors[name];
            setFieldErrors(newErrors);
        }

        if (name === "zip") {
            setZipError(""); // Clear zip error on input change
        }

        if (error) setError("");
    };

    const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newCountryName = e.target.value;
        setFormData(prev => ({
            ...prev,
            country: newCountryName,
            zip: "", // Reset zip on country change
            city: "" // Reset city on country change
        }));
        setZipError(""); // Clear zip error when country changes
    };


    const validateStep = (currentStep: number) => {
        const newErrors: Record<string, string> = {};

        if (currentStep === 1) {
            if (!formData.fullName || formData.fullName.trim().length < 3) {
                newErrors.fullName = t('errors.nameError');
            }
            if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
                newErrors.email = t('errors.emailError');
            }
            if (!formData.phone || formData.phone.trim().length < 9) {
                newErrors.phone = t('errors.phoneError');
            }

            // Validate billing fields if the toggle is ON
            if (showBilling) {
                if (!formData.country) newErrors.country = t('errors.countryRequired');
                if (!formData.city) newErrors.city = t('errors.cityRequired');
                if (!formData.address) newErrors.address = t('errors.addressRequired');
                if (!formData.zip) {
                    newErrors.zip = t('errors.zipRequired');
                } else if (formData.country) {
                    // Country-specific ZIP validation
                    const countryEntry = Object.values(ADDRESS_DATA).find(c => c.name.toLowerCase() === formData.country.toLowerCase());
                    if (countryEntry && !countryEntry.zipRegex.test(formData.zip)) {
                        newErrors.zip = t('errors.invalidFormat', {
                            format: countryEntry.zipFormat,
                            country: countryEntry.name
                        });
                    }
                }
            }
        }

        if (currentStep === 3) {
            if (!formData.paymentMethod) {
                setError(t('errors.paymentMethodRequired'));
                return false;
            }
        }

        setFieldErrors(newErrors);

        // If there are errors, scroll to the first one or top
        if (Object.keys(newErrors).length > 0) {
            window.scrollTo({ top: 100, behavior: 'smooth' });
            return false;
        }

        return true;
    };

    // Derived booking data
    const slug = bookingData?.slug || "";
    const checkIn = bookingData?.checkIn || "";
    const checkOut = bookingData?.checkOut || "";
    const adults = bookingData?.adults || 1;
    const children = bookingData?.children || 0;
    const infants = bookingData?.infants || 0;
    const selectedExtras = bookingData?.selectedExtras;
    const extraPrices = bookingData?.extraPrices;

    if (isLoadingData) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col pt-20 lg:pt-24">
                {/* Skeleton Header */}
                <div className="fixed top-0 inset-x-0 h-20 lg:h-24 bg-white border-b border-gray-100 z-50 flex items-center px-6 lg:px-12">
                    <div className="w-1/4 h-8 bg-gray-100 animate-pulse rounded-lg" />
                    <div className="flex-1 flex justify-center gap-4">
                        <div className="w-10 h-10 bg-gray-100 animate-pulse rounded-full" />
                        <div className="w-10 h-10 bg-gray-100 animate-pulse rounded-full" />
                        <div className="w-10 h-10 bg-gray-100 animate-pulse rounded-full" />
                    </div>
                    <div className="w-1/4 flex justify-end">
                        <div className="w-32 h-10 bg-gray-100 animate-pulse rounded-full" />
                    </div>
                </div>

                <div className="flex-grow container mx-auto px-4 py-8 lg:py-16 max-w-7xl w-full">
                    <div className="flex flex-col lg:flex-row gap-8 lg:gap-16">
                        {/* Skeleton Form */}
                        <div className="lg:w-2/3 space-y-12">
                            <div className="space-y-4">
                                <div className="w-1/3 h-10 bg-gray-200 animate-pulse rounded-xl" />
                                <div className="w-2/3 h-6 bg-gray-100 animate-pulse rounded-lg" />
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <div className="w-20 h-3 bg-gray-100 animate-pulse rounded" />
                                    <div className="w-full h-14 bg-white border border-gray-100 animate-pulse rounded-2xl" />
                                </div>
                                <div className="space-y-2">
                                    <div className="w-20 h-3 bg-gray-100 animate-pulse rounded" />
                                    <div className="w-full h-14 bg-white border border-gray-100 animate-pulse rounded-2xl" />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <div className="w-20 h-3 bg-gray-100 animate-pulse rounded" />
                                    <div className="w-full h-14 bg-white border border-gray-100 animate-pulse rounded-2xl" />
                                </div>
                            </div>
                            <div className="w-full h-32 bg-navy-950/5 animate-pulse rounded-[32px]" />
                        </div>

                        {/* Skeleton Sidebar */}
                        <div className="w-full lg:w-[400px] space-y-8">
                            <div className="bg-white rounded-[40px] overflow-hidden border border-gray-100 shadow-sm h-[600px] p-8 space-y-8">
                                <div className="h-48 -mx-8 -mt-8 bg-gray-100 animate-pulse" />
                                <div className="space-y-4">
                                    <div className="w-3/4 h-8 bg-gray-200 animate-pulse rounded-xl" />
                                    <div className="w-1/2 h-4 bg-gray-100 animate-pulse rounded-lg" />
                                </div>
                                <div className="space-y-6 pt-4">
                                    <div className="flex gap-4">
                                        <div className="w-10 h-10 bg-gray-100 animate-pulse rounded-full" />
                                        <div className="flex-1 space-y-2">
                                            <div className="w-1/2 h-3 bg-gray-50 animate-pulse rounded" />
                                            <div className="w-3/4 h-4 bg-gray-100 animate-pulse rounded" />
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="w-10 h-10 bg-gray-100 animate-pulse rounded-full" />
                                        <div className="flex-1 space-y-2">
                                            <div className="w-1/2 h-3 bg-gray-50 animate-pulse rounded" />
                                            <div className="w-3/4 h-4 bg-gray-100 animate-pulse rounded" />
                                        </div>
                                    </div>
                                </div>
                                <div className="h-px bg-gray-100" />
                                <div className="flex justify-between items-center">
                                    <div className="w-1/4 h-4 bg-gray-100 animate-pulse rounded" />
                                    <div className="w-1/3 h-10 bg-gray-200 animate-pulse rounded-xl" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!property || !bookingData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 text-center">
                <div className="max-w-md space-y-6">
                    <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
                        <AlertCircle size={40} />
                    </div>
                    <h1 className="text-2xl font-bold text-navy-950">{t('errors.sessionNotFound')}</h1>
                    <p className="text-navy-900/60">{t('errors.sessionExpired')}</p>
                    <Link href={`/${locale}/properties`}>
                        <Button variant="luxury" className="w-full h-14 rounded-full">{t('errors.exploreProperties')}</Button>
                    </Link>
                </div>
            </div>
        );
    }

    const nights = checkIn && checkOut ? Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)) : 0;
    const pricingRules = property.policies?.pricing || {
        cleaning_fee: 85,
        weekly_discount_percent: 5,
        monthly_discount_percent: 15
    };

    const basePrice = nights * property.price.perNight;
    const cleaningFee = pricingRules.cleaning_fee;
    const cityTaxPerNight = pricingRules.city_tax_per_night || 2.00;

    // Determine Discount
    let activeDiscountPercent = 0;
    if (nights >= 28) {
        activeDiscountPercent = pricingRules.monthly_discount_percent;
    } else if (nights >= 7) {
        activeDiscountPercent = pricingRules.weekly_discount_percent;
    }

    const discountAmount = activeDiscountPercent > 0 ? Math.round(basePrice * (activeDiscountPercent / 100)) : 0;

    // City Tax Calculation (Tourist Tax)
    // Adults + Children, max 7 nights
    const taxableGuests = adults + children;
    const taxableNights = Math.min(nights, 7);
    const cityTaxTotal = cityTaxPerNight * taxableGuests * taxableNights;

    // Extras Calculation
    const breakfastPrice = extraPrices?.breakfast || 15;
    const transferPrice = extraPrices?.transfer || 55;
    const breakfastDays = selectedExtras?.breakfastDays || 1;
    const isRoundTrip = selectedExtras?.transferType === 'round_trip';

    const breakfastTotal = selectedExtras?.breakfast ? (breakfastPrice * (adults + children + infants) * breakfastDays) : 0;
    const transferTotal = selectedExtras?.transfer ? (transferPrice * (isRoundTrip ? 2 : 1)) : 0;

    // Calculate total price including base, discounts, fees, and extras
    const pricing = {
        basePrice: basePrice,
        discountAmount: discountAmount,
        cleaningFee: cleaningFee,
        cityTaxTotal: cityTaxTotal,
        totalPrice: basePrice - discountAmount + cleaningFee + cityTaxTotal
    };

    const reservationDiscount = pricing ? pricing.discountAmount : 0;
    const couponDiscount = appliedCoupon
        ? (appliedCoupon.discount_type === 'percentage'
            ? (pricing ? pricing.basePrice * (appliedCoupon.discount_value / 100) : 0)
            : appliedCoupon.discount_value)
        : 0;

    const total = Math.max(0, (pricing?.totalPrice || 0) + breakfastTotal + transferTotal - couponDiscount);
    const vat = total * 0.23;

    const formatDate = (dateString: string) => {
        if (!dateString) return "";
        try {
            const date = new Date(dateString);
            const d = date.getDate().toString().padStart(2, '0');
            const m = (date.getMonth() + 1).toString().padStart(2, '0');
            const y = date.getFullYear();
            return `${d}.${m}.${y}`;
        } catch (e) {
            return dateString;
        }
    };

    const nextStep = () => {
        if (validateStep(step)) {
            setStep(prev => Math.min(prev + 1, 3));
            if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    };
    const prevStep = () => {
        if (step > 1) {
            setStep(prev => prev - 1);
        } else {
            router.push(`/properties/${slug}`);
        }
    };

    const handleApplyCoupon = async () => {
        if (!formData.couponCode) return;
        
        setIsValidatingCoupon(true);
        const { validateCoupon } = await import("@/app/actions/coupons");
        const result = await validateCoupon(formData.couponCode);
        
        if (result.success && result.coupon) {
            setAppliedCoupon(result.coupon);
            toast.success(t('step2.couponApplied'));
        } else {
            toast.error(result.error || t('step2.invalidCoupon'));
            setAppliedCoupon(null);
        }
        setIsValidatingCoupon(false);
    };

    const handleSelectPaymentMethod = async (method: string) => {
        setFormData(prev => ({ ...prev, paymentMethod: method }));
        
        if (method === 'card' && !clientSecret) {
            setIsInitializingStripe(true);
            try {
                const res = await createPaymentIntent({
                    ...formData,
                    propertySlug: bookingData!.slug,
                    checkIn: bookingData!.checkIn,
                    checkOut: bookingData!.checkOut,
                    adults: bookingData!.adults,
                    children: bookingData!.children || 0,
                    infants: bookingData!.infants || 0,
                    breakfastTotal,
                    transferTotal,
                    transferType: selectedExtras?.transferType,
                    couponCode: appliedCoupon?.code || "",
                    couponDiscount: couponDiscount || 0,
                    sessionId: sessionId,
                } as any);

                if (res.success && res.clientSecret) {
                    setClientSecret(res.clientSecret);
                } else {
                    setError(res.error || "Erro ao inicializar pagamento.");
                    toast.error("Erro ao inicializar Stripe.");
                }
            } catch (err) {
                console.error(err);
                setError("Erro de rede ao inicializar Stripe.");
            } finally {
                setIsInitializingStripe(false);
            }
        }
    };

    const handleRemoveCoupon = () => {
        setAppliedCoupon(null);
        setFormData(prev => ({ ...prev, couponCode: "" }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateStep(step)) return;

        if (step < 3) {
            nextStep();
        } else {
            setIsSubmitting(true);
            setError("");

            try {
                // If phone is provided, combine it with the code. Otherwise, leave it empty.
                const finalPhone = formData.phone
                    ? `${formData.phoneCode} ${formData.phone}`.trim()
                    : "";

                const result = await processReservation({
                    ...formData,
                    isBillingActive: showBilling,
                    couponCode: appliedCoupon?.code || "",
                    couponDiscount: couponDiscount,
                    phone: finalPhone, // Use the combined phone number
                    propertySlug: property.slug,
                    checkIn: checkIn,
                    checkOut: checkOut,
                    adults: adults,
                    children: children,
                    infants: infants,
                    bookingCode: code,
                    totalPrice: total,
                    basePrice: basePrice,
                    cleaningFee: cleaningFee,
                    discountAmount: discountAmount,
                    cityTaxTotal: cityTaxTotal,
                    breakfastTotal: breakfastTotal,
                    transferTotal: transferTotal,
                    transferType: selectedExtras?.transferType,
                    paymentMethod: formData.paymentMethod,
                    sessionId: sessionId
                });

                if (result.success && result.ref) {
                    if (result.warning) console.warn("Reservation saved with issues:", result.warning);
                    setReservationRef(result.ref);
                    setIsFinished(true);
                } else {
                    // Try to translate the error code directly
                    if (result.error) {
                        setError(translateError(result.error));
                    } else {
                        setError(translateError('errorGeneric'));
                    }
                }
            } catch (err) {
                setError(translateError('errorServer'));
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const handleDownloadPDF = async () => {
        const element = document.getElementById('booking-invoice');
        if (!element) return;

        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: "#ffffff"
        });

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

    if (isFinished) {
        return (
            <BookingSuccessInvoice
                reservationRef={reservationRef}
                locale={locale}
                t={t}
                property={property}
                formData={formData}
                total={total}
                showBilling={showBilling}
                checkIn={checkIn}
                checkOut={checkOut}
                nights={nights}
                adults={adults}
                children={children}
                infants={infants}
                basePrice={basePrice}
                cleaningFee={cleaningFee}
                discountAmount={discountAmount}
                cityTaxTotal={cityTaxTotal}
                breakfastTotal={breakfastTotal}
                transferTotal={transferTotal}
                appliedCoupon={appliedCoupon}
                couponDiscount={couponDiscount}
            />
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col pt-20 lg:pt-24 text-navy-950">
            {/* Header / Navbar Replacement */}
            <header className="fixed top-0 inset-x-0 bg-white/80 backdrop-blur-md border-b border-gray-100 z-50 flex flex-col">
                <div className="h-20 lg:h-24 flex items-center px-4 lg:px-12 justify-between w-full gap-2 lg:gap-4">
                    {/* Left: Navigation & Brand */}
                    <div className="w-auto lg:w-1/4 lg:min-w-[200px] flex items-center gap-8">
                        <button
                            onClick={prevStep}
                            className="flex items-center justify-center gap-1.5 w-auto min-w-[90px] lg:w-32 px-3 py-2 border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-gray-200 transition-all rounded-full group shrink-0"
                        >
                            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            <span className="font-bold text-[9px] lg:text-[11px] uppercase tracking-widest text-navy-950">
                                {step === 1 ? t('header.cancel') : t('header.back')}
                            </span>
                        </button>

                        <Link href="/" className="hidden lg:block">
                            <img
                                src="/legacy/home/images/logo.svg"
                                alt="Lovely Memories"
                                className="h-8 lg:h-10 opacity-90 transition-opacity hover:opacity-100"
                            />
                        </Link>
                    </div>

                    {/* Center: Simplified Progress Map (Responsive) */}
                    <div className="flex-1 flex justify-center items-center">
                        <div className="flex items-center gap-2 lg:gap-6">
                            {[
                                { id: 1, label: t('header.contact') },
                                { id: 2, label: t('header.details') },
                                { id: 3, label: t('header.payment') }
                            ].map((s, idx) => (
                                <React.Fragment key={s.id}>
                                    <div className="relative flex flex-col items-center">
                                        <div className={`
                                            w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center border-2 text-[10px] lg:text-xs font-bold transition-all duration-500 z-10
                                            ${step === s.id ? 'bg-navy-950 text-white border-navy-950 shadow-lg scale-110' :
                                                step > s.id ? 'bg-[#2d8653] text-white border-[#2d8653]' :
                                                    'bg-white text-navy-950/20 border-gray-100'}
                                        `}>
                                            {step > s.id ? '✓' : s.id}
                                        </div>
                                        <div className="absolute top-full mt-1.5 lg:mt-3 flex flex-col items-center">
                                            <span className={`text-[8px] lg:text-[9px] uppercase font-bold lg:tracking-[0.2em] whitespace-nowrap transition-colors duration-500
                                                ${step >= s.id ? 'text-navy-950' : 'text-navy-950/20'}`}>
                                                {s.label}
                                            </span>
                                        </div>
                                    </div>
                                    {idx < 2 && (
                                        <div className={`w-5 sm:w-8 lg:w-16 h-0.5 rounded-full transition-colors duration-500 ${step > s.id ? 'bg-[#2d8653]' : 'bg-gray-100'}`} />
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    <div className="hidden lg:flex lg:w-1/4 lg:min-w-[220px] items-center justify-end pr-4">
                        {/* Right: Empty for Balance */}
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-7xl mx-auto w-full px-6 lg:px-20 py-8 lg:py-12 flex flex-col lg:flex-row gap-8 lg:gap-16">
                {/* Form Section */}
                <div className="flex-1 max-w-2xl">
                    <div className="space-y-12">
                        {/* Hidden form to allow sidebar button to trigger submission via the 'form' attribute */}
                        <form id="checkout-form" onSubmit={handleSubmit} className="hidden" aria-hidden="true" />
                        {/* Honeypot field - Hidden from users */}
                        <div className="hidden" aria-hidden="true">
                            <input
                                type="text"
                                name="website"
                                value={formData.website}
                                onChange={handleInputChange}
                                tabIndex={-1}
                                autoComplete="off"
                            />
                        </div>

                        <AnimatePresence mode="wait">
                            {step === 1 && (
                                <motion.div
                                    key="step1"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="space-y-8"
                                >
                                    <div>
                                        <h1 className="text-4xl font-bold font-montserrat mb-3">{t('step1.title')}</h1>
                                        <p className="text-navy-900/40 font-medium">{t('step1.subtitle')}</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <motion.div
                                            variants={shakeVariants}
                                            animate={fieldErrors.fullName ? "shake" : ""}
                                            className="space-y-2"
                                        >
                                            <label className={`text-[10px] uppercase font-bold tracking-widest transition-colors ${fieldErrors.fullName ? 'text-[#9B1D20]' : 'text-[#B08D4A]'}`}>{t('step1.fullName')}</label>
                                            <input
                                                name="fullName"
                                                value={formData.fullName}
                                                onChange={handleInputChange}
                                                type="text"
                                                className={`w-full h-14 bg-white border rounded-2xl px-5 focus:border-[#B08D4A] outline-none transition-all ${fieldErrors.fullName ? 'border-[#9B1D20] bg-[#9B1D20]/5 shadow-[0_0_10px_rgba(155,29,32,0.05)]' : 'border-gray-100 focus:shadow-lg focus:shadow-gray-200/50'}`}
                                                placeholder={t('step1.fullNamePlaceholder')}
                                            />
                                            <AnimatePresence>
                                                {fieldErrors.fullName && (
                                                    <motion.p
                                                        initial={{ opacity: 0, y: -5 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className="text-[9px] text-[#9B1D20] font-bold uppercase tracking-[0.15em] pl-1"
                                                    >
                                                        {fieldErrors.fullName}
                                                    </motion.p>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                        <motion.div
                                            variants={shakeVariants}
                                            animate={fieldErrors.email ? "shake" : ""}
                                            className="space-y-2"
                                        >
                                            <label className={`text-[10px] uppercase font-bold tracking-widest transition-colors ${fieldErrors.email ? 'text-[#9B1D20]' : 'text-[#B08D4A]'}`}>{t('step1.email')}</label>
                                            <input
                                                name="email"
                                                value={formData.email}
                                                onChange={handleInputChange}
                                                type="email"
                                                className={`w-full h-14 bg-white border rounded-2xl px-5 focus:border-[#B08D4A] outline-none transition-all ${fieldErrors.email ? 'border-[#9B1D20] bg-[#9B1D20]/5 shadow-[0_0_10px_rgba(155,29,32,0.05)]' : 'border-gray-100 focus:shadow-lg focus:shadow-gray-200/50'}`}
                                                placeholder={t('step1.emailPlaceholder')}
                                            />
                                            <AnimatePresence>
                                                {fieldErrors.email && (
                                                    <motion.p
                                                        initial={{ opacity: 0, y: -5 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className="text-[9px] text-[#9B1D20] font-bold uppercase tracking-[0.15em] pl-1"
                                                    >
                                                        {fieldErrors.email}
                                                    </motion.p>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                        <motion.div
                                            variants={shakeVariants}
                                            animate={fieldErrors.phone ? "shake" : ""}
                                            className="space-y-2 md:col-span-2"
                                        >
                                            <label className={`text-[10px] uppercase font-bold tracking-widest transition-colors ${fieldErrors.phone ? 'text-[#9B1D20]' : 'text-[#B08D4A]'}`}>{t('step1.phone')}</label>
                                            <div className="flex gap-3">
                                                <div className="relative">
                                                    <div
                                                        onClick={() => setIsPhoneCodeOpen(!isPhoneCodeOpen)}
                                                        className={`w-28 h-14 bg-white border rounded-2xl px-4 flex items-center justify-between cursor-pointer transition-all ${fieldErrors.phone ? 'border-[#9B1D20] bg-[#9B1D20]/5' : 'border-gray-100 hover:border-gray-200'}`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-lg leading-none">{COUNTRY_CODES.find(c => c.code === formData.phoneCode)?.flag}</span>
                                                            <span className="text-sm font-bold text-navy-950">{formData.phoneCode}</span>
                                                        </div>
                                                        <ChevronDown size={14} className={`transition-transform duration-300 ${isPhoneCodeOpen ? 'rotate-180' : ''}`} />
                                                    </div>

                                                    <AnimatePresence>
                                                        {isPhoneCodeOpen && (
                                                            <>
                                                                <motion.div
                                                                    initial={{ opacity: 0 }}
                                                                    animate={{ opacity: 1 }}
                                                                    exit={{ opacity: 0 }}
                                                                    onClick={() => setIsPhoneCodeOpen(false)}
                                                                    className="fixed inset-0 z-[60]"
                                                                />
                                                                <motion.div
                                                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                                                    className="absolute top-16 left-0 w-80 max-h-80 bg-white rounded-[32px] shadow-2xl border border-gray-100 z-[70] flex flex-col overflow-hidden"
                                                                >
                                                                    <div className="px-6 py-4 border-b border-gray-50 bg-white/80 backdrop-blur-md sticky top-0 z-10">
                                                                        <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#B08D4A]">{t('step1.selectCountry')}</p>
                                                                    </div>
                                                                    <div className="flex-1 overflow-y-auto luxury-scrollbar py-2">
                                                                        {PHONE_CODES.map((item: { code: string; country: string; flag: string }) => (
                                                                            <div
                                                                                key={item.code}
                                                                                onClick={() => {
                                                                                    setFormData(prev => ({ ...prev, phoneCode: item.code }));
                                                                                    setIsPhoneCodeOpen(false);
                                                                                }}
                                                                                className={`px-6 py-3.5 hover:bg-[#B08D4A]/5 transition-all cursor-pointer flex items-center justify-between group ${formData.phoneCode === item.code ? 'bg-[#B08D4A]/5' : ''}`}
                                                                            >
                                                                                <div className="flex items-center gap-4">
                                                                                    <span className="text-xl filter drop-shadow-sm">{item.flag}</span>
                                                                                    <div>
                                                                                        <p className={`text-xs font-bold transition-colors ${formData.phoneCode === item.code ? 'text-[#B08D4A]' : 'text-navy-950'}`}>{item.country}</p>
                                                                                        <p className="text-[9px] text-navy-900/30 uppercase tracking-widest font-bold">{t('step1.international')}</p>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className={`text-sm font-bold transition-colors ${formData.phoneCode === item.code ? 'text-[#B08D4A]' : 'text-navy-900/40'}`}>{item.code}</span>
                                                                                    {formData.phoneCode === item.code && (
                                                                                        <div className="w-1.5 h-1.5 rounded-full bg-[#B08D4A]" />
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </motion.div>
                                                            </>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                                <input
                                                    name="phone"
                                                    value={formData.phone}
                                                    onChange={handleInputChange}
                                                    type="tel"
                                                    className={`flex-1 h-14 bg-white border rounded-2xl px-5 focus:border-[#B08D4A] outline-none transition-all ${fieldErrors.phone ? 'border-[#9B1D20] bg-[#9B1D20]/5 shadow-[0_0_10px_rgba(155,29,32,0.05)]' : 'border-gray-100 focus:shadow-lg focus:shadow-gray-200/50'}`}
                                                    placeholder={t('step1.phonePlaceholder')}
                                                />
                                            </div>
                                            <AnimatePresence>
                                                {fieldErrors.phone && (
                                                    <motion.p
                                                        initial={{ opacity: 0, y: -5 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className="text-[9px] text-[#9B1D20] font-bold uppercase tracking-[0.15em] pl-1"
                                                    >
                                                        {fieldErrors.phone}
                                                    </motion.p>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    </div>

                                    {/* Billing Address Section */}
                                    <div className="pt-8">
                                        <div className="flex items-center justify-between mb-6 p-6 bg-gray-50 rounded-2xl border border-gray-100">
                                            <div>
                                                <h1 className="text-xl font-bold font-montserrat text-navy-950">{t('step1.billingTitle')}</h1>
                                                <p className="text-navy-900/40 font-medium text-xs mt-1">{t('step1.billingSubtitle')}</p>
                                            </div>

                                            {/* Premium Toggle Switch */}
                                            <div
                                                onClick={() => setShowBilling(!showBilling)}
                                                className={`w-12 h-7 rounded-full p-1 cursor-pointer transition-colors duration-300 ${showBilling ? 'bg-[#B08D4A]' : 'bg-gray-300'}`}
                                            >
                                                <motion.div
                                                    initial={false}
                                                    animate={{ x: showBilling ? 20 : 0 }}
                                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                                    className="w-5 h-5 bg-white rounded-full shadow-md"
                                                />
                                            </div>
                                        </div>

                                        <AnimatePresence>
                                            {showBilling && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.3, ease: "easeInOut" }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2 px-1">
                                                        {/* Country Select - Premium Free Input with Autocomplete */}
                                                        <motion.div
                                                            variants={shakeVariants}
                                                            animate={fieldErrors.country ? "shake" : ""}
                                                            className="space-y-2 md:col-span-2 relative z-50"
                                                        >
                                                            <label className={`text-[10px] uppercase font-bold tracking-widest transition-colors ${fieldErrors.country ? 'text-[#9B1D20]' : 'text-[#B08D4A]'}`}>{t('step1.country')}</label>
                                                            <div className="relative">
                                                                <input
                                                                    name="country"
                                                                    value={formData.country}
                                                                    onChange={(e) => {
                                                                        handleInputChange(e);
                                                                        setFieldErrors(prev => ({ ...prev, country: '' }));
                                                                        // Reset zip error when country changes manually
                                                                        setZipError("");
                                                                    }}
                                                                    type="text"
                                                                    className={`w-full h-14 bg-white border rounded-2xl px-5 focus:border-[#B08D4A] outline-none transition-all focus:shadow-lg focus:shadow-gray-200/50 ${fieldErrors.country ? 'border-[#9B1D20] bg-[#9B1D20]/5 shadow-[0_0_10px_rgba(155,29,32,0.05)]' : 'border-gray-100'}`}
                                                                    placeholder={t('step1.countryPlaceholder')}
                                                                    autoComplete="new-password"
                                                                    data-lpignore="true"
                                                                    spellCheck={false}
                                                                />

                                                                {/* Flag indicator if known country */}
                                                                {formData.country && Object.values(ADDRESS_DATA).find(c => c.name.toLowerCase() === formData.country.toLowerCase()) && (
                                                                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xl pointer-events-none">
                                                                        {Object.values(ADDRESS_DATA).find(c => c.name.toLowerCase() === formData.country.toLowerCase())?.flag}
                                                                    </span>
                                                                )}

                                                                <AnimatePresence>
                                                                    {fieldErrors.country && (
                                                                        <motion.p
                                                                            initial={{ opacity: 0, y: -5 }}
                                                                            animate={{ opacity: 1, y: 0 }}
                                                                            className="text-[9px] text-[#9B1D20] font-bold uppercase tracking-[0.15em] pl-1"
                                                                        >
                                                                            {fieldErrors.country}
                                                                        </motion.p>
                                                                    )}
                                                                </AnimatePresence>
                                                            </div>
                                                        </motion.div>

                                                        {/* Address */}
                                                        <motion.div
                                                            variants={shakeVariants}
                                                            animate={fieldErrors.address ? "shake" : ""}
                                                            className="space-y-2 md:col-span-2"
                                                        >
                                                            <label className={`text-[10px] uppercase font-bold tracking-widest transition-colors ${fieldErrors.address ? 'text-[#9B1D20]' : 'text-[#B08D4A]'}`}>{t('step1.address')}</label>
                                                            <input
                                                                name="address"
                                                                value={formData.address}
                                                                onChange={handleInputChange}
                                                                type="text"
                                                                className={`w-full h-14 bg-white border rounded-2xl px-5 focus:border-[#B08D4A] outline-none transition-all focus:shadow-lg focus:shadow-gray-200/50 ${fieldErrors.address ? 'border-[#9B1D20] bg-[#9B1D20]/5 shadow-[0_0_10px_rgba(155,29,32,0.05)]' : 'border-gray-100'}`}
                                                                placeholder={t('step1.addressPlaceholder')}
                                                            />
                                                            <AnimatePresence>
                                                                {fieldErrors.address && (
                                                                    <motion.p
                                                                        initial={{ opacity: 0, y: -5 }}
                                                                        animate={{ opacity: 1, y: 0 }}
                                                                        className="text-[9px] text-[#9B1D20] font-bold uppercase tracking-[0.15em] pl-1"
                                                                    >
                                                                        {fieldErrors.address}
                                                                    </motion.p>
                                                                )}
                                                            </AnimatePresence>
                                                        </motion.div>

                                                        {/* City with Premium Autocomplete */}
                                                        <motion.div
                                                            variants={shakeVariants}
                                                            animate={fieldErrors.city ? "shake" : ""}
                                                            className="space-y-2 relative z-40"
                                                        >
                                                            <label className={`text-[10px] uppercase font-bold tracking-widest transition-colors ${fieldErrors.city ? 'text-[#9B1D20]' : 'text-[#B08D4A]'}`}>{t('step1.city')}</label>
                                                            <div className="relative">
                                                                <input
                                                                    name="city"
                                                                    value={formData.city}
                                                                    onChange={(e) => {
                                                                        handleInputChange(e);
                                                                        setFieldErrors(prev => ({ ...prev, city: '' }));
                                                                    }}
                                                                    type="text"
                                                                    className={`w-full h-14 bg-white border rounded-2xl px-5 focus:border-[#B08D4A] outline-none transition-all focus:shadow-lg focus:shadow-gray-200/50 ${fieldErrors.city ? 'border-[#9B1D20] bg-[#9B1D20]/5 shadow-[0_0_10px_rgba(155,29,32,0.05)]' : 'border-gray-100'}`}
                                                                    placeholder={t('step1.cityPlaceholder')}
                                                                    spellCheck={false}
                                                                />
                                                                <AnimatePresence>
                                                                    {fieldErrors.city && (
                                                                        <motion.p
                                                                            initial={{ opacity: 0, y: -5 }}
                                                                            animate={{ opacity: 1, y: 0 }}
                                                                            className="text-[9px] text-[#9B1D20] font-bold uppercase tracking-[0.15em] pl-1"
                                                                        >
                                                                            {fieldErrors.city}
                                                                        </motion.p>
                                                                    )}
                                                                </AnimatePresence>
                                                            </div>
                                                        </motion.div>

                                                        {/* Zip with Validation Pattern */}
                                                        <motion.div
                                                            variants={shakeVariants}
                                                            animate={fieldErrors.zip || zipError ? "shake" : ""}
                                                            className="space-y-2"
                                                        >
                                                            <label className={`text-[10px] uppercase font-bold tracking-widest transition-colors ${fieldErrors.zip || zipError ? 'text-[#9B1D20]' : 'text-[#B08D4A]'}`}>{t('step1.zip')}</label>
                                                            <input
                                                                name="zip"
                                                                value={formData.zip}
                                                                onChange={handleInputChange}
                                                                onBlur={() => {
                                                                    if (formData.country && formData.zip) {
                                                                        const countryEntry = Object.values(ADDRESS_DATA).find(c => c.name.toLowerCase() === formData.country.toLowerCase());
                                                                        if (countryEntry && !countryEntry.zipRegex.test(formData.zip)) {
                                                                            setZipError(t('errors.invalidFormat', { format: countryEntry.zipFormat, country: countryEntry.name }));
                                                                        } else {
                                                                            setZipError("");
                                                                        }
                                                                    }
                                                                }}
                                                                type="text"
                                                                className={`w-full h-14 bg-white border rounded-2xl px-5 focus:border-[#B08D4A] outline-none transition-all focus:shadow-lg focus:shadow-gray-200/50 ${fieldErrors.zip || zipError
                                                                    ? 'border-[#9B1D20] bg-[#9B1D20]/5 text-[#9B1D20]'
                                                                    : 'border-gray-100'
                                                                    }`}
                                                                placeholder={(() => {
                                                                    const c = Object.values(ADDRESS_DATA).find(co => co.name === formData.country);
                                                                    return c ? c.zipFormat : "0000-000";
                                                                })()}
                                                            />
                                                            {/* Error Message */}
                                                            <AnimatePresence>
                                                                {(fieldErrors.zip || zipError) && (
                                                                    <motion.p
                                                                        initial={{ opacity: 0, y: -5 }}
                                                                        animate={{ opacity: 1, y: 0 }}
                                                                        exit={{ opacity: 0 }}
                                                                        className="text-[9px] text-[#9B1D20] font-bold uppercase tracking-[0.15em] pl-1"
                                                                    >
                                                                        {fieldErrors.zip || zipError}
                                                                    </motion.p>
                                                                )}
                                                            </AnimatePresence>
                                                        </motion.div>
                                                        <motion.div
                                                            variants={shakeVariants}
                                                            className="space-y-2"
                                                        >
                                                            <label className="text-[10px] uppercase font-bold tracking-widest text-[#B08D4A]">{t('step1.vat')}</label>
                                                            <input
                                                                name="vat"
                                                                value={formData.vat}
                                                                onChange={handleInputChange}
                                                                type="text"
                                                                className="w-full h-14 bg-white border border-gray-100 rounded-2xl px-5 focus:border-[#B08D4A] outline-none transition-all focus:shadow-lg focus:shadow-gray-200/50"
                                                                placeholder={t('step1.vatPlaceholder')}
                                                            />
                                                        </motion.div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>


                                </motion.div>
                            )}

                            {step === 2 && (
                                <motion.div
                                    key="step2"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="space-y-8"
                                >
                                    <div>
                                        <h1 className="text-4xl font-bold font-montserrat mb-3">{t('step2.title')}</h1>
                                        <p className="text-navy-900/40 font-medium">{t('step2.subtitle')}</p>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="space-y-2 relative z-30">
                                            <label className="text-[10px] uppercase font-bold tracking-widest text-[#B08D4A]">{t('step2.arrivalTime')}</label>
                                            <div className="relative">
                                                <div
                                                    onClick={() => setIsArrivalOpen(!isArrivalOpen)}
                                                    className={`w-full h-14 bg-white border rounded-2xl px-5 flex items-center justify-between cursor-pointer transition-all ${isArrivalOpen ? 'border-[#B08D4A] shadow-lg shadow-gray-200/50' : 'border-gray-100 hover:border-gray-200'}`}
                                                >
                                                    <span className={`text-sm font-bold ${formData.arrivalTime === 'unknown' ? 'text-navy-950/40' : 'text-navy-950'}`}>
                                                        {arrivalOptions.find(opt => opt.value === formData.arrivalTime)?.label || t('step2.selectTime')}
                                                    </span>
                                                    <ChevronDown size={14} className={`transition-transform duration-300 ${isArrivalOpen ? 'rotate-180' : ''}`} />
                                                </div>

                                                <AnimatePresence>
                                                    {isArrivalOpen && (
                                                        <>
                                                            <motion.div
                                                                initial={{ opacity: 0 }}
                                                                animate={{ opacity: 1 }}
                                                                exit={{ opacity: 0 }}
                                                                onClick={() => setIsArrivalOpen(false)}
                                                                className="fixed inset-0 z-[60]"
                                                            />
                                                            <motion.div
                                                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                                                className="absolute top-16 left-0 w-full bg-white rounded-[24px] shadow-2xl border border-gray-100 z-[70] overflow-hidden py-2"
                                                            >
                                                                {arrivalOptions.map((opt) => (
                                                                    <div
                                                                        key={opt.value}
                                                                        onClick={() => {
                                                                            setFormData(prev => ({ ...prev, arrivalTime: opt.value }));
                                                                            setIsArrivalOpen(false);
                                                                        }}
                                                                        className={`px-6 py-4 hover:bg-[#B08D4A]/5 transition-all cursor-pointer flex items-center justify-between group ${formData.arrivalTime === opt.value ? 'bg-[#B08D4A]/5' : ''}`}
                                                                    >
                                                                        <span className={`text-sm font-bold transition-colors ${formData.arrivalTime === opt.value ? 'text-[#B08D4A]' : 'text-navy-950 group-hover:text-[#B08D4A]'}`}>
                                                                            {opt.label}
                                                                        </span>
                                                                        {formData.arrivalTime === opt.value && (
                                                                            <div className="w-1.5 h-1.5 rounded-full bg-[#B08D4A]" />
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </motion.div>
                                                        </>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                        <div className="space-y-4 pt-4 border-t border-gray-100">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Ticket className="w-5 h-5 text-[#B08D4A]" />
                                                <h4 className="text-sm font-bold uppercase tracking-widest text-[#B08D4A]">
                                                    {t('step2.couponCode')}
                                                </h4>
                                            </div>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={formData.couponCode}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, couponCode: e.target.value.toUpperCase() }))}
                                                    placeholder={t('step2.couponPlaceholder')}
                                                    className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl px-5 h-12 text-sm outline-none focus:ring-1 focus:ring-[#8ca38c] transition-all uppercase"
                                                    disabled={!!appliedCoupon || isValidatingCoupon}
                                                />
                                                {appliedCoupon ? (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={handleRemoveCoupon}
                                                        className="h-12 px-6 rounded-2xl border-red-100 text-red-600 hover:bg-red-50"
                                                    >
                                                        {t('header.cancel')}
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        type="button"
                                                        variant="luxury"
                                                        onClick={handleApplyCoupon}
                                                        disabled={!formData.couponCode || isValidatingCoupon}
                                                        className="h-12 px-8 rounded-2xl"
                                                    >
                                                        {isValidatingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : t('step2.applyCoupon')}
                                                    </Button>
                                                )}
                                            </div>
                                            {appliedCoupon && (
                                                <p className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-in fade-in slide-in-from-top-1">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    {t('step2.couponApplied')}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {step === 3 && (
                                <motion.div
                                    key="step3"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="space-y-8"
                                >
                                    <div>
                                        <h1 className="text-4xl font-bold font-montserrat mb-3">{t('step3.title')}</h1>
                                        <p className="text-navy-900/40 font-medium">{t('step3.subtitle')}</p>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        {/* Wire Transfer Option */}
                                        <div
                                            onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'wire' }))}
                                            className={`p-6 border-2 rounded-[32px] cursor-pointer transition-all duration-300 flex items-center justify-between ${formData.paymentMethod === 'wire' ? 'border-navy-950 bg-white shadow-xl' : 'border-gray-100 bg-gray-50/50 hover:border-gray-200'}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${formData.paymentMethod === 'wire' ? 'bg-navy-950 text-white' : 'bg-white text-navy-400 border border-gray-100'}`}>
                                                    <CheckCircle2 className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <p className="font-bold">{t('step3.wire')}</p>
                                                    <p className="text-navy-900/40 text-[10px] uppercase tracking-wider font-bold">{t('step3.manual')}</p>
                                                </div>
                                            </div>
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${formData.paymentMethod === 'wire' ? 'border-navy-950' : 'border-gray-200'}`}>
                                                {formData.paymentMethod === 'wire' && <div className="w-3 h-3 rounded-full bg-navy-950" />}
                                            </div>
                                        </div>

                                        {formData.paymentMethod === 'wire' && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                className="p-8 bg-amber-50/50 border border-amber-100 rounded-[32px] space-y-4"
                                            >
                                                <p className="text-xs font-medium text-amber-900/70 leading-relaxed">
                                                    {t('step3.instructions')}
                                                </p>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] uppercase font-bold tracking-widest text-[#B08D4A]">{t('step3.holder')}</p>
                                                        <p className="text-sm font-bold">Lovely Memories Ltd.</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] uppercase font-bold tracking-widest text-[#B08D4A]">{t('step3.bankName')}</p>
                                                        <p className="text-sm font-bold">Millennium BCP</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] uppercase font-bold tracking-widest text-[#B08D4A]">{t('step3.iban')}</p>
                                                        <p className="text-sm font-mono font-bold tracking-tighter">PT50 0033 0000 1234 5678 9012 3</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] uppercase font-bold tracking-widest text-[#B08D4A]">{t('step3.swift')}</p>
                                                        <p className="text-sm font-bold">BCPTPLLX</p>
                                                    </div>
                                                    <div className="space-y-1 md:col-span-2">
                                                        <p className="text-[10px] uppercase font-bold tracking-widest text-[#B08D4A]">{t('step3.reference')}</p>
                                                        <p className="text-lg font-mono font-bold tracking-tighter text-[#B08D4A]">{paymentReference}</p>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}

                                        {/* Card Option (Stripe) */}
                                        <div
                                            onClick={() => handleSelectPaymentMethod('card')}
                                            className={`p-6 border-2 rounded-[32px] cursor-pointer transition-all duration-300 flex items-center justify-between ${formData.paymentMethod === 'card' ? 'border-navy-950 bg-white shadow-xl' : 'border-gray-100 bg-gray-50/50 hover:border-gray-200'}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${formData.paymentMethod === 'card' ? 'bg-navy-950 text-white' : 'bg-white text-navy-400 border border-gray-100'}`}>
                                                    <CreditCard className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <p className="font-bold">{t('step3.card')}</p>
                                                    <p className="text-navy-900/40 text-[10px] uppercase tracking-wider font-bold">Powered By Stripe • {t('step3.cardTypes')}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {formData.paymentMethod === 'card' && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                className="p-8 bg-white border-2 border-navy-950 rounded-[32px] space-y-6 shadow-2xl relative overflow-hidden"
                                            >
                                                {isInitializingStripe ? (
                                                    <div className="py-12 flex flex-col items-center justify-center gap-4">
                                                        <Loader2 className="w-8 h-8 animate-spin text-navy-950" />
                                                        <p className="text-sm font-medium text-navy-900/60">{t('step3.initializing') || "Initializing secure checkout..."}</p>
                                                    </div>
                                                ) : clientSecret ? (
                                                    <>
                                                        {/* Secure Header */}
                                                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-6 h-6 bg-navy-50 rounded-full flex items-center justify-center">
                                                                    <ShieldCheck className="w-3.5 h-3.5 text-navy-900" />
                                                                </div>
                                                                <p className="text-[10px] text-navy-900/40 uppercase tracking-widest font-bold">{t('step3.securePayment') || "Secure Payment"}</p>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 opacity-40 grayscale">
                                                                <span className="text-[9px] font-bold tracking-widest uppercase">Powered by</span>
                                                                <img src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" alt="Stripe" className="h-3" />
                                                            </div>
                                                        </div>
                                                    <Elements
                                                        stripe={stripePromise}
                                                        options={{
                                                            clientSecret,
                                                            appearance: {
                                                                theme: 'stripe',
                                                                variables: {
                                                                    colorPrimary: '#03050a',
                                                                    fontFamily: 'Montserrat, sans-serif',
                                                                    borderRadius: '16px',
                                                                }
                                                            }
                                                        }}
                                                    >
                                                        <StripePaymentForm
                                                            amount={total}
                                                            isLoading={isSubmitting}
                                                            setIsLoading={setIsSubmitting}
                                                            onSuccess={handlePaymentSuccess}
                                                            onValidityChange={setIsStripeValid}
                                                        />
                                                    </Elements>
                                                    </>
                                                ) : (
                                                    <div className="py-8 text-center text-red-500 bg-red-50 rounded-2xl">
                                                        <p className="text-sm font-medium">Error: Could not load payment intent. Please retry.</p>
                                                    </div>
                                                )}

                                                {/* Security Footer */}
                                                <div className="pt-4 flex items-center justify-center gap-2 border-t border-gray-50 mt-4">
                                                    <ShieldCheck className="w-4 h-4 text-[#2d8653]" />
                                                    <span className="text-[10px] font-bold text-navy-900/30 uppercase tracking-widest">
                                                        PCI-DSS Compliant • 256-bit SSL
                                                    </span>
                                                </div>
                                            </motion.div>
                                        )}

                                        {/* PayPal Option */}
                                        <div
                                            className="p-6 border-2 border-gray-100 rounded-[32px] bg-gray-50/50 opacity-60 cursor-not-allowed flex items-center justify-between"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center border border-gray-100">
                                                    <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal" className="h-6 opacity-40 grayscale" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-bold text-gray-500">PayPal</p>
                                                        <span className="px-2 py-0.5 rounded-full bg-gray-200 text-gray-500 text-[9px] font-bold uppercase tracking-wider">
                                                            {t('step3.comingSoon')}
                                                        </span>
                                                    </div>
                                                    <p className="text-gray-400 text-[10px] uppercase tracking-wider font-bold">{t('step3.paypalSubtitle')}</p>
                                                </div>
                                            </div>
                                            <div className="w-6 h-6 rounded-full border-2 border-gray-200 flex items-center justify-center bg-gray-100">
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {error && (
                            <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold border border-red-100">
                                {error}
                            </div>
                        )}


                    </div>
                </div>

                {/* Summary Sidebar */}
                <div className="w-full lg:w-[400px] shrink-0">
                    <div className="sticky top-32 space-y-6">
                        {/* Checkout Timer */}
                        {property && bookingData && !isFinished && (
                            <CheckoutTimer 
                                propertyId={property.id}
                                checkIn={bookingData.checkIn}
                                checkOut={bookingData.checkOut}
                                sessionId={sessionId}
                            />
                        )}
                        {/* Property Card */}
                        <div className="bg-white rounded-[40px] overflow-hidden border border-gray-100 shadow-2xl shadow-navy-950/5">
                            <div className="h-40 relative overflow-hidden">
                                <img
                                    src={property.image || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop'}
                                    alt={property.title}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute top-4 left-4">
                                    <span className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-navy-950 border border-white">
                                        {t('sidebar.propertyDetails')}
                                    </span>
                                </div>
                            </div>
                            <div className="p-5 md:p-6">
                                <h3 className="text-xl md:text-2xl font-bold font-montserrat mb-1">{property.title?.[locale] || property.title?.en || 'Untitled'}</h3>
                                <p className="text-navy-900/70 text-sm font-medium mb-4">{property.location.city}, Portugal</p>



                                <div className="space-y-4 mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
                                            <Calendar className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase font-bold tracking-widest text-[#B08D4A] mb-1">{t('sidebar.dateRange')}</p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-base font-bold text-navy-950">{formatDate(checkIn)}</span>
                                                <ArrowRight className="w-3 h-3 text-navy-900/60" />
                                                <span className="text-base font-bold text-navy-950">{formatDate(checkOut)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
                                            <User className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase font-bold tracking-widest text-[#B08D4A] mb-1">{t('sidebar.guestsTitle')}</p>
                                            <p className="text-base font-bold">
                                                {t('sidebar.adults', { count: adults })}
                                                {children > 0 && `, ${t('sidebar.children', { count: children })}`}
                                                {infants > 0 && `, ${t('sidebar.infants', { count: infants })}`}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="h-px bg-gray-100 mb-6" />

                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-navy-900/80 font-medium">{t('sidebar.subtotal')} ({t('sidebar.nights', { count: nights })})</span>
                                        <span className="font-bold">€{basePrice}</span>
                                    </div>
                                    {discountAmount > 0 && (
                                        <div className="flex justify-between text-sm text-[#2d8653]">
                                            <span className="font-medium">{nights >= 28 ? t('sidebar.monthlyDiscount') : t('sidebar.weeklyDiscount')}</span>
                                            <span className="font-bold">−€{discountAmount}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-sm">
                                        <span className="text-navy-900/80 font-medium">{t('sidebar.cleaning')}</span>
                                        <span className="font-bold">€{cleaningFee}</span>
                                    </div>
                                    {cityTaxTotal > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-navy-900/80 font-medium">{t('sidebar.cityTax') || "City Tax"}</span>
                                            <span className="font-bold">€{cityTaxTotal}</span>
                                        </div>
                                    )}
                                    {couponDiscount > 0 && (
                                        <div className="flex justify-between text-sm text-[#B08D4A]">
                                            <span className="font-medium">{t('step2.couponCode')} ({appliedCoupon?.code})</span>
                                            <span className="font-bold">−€{couponDiscount}</span>
                                        </div>
                                    )}

                                    {/* Extras Display */}
                                    {(selectedExtras?.breakfast || selectedExtras?.transfer) && (
                                        <div className="pt-3 border-t border-gray-100 mt-3 space-y-3">
                                            <p className="text-[10px] uppercase font-bold tracking-widest text-[#B08D4A]">{t('sidebar.additionalServices')}</p>
                                            {selectedExtras.breakfast && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-navy-900/80 font-medium">{t('sidebar.breakfast')}</span>
                                                    <span className="font-bold">€{breakfastTotal}</span>
                                                </div>
                                            )}
                                            {selectedExtras.transfer && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-navy-900/80 font-medium">{t('sidebar.transfer')} ({isRoundTrip ? t('sidebar.roundTrip') : t('sidebar.oneWay')})</span>
                                                    <span className="font-bold">€{transferTotal}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex justify-between items-baseline pt-3 border-t border-gray-100">
                                        <span className="text-sm font-bold uppercase tracking-widest">{t('sidebar.total')}</span>
                                        <div className="text-right">
                                            <p className="text-3xl font-bold tracking-tighter">€{total}</p>
                                            <p className="text-[10px] text-navy-900/60 font-medium">{t('sidebar.vatIncluded')}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Security Badge - Sidebar Position */}
                        {/* Primary Action Button - Moved from Header */}
                        <Button
                            form={step === 3 && formData.paymentMethod === 'card' ? "stripe-payment-form" : "checkout-form"}
                            type="submit"
                            variant="luxury"
                            className="w-full h-16 rounded-[32px] text-sm lg:text-base font-bold flex items-center justify-center gap-3 shadow-2xl shadow-[#B08D4A]/30 active:scale-[0.98] transition-all hover:scale-[1.02]"
                            disabled={isSubmitting || !!error || bookingStatus === "confirming" || (step === 3 && formData.paymentMethod === 'card' && !isStripeValid)}
                        >
                            {isSubmitting || bookingStatus === "confirming" ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>{t('header.processing')}</span>
                                </>
                            ) : (
                                <>
                                    {step === 3 ? t('header.confirmPayment') : t('header.continue')}
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </main>

            <footer className="py-12 px-6 lg:px-20 border-t border-gray-100 text-center">
                <div className="flex items-center justify-center gap-8 mb-6 grayscale opacity-30">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-4" />
                    <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-6" />
                    <img src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" alt="Stripe" className="h-5" />
                </div>
                <p className="text-[10px] text-navy-900/40 font-bold uppercase tracking-widest mb-2">
                    {t('footer.secured')}
                </p>
                <p className="text-[10px] text-navy-900/20 font-medium">
                    {t('footer.rights')} • {t('footer.privacy')} • {t('footer.terms')}
                </p>
            </footer>
        </div>
    );
}
