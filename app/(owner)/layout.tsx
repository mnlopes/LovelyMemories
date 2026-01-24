import parse from 'html-react-parser';
import type { Metadata } from "next";
import { getLegacyHead } from "@/lib/legacy";
import "@/app/globals.css";

const BODY_CLASSES = "wp-singular page-template page-template-templates page-template-page-owner page-template-templatespage-owner-php page page-id-598 wp-theme-adhq-theme theme-adhq-theme woocommerce-js yith-booking en";

export const metadata: Metadata = {
    title: "Owner - Lovely Memories",
    description: "Owner portal for Lovely Memories.",
};

export default function OwnerLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const legacyHeadContent = getLegacyHead('owner');

    return (
        <>
            {parse(legacyHeadContent.replace(/>\s+</g, '><').trim())}
            <main className={BODY_CLASSES}>
                {children}
            </main>
        </>
    );
}
