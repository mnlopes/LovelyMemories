import { useTranslations } from 'next-intl';

export default function ContactInfo() {
    const t = useTranslations('Contact');

    return (
        <div className="flex flex-col items-start gap-12 max-w-lg">
            {/* Title */}
            <div>
                <h1 className="text-4xl md:text-5xl font-bold text-navy-950 mb-6">
                    {t('title')}
                </h1>
                <div className="text-navy-900/80 space-y-6 leading-relaxed">
                    <p>
                        {t('description1')}
                    </p>
                    <p>
                        {t('description2')}
                    </p>
                </div>
            </div>

            {/* Details List */}
            <ul className="space-y-8 w-full pl-2">
                {/* Location */}
                <li className="flex items-start gap-5">
                    <figure className="shrink-0 w-5 md:w-6 opacity-60">
                        <img
                            src="/legacy/contact/images/Group-6.svg"
                            alt="Location"
                            className="w-full h-auto"
                        />
                    </figure>
                    <div className="text-navy-900 pt-0.5 text-base font-light">
                        <p>Rua Dom Manuel II, 98</p>
                        <p>4050-302 Porto / Portugal</p>
                    </div>
                </li>

                {/* Phones */}
                <li className="flex items-start gap-5">
                    <figure className="shrink-0 w-5 md:w-6 opacity-60">
                        <img
                            src="/legacy/contact/images/Group-4.svg"
                            alt="Phone"
                            className="w-full h-auto"
                        />
                    </figure>
                    <div className="text-navy-900 pt-0.5 text-base font-light">
                        <p className="mb-1">
                            <span className="font-semibold text-navy-950">Achilleas</span> <a href="tel:+351932734633" className="hover:text-[#B09E80] transition-colors">+351 932 734 633</a>
                        </p>
                        <p>
                            <span className="font-semibold text-navy-950">Joao</span> <a href="tel:+351932473600" className="hover:text-[#B09E80] transition-colors">+351 932 473 600</a>
                        </p>
                    </div>
                </li>

                {/* Email */}
                <li className="flex items-start gap-5">
                    <figure className="shrink-0 w-5 md:w-6 opacity-60">
                        <img
                            src="/legacy/contact/images/Group-mail.svg"
                            alt="Email"
                            className="w-full h-auto"
                        />
                    </figure>
                    <div className="text-navy-900 pt-1 text-base font-light">
                        <a href="mailto:achilleas@lovelymemories.pt" className="hover:text-[#B09E80] transition-colors border-b border-transparent hover:border-[#B09E80]">
                            achilleas@lovelymemories.pt
                        </a>
                    </div>
                </li>
            </ul>

        </div>
    );
}
