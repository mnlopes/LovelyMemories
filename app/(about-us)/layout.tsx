import parse from 'html-react-parser';
import type { Metadata } from "next";
import { getLegacyHead } from "@/lib/legacy";
import "@/app/globals.css";

const BODY_CLASSES = "wp-singular page-template page-template-templates page-template-page-about page-template-templatespage-about-php page page-id-2 wp-theme-adhq-theme theme-adhq-theme woocommerce-js yith-booking en";

export const metadata: Metadata = {
    title: "About Us - Lovely Memories",
    description: "About Lovely Memories.",
};

export default function AboutUsLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const legacyHeadContent = getLegacyHead('about-us');

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
