import parse from 'html-react-parser';
import type { Metadata } from "next";
import { getLegacyHead } from "@/lib/legacy";
import "@/app/globals.css";

// Classes específicas para páginas internas (baseado em Properties)
const PAGES_BODY_CLASSES = "wp-singular page-template page-template-templates page-template-page-properties page-template-templatespage-properties-php page page-id-34 wp-theme-adhq-theme theme-adhq-theme woocommerce-js yith-booking en";

export const metadata: Metadata = {
    title: "Lovely Memories - Luxury Property Management",
    description: "Experience the pinnacle of property management with Lovely Memories.",
};

export default function PagesLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className={PAGES_BODY_CLASSES}>
            {children}
        </div>
    );
}
