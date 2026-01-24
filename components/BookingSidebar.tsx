"use client";

import { useState } from "react";
import { Button } from "./ui/Button";
import { Users, Calendar, Info } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface BookingSidebarProps {
    shortTermPrice?: number;
    midTermPrice?: number;
    longTermPrice?: number;
    cleaningFee?: number;
    cityTax?: number;
    agent: {
        name: string;
        image: string;
        role: string;
    };
}

type EstadiaType = 'short' | 'mid' | 'long';

export const BookingSidebar = ({
    shortTermPrice = 0,
    midTermPrice = 0,
    longTermPrice = 0,
    cleaningFee = 65,
    cityTax = 4,
    agent
}: BookingSidebarProps) => {
    const [activeTab, setActiveTab] = useState<EstadiaType>('short');
    const [guests, setGuests] = useState(2);

    const getBasePrice = () => {
        if (activeTab === 'short') return shortTermPrice || 94.76;
        if (activeTab === 'mid') return midTermPrice || 2500;
        return longTermPrice || 2200;
    };

    const price = getBasePrice();
    const nights = 7; // Mock for design
    const subtotal = price * (activeTab === 'short' ? nights : 1);
    const totalTax = cityTax * (activeTab === 'short' ? nights : 30);
    const total = subtotal + totalTax + cleaningFee;

    const formatPrice = (val: number) => {
        return val.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
    };

    return (
        <div className="sticky top-32 z-30">
            <div className="bg-white shadow-[0_30px_60px_rgba(0,0,0,0.12)] overflow-hidden text-[#0a1128] rounded-[24px] border border-gray-100">
                {/* Tabs */}
                <div className="flex bg-[#F8F7F3] p-0 border-b border-gray-100">
                    {(['short', 'mid', 'long'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                "flex-1 py-5 text-[11px] font-bold transition-all duration-300 capitalize tracking-[0.1em] border-r border-gray-100 last:border-r-0",
                                activeTab === tab
                                    ? "bg-white text-[#0a1128] shadow-[0_4px_20px_rgba(0,0,0,0.05)]"
                                    : "text-[#0a1128]/40 hover:text-[#0a1128]/60"
                            )}
                        >
                            {tab}-term
                        </button>
                    ))}
                </div>

                <div className="p-10 space-y-8">
                    {/* Arrival/Departure Selection */}
                    <div className="space-y-6 border-b border-[#f1f1f1] pb-8">
                        <div className="flex flex-col gap-2 group cursor-pointer">
                            <span className="text-[11px] uppercase tracking-widest text-[#AD9C7E] font-bold">Arrival</span>
                            <div className="flex items-center gap-3">
                                <Calendar className="w-5 h-5 text-[#AD9C7E]" />
                                <span className="text-xl font-bold tracking-tight">01.02.2024</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 group cursor-pointer pt-2">
                            <span className="text-[11px] uppercase tracking-widest text-[#AD9C7E] font-bold">Departure</span>
                            <div className="flex items-center gap-3">
                                <Calendar className="w-5 h-5 text-[#AD9C7E]" />
                                <span className="text-xl font-bold tracking-tight">08.02.2024</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 group cursor-pointer pt-2">
                            <span className="text-[11px] uppercase tracking-widest text-[#AD9C7E] font-bold">Travellers</span>
                            <div className="flex items-center gap-3">
                                <Users className="w-5 h-5 text-[#AD9C7E]" />
                                <span className="text-xl font-bold tracking-tight">{guests} guest</span>
                            </div>
                        </div>
                    </div>

                    {/* Price Details */}
                    <div className="space-y-4">
                        <h4 className="text-[13px] font-bold text-[#AD9C7E] uppercase tracking-[0.2em] flex items-center gap-2">
                            Price Details
                        </h4>
                        <div className="space-y-3 text-sm font-medium">
                            <div className="flex justify-between items-center">
                                <span className="text-[#0a1128]/70">Price per {activeTab === 'short' ? 'night' : 'month'} x {activeTab === 'short' ? nights : 1}</span>
                                <span className="font-bold">{formatPrice(price)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[#0a1128]/70">City tax</span>
                                <span className="font-bold">{formatPrice(totalTax)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[#0a1128]/70">Cleaning fee</span>
                                <span className="font-bold">{formatPrice(cleaningFee)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Total */}
                    <div className="pt-8 border-t border-[#f1f1f1]">
                        <div className="flex justify-between items-baseline mb-8">
                            <span className="text-lg font-bold">Total</span>
                            <span className="text-4xl md:text-5xl font-playfair font-black text-[#0a1128]">{formatPrice(total)}</span>
                        </div>
                        <Button className="w-full h-[72px] bg-[#AD9C7E] text-white font-bold text-lg hover:bg-[#93856b] rounded-full shadow-2xl shadow-[#AD9C7E]/20 transition-all transform hover:scale-[1.03] active:scale-[0.98] border-none uppercase tracking-widest px-8">
                            Request to book
                        </Button>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-[#0a1128]/40 mt-8 font-bold text-center">
                            You won't be charged yet
                        </p>
                    </div>
                </div>
            </div>

            {/* Host Mini Info */}
            <div className="mt-8 flex items-center justify-between p-5 bg-white shadow-xl border border-[#f1f1f1] rounded-2xl group cursor-pointer transition-all hover:border-[#AD9C7E]/30">
                <div className="flex items-center gap-4">
                    <div className="relative w-12 h-12 rounded-full overflow-hidden grayscale group-hover:grayscale-0 transition-all bg-[#f1f1f1] border-2 border-white shadow-sm">
                        {agent.image && (
                            <Image src={agent.image} alt={agent.name} fill className="object-cover" />
                        )}
                    </div>
                    <div>
                        <p className="text-[10px] text-[#AD9C7E] font-bold uppercase tracking-widest">Ask our host</p>
                        <p className="text-[15px] font-bold text-[#0a1128]">Message {agent.name.split(' ')[0]}</p>
                    </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-[#f1f1f1] flex items-center justify-center text-[#AD9C7E] group-hover:bg-[#AD9C7E] group-hover:text-white transition-all">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                </div>
            </div>
        </div>
    );
};
