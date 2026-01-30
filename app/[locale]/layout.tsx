import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { Montserrat } from "next/font/google";
import "../globals.css";
// import "../icons.css"; // Moved to SVG components (LegacyIcon)
import { Preloader } from "@/components/Preloader";
import { ScrollAnimations } from "@/components/ScrollAnimations";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { GuestSelectorWrapper } from "@/components/GuestSelectorWrapper";
import { DateSelectorWrapper } from "@/components/DateSelectorWrapper";

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
    <html lang={locale} dir={dir}>
      <body className={`${montserrat.variable} antialiased`} suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          <Preloader />
          <ScrollAnimations />
          <Navbar />
          <PageTransition>
            {children}
          </PageTransition>
          <Footer />
          <GuestSelectorWrapper />
          <DateSelectorWrapper />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
