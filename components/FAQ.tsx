"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";

const FAQS = [
    {
        question: "What is included in the concierge service?",
        answer: "Our dedicated concierge team is available 24/7 to handle everything from restaurant reservations and private chef bookings to yacht charters and secure transportation. We tailor every detail to your preferences."
    },
    {
        question: "How do you ensure the security of the properties?",
        answer: "We employ state-of-the-art security systems, including 24-hour surveillance and smart access control. For high-profile guests, we can also provide on-site private security personnel upon request."
    },
    {
        question: "Can I request specific amenities prior to arrival?",
        answer: "Absolutely. Whether you require a fully stocked wine cellar, specific childcare equipment, or a particular brand of linens, simply inform your personal host, and we will ensure everything is ready for your arrival."
    },
    {
        question: "What is your cancellation policy?",
        answer: "We offer flexible cancellation terms for most of our properties. Specific details vary by location and season, but we prioritize fairness and transparency. Please check the specific booking terms for your chosen residence."
    },
    {
        question: "Do you offer long-term stays?",
        answer: "Yes, many of our guests choose Lovely Memories for extended stays. We offer exclusive rates and bespoke services for bookings longer than 30 days, ensuring you feel perfectly at home."
    }
];

export const FAQ = () => {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    return (
        <section className="py-32 bg-navy-950 relative overflow-hidden">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 md:gap-24">

                    {/* Header / Title Column */}
                    <div className="lg:col-span-4">
                        <span className="text-gold-400 text-sm font-medium tracking-widest uppercase mb-6 block">Support</span>
                        <h2 className="text-4xl md:text-6xl font-playfair text-white leading-tight mb-8">
                            Frequently Asked <br />
                            <span className="text-white/50 italic">Questions.</span>
                        </h2>
                        <p className="text-white/60 leading-relaxed mb-8">
                            Can't find what you're looking for? Contact our concierge team for personalized assistance.
                        </p>
                        <button className="px-8 py-4 rounded-full border border-white/10 hover:bg-white hover:text-navy-950 transition-colors text-white text-sm font-medium uppercase tracking-wider">
                            Contact Support
                        </button>
                    </div>

                    {/* FAQ List Column */}
                    <div className="lg:col-span-8 space-y-2">
                        {FAQS.map((faq, i) => (
                            <div
                                key={i}
                                className={`group border-b transition-colors duration-500 ${openIndex === i ? "border-gold-400" : "border-white/10 hover:border-white/30"}`}
                            >
                                <button
                                    onClick={() => setOpenIndex(openIndex === i ? null : i)}
                                    className="w-full flex items-center justify-between py-8 text-left focus:outline-none"
                                >
                                    <span className={`text-xl md:text-2xl font-playfair transition-colors duration-300 ${openIndex === i ? "text-gold-400" : "text-white group-hover:text-white/80"}`}>
                                        {faq.question}
                                    </span>
                                    <span className={`relative flex items-center justify-center w-8 h-8 transition-transform duration-500 ${openIndex === i ? "rotate-45" : "rotate-0"}`}>
                                        <Plus className={`w-6 h-6 ${openIndex === i ? "text-gold-400" : "text-white/50"}`} />
                                    </span>
                                </button>

                                <AnimatePresence>
                                    {openIndex === i && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
                                            className="overflow-hidden"
                                        >
                                            <div className="pb-8 text-white/60 leading-7 text-lg max-w-2xl">
                                                {faq.answer}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>

                </div>
            </div>
        </section>
    );
};
