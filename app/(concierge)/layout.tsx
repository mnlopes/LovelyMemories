import parse from 'html-react-parser';
import type { Metadata } from "next";
import { getLegacyHead } from "@/lib/legacy";
import "@/app/globals.css";

const BODY_CLASSES = "wp-singular page-template page-template-templates page-template-page-concierge page-template-templatespage-concierge-php page page-id-29 wp-theme-adhq-theme theme-adhq-theme woocommerce-js yith-booking en";

export const metadata: Metadata = {
    title: "Concierge - Lovely Memories",
    description: "Concierge services by Lovely Memories.",
};

export default function ConciergeLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const legacyHeadContent = getLegacyHead('concierge');

    return (
        <html lang="en">
            <head>
                {parse(legacyHeadContent.replace(/>\s+</g, '><').trim())}
            </head>
            <body
                className={BODY_CLASSES}
                suppressHydrationWarning
            >
                {children}
            </body>
        </html>
    );
}
