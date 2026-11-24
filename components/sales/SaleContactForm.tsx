'use client';

import { useState } from 'react';
import { Loader2, MessageCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

const inputBase = 'rounded-xl border bg-white text-base text-[#192537] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b09e80] md:text-sm';
const okBorder = 'border-[#dfe2e6]';
const badBorder = 'border-[#b42318]';
const inputCls = `min-h-[46px] px-3.5 ${inputBase} ${okBorder}`;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const labelCls = 'flex flex-col gap-1.5 text-xs font-semibold text-[#374151]';

type Mode = 'info' | 'visit';
type FieldKey = 'name' | 'email' | 'message' | 'visitTimes' | 'consent';
type Errors = Partial<Record<FieldKey, string>>;
type Status = 'idle' | 'sending' | 'sent' | 'error' | 'too_many';

export function SaleContactForm({
    listingId,
    title,
    reference,
    sold,
    locale,
    whatsappUrl,
}: {
    listingId: string;
    title: string;
    reference: string;
    sold: boolean;
    locale: 'en' | 'pt';
    /** Full wa.me link, only when a WhatsApp number is configured. */
    whatsappUrl: string | null;
}) {
    const t = useTranslations('Sales');
    const [mode, setMode] = useState<Mode>('info');
    const visit = !sold && mode === 'visit';

    const defaultMessage = (m: Mode) =>
        sold ? t('messageSold', { title, reference }) : m === 'visit' ? t('messageVisit', { title, reference }) : t('messageInfo', { title, reference });

    const [message, setMessage] = useState(() => defaultMessage('info'));
    const [messageTouched, setMessageTouched] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [purpose, setPurpose] = useState<'live' | 'invest' | 'both'>('live');
    const [visitTimes, setVisitTimes] = useState('');
    const [consent, setConsent] = useState(false);
    const [website, setWebsite] = useState(''); // honeypot
    const [status, setStatus] = useState<Status>('idle');
    const [errors, setErrors] = useState<Errors>({});

    const clearError = (k: FieldKey) => setErrors((prev) => (prev[k] ? { ...prev, [k]: undefined } : prev));
    const fieldProps = (k: FieldKey) => ({
        'aria-invalid': errors[k] ? (true as const) : undefined,
        'aria-describedby': errors[k] ? `sale-err-${k}` : undefined,
    });
    const errorText = (k: FieldKey) =>
        errors[k] ? (
            <span id={`sale-err-${k}`} className="text-xs font-semibold text-[#b42318]">
                {errors[k]}
            </span>
        ) : null;

    function switchMode(next: Mode) {
        setMode(next);
        if (!messageTouched) setMessage(defaultMessage(next));
    }

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (status === 'sending') return;
        const found: Errors = {};
        if (!name.trim()) found.name = t('errorName');
        if (!EMAIL_RE.test(email.trim())) found.email = t('errorEmail');
        if (!message.trim()) found.message = t('errorMessage');
        if (visit && !visitTimes.trim()) found.visitTimes = t('errorVisitTimes');
        if (!consent) found.consent = t('errorConsent');
        setErrors(found);
        const order: FieldKey[] = ['name', 'email', 'visitTimes', 'message', 'consent'];
        const first = order.find((k) => found[k]);
        if (first) {
            (e.currentTarget.elements.namedItem(first) as HTMLElement | null)?.focus();
            return;
        }
        setStatus('sending');
        try {
            const res = await fetch('/api/contact-sale', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    listingId,
                    kind: visit ? 'visit' : 'info',
                    name,
                    email,
                    phone: phone.trim() || undefined,
                    purpose,
                    message,
                    visitTimes: visit ? visitTimes.trim() || undefined : undefined,
                    consent: true,
                    locale,
                    website,
                }),
            });
            if (res.ok) setStatus('sent');
            else if (res.status === 429) setStatus('too_many');
            else setStatus('error');
        } catch {
            setStatus('error');
        }
    }

    if (status === 'sent') {
        return (
            <div role="status" className="flex flex-col gap-2 rounded-2xl bg-[#e6f4ea] p-5 text-[#1d6b40]">
                <p className="text-base font-bold">{t('sentTitle')}</p>
                <p className="text-sm leading-relaxed">{t('sentText')}</p>
            </div>
        );
    }

    const tabCls = (active: boolean) =>
        `min-h-11 rounded-full text-xs font-bold tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b09e80] ${active ? 'bg-[#192537] text-white' : 'text-[#374151]'}`;

    return (
        <div className="flex flex-col gap-5">
            {sold ? (
                <p className="rounded-xl bg-[#f1f3f5] px-4 py-3 text-[13px] leading-relaxed text-[#374151]">{t('soldNote')}</p>
            ) : (
                <div className="grid grid-cols-2 gap-1 rounded-full bg-[#f1f3f5] p-1">
                    <button type="button" aria-pressed={!visit} onClick={() => switchMode('info')} className={tabCls(!visit)}>
                        {t('modeInfo')}
                    </button>
                    <button type="button" aria-pressed={visit} onClick={() => switchMode('visit')} className={tabCls(visit)}>
                        {t('modeVisit')}
                    </button>
                </div>
            )}
            <form className="flex flex-col gap-3" onSubmit={onSubmit} noValidate>
                <label className={labelCls}>
                    {t('fieldName')}
                    <input
                        {...fieldProps('name')}
                        type="text"
                        name="name"
                        required
                        maxLength={120}
                        autoComplete="name"
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value);
                            clearError('name');
                        }}
                        placeholder={t('placeholderName')}
                        className={`${inputCls} ${errors.name ? badBorder : ''}`}
                    />
                    {errorText('name')}
                </label>
                <label className={labelCls}>
                    {t('fieldEmail')}
                    <input
                        {...fieldProps('email')}
                        type="email"
                        name="email"
                        required
                        maxLength={200}
                        autoComplete="email"
                        inputMode="email"
                        autoCapitalize="none"
                        spellCheck={false}
                        value={email}
                        onChange={(e) => {
                            setEmail(e.target.value);
                            clearError('email');
                        }}
                        placeholder={t('placeholderEmail')}
                        className={`${inputCls} ${errors.email ? badBorder : ''}`}
                    />
                    {errorText('email')}
                </label>
                <label className={labelCls}>
                    {t('fieldPhone')}
                    <input
                        type="tel"
                        name="phone"
                        maxLength={40}
                        autoComplete="tel"
                        inputMode="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+351"
                        className={inputCls}
                    />
                </label>
                {/* Three short choices: buttons you see at once read better than a native dropdown. */}
                <fieldset className="flex flex-col gap-1.5">
                    <legend className="mb-1.5 text-xs font-semibold text-[#374151]">{t('fieldPurpose')}</legend>
                    <div className="flex flex-wrap gap-2">
                        {(
                            [
                                ['live', t('purposeLive')],
                                ['invest', t('purposeInvest')],
                                ['both', t('purposeBoth')],
                            ] as const
                        ).map(([value, text]) => (
                            <label key={value} className="cursor-pointer">
                                <input
                                    type="radio"
                                    name="purpose"
                                    value={value}
                                    checked={purpose === value}
                                    onChange={() => setPurpose(value)}
                                    className="peer sr-only"
                                />
                                <span className="inline-flex min-h-[42px] items-center rounded-full border border-[#d6d9de] bg-white px-3.5 text-[13px] font-semibold text-[#374151] transition-colors duration-300 hover:border-[#192537] peer-checked:border-[#192537] peer-checked:bg-[#192537] peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-[#b09e80] peer-focus-visible:ring-offset-1">
                                    {text}
                                </span>
                            </label>
                        ))}
                    </div>
                </fieldset>
                {visit && (
                    <label className={labelCls}>
                        {t('fieldVisitTimes')}
                        <input
                            {...fieldProps('visitTimes')}
                            type="text"
                            name="visitTimes"
                            maxLength={300}
                            value={visitTimes}
                            onChange={(e) => {
                                setVisitTimes(e.target.value);
                                clearError('visitTimes');
                            }}
                            placeholder={t('visitTimesPlaceholder')}
                            className={`${inputCls} ${errors.visitTimes ? badBorder : ''}`}
                        />
                        {errorText('visitTimes')}
                    </label>
                )}
                <label className={labelCls}>
                    {t('fieldMessage')}
                    <textarea
                        {...fieldProps('message')}
                        name="message"
                        rows={3}
                        required
                        maxLength={2000}
                        value={message}
                        onChange={(e) => {
                            setMessage(e.target.value);
                            setMessageTouched(true);
                            clearError('message');
                        }}
                        className={`px-3.5 py-3 leading-normal ${inputBase} ${errors.message ? badBorder : okBorder}`}
                    />
                    {errorText('message')}
                </label>
                {/* Honeypot: invisible to people, tempting to bots. */}
                <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                    <label>
                        Website
                        <input type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                    </label>
                </div>
                <div className="flex flex-col gap-1.5">
                <label className="flex items-start gap-2.5 text-xs leading-normal text-[#4b5563]">
                    <input
                        {...fieldProps('consent')}
                        type="checkbox"
                        name="consent"
                        required
                        checked={consent}
                        onChange={(e) => {
                            setConsent(e.target.checked);
                            clearError('consent');
                        }}
                        className="mt-0.5 size-4 accent-[#192537] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b09e80] focus-visible:ring-offset-1"
                    />
                    <span>
                        {t.rich('consent', {
                            link: (chunks) => (
                                <Link href="/privacy-policy" target="_blank" className="font-semibold underline">
                                    {chunks}
                                </Link>
                            ),
                        })}
                    </span>
                </label>
                {errorText('consent')}
                </div>
                <div role="alert">
                    {status === 'error' && <p className="text-[13px] font-semibold text-[#b42318]">{t('errorGeneric')}</p>}
                    {status === 'too_many' && <p className="text-[13px] font-semibold text-[#b42318]">{t('errorTooMany')}</p>}
                </div>
                <button
                    type="submit"
                    disabled={status === 'sending'}
                    className="flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-[#192537] text-xs font-bold uppercase tracking-[0.18em] text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b09e80] focus-visible:ring-offset-2 disabled:opacity-60"
                >
                    {status === 'sending' && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                    {status === 'sending' ? t('sending') : visit ? t('submitVisit') : t('submitInfo')}
                </button>
                {whatsappUrl && (
                    <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex min-h-[50px] items-center justify-center gap-2.5 rounded-full border border-[#d6d9de] text-[13px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b09e80]"
                    >
                        <MessageCircle className="size-[18px] text-[#1d6b40]" aria-hidden="true" />
                        {t('whatsappCta')}
                    </a>
                )}
                <p className="text-center text-xs text-[#6b7280]">{t('noObligation')}</p>
            </form>
        </div>
    );
}
