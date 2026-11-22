import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computePerformance, type PerfReservation } from '../performance';

const TODAY = '2026-11-20';

function res(over: Partial<PerfReservation> & { check_in: string; check_out: string }): PerfReservation {
    return {
        status: 'confirmed',
        platform: null,
        import_batch_id: null,
        net_amount: null,
        total_price: 100,
        city_tax_total: 0,
        breakfast_total: 0,
        transfer_total: 0,
        ...over,
    };
}

const opts = { today: TODAY, price: 500000, priceOnRequest: false };

test('sem linhas devolve null', () => {
    assert.equal(computePerformance([], opts), null);
});

test('só linhas canceladas devolve null', () => {
    const rows = [res({ check_in: '2026-03-01', check_out: '2026-03-04', status: 'cancelled' })];
    assert.equal(computePerformance(rows, opts), null);
});

test('só estadias futuras devolve null', () => {
    const rows = [res({ check_in: '2026-12-01', check_out: '2026-12-04' })];
    assert.equal(computePerformance(rows, opts), null);
});

test('ano inteiro só com reservas do site', () => {
    const rows = [
        res({ check_in: '2025-11-20', check_out: '2025-11-30', total_price: 1000 }),
        res({ check_in: '2026-03-01', check_out: '2026-03-11', total_price: 2000 }),
        res({ check_in: '2026-09-01', check_out: '2026-09-06', total_price: 500 }),
    ];
    const s = computePerformance(rows, opts)!;
    assert.equal(s.windowEnd, '2026-11-20');
    assert.equal(s.windowStart, '2025-11-20');
    assert.equal(s.days, 365);
    assert.equal(s.fullYear, true);
    assert.equal(s.eligible, true);
    assert.equal(s.staleDays, 0);
    assert.equal(s.revenue, 3500);
    assert.equal(s.occupancy, 25 / 365);
    assert.equal(s.grossYield, s.revenue / 500000);
});

test('a mesma estadia como reserva do site e importada conta as noites uma vez', () => {
    const rows = [
        res({ check_in: '2025-11-20', check_out: '2025-11-21' }),
        res({ check_in: '2026-03-01', check_out: '2026-03-06' }),
        res({ check_in: '2026-03-03', check_out: '2026-03-08', platform: 'airbnb', import_batch_id: 'b1', net_amount: 200 }),
    ];
    // noites: 1 + (1..5 mar) + (3..7 mar) = 1 + 7 distintas; o Airbnb acaba em 2026-03-08 -> janela acaba aí
    const s = computePerformance(rows, opts)!;
    assert.equal(s.windowEnd, '2026-03-08');
    assert.equal(s.days, 108);
    assert.equal(s.occupancy, 8 / 108);
});

test('estadia que começa antes da janela só conta as noites dentro e sem receita', () => {
    const rows = [
        res({ check_in: '2025-11-18', check_out: '2025-11-23', total_price: 900 }),
        res({ check_in: '2026-02-01', check_out: '2026-02-03', total_price: 100 }),
    ];
    // windowStart = max(2025-11-20, 2025-11-18) = 2025-11-20; noites dentro: 20, 21, 22 nov = 3
    const s = computePerformance(rows, opts)!;
    assert.equal(s.windowStart, '2025-11-20');
    assert.equal(s.days, 365);
    assert.equal(s.occupancy, 5 / 365);
    assert.equal(s.revenue, 100);
});

test('última estadia do Airbnb importada antes de hoje recua a janela', () => {
    const rows = [
        res({ check_in: '2025-10-01', check_out: '2025-10-05' }),
        res({ check_in: '2026-10-08', check_out: '2026-10-12', platform: 'airbnb', import_batch_id: 'b1', net_amount: 400 }),
    ];
    const s = computePerformance(rows, opts)!;
    assert.equal(s.windowEnd, '2026-10-12');
    assert.equal(s.staleDays, 39);
});

test('airbnb sem import_batch_id não conta para a data dos dados', () => {
    const rows = [
        res({ check_in: '2026-05-01', check_out: '2026-05-04' }),
        res({ check_in: '2026-10-08', check_out: '2026-10-12', platform: 'airbnb', import_batch_id: null }),
    ];
    const s = computePerformance(rows, opts)!;
    assert.equal(s.windowEnd, '2026-11-20');
});

