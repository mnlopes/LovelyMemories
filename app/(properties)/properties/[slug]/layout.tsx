import parse from 'html-react-parser';
import type { Metadata } from "next";
import { getLegacyHead } from "@/lib/legacy";
import "@/app/globals.css";

const BODY_CLASSES = "archive tax-property term-paraiso-331-garden-huts-eco-homes term-46 wp-theme-adhq-theme theme-adhq-theme woocommerce woocommerce-page woocommerce-js yith-booking en";

export const metadata: Metadata = {
    title: "Project Detail - Lovely Memories",
    description: "Property project detailed view.",
};

export default function BuildingDetailLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className={BODY_CLASSES}>
            {children}
        </div>
    );
}
