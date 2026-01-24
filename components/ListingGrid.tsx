"use client";

import Link from "next/link";

const PROPERTIES = [
    {
        title: "Paraíso 331",
        description: "Garden Huts & Eco Homes",
        image: "http://207.154.225.193/lovely-memories/wp-content/uploads/2024/05/e7de979846a74b7dd3407aec0a0f3e9294605259.jpg",
        link: "/property/paraiso-331"
    },
    {
        title: "Paraíso 332",
        description: "Garden Huts & Eco Homes",
        image: "http://207.154.225.193/lovely-memories/wp-content/uploads/2024/04/footer-BG.png",
        link: "/property/paraiso-332"
    },
    {
        title: "Praça dos Poveiros",
        description: "",
        image: "http://207.154.225.193/lovely-memories/wp-content/uploads/2024/04/footer-BG.png",
        link: "/property/praca-dos-poveiros"
    },
    {
        title: "RDM II",
        description: "",
        image: "http://207.154.225.193/lovely-memories/wp-content/uploads/2024/04/footer-BG.png",
        link: "/property/rdm-ii"
    },
    {
        title: "The Flower Power",
        description: "",
        image: "http://207.154.225.193/lovely-memories/wp-content/uploads/2024/04/footer-BG.png",
        link: "/property/the-flower-power"
    }
];

export const ListingGrid = () => {
    return (
        <div className="section-block section-buildings">
            <div className="container">
                <div className="row">
                    <div className="col">
                        <h5 className="section-title">Some of our Unique Homes &amp; Resorts</h5>
                    </div>
                </div>
                <div className="row row-cols-1 row-cols-xl-5 buildings-posts">
                    {PROPERTIES.map((property, index) => (
                        <Link key={index} className="col buildings-posts__card" href={property.link}>
                            <figure className="mb-0 buildings-posts__card--img">
                                <img
                                    className="img-fluid"
                                    src={property.image}
                                    alt={property.title}
                                />
                                <div className="text-wrap">
                                    <h6 className="text-wrap__title">{property.title}</h6>
                                    {property.description && (
                                        <p className="text-wrap__desc">{property.description}</p>
                                    )}
                                </div>
                            </figure>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
};
