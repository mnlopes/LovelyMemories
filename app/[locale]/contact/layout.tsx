import parse from 'html-react-parser';
import type { Metadata } from "next";
import { getLegacyHead } from "@/lib/legacy";
import "@/app/globals.css";
import "@/app/overrides.css";

const BODY_CLASSES = "wp-singular page-template page-template-templates page-template-page-contact page-template-templatespage-contact-php page page-id-10 wp-theme-adhq-theme theme-adhq-theme woocommerce-js yith-booking en";

export const metadata: Metadata = {
    title: "Contact - Lovely Memories",
    description: "Get in touch with Lovely Memories.",
};

export default function ContactLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const legacyHeadContent = getLegacyHead('contact');

    return (
        <div className={BODY_CLASSES}>
            {parse(legacyHeadContent.replace(/>\s+</g, '><').trim())}
            {children}
        </div>
    );
}
