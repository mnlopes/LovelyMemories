import parse from 'html-react-parser';
import type { Metadata } from "next";
import { getLegacyHead } from "@/lib/legacy";
import "@/app/globals.css";

const BODY_CLASSES = "wp-singular page-template page-template-templates page-template-page-properties page-template-templatespage-properties-php page page-id-34 wp-theme-adhq-theme theme-adhq-theme woocommerce-js yith-booking en";

export const metadata: Metadata = {
    title: "Properties - Lovely Memories",
    description: "Our luxury properties.",
};

export default function PropertiesLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const legacyHeadContent = getLegacyHead('properties');

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
