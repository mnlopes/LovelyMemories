'use client';

import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';

/** Above this many characters the description starts folded, with a "Read more" button. */
const FOLD_AT = 700;

/**
 * The listing description. Long texts start folded to about nine lines; the whole text is always
 * in the HTML (search engines and screen readers get all of it), only its height is limited.
 */
export function SaleDescription({
    paragraphs,
    readMore,
    readLess,
}: {
    paragraphs: string[];
    readMore: string;
    readLess: string;
}) {
    const long = paragraphs.join('').length > FOLD_AT;
    const [open, setOpen] = useState(false);
    const id = useId();
    const folded = long && !open;

    return (
        <div className="flex flex-col gap-3">
            <div
                id={id}
                className={`relative flex flex-col gap-3.5 ${folded ? 'max-h-[16rem] overflow-hidden' : ''}`}
            >
                {paragraphs.map((p, i) => (
                    <p key={i} className="whitespace-pre-line text-base leading-[1.75] text-[#374151]">{p}</p>
                ))}
                {folded && (
                    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white to-transparent" />
                )}
            </div>
            {long && (
                <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={id}
                    onClick={() => setOpen((o) => !o)}
                    className="inline-flex min-h-11 w-fit items-center gap-1.5 rounded-full text-sm font-bold uppercase tracking-[0.14em] text-[#192537] underline-offset-4 hover:text-[#7a6a4d] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b09e80] focus-visible:ring-offset-2"
                >
                    {open ? readLess : readMore}
                    <ChevronDown aria-hidden="true" className={`h-4 w-4 text-[#b09e80] transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
            )}
        </div>
    );
}
