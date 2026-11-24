'use client';

import { useState } from 'react';
import { Check, Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

/**
 * Phones open the system share sheet (WhatsApp, Messages… in one tap). Computers copy the link:
 * the Windows and macOS share panels get in the way when all you want is to paste it somewhere.
 */
export function SaleShareButton({ title }: { title: string }) {
    const t = useTranslations('Sales');
    const [copied, setCopied] = useState(false);

    async function share() {
        const url = window.location.href;
        const touch = window.matchMedia('(pointer: coarse)').matches;
        try {
            if (touch && typeof navigator.share === 'function') {
                await navigator.share({ title, url });
                return;
            }
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            // Share sheet dismissed or clipboard blocked: nothing to do.
        }
    }

    return (
        <div className="relative">
            <button
                type="button"
                onClick={share}
                aria-label={t('share')}
                title={t('share')}
                className="flex size-11 items-center justify-center rounded-full border border-[#e3e6ea] text-[#192537] transition-colors duration-300 hover:bg-[#f5f6f8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b09e80]"
            >
                {copied ? <Check className="size-[18px] text-[#1d6b40]" aria-hidden="true" /> : <Share2 className="size-[18px]" aria-hidden="true" />}
            </button>
            <span
                role="status"
                className={`pointer-events-none absolute right-0 top-full z-10 mt-2 whitespace-nowrap rounded-full bg-[#192537] px-3 py-1.5 text-xs font-semibold text-white shadow-lg transition-opacity duration-300 ${
                    copied ? 'opacity-100' : 'opacity-0'
                }`}
            >
                {copied ? t('shareCopied') : ''}
            </span>
        </div>
    );
}
