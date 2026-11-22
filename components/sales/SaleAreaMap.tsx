'use client';

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';

const SaleAreaMapLeaflet = dynamic(() => import('./SaleAreaMapLeaflet'), {
    ssr: false,
    loading: () => <div className="h-full w-full animate-pulse bg-[#e8edf1]" />,
});

export function SaleAreaMap({
    lat,
    lng,
    label,
}: {
    lat: number | null;
    lng: number | null;
    /** Accessible description, e.g. "Map of Paranhos, Porto". */
    label: string;
}) {
    const t = useTranslations('Sales');
    if (lat === null || lng === null) return null;
    return (
        <div
            role="img"
            aria-label={label}
            className="relative h-[260px] overflow-hidden rounded-[20px] border border-[#dde3e8] bg-[#e8edf1] md:h-[320px]"
        >
            <SaleAreaMapLeaflet lat={lat} lng={lng} />
            <p className="absolute bottom-4 left-4 z-[500] w-fit max-w-[calc(100%-2rem)] rounded-full bg-white px-3.5 py-2 text-xs font-semibold text-[#374151] shadow-[0_4px_14px_rgba(0,0,0,0.08)]">
                {t('mapNote')}
            </p>
        </div>
    );
}
