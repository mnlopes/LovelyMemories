"use client";

import Link from "next/link";

export const Footer = () => {
    return (
        <footer className="footer" style={{ backgroundImage: "url('http://207.154.225.193/lovely-memories/wp-content/uploads/2024/04/footer-BG.png')" }}>
            <div className="footer-top">
                <div className="container">
                    <div className="row justify-content-center">
                        <div className="col-12">
                            <h4 className="text-center footer-title color-white">Get in Touch</h4>
                        </div>
                        <div className="col-12 col-md-8 col-lg-5">
                            <p className="mb-0 text-center footer-desc color-white">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi tincidunt eu mauris a pulvinar.</p>
                        </div>
                        <div className="col-12 col-md-10 col-lg-8">
                            <div className="wpcf7 js" id="wpcf7-f15-o1" lang="en-US" dir="ltr">
                                <form action="#" method="post" className="wpcf7-form init" aria-label="Contact form" noValidate>
                                    <div className="form-group">
                                        <span className="wpcf7-form-control-wrap" data-name="your-email">
                                            <input size={40} maxLength={400} className="wpcf7-form-control wpcf7-email wpcf7-validates-as-required wpcf7-text wpcf7-validates-as-email form-control" aria-required="true" aria-invalid="false" placeholder="Enter your email" type="email" name="your-email" />
                                        </span>
                                        <button className="form-submit" type="submit">Subscribe</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                        <div className="col-11 footer-menu">
                            <ul id="menu-main-menu-1" className="header__main--menu">
                                <li className="menu-item nav-item active"><Link href="/" className="nav-link active">Book</Link></li>
                                <li className="menu-item nav-item"><Link href="/owner" className="nav-link">Owner</Link></li>
                                <li className="menu-item nav-item"><Link href="/about" className="nav-link">About Us</Link></li>
                                <li className="menu-item nav-item"><Link href="/properties" className="nav-link">Properties</Link></li>
                                <li className="menu-item nav-item"><Link href="/concierge" className="nav-link">Concierge</Link></li>
                                <li className="menu-item nav-item"><Link href="/blog" className="nav-link">Blog</Link></li>
                                <li className="menu-item nav-item"><Link href="/contact" className="nav-link">Contact</Link></li>
                            </ul>
                        </div>
                        <div className="col-12 social-icons">
                            <ul className="social-icons__wrap d-flex align-items-center">
                                <li className="social-icons__wrap--link">
                                    <a href="http://instagram.com" target="_blank" className="perma" rel="noopener noreferrer">
                                        <span className="icon-facebook"></span>
                                    </a>
                                </li>
                                <li className="social-icons__wrap--link">
                                    <a href="http://facebook.com" target="_blank" className="perma" rel="noopener noreferrer">
                                        <span className="icon-instagram"></span>
                                    </a>
                                </li>
                                <li className="social-icons__wrap--link">
                                    <a href="http://x.com" target="_blank" className="perma" rel="noopener noreferrer">
                                        <span className="icon-x"></span>
                                    </a>
                                </li>
                                <li className="social-icons__wrap--link">
                                    <a href="http://linkedin.com" target="_blank" className="perma" rel="noopener noreferrer">
                                        <span className="icon-linkedin"></span>
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
            <div className="footer-bottom">
                <div className="footer-bottom__top">
                    <hr className="footer-bottom__top--divider" />
                    <figure className="mb-0 footer-bottom__top--logo">
                        <img src="http://207.154.225.193/lovely-memories/wp-content/uploads/2024/04/logo-1.svg" alt="" className="img-fluid" />
                    </figure>
                </div>
                <div className="footer-bottom__bottom">
                    <div className="footer-bottom__bottom--left">
                        <Link href="/privacy-policy" className="policy-link">
                            Privacy &amp; Cookie Policy
                        </Link>
                        <Link href="/terms-conditions" className="policy-link">
                            Terms &amp; Conditions
                        </Link>
                    </div>
                    <div className="footer-bottom__bottom--right">
                        <p className="mb-0 copyright">© 2026 Lovely Memories</p>
                    </div>
                </div>
            </div>
        </footer>
    );
};
