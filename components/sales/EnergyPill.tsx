import { Zap } from 'lucide-react';
import type { EnergyClass } from '@/lib/sales/types';

/** Energy pill tint, following the certificate scale: green for A+ to B, yellow B- and C, orange D and E, red F. */
const ENERGY_TINT: Record<EnergyClass, string> = {
    'A+': 'bg-[#e6f4ea] text-[#1d6b40]',
    A: 'bg-[#e6f4ea] text-[#1d6b40]',
    B: 'bg-[#e6f4ea] text-[#1d6b40]',
    'B-': 'bg-[#f6f4d8] text-[#6b6410]',
    C: 'bg-[#fdf3d4] text-[#7a5a00]',
    D: 'bg-[#fdebd7] text-[#8a4a0c]',
    E: 'bg-[#fde3d6] text-[#94400f]',
    F: 'bg-[#fbe1e0] text-[#9b2420]',
    exempt: 'bg-[#eef0f3] text-[#4b5563]',
};

/** The same energy-class pill on the catalogue cards and on the listing page. `label` is the already translated text. */
export function EnergyPill({ energy, label, size = 'sm' }: { energy: EnergyClass; label: string; size?: 'sm' | 'md' }) {
    return (
        <span
            className={`inline-flex w-fit shrink-0 items-center gap-1 whitespace-nowrap rounded-full font-bold ${ENERGY_TINT[energy]} ${
                size === 'md' ? 'px-3 py-1 text-[15px]' : 'px-2.5 py-1 text-[11px]'
            }`}
        >
            <Zap className={size === 'md' ? 'size-3.5' : 'size-3'} aria-hidden="true" />
            {label}
        </span>
    );
}
