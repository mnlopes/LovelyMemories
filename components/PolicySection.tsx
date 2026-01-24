import { Check, X, Clock, Wind, Wifi, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/Button";

interface PolicySectionProps {
    rules?: string[];
    cancellationPolicy?: string;
}

const DEFAULT_RULES = [
    { label: "Children welcome (1-12 years)", icon: Check, allowed: true },
    { label: "Infants welcome (under 12 months)", icon: Check, allowed: true },
    { label: "No pets", icon: X, allowed: false },
    { label: "No parties or events", icon: X, allowed: false },
    { label: "No smoking", icon: X, allowed: false },
];

export const PolicySection = ({ rules, cancellationPolicy }: PolicySectionProps) => {
    return (
        <section className="py-24 space-y-24 border-t border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-20">

                {/* House Rules */}
                <div className="space-y-8">
                    <h3 className="text-[11px] font-extrabold text-[#AD9C7E] uppercase tracking-[0.4em]">House Rules</h3>
                    <ul className="space-y-5">
                        {DEFAULT_RULES.map((rule, i) => (
                            <li key={i} className="flex items-center gap-4 text-sm font-bold text-navy-950/80">
                                <rule.icon className={cn("w-4 h-4", rule.allowed ? "text-[#AD9C7E]" : "text-gray-200")} />
                                {rule.label}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Good to know */}
                <div className="space-y-8">
                    <h3 className="text-[11px] font-extrabold text-[#AD9C7E] uppercase tracking-[0.4em]">Good to know</h3>
                    <ul className="space-y-5">
                        <li className="flex items-center gap-4 text-sm font-bold text-navy-950/80">
                            <Clock className="w-4 h-4 text-[#AD9C7E]" />
                            Arrival from 15:00
                        </li>
                        <li className="flex items-center gap-4 text-sm font-bold text-navy-950/80">
                            <Clock className="w-4 h-4 text-[#AD9C7E]" />
                            Departure before 11:00
                        </li>
                        <li className="flex items-center gap-4 text-sm font-bold text-navy-950/80">
                            <Wind className="w-4 h-4 text-[#AD9C7E]" />
                            Air Con
                        </li>
                        <li className="flex items-center gap-4 text-sm font-bold text-navy-950/80">
                            <Wifi className="w-4 h-4 text-[#AD9C7E]" />
                            High-Speed WiFi
                        </li>
                    </ul>
                </div>

                {/* Cancellation */}
                <div className="space-y-8">
                    <h3 className="text-[11px] font-extrabold text-[#AD9C7E] uppercase tracking-[0.4em]">Cancellation policy</h3>
                    <div className="flex gap-6 p-8 bg-[#FBFAF8] rounded-3xl border border-[#F1F0EC]">
                        <div className="flex flex-col items-center justify-center w-14 h-14 bg-white border border-gray-100 rounded-lg text-center shadow-sm">
                            <span className="text-[10px] font-bold uppercase text-gray-400">Feb</span>
                            <span className="text-2xl font-black leading-none text-navy-950">3</span>
                        </div>
                        <div className="flex-1 space-y-2">
                            <p className="text-[15px] font-bold text-navy-950 leading-tight">Cancel before 3 Feb, 2026</p>
                            <p className="text-xs text-navy-950/50 font-medium leading-relaxed">
                                for a 50% refund. Not eligible for a refund after this date.
                            </p>
                            <button className="text-[11px] font-bold text-[#AD9C7E] uppercase tracking-[0.1em] border-b border-[#AD9C7E] pt-2">View full terms</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Host Section */}
            <div className="pt-24 border-t border-gray-100">
                <h3 className="text-[11px] font-extrabold text-[#AD9C7E] uppercase tracking-[0.4em] mb-12">The Host</h3>
                <div className="flex flex-col lg:flex-row gap-20 items-start">
                    <div className="flex-1 space-y-8">
                        <h2 className="text-4xl font-playfair font-bold text-navy-950 underline decoration-[#AD9C7E]/30 underline-offset-[12px]">This home is managed by Lovely Stay</h2>
                        <p className="text-navy-950/70 text-lg leading-relaxed max-w-2xl font-medium italic">
                            "This home is managed directly by a business. A member of their staff will be your point of contact before and during your stay. The team has over 30 years of experience looking after guests wanting to stay in the most exclusive locations."
                        </p>
                        <Button className="rounded-full border-[#AD9C7E] text-[#AD9C7E] font-bold text-[11px] uppercase tracking-[0.2em] hover:bg-[#AD9C7E] hover:text-white px-10 h-14 bg-white border-2">
                            Login to message the host
                        </Button>
                    </div>
                    <div className="w-full lg:w-[35%] flex items-start gap-6 p-8 bg-[#F8F7F3] rounded-3xl">
                        <ShieldAlert className="w-8 h-8 text-[#AD9C7E] shrink-0 mt-1" />
                        <p className="text-[15px] font-bold text-[#AD9C7E] leading-relaxed italic">
                            Great hosts, not just great homes – We reject homes managed by hosts who don't meet our standards of excellence.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
};
