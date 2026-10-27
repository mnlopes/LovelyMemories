"use client";

import { LayoutGrid } from "lucide-react";
import { Link, usePathname } from "@/i18n/routing";

// Thin strip above every mockup screen so the client can jump between the
// two proposals without hunting for links inside the designs.
export function MockupBar() {
    const pathname = usePathname();
    const option = pathname.startsWith('/mockups-propertysell/a') ? 'a' : pathname.startsWith('/mockups-propertysell/b') ? 'b' : null;

    const pill = (active: boolean) =>
        `rounded-full px-3 sm:px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] transition-colors ${
            active ? 'bg-[#b09e80] text-[#192537]' : 'text-white hover:text-[#b09e80]'
        }`;

    return (
        <div className="bg-[#0a1128] border-b border-white/10">
            <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-4 py-2">
                <span className="hidden sm:block text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                    Homes for sale · design proposals
                </span>
                <span className="sm:hidden text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">Proposals</span>
                <div className="flex items-center gap-2">
                    <nav aria-label="Proposals" className="flex items-center gap-1 rounded-full border border-white/15 p-0.5">
                        <Link href="/mockups-propertysell/a" className={pill(option === 'a')} aria-current={option === 'a' ? 'page' : undefined}>
                            Option A
                        </Link>
                        <Link href="/mockups-propertysell/b" className={pill(option === 'b')} aria-current={option === 'b' ? 'page' : undefined}>
                            Option B
                        </Link>
                    </nav>
                    <Link
                        href="/mockups-propertysell"
                        aria-label="All screens"
                        className="flex h-8 items-center gap-2 rounded-full border border-white/15 px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-white hover:text-[#b09e80]"
                    >
                        <LayoutGrid className="size-3.5" />
                        <span className="hidden sm:inline">All screens</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}
