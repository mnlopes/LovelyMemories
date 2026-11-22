'use client';

import { useState } from 'react';
import { Check, Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function SaleShareButton({ title }: { title: string }) {
    const t = useTranslations('Sales');
    const [copied, setCopied] = useState(false);

    async function share() {
        const url = window.location.href;
        try {
            if (typeof navigator.share === 'function') {
                await navigator.share({ title, url });
                return;
            }
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Share sheet dismissed or clipboard blocked: nothing to do.
        }
    }

    return (
        <button
            type="button"
            onClick={share}
            aria-label={copied ? t('shareCopied') : t('share')}
            title={copied ? t('shareCopied') : t('share')}
            className="flex size-11 items-center justify-center rounded-full border border-[#e3e6ea] text-[#192537] hover:bg-[#f5f6f8]"
        >
            {copied ? <Check className="size-[18px] text-[#1d6b40]" aria-hidden="true" /> : <Share2 className="size-[18px]" aria-hidden="true" />}
        </button>
    );
}
