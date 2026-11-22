import { escapeHtml } from '../email-templates';

export type InquiryEmailData = {
    kind: 'info' | 'visit';
    name: string;
    email: string;
    phone?: string;
    purpose: 'live' | 'invest' | 'both';
    message: string;
    visitTimes?: string;
    listingTitle: string;
    reference: string;
    listingUrl: string;
};

const PURPOSE_PT: Record<InquiryEmailData['purpose'], string> = {
    live: 'Viver',
    invest: 'Investir',
    both: 'Viver e investir',
};

const WRAPPER_OPEN = `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">`;

const header = (title: string) => `
    <div style="background-color: #0A1128; padding: 30px; text-align: center;">
        <h2 style="color: #B08D4A; margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 1px;">${title}</h2>
    </div>`;

/** Email to the team. Portuguese only: the team works in Portuguese. */
export function saleInquiryTeamEmail(d: InquiryEmailData): { subject: string; html: string } {
    const isVisit = d.kind === 'visit';
    const label = isVisit ? 'PEDIDO DE VISITA' : 'PEDIDO DE INFORMAÇÃO';
    const subject = `🏡 ${label}: [Ref: ${d.reference}] - ${d.listingTitle}`;

    const row = (name: string, value: string) =>
        `<p style="margin: 5px 0;"><strong>${name}:</strong> ${value}</p>`;
    const url = escapeHtml(d.listingUrl);

    const html = `
${WRAPPER_OPEN}${header(`🏡 ${label}`)}
    <div style="padding: 30px; color: #333; line-height: 1.6;">
        <h3 style="color: #0A1128; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px; margin-bottom: 20px;">Imóvel</h3>
        ${row('Anúncio', escapeHtml(d.listingTitle))}
        ${row('Referência', escapeHtml(d.reference))}
        <p style="margin: 5px 0;"><strong>Ligação:</strong> <a href="${url}" style="color: #B08D4A;">${url}</a></p>

        <h3 style="color: #0A1128; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px; margin-top: 30px; margin-bottom: 20px;">Contacto</h3>
        ${row('Tipo de pedido', escapeHtml(isVisit ? 'Marcar visita' : 'Pedir informação'))}
        ${row('Nome', escapeHtml(d.name))}
        ${row('Email', escapeHtml(d.email))}
        ${d.phone ? row('Telefone', escapeHtml(d.phone)) : ''}
        ${row('Objetivo', escapeHtml(PURPOSE_PT[d.purpose] ?? d.purpose))}
        ${d.visitTimes ? row('Datas e horas que dão jeito', escapeHtml(d.visitTimes)) : ''}

        <div style="margin-top: 25px; background: #f9f9f9; padding: 15px; border-radius: 8px; border-left: 4px solid #B08D4A;">
            <p style="margin: 0; font-weight: bold; font-size: 12px; text-transform: uppercase; color: #999;">Mensagem:</p>
            <p style="margin: 5px 0 0 0; white-space: pre-wrap;">${escapeHtml(d.message)}</p>
        </div>

        <p style="font-size: 12px; color: #999; margin-top: 25px;">Basta responder a este email: a resposta vai para o comprador.</p>
    </div>
</div>
`;
    return { subject, html };
}

/** Short confirmation to the buyer. No user-supplied text at all (name, phone, message): only DB data. */
export function saleInquiryBuyerEmail(
    d: InquiryEmailData,
    locale: 'en' | 'pt',
): { subject: string; html: string } {
    const isEn = locale === 'en';
    const c = isEn
        ? {
              subject: `Lovely Memories | We received your request [Ref: ${d.reference}]`,
              title: 'We received your request',
              hello: 'Hello',
              body: 'Thank you for your interest in',
              ref: 'Reference',
              soon: "We'll get back to you shortly.",
              sign: 'The Lovely Memories team',
          }
        : {
              subject: `Lovely Memories | Recebemos o seu pedido [Ref: ${d.reference}]`,
              title: 'Recebemos o seu pedido',
              hello: 'Olá',
              body: 'Obrigado pelo seu interesse em',
              ref: 'Referência',
              soon: 'Respondemos em breve.',
              sign: 'A equipa Lovely Memories',
          };

    const html = `
${WRAPPER_OPEN}${header(c.title)}
    <div style="padding: 30px; color: #333; line-height: 1.6;">
        <p>${c.hello},</p>
        <p>${c.body} <strong>${escapeHtml(d.listingTitle)}</strong>.</p>
        <p style="margin: 5px 0;"><strong>${c.ref}:</strong> ${escapeHtml(d.reference)}</p>
        <p>${c.soon}</p>
        <p style="margin-top: 25px;">${c.sign}</p>
    </div>
</div>
`;
    return { subject: c.subject, html };
}