test('Airbnb com check-out depois de hoje não avança a janela', () => {
    const rows = [
        res({ check_in: '2026-05-01', check_out: '2026-05-04' }),
        res({ check_in: '2026-11-25', check_out: '2026-12-02', platform: 'airbnb', import_batch_id: 'b1', net_amount: 400 }),
    ];
    const s = computePerformance(rows, opts)!;
    assert.equal(s.windowEnd, '2026-11-20');
    assert.equal(s.staleDays, 0);
});

test('primeira estadia em 2026-06-01 dá historial curto elegível', () => {
    const rows = [res({ check_in: '2026-06-01', check_out: '2026-06-05' })];
    const s = computePerformance(rows, opts)!;
    assert.equal(s.windowStart, '2026-06-01');
    assert.equal(s.fullYear, false);
    assert.equal(s.grossYield, null);
    assert.equal(s.eligible, true);
});

test('primeira estadia em 2026-10-01 (50 dias) não é elegível', () => {
    const rows = [res({ check_in: '2026-10-01', check_out: '2026-10-03' })];
    const s = computePerformance(rows, opts)!;
    assert.equal(s.days, 50);
    assert.equal(s.eligible, false);
});

test('preço sob consulta ou sem preço não dá rentabilidade', () => {
    const rows = [res({ check_in: '2025-11-20', check_out: '2025-11-25' })];
    assert.equal(computePerformance(rows, { ...opts, priceOnRequest: true })!.grossYield, null);
    assert.equal(computePerformance(rows, { ...opts, price: null })!.grossYield, null);
    assert.equal(computePerformance(rows, { ...opts, price: 0 })!.grossYield, null);
});

test('net_amount 300 com total_price 400 conta 300', () => {
    const rows = [res({ check_in: '2026-06-01', check_out: '2026-06-03', net_amount: 300, total_price: 400 })];
    assert.equal(computePerformance(rows, opts)!.revenue, 300);
});

test('historial mais antigo do que as linhas carregadas: ano inteiro com rentabilidade', () => {
    // Só chegam as estadias do último ano; a primeira estadia da casa foi há dois anos.
    const rows = [
        res({ check_in: '2026-03-01', check_out: '2026-03-11', total_price: 2000 }),
        res({ check_in: '2026-08-01', check_out: '2026-08-06', total_price: 1000 }),
    ];
    const s = computePerformance(rows, { ...opts, firstCheckIn: '2024-11-01', lastImportedCheckOut: null })!;
    assert.equal(s.windowStart, '2025-11-20');
    assert.equal(s.windowEnd, '2026-11-20');
    assert.equal(s.days, 365);
    assert.equal(s.fullYear, true);
    assert.equal(s.revenue, 3000);
    assert.equal(s.grossYield, 3000 / 500000);
});

test('casa fechada no inverno: a janela continua a ter 365 dias', () => {
    // Sem estadias nos primeiros meses da janela, mas a casa tem historial mais antigo.
    const rows = [
        res({ check_in: '2026-04-01', check_out: '2026-04-11' }),
        res({ check_in: '2026-07-01', check_out: '2026-07-21' }),
    ];
    const s = computePerformance(rows, { ...opts, firstCheckIn: '2023-05-01', lastImportedCheckOut: null })!;
    assert.equal(s.windowStart, '2025-11-20');
    assert.equal(s.days, 365);
    assert.equal(s.fullYear, true);
    assert.equal(s.occupancy, 30 / 365);
});

test('última importação do Airbnb com mais de 400 dias: a janela acaba aí e fica desatualizada', () => {
    const rows = [
        res({ check_in: '2024-09-01', check_out: '2024-09-11', total_price: 1500 }),
        res({ check_in: '2025-05-01', check_out: '2025-05-06', total_price: 800 }),
        res({ check_in: '2026-08-01', check_out: '2026-08-04', total_price: 600 }), // depois da data dos dados
    ];
    const s = computePerformance(rows, { ...opts, firstCheckIn: '2024-01-10', lastImportedCheckOut: '2025-06-30' })!;
    assert.equal(s.windowEnd, '2025-06-30');
    assert.equal(s.windowStart, '2024-06-30');
    assert.equal(s.days, 365);
    assert.equal(s.staleDays, 508);
    assert.equal(s.revenue, 2300);
    assert.equal(s.occupancy, 15 / 365);
});
