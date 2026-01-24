"use client";

import Link from "next/link";
import { useState } from "react";
import { User, Globe } from "lucide-react"; // Fallback icons if needed, but using legacy text/structure first.

export const Navbar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <header className="header">
            <div className="header__inner">
                <nav className="header__nav">
                    <div className="header__nav--inner">
                        <button
                            className={`header__nav--toggler ${isMenuOpen ? 'active' : ''}`}
                            type="button"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                        >
                            <div className="lines">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                        </button>
                    </div>
                </nav>

                <Link href="/" className="header__nav--brand">
                    <figure className="mb-0">
                        <img
                            src="http://207.154.225.193/lovely-memories/wp-content/uploads/2024/04/logo.svg"
                            alt="Lovely Memories"
                            className="logo img-fluid"
                        />
                    </figure>
                </Link>

                <div className={`header__nav--collapse ${isMenuOpen ? 'show' : ''}`}>
                    <div className="content">
                        <ul id="menu-main-menu" className="header__main--menu">
                            <li className="menu-item nav-item active"><Link href="/" className="nav-link active">Book</Link></li>
                            <li className="menu-item nav-item"><Link href="/owner" className="nav-link">Owner</Link></li>
                            <li className="menu-item nav-item"><Link href="/about" className="nav-link">About Us</Link></li>
                            <li className="menu-item nav-item"><Link href="/properties" className="nav-link">Properties</Link></li>
                            <li className="menu-item nav-item"><Link href="/concierge" className="nav-link">Concierge</Link></li>
                            <li className="menu-item nav-item"><Link href="/blog" className="nav-link">Blog</Link></li>
                            <li className="menu-item nav-item"><Link href="/contact" className="nav-link">Contact</Link></li>
                        </ul>
                        <div className="content__mobile-role">
                            <Link className="content__mobile-role--perma" href="/login">
                                <i className="icon-guest"></i>
                                <span>Login</span>
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="header__inner--user-data">
                    <div className="role">
                        <Link className="role__perma" href="/login">
                            {/* icon-guest is likely a font icon. we might need to verify if fonts are loaded. 
                                providing a lucide fallback if needed, but keeping class for now */}
                            <i className="icon-guest"></i>
                            <span>Login</span>
                        </Link>
                    </div>
                    <div className="language-switcher">
                        <div className="dropdown-center">
                            <button className="dropdown-toggle" type="button">
                                <figure className="mb-0">
                                    <img src="http://207.154.225.193/lovely-memories/wp-content/uploads/flags/english-flag.svg" className="img-fluid" alt="en" />
                                </figure>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

