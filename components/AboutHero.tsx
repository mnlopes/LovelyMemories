import { useTranslations } from "next-intl";

export const AboutHero = () => {
    const t = useTranslations('AboutHero');
    return (
        <section className="relative h-[60vh] flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0">
                <img
                    src="/legacy/about-us/images/about-feature.png"
                    alt="About Us"
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40" />
            </div>
            <div className="relative z-10 text-center px-4">
                <h1 className="text-white font-bold text-4xl md:text-6xl leading-tight drop-shadow-lg">
                    {t.rich('title', {
                        br: () => <br />
                    })}
                </h1>
            </div>
        </section>
    );
};
