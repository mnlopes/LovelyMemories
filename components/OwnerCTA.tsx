"use client";

import Link from "next/link";

export const OwnerCTA = () => {
    return (
        <div className="section-block section-owner">
            <div className="container">
                <div className="row justify-content-center justify-content-xl-start section-content">
                    <div className="col-xl-2 d-none d-xl-block"></div>
                    <div className="col-12 col-md-6 col-xl-8">
                        <div className="owner-text">
                            <p>Are you a Property Owner?</p><br />
                            <h3 className="fw-bold">Unleash your <br />
                                property´s potential</h3><br />
                            <h6>We know what it takes to be the best<br />
                                Find out what distinguishes us from the rest.</h6>                </div>
                        <a className="btn" href="http://207.154.225.193/lovely-memories/owner/" target="_self">
                            <p className="mb-0">Discover</p>
                        </a>
                    </div>
                </div>
            </div>
            <div className="owner-images">
                <figure
                    className="mb-0 owner-images__img"
                    style={{ left: "-5%", top: "-10%", height: "450px", width: "450px" }}
                >
                    <img className="img-fluid" src="http://207.154.225.193/lovely-memories/wp-content/uploads/2024/04/owner-section-image-1.png" alt="" />
                </figure>

                <figure
                    className="mb-0 owner-images__img"
                    style={{ left: "57%", top: "30%", height: "400px", width: "400px" }}
                >
                    <img className="img-fluid" src="http://207.154.225.193/lovely-memories/wp-content/uploads/2024/04/owner-section-image-2.png" alt="" />
                </figure>

                <figure
                    className="mb-0 owner-images__img"
                    style={{ left: "80%", top: "-10%", height: "450px", width: "300px" }}
                >
                    <img className="img-fluid" src="http://207.154.225.193/lovely-memories/wp-content/uploads/2024/04/owner-section-image-3.png" alt="" />
                </figure>
            </div>
        </div>
    );
};
