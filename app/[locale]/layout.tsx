import { NextIntlClientProvider } from 'next-intl';
import { Toaster } from 'sonner';
import { getMessages } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Montserrat } from "next/font/google";
import "../globals.css";
// import "../icons.css"; // Moved to SVG components (LegacyIcon)
import { Preloader } from "@/components/Preloader";
import { ScrollAnimations } from "@/components/ScrollAnimations";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { GuestSelectorWrapper } from "@/components/GuestSelectorWrapper";
import { DateSelectorWrapper } from "@/components/DateSelectorWrapper";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { CookieConsent } from "@/components/CookieConsent";
import { SiteJsonLd } from "@/components/seo/SiteJsonLd";
import type { Metadata } from "next";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

const SITE_NAME = "Lovely Memories";
const SITE_DESCRIPTION =
  "Premium short-stay rentals and full property management in Porto, Vila Nova de Gaia and the Douro. Curated luxury homes with concierge service.";

// Icons (app/icon.png, app/apple-icon.png, app/favicon.ico) and the social card
// (app/opengraph-image.png, app/twitter-image.png) are auto-detected by Next.js
// from the app/ directory, so they don't need to be declared here.
export const metadata: Metadata = {
  metadataBase: new URL("https://lovelymemories.pt"),
  title: {
    default: `${SITE_NAME} — Luxury Stays & Property Management in Porto & Douro`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Luxury Stays & Property Management`,
    description: SITE_DESCRIPTION,
    url: "https://lovelymemories.pt",
    images: ["/opengraph-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Luxury Stays & Property Management`,
    description: SITE_DESCRIPTION,
    images: ["/twitter-image.png"],
  },
};

import { PageTransition } from "@/components/PageTransition";

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  // HEBREW support: RTL if locale is 'he'
  const dir = locale === 'he' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body className={`${montserrat.variable} antialiased`} suppressHydrationWarning>
        <SiteJsonLd />
        <NextIntlClientProvider messages={messages} locale={locale}>
          <Toaster
            position="top-right"
            richColors
            expand={true}
            theme="system"
            style={{ zIndex: 999999 }}
          />
          <Preloader />
          <ScrollAnimations />
          {children}
          <CookieConsent />
          <GoogleAnalytics />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
