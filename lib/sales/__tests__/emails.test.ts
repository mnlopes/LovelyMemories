import { test } from 'node:test';
import assert from 'node:assert/strict';
import { saleInquiryTeamEmail, saleInquiryBuyerEmail, type InquiryEmailData } from '../emails';

const base: InquiryEmailData = {
    kind: 'visit',
    name: '<img src=x onerror=alert(1)>',
    email: 'buyer@example.com',
    phone: '+351 912 345 678',
    purpose: 'live',
    message: '<script>x</script>',
    visitTimes: 'Sábado de manhã',
    listingTitle: 'A & B',
    reference: 'LM-V-0001',
    listingUrl: 'https://www.lovelymemories.pt/en/for-sale/a-b',
};

test('team email escapes every user-controlled field', () => {
    const { html } = saleInquiryTeamEmail(base);
    assert.ok(!html.includes('<img'));
    assert.ok(!html.includes('<script'));
    assert.ok(!html.includes('& B'));
    assert.ok(html.includes('&lt;img'));
    assert.ok(html.includes('&amp; B'));
});

test('buyer email escapes the listing title', () => {
    for (const locale of ['pt', 'en'] as const) {
        const { html } = saleInquiryBuyerEmail({ ...base, listingTitle: 'A & <b>B</b>' }, locale);
        assert.ok(!html.includes('<b>B'));
        assert.ok(html.includes('A &amp; &lt;b&gt;B'));
    }
});

test('buyer email contains no user-supplied text', () => {
    const d = { ...base, name: 'Ana Silva', message: 'Mensagem privada', visitTimes: 'Sabado' };
    for (const locale of ['pt', 'en'] as const) {
        const { html } = saleInquiryBuyerEmail(d, locale);
        assert.ok(!html.includes('Ana'));
        assert.ok(!html.includes(d.phone!));
        assert.ok(!html.includes(d.message));
        assert.ok(!html.includes('Sabado'));
        assert.ok(!html.includes(d.email));
    }
});

test('team email subject depends on kind', () => {
    const visit = saleInquiryTeamEmail({ ...base, kind: 'visit' }).subject;
    const info = saleInquiryTeamEmail({ ...base, kind: 'info' }).subject;
    assert.equal(visit, '🏡 PEDIDO DE VISITA: [Ref: LM-V-0001] - A & B');
    assert.equal(info, '🏡 PEDIDO DE INFORMAÇÃO: [Ref: LM-V-0001] - A & B');
});

test('buyer email in pt confirms the request without phone or message', () => {
    const d = { ...base, name: 'Ana', message: 'Mensagem privada do comprador' };
    const { subject, html } = saleInquiryBuyerEmail(d, 'pt');
    assert.equal(subject, 'Lovely Memories | Recebemos o seu pedido [Ref: LM-V-0001]');
    assert.ok(html.includes('Recebemos o seu pedido'));
    assert.ok(!html.includes(d.phone!));
    assert.ok(!html.includes(d.message));
    assert.ok(html.includes('LM-V-0001'));
});

test('buyer email in en has the english subject and no phone or message', () => {
    const d = { ...base, name: 'Ana', message: 'Private buyer message' };
    const { subject, html } = saleInquiryBuyerEmail(d, 'en');
    assert.equal(subject, 'Lovely Memories | We received your request [Ref: LM-V-0001]');
    assert.ok(!html.includes(d.phone!));
    assert.ok(!html.includes(d.message));
});
