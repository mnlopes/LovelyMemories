"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Filter, X, Loader2 } from "lucide-react";
import { PropertySearchSelect } from "./PropertySearchSelect";
import { HistoryDropdown } from "./HistoryDropdown";

interface Property {
    id: string;
    title: any; // Using any as it's a localized object
    airbnb_listing_name?: string;
}

interface HistoryFiltersProps {
    properties: Property[];
    locale: string;
}

const MONTHS = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
];

const YEARS = [
    { value: "2024", label: "2024" },
    { value: "2025", label: "2025" },
    { value: "2026", label: "2026" },
    { value: "2027", label: "2027" },
];

export function HistoryFilters({ properties, locale }: HistoryFiltersProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const createQueryString = useCallback(
        (params: Record<string, string | null>) => {
            const newSearchParams = new URLSearchParams(searchParams.toString());
            
            Object.entries(params).forEach(([name, value]) => {
                if (value === null || value === "") {
                    newSearchParams.delete(name);
                } else {
                    newSearchParams.set(name, value);
                }
            });

            return newSearchParams.toString();
        },
        [searchParams]
    );

    const updateFilter = (name: string, value: string) => {
        const query = createQueryString({ [name]: value });
        startTransition(() => {
            router.push(`${pathname}?${query}`, { scroll: false });
        });
    };

    const clearFilters = () => {
        startTransition(() => {
            router.push(pathname, { scroll: false });
        });
    };

    const currentMonth = searchParams.get("month") || "";
    const currentYear = searchParams.get("year") || "";
    const currentProperty = searchParams.get("propertyId") || "";
    const hasFilters = currentMonth || currentYear || currentProperty;

    return (
        <div className={`flex items-center gap-6 flex-nowrap py-1 w-full transition-opacity duration-300 ${isPending ? 'opacity-60' : 'opacity-100'}`}>
            <div className="flex items-center gap-2 text-[#a3a3a3] shrink-0">
                {isPending ? (
                    <Loader2 className="size-4 animate-spin text-admin-accent" />
                ) : (
                    <Filter className="size-4" />
                )}
                <span className="text-xs font-bold uppercase tracking-wider hidden lg:inline">
                    {isPending ? 'Loading...' : 'Filters'}
                </span>
            </div>

            {/* Month Filter */}
            <HistoryDropdown 
                options={MONTHS}
                value={currentMonth}
                onSelect={(val) => updateFilter("month", val)}
                placeholder="All Months"
            />

            {/* Year Filter */}
            <HistoryDropdown 
                options={YEARS}
                value={currentYear}
                onSelect={(val) => updateFilter("year", val)}
                placeholder="All Years"
            />

            {/* Property Filter */}
            <PropertySearchSelect 
                properties={properties}
                selectedId={currentProperty}
                onSelect={(val) => updateFilter("propertyId", val)}
                variant="compact"
                placeholder="All Properties"
                showAllOption={true}
            />

            {(hasFilters && !isPending) && (
                <button
                    onClick={clearFilters}
                    className="flex items-center gap-1.5 text-xs font-bold text-[#f87171] hover:text-red-500 transition-colors uppercase tracking-wider px-2"
                >
                    <X className="size-3.5" />
                    Clear
                </button>
            )}
        </div>
    );
}
