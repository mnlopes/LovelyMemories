
import { calculateReservationPrice, verifyAvailability } from '../lib/pricing';

async function runTests() {
    console.log('=== INICIANDO TESTES DO MOTOR DE PREÇOS ===\n');

    // ID de uma propriedade de teste (usaremos o slug como referência se necessário, mas o motor usa ID)
    // Para teste, podemos usar um ID fictício ou buscar um real.
    const propertyId = 'rdm-ii'; // Note: Ajustar para um ID real se necessário

    const scenarios = [
        {
            name: 'Reserva Standard (3 noites)',
            checkIn: new Date('2026-05-10'),
            checkOut: new Date('2026-05-13'),
            expectedDiscount: 0
        },
        {
            name: 'Reserva Semanal (7 noites - 5% desc)',
            checkIn: new Date('2026-06-01'),
            checkOut: new Date('2026-06-08'),
            expectedDiscount: 5
        },
        {
            name: 'Reserva Mensal (28 noites - 15% desc)',
            checkIn: new Date('2026-07-01'),
            checkOut: new Date('2026-07-29'),
            expectedDiscount: 15
        },
        {
            name: 'Reserva Inválida (Meia-noite / Hoje)',
            checkIn: new Date(),
            checkOut: new Date(new Date().getTime() + 86400000),
            expectedError: true
        }
    ];

    for (const s of scenarios) {
        console.log(`Cenário: ${s.name}`);

        if (s.expectedError) {
            const avail = await verifyAvailability(propertyId, s.checkIn, s.checkOut);
            console.log(avail.available ? '❌ ERRO: Deveria ter bloqueado' : `✅ BLOQUEADO: ${avail.error}`);
        } else {
            const pricing = await calculateReservationPrice({
                propertyId,
                checkIn: s.checkIn,
                checkOut: s.checkOut
            });

            if ('error' in pricing) {
                console.log(`❌ ERRO: ${pricing.error}`);
            } else {
                console.log(`- Noites: ${pricing.nights}`);
                console.log(`- Preço Base: €${pricing.basePrice}`);
                console.log(`- Desconto: ${pricing.discountPercent}% (€${pricing.discountAmount})`);
                console.log(`- Taxa Limpeza: €${pricing.cleaningFee}`);
                console.log(`- TOTAL: €${pricing.totalPrice}`);

                if (pricing.discountPercent === s.expectedDiscount) {
                    console.log('✅ TESTE PASSOU');
                } else {
                    console.log(`❌ FALHOU: Esperava ${s.expectedDiscount}% mas obteve ${pricing.discountPercent}%`);
                }
            }
        }
        console.log('------------------------------');
    }
}

runTests().catch(console.error);
