'use client';

import { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

/** Fixed bottom bar on phones: price, WhatsApp (when configured) and a jump to the contact form. */
export function SaleMobileBar({
    priceText,
    statusText,
    statusTone,
    whatsappUrl,
}: {
    priceText: string;
    statusText: string;
    statusTone: 'good' | 'neutral';
    whatsappUrl: string | null;
}) {
    const t = useTranslations('Sales');
    const [hidden, setHidden] = useState(false);

    // The footer comes after the page in the layout: pad the body so the bar never covers it.
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 1023px)');
        const apply = () => {
            document.body.style.paddingBottom = mq.matches ? '84px' : '';
            // Focused fields scroll clear of the fixed bar.
            document.documentElement.style.scrollPaddingBottom = mq.matches ? '96px' : '';
        };
        apply();
        mq.addEventListener('change', apply);
        return () => {
            mq.removeEventListener('change', apply);
            document.body.style.paddingBottom = '';
            document.documentElement.style.scrollPaddingBottom = '';
        };
    }, []);

    // Hide the bar while the contact form is on screen or one of its fields has focus.
    useEffect(() => {
        const form = document.getElementById('contact');
        if (!form) return;
        let inView = false;
        let focused = false;
        const update = () => setHidden(inView || focused);
        const io = new IntersectionObserver(([entry]) => {
            inView = entry.isIntersecting;
            update();
        });
        io.observe(form);
        const onIn = (e: FocusEvent) => {
            const el = e.target as HTMLElement;
            if (el.matches('input, select, textarea')) {
                focused = true;
                update();
            }
        };
        const onOut = () => {
            focused = false;
            update();
        };
        form.addEventListener('focusin', onIn);
        form.addEventListener('focusout', onOut);
        return () => {
            io.disconnect();
            form.removeEventListener('focusin', onIn);
            form.removeEventListener('focusout', onOut);
        };
    }, []);

    return (
        <div className={`fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-[#eceef1] bg-white px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] lg:hidden ${hidden ? 'hidden' : ''}`}>
            <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-lg font-bold text-[#192537]">{priceText}</span>
                <span className={`text-[11px] font-semibold ${statusTone === 'good' ? 'text-[#1d6b40]' : 'text-[#6b7280]'}`}>{statusText}</span>
            </div>
            {whatsappUrl && (
                <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t('whatsappCta')}
                    className="flex size-12 items-center justify-center rounded-full border border-[#d6d9de]"
                >
                    <MessageCircle className="size-5 text-[#1d6b40]" aria-hidden="true" />
                </a>
            )}
            <a
                href="#contact"
                className="flex min-h-12 items-center justify-center rounded-full bg-[#192537] px-6 text-xs font-bold uppercase tracking-[0.14em] text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b09e80] focus-visible:ring-offset-2"
            >
                {t('requestInfoShort')}
            </a>
        </div>
    );
}
