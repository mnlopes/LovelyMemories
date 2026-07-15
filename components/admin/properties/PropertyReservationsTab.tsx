"use client";
export function PropertyReservationsTab({ propertyId, locale }: { propertyId: string; locale: string }) {
    return <div className="py-10 text-center text-sm text-[#a3a3a3]">reservations: {propertyId} / {locale}</div>;
}
