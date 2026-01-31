"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter, Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
    ChevronLeft,
    ChevronDown,
    ChevronUp,
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
    Clock
} from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { BookingInvoice } from "@/components/booking/BookingInvoice";
import { Button } from "@/components/ui/Button";
import { PROPERTIES } from "@/lib/data";
import { ADDRESS_DATA, COUNTRY_CODES as PHONE_CODES } from "@/lib/address-data";
import { processReservation } from "@/app/actions/reservation";
import { getBookingSession, BookingSessionData } from "@/lib/booking-session";

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
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [zipError, setZipError] = useState<string>("");

    const code = searchParams.get("code") || "";
    const paymentReference = code ? `LM-${code.toUpperCase()}` : "LM-PENDING";

    // Load booking data from session code with a small "luxury" delay for the skeleton
    useEffect(() => {
        const data = getBookingSession(code);
        if (data) {
            setBookingData(data);
        }

        // Artificial delay so the skeleton is actually visible and the transition feels "prepared"
        const timer = setTimeout(() => {
            setIsLoadingData(false);
        }, 1200);

        return () => clearTimeout(timer);
    }, [code]);

    // Form state
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        phone: "",
        arrivalTime: "unknown",
        specialRequests: "",
        paymentMethod: "wire", // Default to wire for now
        phoneCode: "+351",
        website: "", // Honeypot field
        // Billing Address
        address: "",
        city: "",
        zip: "",
        country: "",
        vat: "" // VAT / NIF Number
    });

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

    const validateAddress = () => {
        const newErrors: Record<string, string> = {};
        let validZip = true;

        if (!formData.country) newErrors.country = t('errors.countryRequired');
        if (!formData.address) newErrors.address = t('errors.addressRequired');
        if (!formData.city) newErrors.city = t('errors.cityRequired');
        if (!formData.zip) newErrors.zip = t('errors.zipRequired');

        if (formData.country) {
            // Case-insensitive lookup for known countries
            const countryEntry = Object.values(ADDRESS_DATA).find(c => c.name.toLowerCase() === formData.country.toLowerCase());

            if (countryEntry && formData.zip) {
                if (!countryEntry.zipRegex.test(formData.zip)) {
                    setZipError(t('errors.invalidFormat', { format: countryEntry.zipFormat, country: countryEntry.name }));
                    validZip = false;
                } else {
                    setZipError("");
                }
            } else if (countryEntry && !formData.zip) {
                // Zip is required and checked above, but if we are here it means generic check passed but logic flows.
            }
        }

        setFieldErrors(prev => ({ ...prev, ...newErrors }));
        return Object.keys(newErrors).length === 0 && validZip;
    };

    const validateStep = (currentStep: number) => {
        const newErrors: Record<string, string> = {};

        if (currentStep === 1) {
            if (!formData.fullName || formData.fullName.length < 3) {
                newErrors.fullName = t('errors.nameError');
            }
            if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
                newErrors.email = t('errors.emailError');
            }
            // Phone is now optional, so no validation here

            // Phone is now optional, so no validation here

            // Validate address fields ONLY if billing is shown
            if (showBilling) {
                const addressValid = validateAddress();
                if (!addressValid) {
                    return false;
                }
            }
        }

        setFieldErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Derived booking data
    const slug = bookingData?.slug || "";
    const checkIn = bookingData?.checkIn || "";
    const checkOut = bookingData?.checkOut || "";
    const adults = bookingData?.adults || 1;
    const infants = bookingData?.infants || 0;
    const selectedExtras = bookingData?.selectedExtras;
    const extraPrices = bookingData?.extraPrices;

    const property = PROPERTIES.find(p => p.slug === slug);

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
    const basePrice = nights * property.price.perNight;
    const cleaningFee = 85;

    // Extras Calculation
    const breakfastPrice = extraPrices?.breakfast || 15;
    const transferPrice = extraPrices?.transfer || 55;
    const breakfastDays = selectedExtras?.breakfastDays || 1;
    const isRoundTrip = selectedExtras?.transferType === 'round_trip';

    const breakfastTotal = selectedExtras?.breakfast ? (breakfastPrice * (adults + infants) * breakfastDays) : 0;
    const transferTotal = selectedExtras?.transfer ? (transferPrice * (isRoundTrip ? 2 : 1)) : 0;

    const total = basePrice + cleaningFee + breakfastTotal + transferTotal;
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
        }
    };
    const prevStep = () => {
        if (step > 1) {
            setStep(prev => prev - 1);
        } else {
            router.push(`/properties/${slug}`);
        }
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
                    phone: finalPhone, // Use the combined phone number
                    propertySlug: property.slug,
                    checkIn: checkIn,
                    checkOut: checkOut,
                    adults: adults,
                    infants: infants,
                    bookingCode: code
                });

                if (result.success && result.ref) {
                    setReservationRef(result.ref);
                    setIsFinished(true);
                } else {
                    setError(result.error || t('errors.genericError'));
                }
            } catch (err) {
                setError(t('errors.serverError'));
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
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 bg-gradient-to-b from-gray-50 to-white text-navy-950">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-4xl mx-auto w-full pt-12 pb-24 px-6"
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
                        <div className="flex flex-col md:flex-row gap-6 md:gap-0 justify-between py-6 px-8 border-b border-gray-100 bg-gray-50/30">
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
                        <div className="p-8 space-y-6">
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

                            <div className="flex justify-between items-center py-4 border-b border-gray-100">
                                <span className="font-bold text-navy-950">{t('success.bookingOf')} <span className="text-[#B08D4A]">{property.title}</span></span>
                                <span className="font-bold text-navy-950">€{total}</span>
                            </div>

                            <div className="space-y-2 text-sm text-navy-900/70">
                                <div className="flex items-center gap-4 py-2">
                                    <span className="text-sm font-bold text-navy-950 shrink-0">{t('success.dates')}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-navy-900/70">{formatDate(checkIn)}</span>
                                        <ArrowRight className="w-3 h-3 text-navy-900/20" />
                                        <span className="text-sm font-medium text-navy-900/70">{formatDate(checkOut)}</span>
                                    </div>
                                </div>
                                <p><span className="font-bold text-navy-950">{t('success.duration')}</span> {t('sidebar.nights', { count: nights })}</p>
                                <p><span className="font-bold text-navy-950">{t('success.guests')}</span> {t('sidebar.adults', { count: adults })}{infants > 0 && `, ${t('sidebar.infants', { count: infants })}`}</p>
                            </div>

                            <div className="space-y-3 pt-4">
                                <div className="flex justify-between text-sm">
                                    <span className="font-medium text-navy-900/60">{t('sidebar.subtotal')}:</span>
                                    <span className="font-bold text-navy-950">€{basePrice}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="font-medium text-navy-900/60">{t('success.cleaningFee')}</span>
                                    <span className="font-bold text-navy-950">€{cleaningFee}</span>
                                </div>

                                {/* Additional Services */}
                                {selectedExtras?.breakfast && (
                                    <div className="flex justify-between text-sm">
                                        <span className="font-medium text-navy-900/60">{t('sidebar.breakfast')}:</span>
                                        <span className="font-bold text-navy-950">€{breakfastTotal}</span>
                                    </div>
                                )}
                                {selectedExtras?.transfer && (
                                    <div className="flex justify-between text-sm">
                                        <span className="font-medium text-navy-900/60">{t('sidebar.transfer')} ({isRoundTrip ? t('sidebar.roundTrip') : t('sidebar.oneWay')}):</span>
                                        <span className="font-bold text-navy-950">€{transferTotal}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm pt-4 border-t border-gray-100">
                                    <span className="font-bold text-navy-950">{t('success.paymentMethod')}:</span>
                                    <span className="font-bold text-navy-950 capitalize">{formData.paymentMethod === 'wire' ? t('success.bankTransfer') : formData.paymentMethod}</span>
                                </div>
                                <div className="flex justify-between text-lg pt-4 border-t border-gray-100">
                                    <span className="font-bold text-navy-950">{t('sidebar.total')}:</span>
                                    <span className="font-bold text-navy-950">€{total}</span>
                                </div>
                            </div>

                            {formData.specialRequests && (
                                <div className="pt-6">
                                    <h3 className="text-sm font-bold text-navy-950 mb-2">{t('success.note')}:</h3>
                                    <p className="text-sm text-navy-900/70 italic">"{formData.specialRequests}"</p>
                                </div>
                            )}
                        </div>
                    </div> {/* Added missing closing div here */}

                    {/* Billing Address Card */}
                    {showBilling && formData.address && ( // Only show if address is filled (implies toggle was likely used or pre-filled)
                        <div className="mt-8 bg-white border border-gray-100 rounded-3xl p-8 md:p-12 shadow-sm">
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

                    <div className="mt-12 text-center">
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
                        propertyTitle={property.title}
                        propertyLocation={`${property.location.city}, Portugal`}
                        checkIn={formatDate(checkIn)}
                        checkOut={formatDate(checkOut)}
                        nights={nights}
                        guests={`${t('sidebar.adults', { count: adults })}${infants > 0 ? `, ${t('sidebar.infants', { count: infants })}` : ''}`}
                        basePrice={basePrice}
                        cleaningFee={cleaningFee}
                        breakfastTotal={breakfastTotal}
                        transferTotal={transferTotal}
                        total={total}
                        paymentMethod={formData.paymentMethod}
                        customerName={formData.fullName}
                        customerEmail={formData.email}
                        customerPhone={formData.phone}
                        specialRequests={formData.specialRequests}
                        t={t}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col pt-20 lg:pt-24 text-navy-950">
            {/* Header / Navbar Replacement */}
            <header className="fixed top-0 inset-x-0 bg-white/80 backdrop-blur-md border-b border-gray-100 z-50 flex flex-col">
                <div className="h-20 lg:h-24 flex items-center px-6 lg:px-12 justify-between w-full gap-4">
                    {/* Left: Navigation & Brand */}
                    <div className="w-1/4 min-w-[200px] flex items-center gap-8">
                        <button
                            onClick={prevStep}
                            className="flex items-center justify-center gap-2 w-32 px-4 py-2 border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-gray-200 transition-all rounded-full group shrink-0"
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
                                        <div className="absolute top-full mt-2 lg:mt-3 flex flex-col items-center">
                                            <span className={`text-[8px] lg:text-[9px] uppercase font-bold tracking-[0.2em] whitespace-nowrap transition-colors duration-500
                                                ${step >= s.id ? 'text-navy-950' : 'text-navy-950/20'}`}>
                                                {s.label}
                                            </span>
                                        </div>
                                    </div>
                                    {idx < 2 && (
                                        <div className={`w-8 lg:w-16 h-0.5 rounded-full transition-colors duration-500 ${step > s.id ? 'bg-[#2d8653]' : 'bg-gray-100'}`} />
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    <div className="w-1/4 min-w-[220px] flex items-center justify-end pr-4">
                        {/* Right: Empty for Balance */}
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-7xl mx-auto w-full px-6 lg:px-20 py-8 lg:py-12 flex flex-col lg:flex-row gap-8 lg:gap-16">
                {/* Form Section */}
                <div className="flex-1 max-w-2xl">
                    <form id="checkout-form" onSubmit={handleSubmit} className="space-y-12">
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
                                                                onBlur={validateAddress}
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
                                        <div className="space-y-2">
                                            <label className="text-[10px] uppercase font-bold tracking-widest text-[#B08D4A]">{t('step2.specialRequests')}</label>
                                            <textarea name="specialRequests" value={formData.specialRequests} onChange={handleInputChange} className="w-full h-40 bg-white border border-gray-100 rounded-2xl p-5 focus:border-[#B08D4A] outline-none transition-colors resize-none" placeholder={t('step2.specialRequestsPlaceholder')}></textarea>
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
                                                    <div className="space-y-1 md:col-span-2">
                                                        <p className="text-[10px] uppercase font-bold tracking-widest text-[#B08D4A]">{t('step3.iban')}</p>
                                                        <p className="text-sm font-mono font-bold tracking-tighter">PT50 0033 0000 1234 5678 9012 3</p>
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
                                            onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'card' }))}
                                            className={`p-6 border-2 rounded-[32px] cursor-pointer transition-all duration-300 flex items-center justify-between ${formData.paymentMethod === 'card' ? 'border-navy-950 bg-white shadow-xl' : 'border-gray-100 bg-gray-50/50 hover:border-gray-200'}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${formData.paymentMethod === 'card' ? 'bg-navy-950 text-white' : 'bg-white text-navy-400 border border-gray-100'}`}>
                                                    <CreditCard className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <p className="font-bold">{t('step3.card')}</p>
                                                    <p className="text-navy-900/40 text-[10px] uppercase tracking-wider font-bold">{t('step3.cardTypes')}</p>
                                                </div>
                                            </div>
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${formData.paymentMethod === 'card' ? 'border-navy-950' : 'border-gray-200'}`}>
                                                {formData.paymentMethod === 'card' && <div className="w-3 h-3 rounded-full bg-navy-950" />}
                                            </div>
                                        </div>

                                        {formData.paymentMethod === 'card' && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                className="p-8 border border-gray-100 bg-white shadow-xl shadow-navy-950/5 rounded-[40px] space-y-6 relative overflow-hidden"
                                            >
                                                <div className="absolute -top-10 -right-10 opacity-[0.03] rotate-12">
                                                    <ShieldCheck className="w-40 h-40" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] uppercase font-bold tracking-widest text-[#B08D4A]">{t('step3.cardDetails')}</label>
                                                    <input disabled type="text" className="w-full h-14 bg-gray-50 border border-gray-100 rounded-2xl px-5 outline-none transition-colors" placeholder={t('step3.cardPlaceholder')} />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] uppercase font-bold tracking-widest text-[#B08D4A]">{t('step3.expiry')}</label>
                                                        <input disabled type="text" className="w-full h-14 bg-gray-50 border border-gray-100 rounded-2xl px-5 outline-none transition-colors" placeholder={t('step3.expiryPlaceholder')} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] uppercase font-bold tracking-widest text-[#B08D4A]">{t('step3.cvv')}</label>
                                                        <input disabled type="text" className="w-full h-14 bg-gray-50 border border-gray-100 rounded-2xl px-5 outline-none transition-colors" placeholder={t('step3.cvvPlaceholder')} />
                                                    </div>
                                                </div>
                                                <p className="text-center text-[10px] text-navy-900/40 font-medium">{t('step3.comingSoon')}</p>
                                            </motion.div>
                                        )}

                                        {/* PayPal Option */}
                                        <div
                                            onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'paypal' }))}
                                            className={`p-6 border-2 rounded-[32px] cursor-pointer transition-all duration-300 flex items-center justify-between ${formData.paymentMethod === 'paypal' ? 'border-navy-950 bg-white shadow-xl' : 'border-gray-100 bg-gray-50/50 hover:border-gray-200'}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${formData.paymentMethod === 'paypal' ? 'bg-navy-950 text-white' : 'bg-white text-navy-400 border border-gray-100'}`}>
                                                    <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal" className={`h-6 ${formData.paymentMethod !== 'paypal' && 'opacity-30'}`} />
                                                </div>
                                                <div>
                                                    <p className="font-bold">PayPal</p>
                                                    <p className="text-navy-900/40 text-[10px] uppercase tracking-wider font-bold">{t('step3.paypalSubtitle')}</p>
                                                </div>
                                            </div>
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${formData.paymentMethod === 'paypal' ? 'border-navy-950' : 'border-gray-200'}`}>
                                                {formData.paymentMethod === 'paypal' && <div className="w-3 h-3 rounded-full bg-navy-950" />}
                                            </div>
                                        </div>

                                        {formData.paymentMethod === 'paypal' && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                className="p-8 bg-blue-50/30 border border-blue-100 rounded-[32px] text-center"
                                            >
                                                <Button variant="luxury" className="bg-[#0070ba] hover:bg-[#003087] text-white border-none px-12 h-12 rounded-full shadow-lg">
                                                    {t('step3.paypalButton')}
                                                </Button>
                                                <p className="mt-4 text-[10px] text-blue-900/40 font-bold uppercase tracking-widest">{t('step3.paypalIntegration')}</p>
                                            </motion.div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {error && (
                            <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold border border-red-100">
                                {error}
                            </div>
                        )}


                    </form>
                </div>

                {/* Summary Sidebar */}
                <div className="w-full lg:w-[400px] shrink-0">
                    <div className="sticky top-32 space-y-6">
                        {/* Property Card */}
                        <div className="bg-white rounded-[40px] overflow-hidden border border-gray-100 shadow-2xl shadow-navy-950/5">
                            <div className="h-40 relative overflow-hidden">
                                <img src={property.image} alt={property.title} className="w-full h-full object-cover" />
                                <div className="absolute top-4 left-4">
                                    <span className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-navy-950 border border-white">
                                        {t('sidebar.propertyDetails')}
                                    </span>
                                </div>
                            </div>
                            <div className="p-5 md:p-6">
                                <h3 className="text-xl md:text-2xl font-bold font-montserrat mb-1">{property.title}</h3>
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
                                    <div className="flex justify-between text-sm">
                                        <span className="text-navy-900/80 font-medium">{t('sidebar.cleaning')}</span>
                                        <span className="font-bold">€{cleaningFee}</span>
                                    </div>

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
                            form="checkout-form"
                            type="submit"
                            variant="luxury"
                            className="w-full h-16 rounded-[32px] text-sm lg:text-base font-bold flex items-center justify-center gap-3 shadow-2xl shadow-[#B08D4A]/30 active:scale-[0.98] transition-all hover:scale-[1.02]"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
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
