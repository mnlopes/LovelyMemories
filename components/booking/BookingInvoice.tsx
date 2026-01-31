"use client";

import React from 'react';
import { Calendar, User, MapPin, Mail, Phone, ShieldCheck } from 'lucide-react';

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
    breakfastTotal?: number;
    transferTotal?: number;
    total: number;
    paymentMethod: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    specialRequests?: string;
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
    breakfastTotal = 0,
    transferTotal = 0,
    total,
    paymentMethod,
    customerName,
    customerEmail,
    customerPhone,
    specialRequests,
    t
}) => {
    return (
        <div id="booking-invoice" style={{ backgroundColor: '#ffffff', color: '#0a1128', width: '800px', padding: '48px', fontFamily: 'sans-serif', lineHeight: '1.6' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #f3f4f6', paddingBottom: '40px', marginBottom: '40px' }}>
                <div>
                    <div style={{
                        backgroundColor: '#192537',
                        width: '240px',
                        height: '80px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '12px',
                        marginBottom: '24px'
                    }}>
                        <img
                            src="/legacy/home/images/logo.svg"
                            alt="Lovely Memories"
                            style={{ height: '40px', width: 'auto' }}
                            crossOrigin="anonymous"
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '4px' }}>
                        <p style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#B08D4A', margin: 0 }}>Lovely Memories</p>
                        <p style={{ fontSize: '9px', color: '#6e7a91', fontWeight: '500', margin: 0 }}>Luxury Property Management • Porto, Portugal</p>
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 8px 0' }}>{t('success.orderDetails')}</h1>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <p style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.1em', color: '#9ea8ba', margin: 0 }}>{t('success.reference')}</p>
                        <p style={{ fontSize: '18px', fontFamily: 'monospace', fontWeight: 'bold', color: '#0a1128', margin: 0 }}>{reservationRef}</p>
                        <p style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.1em', color: '#9ea8ba', margin: '8px 0 0 0' }}>{t('success.date')}</p>
                        <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#0a1128', margin: 0 }}>{date}</p>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', marginBottom: '48px' }}>
                {/* Guest & Property */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    <div>
                        <p style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.1em', color: '#B08D4A', marginBottom: '16px', margin: '0 0 16px 0' }}>Informação do Hóspede</p>
                        <div style={{ backgroundColor: '#f9fafb', borderRadius: '16px', padding: '24px', border: '1px solid #f3f4f6' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                <User style={{ width: '16px', height: '16px', color: '#B08D4A' }} />
                                <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{customerName}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#6e7a91', marginBottom: '8px' }}>
                                <Mail style={{ width: '16px', height: '16px' }} />
                                <span style={{ fontSize: '12px' }}>{customerEmail}</span>
                            </div>
                            {customerPhone && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#6e7a91' }}>
                                    <Phone style={{ width: '16px', height: '16px' }} />
                                    <span style={{ fontSize: '12px' }}>{customerPhone}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div>
                        <p style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.1em', color: '#B08D4A', marginBottom: '16px', margin: '0 0 16px 0' }}>Propriedade</p>
                        <div style={{ backgroundColor: '#f9fafb', borderRadius: '16px', padding: '24px', border: '1px solid #f3f4f6' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 8px 0' }}>{propertyTitle}</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6e7a91' }}>
                                <MapPin style={{ width: '16px', height: '16px' }} />
                                <span style={{ fontSize: '12px' }}>{propertyLocation}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stay Details */}
                <div>
                    <p style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.1em', color: '#B08D4A', marginBottom: '16px', margin: '0 0 16px 0' }}>Detalhes da Estadia</p>
                    <div style={{ backgroundColor: '#192537', color: '#ffffff', borderRadius: '24px', padding: '32px', boxShadow: '0 10px 30px rgba(25, 37, 55, 0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', marginBottom: '24px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <p style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.1em', color: 'rgba(255, 255, 255, 0.4)', margin: 0 }}>{t('success.dates')}</p>
                                <p style={{ fontSize: '14px', fontWeight: 'bold', margin: 0 }}>{checkIn} — {checkOut}</p>
                            </div>
                            <Calendar style={{ width: '20px', height: '20px', color: 'rgba(255, 255, 255, 0.4)' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <p style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.1em', color: 'rgba(255, 255, 255, 0.4)', margin: 0 }}>{t('success.duration')}</p>
                                <p style={{ fontSize: '14px', fontWeight: 'bold', margin: 0 }}>{nights} {nights === 1 ? 'Noite' : 'Noites'}</p>
                            </div>
                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <p style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.1em', color: 'rgba(255, 255, 255, 0.4)', margin: 0 }}>{t('success.guests')}</p>
                                <p style={{ fontSize: '14px', fontWeight: 'bold', margin: 0 }}>{guests}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Pricing Table */}
            <div style={{ marginBottom: '48px' }}>
                <p style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.1em', color: '#B08D4A', marginBottom: '16px', margin: '0 0 16px 0' }}>Resumo Financeiro</p>
                <div style={{ border: '1px solid #f3f4f6', borderRadius: '24px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: 'rgba(249, 250, 251, 0.5)', borderBottom: '1px solid #f3f4f6' }}>
                                <th style={{ textAlign: 'left', padding: '16px 24px', fontWeight: 'bold', color: '#6e7a91', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.1em' }}>Descrição</th>
                                <th style={{ textAlign: 'right', padding: '16px 24px', fontWeight: 'bold', color: '#6e7a91', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.1em' }}>Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{ padding: '16px 24px', fontWeight: '500' }}>{t('sidebar.subtotal')} ({nights} noites)</td>
                                <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 'bold' }}>€{basePrice}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{ padding: '16px 24px', fontWeight: '500' }}>{t('success.cleaningFee')}</td>
                                <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 'bold' }}>€{cleaningFee}</td>
                            </tr>
                            {breakfastTotal > 0 && (
                                <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                                    <td style={{ padding: '16px 24px', fontWeight: '500' }}>{t('sidebar.breakfast')}</td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 'bold' }}>€{breakfastTotal}</td>
                                </tr>
                            )}
                            {transferTotal > 0 && (
                                <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                                    <td style={{ padding: '16px 24px', fontWeight: '500' }}>{t('sidebar.transfer')}</td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 'bold' }}>€{transferTotal}</td>
                                </tr>
                            )}
                            <tr style={{ backgroundColor: 'rgba(249, 250, 251, 0.3)' }}>
                                <td style={{ padding: '24px' }}>
                                    <p style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>{t('sidebar.total')}</p>
                                    <p style={{ fontSize: '10px', color: '#9ea8ba', fontWeight: '500', margin: 0 }}>Inclui IVA à taxa legal</p>
                                </td>
                                <td style={{ padding: '24px', textAlign: 'right' }}>
                                    <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>€{total}</p>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Footer Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', paddingTop: '32px', borderTop: '1px solid #f3f4f6' }}>
                <div>
                    <p style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.1em', color: '#B08D4A', marginBottom: '8px', margin: 0 }}>{t('success.paymentMethod')}</p>
                    <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#0a1128', textTransform: 'capitalize', margin: 0 }}>{paymentMethod === 'wire' ? t('success.bankTransfer') : paymentMethod}</p>
                </div>
                {specialRequests && (
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.1em', color: '#B08D4A', marginBottom: '8px', margin: 0 }}>{t('success.note')}</p>
                        <p style={{ fontSize: '11px', color: '#6e7a91', fontStyle: 'italic', fontWeight: '500', margin: 0 }}>"{specialRequests}"</p>
                    </div>
                )}
            </div>

            {/* Bottom Tagline */}
            <div style={{ marginTop: '64px', textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: '#e6f4ea', color: '#2d8653', padding: '8px 16px', borderRadius: '9999px', border: '1px solid #c4eed0', marginBottom: '16px' }}>
                    <ShieldCheck style={{ width: '16px', height: '16px' }} />
                    <span style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Documento Oficial de Reserva</span>
                </div>
                <p style={{ fontSize: '10px', color: '#9ea8ba', fontWeight: '500', margin: 0 }}>
                    Obrigado por escolher a Lovely Memories. Estamos ansiosos por recebê-lo no Porto.
                    <br />
                    © 2026 Lovely Memories Luxury Property Management
                </p>
            </div>
        </div>
    );
};
