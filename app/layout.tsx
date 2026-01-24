import parse from 'html-react-parser';
import type { Metadata } from "next";
import { getLegacyHead } from "@/lib/legacy";
import { Preloader } from "@/components/Preloader";
import { ScrollAnimations } from "@/components/ScrollAnimations";
import "./globals.css";

// Classes originais extraídas do HTML
const LEGACY_BODY_CLASSES = "home wp-singular page-template page-template-front-page page-template-front-page-php page page-id-1 wp-theme-adhq-theme theme-adhq-theme woocommerce-js yith-booking en";

export const metadata: Metadata = {
  title: "Lovely Memories - Luxury Property Management",
  description: "Experience the pinnacle of property management with Lovely Memories.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const legacyHeadContent = getLegacyHead('home');

  return (
    <html lang="en">
      <head>
        {/* Injeção Crítica dos Estilos e Scripts Legados */}
        {parse(legacyHeadContent.replace(/>\s+</g, '><').trim())}
      </head>
      <body
        className={LEGACY_BODY_CLASSES}
        suppressHydrationWarning
      >
        <Preloader />
        <ScrollAnimations />
        {children}
      </body>
    </html>
  );
}
