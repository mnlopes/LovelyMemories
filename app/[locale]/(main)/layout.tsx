"use client";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { GuestSelectorWrapper } from "@/components/GuestSelectorWrapper";
import { DateSelectorWrapper } from "@/components/DateSelectorWrapper";
import { PageTransition } from "@/components/PageTransition";

export default function MainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <Navbar />
            <PageTransition>
                {children}
            </PageTransition>
            <Footer />
            <GuestSelectorWrapper />
            <DateSelectorWrapper />
        </>
    );
}
