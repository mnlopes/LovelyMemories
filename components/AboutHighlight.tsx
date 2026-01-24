"use client";

import Link from "next/link";

export const AboutHighlight = () => {
    return (
        <div className="section-block section-about">
            <div className="container">
                <div className="row justify-content-center justify-content-md-start">
                    <div className="col-11 col-md-9 col-xl-6">
                        <div className="content">
                            <div className="content__text-wrap">
                                <h2 className="content__text-wrap--title">From Porto to the World</h2>
                                <p className="content__text-wrap--desc mb-0">We are the leading tourism accommodation management agent in Portugal, run by an amazing, international team. Our clients, be it the owners or guests themselves, know exactly why!</p>
                            </div>
                            <a className="btn" href="#">About Us</a>
                        </div>
                    </div>
                </div>
            </div>
            <figure className="mb-0 about-bg">
                <img className="img-fluid" src="http://207.154.225.193/lovely-memories/wp-content/uploads/2024/04/about-us-section-image.png" alt="" />
            </figure>
        </div>
    );
};
