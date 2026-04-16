"use client";

import React from 'react';
import { Calendar, User, MapPin, Mail, Phone, ShieldCheck, Euro } from 'lucide-react';

interface BookingInvoiceProps {
    reservationRef: string;
    date: string;
    propertyTitle: string;
    propertyLocation: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    guests: string;
    basePrice: number;
    cleaningFee: number;
    discountAmount?: number;
    cityTaxTotal?: number;
    breakfastTotal?: number;
    transferTotal?: number;
    total: number;
    paymentMethod: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    // Billing info
    billingAddress?: string;
    billingCity?: string;
    billingZip?: string;
    billingCountry?: string;
    vat?: string;
    couponCode?: string;
    couponDiscount?: number;
    t: (key: string, params?: any) => string;
}

export const BookingInvoice: React.FC<BookingInvoiceProps> = ({
    reservationRef,
    date,
    propertyTitle,
    propertyLocation,
    checkIn,
    checkOut,
    nights,
    guests,
    basePrice,
    cleaningFee,
    discountAmount = 0,
    cityTaxTotal = 0,
    breakfastTotal = 0,
    transferTotal = 0,
    total,
    paymentMethod,
    customerName,
    customerEmail,
    customerPhone,
    billingAddress,
    billingCity,
    billingZip,
    billingCountry,
    vat,
    couponCode,
    couponDiscount = 0,
    t
}) => {
    return (
        <div id="booking-invoice" style={{ backgroundColor: '#ffffff', color: '#0a1128', width: '800px', padding: '64px', fontFamily: 'sans-serif', lineHeight: '1.6', position: 'relative' }}>
            {/* Elegant Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #eef0f2', paddingBottom: '48px', marginBottom: '48px' }}>
                <div>
                    <div style={{
                        backgroundColor: '#0A1128',
                        width: '240px',
                        height: '80px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '16px',
                        marginBottom: '24px',
                        boxShadow: '0 4px 12px rgba(10, 17, 40, 0.1)'
                    }}>
                        <img
                            src="/legacy/home/images/logo.svg"
                            alt="Lovely Memories"
                            style={{ height: '36px', width: 'auto' }}
                            crossOrigin="anonymous"
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <p style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#B08D4A', margin: 0 }}>Lovely Memories</p>
                        <p style={{ fontSize: '10px', color: '#6e7a91', fontWeight: '500', margin: 0 }}>Luxury Property Management • Porto, Portugal</p>
                        <p style={{ fontSize: '10px', color: '#9ea8ba', margin: 0 }}>www.lovelymemories.pt</p>
                    </div>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h1 style={{ fontSize: '32px', fontWeight: 'bold', margin: 0, color: '#0a1128', fontStyle: 'montserrat' }}>{t('success.orderDetails')}</h1>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <p style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.15em', color: '#9ea8ba', margin: 0 }}>{t('success.reference')}</p>
                        <p style={{ fontSize: '20px', fontFamily: 'monospace', fontWeight: 'bold', color: '#0a1128', margin: 0 }}>{reservationRef}</p>
                        <p style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.15em', color: '#9ea8ba', margin: '12px 0 0 0' }}>{t('success.date')}</p>
                        <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#0a1128', margin: 0 }}>{date}</p>
                    </div>
                </div>
            </div>

            {/* Content Section 1: Information */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', marginBottom: '48px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    {/* Guest Section */}
                    <div>
                        <p style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.12em', color: '#B08D4A', margin: '0 0 16px 0' }}>{t('success.guestInfo')}</p>
                        <div style={{ backgroundColor: '#fdfbf7', borderRadius: '20px', padding: '24px', border: '1px solid #f0e6d2' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                <User style={{ width: '16px', height: '16px', color: '#B08D4A' }} />
                                <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#0a1128' }}>{customerName}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#6e7a91', marginBottom: '8px' }}>
                                <Mail style={{ width: '14px', height: '14px' }} />
                                <span style={{ fontSize: '13px' }}>{customerEmail}</span>
                            </div>
                            {customerPhone && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#6e7a91' }}>
                                    <Phone style={{ width: '14px', height: '14px' }} />
                                    <span style={{ fontSize: '13px' }}>{customerPhone}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Property Section */}
                    <div>
                        <p style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.12em', color: '#B08D4A', margin: '0 0 16px 0' }}>{t('success.property')}</p>
                        <div style={{ backgroundColor: '#f9fafb', borderRadius: '20px', padding: '24px', border: '1px solid #f3f4f6' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 8px 0', color: '#0a1128' }}>{propertyTitle}</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6e7a91' }}>
                                <MapPin style={{ width: '14px', height: '14px' }} />
                                <span style={{ fontSize: '13px' }}>{propertyLocation}</span>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Stay Details Section */}
                <div data-pdf-section="stay-details">
                    <p style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.12em', color: '#B08D4A', margin: '0 0 16px 0' }}>{t('success.stayDetails')}</p>
                    <div style={{ backgroundColor: '#0A1128', color: '#ffffff', borderRadius: '24px', padding: '32px', boxShadow: '0 12px 24px rgba(10, 17, 40, 0.15)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', marginBottom: '24px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <p style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.15em', color: 'rgba(255, 255, 255, 0.4)', margin: 0 }}>{t('success.dates')}</p>
                                <p style={{ fontSize: '15px', fontWeight: 'bold', margin: 0 }}>{checkIn} — {checkOut}</p>
                            </div>
                            <Calendar style={{ width: '22px', height: '22px', color: '#B08D4A' }} />
                        </div>
                        <div style={{ display: 'flex', gap: '48px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <p style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.15em', color: 'rgba(255, 255, 255, 0.4)', margin: 0 }}>{t('success.duration')}</p>
                                <p style={{ fontSize: '15px', fontWeight: 'bold', margin: 0 }}>{t('sidebar.nights', { count: nights })}</p>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <p style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.15em', color: 'rgba(255, 255, 255, 0.4)', margin: 0 }}>{t('success.guests')}</p>
                                <p style={{ fontSize: '15px', fontWeight: 'bold', margin: 0 }}>{guests}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Billing Information (Optional) */}
            {billingAddress && (
                <div style={{ marginBottom: '48px' }} data-pdf-section="billing-info">
                    <p style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.12em', color: '#B08D4A', margin: '0 0 16px 0' }}>{t('step1.billingTitle')}</p>
                    <div style={{ backgroundColor: '#f9fafb', borderRadius: '20px', padding: '24px', border: '1px solid #f3f4f6' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                            <div>
                                <p style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', color: '#9ea8ba', marginBottom: '4px', margin: 0 }}>{t('step1.address')}</p>
                                <p style={{ fontSize: '13px', color: '#0a1128', fontWeight: '500', margin: 0 }}>{billingAddress}</p>
                                <p style={{ fontSize: '13px', color: '#0a1128', fontWeight: '500', margin: 0 }}>{billingZip} {billingCity}</p>
                                <p style={{ fontSize: '13px', color: '#0a1128', fontWeight: '500', margin: 0 }}>{billingCountry}</p>
                            </div>
                            {vat && (
                                <div>
                                    <p style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', color: '#9ea8ba', marginBottom: '4px', margin: 0 }}>{t('step1.vat').split(' - ')[0]}</p>
                                    <p style={{ fontSize: '13px', color: '#0a1128', fontWeight: 'bold', margin: 0 }}>{vat}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Financial Summary */}
            <div style={{ marginBottom: '48px' }} data-pdf-section="financial-summary">
                <p style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.12em', color: '#B08D4A', margin: '0 0 16px 0' }}>{t('success.financialSummary')}</p>
                <div style={{ border: '1px solid #eef0f2', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                    <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #eef0f2' }}>
                                <th style={{ textAlign: 'left', padding: '18px 24px', fontWeight: 'bold', color: '#6e7a91', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.12em' }}>{t('success.description')}</th>
                                <th style={{ textAlign: 'right', padding: '18px 24px', fontWeight: 'bold', color: '#6e7a91', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.12em' }}>{t('success.value')}</th>
                            </tr>
                        </thead>
                        <tbody style={{ color: '#0a1128' }}>
                            <tr style={{ borderBottom: '1px solid #eef0f2' }}>
                                <td style={{ padding: '16px 24px', fontWeight: '500' }}>{t('sidebar.subtotal')} ({t('sidebar.nights', { count: nights })})</td>
                                <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 'bold' }}>€{basePrice}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #eef0f2' }}>
                                <td style={{ padding: '16px 24px', fontWeight: '500' }}>{t('success.cleaningFee')}</td>
                                <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 'bold' }}>€{cleaningFee}</td>
                            </tr>
                            {discountAmount > 0 && (
                                <tr style={{ borderBottom: '1px solid #eef0f2', color: '#2d8653', backgroundColor: '#f6fbf8' }}>
                                    <td style={{ padding: '16px 24px', fontWeight: '500' }}>{nights >= 28 ? t('sidebar.monthlyDiscount') : t('sidebar.weeklyDiscount')}</td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 'bold' }}>−€{discountAmount}</td>
                                </tr>
                            )}
                            {couponDiscount > 0 && (
                                <tr style={{ borderBottom: '1px solid #eef0f2', color: '#B08D4A', backgroundColor: '#fcfaf6' }}>
                                    <td style={{ padding: '16px 24px', fontWeight: '500' }}>{t('step2.couponCode')} ({couponCode})</td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 'bold' }}>−€{couponDiscount}</td>
                                </tr>
                            )}
                            {cityTaxTotal > 0 && (
                                <tr style={{ borderBottom: '1px solid #eef0f2' }}>
                                    <td style={{ padding: '16px 24px', fontWeight: '500' }}>{t('sidebar.cityTax')}</td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 'bold' }}>€{cityTaxTotal}</td>
                                </tr>
                            )}
                            {breakfastTotal > 0 && (
                                <tr style={{ borderBottom: '1px solid #eef0f2' }}>
                                    <td style={{ padding: '16px 24px', fontWeight: '500' }}>{t('sidebar.breakfast')}</td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 'bold' }}>€{breakfastTotal}</td>
                                </tr>
                            )}
                            {transferTotal > 0 && (
                                <tr style={{ borderBottom: '1px solid #eef0f2' }}>
                                    <td style={{ padding: '16px 24px', fontWeight: '500' }}>{t('sidebar.transfer')}</td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 'bold' }}>€{transferTotal}</td>
                                </tr>
                            )}
                            <tr style={{ backgroundColor: '#0A1128', color: '#ffffff' }}>
                                <td style={{ padding: '24px' }}>
                                    <p style={{ fontSize: '20px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>{t('sidebar.total')}</p>
                                    <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', fontWeight: '500', margin: 0 }}>{t('success.vatRate')}</p>
                                </td>
                                <td style={{ padding: '24px', textAlign: 'right' }}>
                                    <p style={{ fontSize: '32px', fontWeight: 'bold', margin: 0 }}>€{total}</p>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Bank Transfer Instructions (Only for Wire) */}
            {paymentMethod === 'wire' && (
                <div style={{ marginBottom: '48px' }} data-pdf-section="bank-transfer">
                    <p style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.12em', color: '#B08D4A', margin: '0 0 16px 0' }}>{t('success.bankTransfer')}</p>
                    <div style={{ backgroundColor: '#fdfbf7', border: '1px solid #f0e6d2', borderRadius: '24px', padding: '32px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                            <div style={{ 
                                width: '40px', 
                                height: '40px', 
                                minWidth: '40px',
                                borderRadius: '50%', 
                                backgroundColor: '#B08D4A', 
                                color: '#ffffff', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                boxShadow: '0 4px 8px rgba(176, 141, 74, 0.2)',
                                flexShrink: 0
                            }}>
                                <Euro style={{ width: '20px', height: '20px' }} />
                            </div>
                            <p style={{ fontSize: '14px', color: '#8a6d3b', fontWeight: '500', margin: 0 }}>{t('step3.instructions')}</p>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                            <div>
                                <p style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', color: '#9ea8ba', marginBottom: '4px', margin: 0 }}>{t('step3.holder')}</p>
                                <p style={{ fontSize: '14px', color: '#0a1128', fontWeight: 'bold', margin:0 }}>Lovely Memories Ltd.</p>
                            </div>
                            <div>
                                <p style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', color: '#9ea8ba', marginBottom: '4px', margin: 0 }}>{t('step3.bankName')}</p>
                                <p style={{ fontSize: '14px', color: '#0a1128', fontWeight: 'bold', margin:0 }}>Millennium BCP</p>
                            </div>
                            <div>
                                <p style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', color: '#9ea8ba', marginBottom: '4px', margin: 0 }}>{t('step3.iban')}</p>
                                <p style={{ fontSize: '14px', color: '#0a1128', fontWeight: 'bold', margin:0, fontFamily: 'monospace' }}>PT50 0033 0000 1234 5678 9012 3</p>
                            </div>
                            <div>
                                <p style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', color: '#9ea8ba', marginBottom: '4px', margin: 0 }}>{t('step3.swift')}</p>
                                <p style={{ fontSize: '14px', color: '#0a1128', fontWeight: 'bold', margin:0 }}>BCPTPLLX</p>
                            </div>
                        </div>
                        <div style={{ backgroundColor: '#ffffff', border: '1px solid #f0e6d2', borderRadius: '16px', padding: '16px', textAlign: 'center' }}>
                            <p style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', color: '#9ea8ba', marginBottom: '4px', margin: 0 }}>{t('step3.reference')}</p>
                            <p style={{ fontSize: '24px', color: '#B08D4A', fontWeight: 'bold', margin: 0, fontFamily: 'monospace', letterSpacing: '0.05em' }}>{reservationRef}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer / Payment Method */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '32px', borderTop: '1px solid #eef0f2' }}>
                <div>
                    <p style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.12em', color: '#B08D4A', marginBottom: '8px', margin: 0 }}>{t('success.paymentMethod')}</p>
                    <p style={{ fontSize: '15px', fontWeight: 'bold', color: '#0a1128', textTransform: 'capitalize', margin: 0 }}>{paymentMethod === 'wire' ? t('success.bankTransfer') : paymentMethod}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                </div>
            </div>

            {/* Final Tagline */}
            <div style={{ marginTop: '64px', textAlign: 'center', opacity: 0.6 }}>
                <p style={{ fontSize: '11px', color: '#6e7a91', fontWeight: '500', margin: 0 }}>
                    {t('success.thankYouLine')}
                    <br />
                    © 2026 Lovely Memories Luxury Property Management
                </p>
            </div>
        </div>
    );
};
