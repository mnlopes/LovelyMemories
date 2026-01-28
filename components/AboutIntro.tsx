"use client";

import React from 'react';
import { useTranslations } from "next-intl";

export const AboutIntro = () => {
    const t = useTranslations('AboutIntro');
    return (
        <section className="py-24 bg-white">
            <div className="container mx-auto px-4 max-w-4xl text-center">
                <div className="space-y-8 text-[#696969] text-lg md:text-xl font-light leading-relaxed">
                    <h6 className="m-0">
                        {t('p1')}
                    </h6>
                    <h6 className="m-0">
                        {t('p2')}
                    </h6>
                </div>
            </div>
        </section>
    );
};
