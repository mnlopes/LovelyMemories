import { getLegacyBody } from '@/lib/legacy';
import { GuestSelectorWrapper } from '@/components/GuestSelectorWrapper';
import { DateSelectorWrapper } from '@/components/DateSelectorWrapper';
import { OwnerParallax } from '@/components/OwnerParallax';
import { PropertyOwnerSection } from '@/components/PropertyOwnerSection';
import { Concierge } from '@/components/Concierge';

export default function Home() {
    const content = getLegacyBody('home') || '';
    const parts = content.split('<!-- CONCIERGE_SLOT -->');
    const topContent = parts[0] || '';
    const bottomContent = parts[1] || '';

    return (
        <main className="relative">
            {/* Wrapper Global para o Legado */}
            <div className="main-content-wrap">
                <div className="single-page single-home">
                    {/* Parte Superior */}
                    <div
                        className="legacy-content-wrapper"
                        dangerouslySetInnerHTML={{ __html: topContent }}
                        suppressHydrationWarning={true}
                    />

                    {/* Componente Concierge React Funcional (In-Place) */}
                    <Concierge />

                    {/* Parte Inferior */}
                    {bottomContent && (
                        <div
                            className="legacy-content-wrapper"
                            dangerouslySetInnerHTML={{ __html: bottomContent }}
                            suppressHydrationWarning={true}
                        />
                    )}
                </div>
            </div>

            {/* Componentes Cliente para Interatividade Híbrida */}
            <GuestSelectorWrapper />
            <DateSelectorWrapper />
            <OwnerParallax />
        </main>
    );
}
