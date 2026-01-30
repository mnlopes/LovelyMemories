import React from 'react';
import ContactInfo from './ContactInfo';
import PropertyEstimateForm from './PropertyEstimateForm';
import ContactMap from './ContactMap';

export default function ContactContent() {
    return (
        <section className="pt-40 lg:pt-48 bg-white relative">
            <div className="container mx-auto px-4 relative z-10">
                <div className="flex flex-col lg:flex-row gap-12 lg:gap-24 justify-center items-start max-w-7xl mx-auto mb-10 relative">
                    {/* Left Column: Info */}
                    <div className="w-full lg:flex-1">
                        <ContactInfo />
                    </div>

                    {/* Right Column: Estimate Form */}
                    <div className="w-full lg:w-auto lg:shrink-0 flex justify-center lg:block relative z-20">
                        <PropertyEstimateForm />
                    </div>
                </div>
            </div>

            {/* Full Width Map - Bleeds to edges and touches footer */}
            <div className="w-full -mt-24 lg:-mt-48 relative z-0">
                <ContactMap />
            </div>
        </section>
    );
}
