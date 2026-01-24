'use client';

import { useState, useEffect } from 'react';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

export default function Navbar() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { scrollY } = useScroll();

    useMotionValueEvent(scrollY, "change", (latest) => {
        setIsScrolled(latest > 50);
    });

    const links = [
        { name: 'Home', href: '/' },
        { name: 'Gallery', href: '#gallery' },
        { name: 'About', href: '#about' },
        { name: 'Contact', href: '#contact' },
    ];

    return (
        <motion.nav
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isScrolled ? 'py-4 glass shadow-lg' : 'py-6 bg-transparent'
                }`}
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.8 }}
        >
            <div className="container mx-auto px-6 flex items-center justify-between">
                <Link href="/" className="relative z-50">
                    <span className="font-playfair text-2xl md:text-3xl text-white font-bold tracking-wide">
                        L<span className="text-gold-400">M</span>
                    </span>
                </Link>

                {/* Desktop Menu */}
                <div className="hidden md:flex items-center space-x-8">
                    {links.map((link) => (
                        <Link
                            key={link.name}
                            href={link.href}
                            className="text-white/90 hover:text-gold-300 text-sm uppercase tracking-widest transition-colors duration-300 font-medium relative group"
                        >
                            {link.name}
                            <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-gold-400 transition-all duration-300 group-hover:w-full" />
                        </Link>
                    ))}
                    <button className="px-5 py-2 border border-gold-400/50 text-gold-200 text-sm uppercase tracking-widest rounded-sm hover:bg-gold-500/10 transition-all duration-300">
                        Book Now
                    </button>
                </div>

                {/* Mobile Menu Button */}
                <button
                    className="md:hidden text-white z-50"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    {isMobileMenuOpen ? <X /> : <Menu />}
                </button>

                {/* Mobile Menu Overlay */}
                <motion.div
                    className={`fixed inset-0 bg-navy-950/95 backdrop-blur-xl flex flex-col items-center justify-center space-y-8 md:hidden`}
                    initial={{ opacity: 0, pointerEvents: 'none' }}
                    animate={{
                        opacity: isMobileMenuOpen ? 1 : 0,
                        pointerEvents: isMobileMenuOpen ? 'auto' : 'none'
                    }}
                    transition={{ duration: 0.3 }}
                >
                    {links.map((link) => (
                        <Link
                            key={link.name}
                            href={link.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="font-playfair text-3xl text-white hover:text-gold-400 transition-colors"
                        >
                            {link.name}
                        </Link>
                    ))}
                </motion.div>
            </div>
        </motion.nav>
    );
}
