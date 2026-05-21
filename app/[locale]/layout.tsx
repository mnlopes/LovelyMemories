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

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata = {
  title: "Lovely Memories - Luxury Property Management",
  description: "Creating unforgettable experiences.",
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
