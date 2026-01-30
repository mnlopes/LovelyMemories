"use client";

import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

interface BreadcrumbProps {
    items: {
        label: string;
        href?: string;
    }[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
    const t = useTranslations('PropertyDetail');
    return (
        <nav className="flex items-center gap-1.5 text-sm">
            <Link
                href="/"
                className="text-muted-foreground hover:text-navy-950 transition-colors"
            >
                {t('home')}
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />

            {items.map((item, index) => (
                <span key={index} className="flex items-center gap-1.5">
                    {item.href ? (
                        <Link
                            href={item.href}
                            className={`transition-colors hover:text-navy-950 ${index === items.length - 1
                                ? "text-navy-950 font-medium"
                                : "text-muted-foreground"
                                }`}
                        >
                            {item.label}
                        </Link>
                    ) : (
                        <span className={`transition-colors ${index === items.length - 1
                            ? "text-navy-950 font-medium"
                            : "text-muted-foreground"
                            }`}>
                            {item.label}
                        </span>
                    )}

                    {index < items.length - 1 && (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                    )}
                </span>
            ))}
        </nav>
    );
}
