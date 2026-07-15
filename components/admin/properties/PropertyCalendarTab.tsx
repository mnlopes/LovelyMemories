"use client";
export function PropertyCalendarTab({ propertyId, locale }: { propertyId: string; locale: string }) {
    return <div className="py-10 text-center text-sm text-[#a3a3a3]">calendar: {propertyId} / {locale}</div>;
}
