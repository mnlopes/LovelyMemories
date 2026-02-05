"use client";

import { Montserrat } from "next/font/google";
import { Link } from "@/i18n/routing";

const montserrat = Montserrat({
    subsets: ["latin"],
    variable: "--font-montserrat",
    display: "swap",
});

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className={`${montserrat.variable} antialiased min-h-screen bg-[#FCFCFC] font-sans overflow-hidden`}>
            {children}
        </div>
    );
}
