"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, Star, Trash2, Upload } from "lucide-react";
import { IMG } from "../../../../_components/data";
import { Section, LangTabs, input, label } from "./ui";

const PHOTOS = [
    { src: IMG.cottage, alt: 'Garden and terrace' },
    { src: IMG.livingGarden, alt: 'Living room opening onto the garden' },
    { src: IMG.bedroom, alt: 'Double bedroom' },
    { src: IMG.garden, alt: 'View over the neighbourhood gardens' },
];

export function PhotosTab() {
    const [main, setMain] = useState(0);
    const [lang, setLang] = useState<'EN' | 'PT'>('EN');

    return (
        <Section title="Photos" hint="At least one photo to publish">
            <button type="button" className="flex min-h-[110px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#b8b8b8] bg-[#fafafa] px-4 text-center text-[13px] font-bold">
                <Upload className="size-5" aria-hidden="true" />
                Upload photos
                <span className="text-xs font-normal text-[#6b6b6b]">They are resized in your browser before uploading.</span>
            </button>
            <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-[#6b6b6b]">Drag to reorder, or use the arrows. The main photo is the card cover.</p>
                <LangTabs lang={lang} onChange={setLang} />
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
                {PHOTOS.map((p, i) => (
                    <li key={p.src} className="flex flex-col gap-3 rounded-2xl border border-[#eeeeee] bg-[#fafafa] p-3">
                        <div className="relative aspect-[16/10] overflow-hidden rounded-xl">
                            <Image src={p.src} alt="" fill sizes="(max-width: 640px) 100vw, 320px" className="object-cover" />
                            {main === i && <span className="absolute left-2 top-2 rounded-full bg-[#111111] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">Main photo</span>}
                        </div>
                        <label className={label}>Alt text ({lang})
                            <input type="text" key={lang} defaultValue={lang === 'EN' ? p.alt : ''} placeholder={lang === 'PT' ? 'Descrição da foto' : ''} className={input} />
                        </label>
                        <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => setMain(i)} className="flex min-h-10 items-center gap-1.5 rounded-[10px] border border-[#e0e0e0] bg-white px-3 text-xs font-bold"><Star className="size-3.5" aria-hidden="true" />Set as main</button>
                            <button type="button" aria-label="Move up" className="flex size-10 items-center justify-center rounded-[10px] border border-[#e0e0e0] bg-white"><ArrowUp className="size-4" aria-hidden="true" /></button>
                            <button type="button" aria-label="Move down" className="flex size-10 items-center justify-center rounded-[10px] border border-[#e0e0e0] bg-white"><ArrowDown className="size-4" aria-hidden="true" /></button>
                            <button type="button" aria-label="Delete photo" className="ml-auto flex size-10 items-center justify-center rounded-[10px] border border-[#f0d4d4] bg-white text-[#b42318]"><Trash2 className="size-4" aria-hidden="true" /></button>
                        </div>
                    </li>
                ))}
            </ul>
        </Section>
    );
}
