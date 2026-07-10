/**
 * Simple HTML templates for emails.
 * These follow the brand style: Dark Navy (#0A1128) and Gold (#B08D4A).
 */

/**
 * Escape user-controlled values before interpolating them into email HTML.
 * Email clients don't execute JS, but this prevents broken markup and HTML-injection
 * tricks (e.g. a crafted full_name closing a tag) from a value that originates in the DB.
 */
const escapeHtml = (value: unknown): string =>
    String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

export const adminLeadEmail = (data: any) => `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
    <div style="background-color: #0A1128; padding: 30px; text-align: center;">
        <h1 style="color: #B08D4A; margin: 0; font-size: 24px;">New Property Owner Lead</h1>
    </div>
    <div style="padding: 30px; color: #333; line-height: 1.6;">
        <p>You have received a new evaluation / contact request from the website.</p>
        
        <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Name:</strong> ${escapeHtml(data.fullName)}</p>
            <p><strong>Email:</strong> ${escapeHtml(data.email)}</p>
            <p><strong>Phone:</strong> ${escapeHtml(data.phoneNumber)}</p>
            <p><strong>Typology:</strong> ${escapeHtml(data.typology)}</p>
            <p><strong>Extra Perks:</strong> ${escapeHtml(data.perks)}</p>
            <p><strong>Location:</strong> ${escapeHtml(data.location)}</p>
            ${data.plan ? `<p><strong>Selected Plan:</strong> ${data.plan.toUpperCase()}</p>` : ''}
            ${data.numProperties ? `<p><strong>Number of Properties:</strong> ${data.numProperties}</p>` : ''}
        </div>
        
        <p style="font-size: 12px; color: #999;">Este email foi enviado automaticamente pelo formulário do Revenue Report da pagina Owner.</p>
    </div>
</div>
`;

export const adminContactEmail = (data: any) => `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
    <div style="background-color: #0A1128; padding: 30px; text-align: center;">
        <h1 style="color: #B08D4A; margin: 0; font-size: 24px;">New General Contact</h1>
    </div>
    <div style="padding: 30px; color: #333; line-height: 1.6;">
        <p>You have received a new contact request from the website.</p>
        
        <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Email:</strong> ${escapeHtml(data.email)}</p>
            ${data.fullName ? `<p><strong>Name:</strong> ${escapeHtml(data.fullName)}</p>` : ''}
            <p><strong>Location:</strong> ${escapeHtml(data.location || 'N/A')}</p>
            ${data.bedrooms ? `<p><strong>Typology (Bedrooms):</strong> ${escapeHtml(data.bedrooms)}</p>` : ''}
            ${data.message ? `<div style="margin-top: 15px; border-top: 1px solid #ddd; padding-top: 10px;"><strong>Message:</strong><br/>${escapeHtml(data.message)}</div>` : ''}
        </div>
        
        <p style="font-size: 12px; color: #999;">This email was sent via the website contact form.</p>
    </div>
</div>
`;

export const bookingAdminEmail = (data: any) => `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
    <div style="background-color: #0A1128; padding: 30px; text-align: center;">
        <h2 style="color: #B08D4A; margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 1px;">✨ Nova Reserva: ${data.reference_id}</h2>
    </div>
    <div style="padding: 30px; color: #333; line-height: 1.6;">
        <h3 style="color: #0A1128; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px; margin-bottom: 20px;">Detalhes do Cliente</h3>
        <p style="margin: 5px 0;"><strong>Hóspede:</strong> ${escapeHtml(data.guest_name)}</p>
        <p style="margin: 5px 0;"><strong>Email:</strong> ${escapeHtml(data.guest_email)}</p>
        <p style="margin: 5px 0;"><strong>Telefone:</strong> ${escapeHtml(data.guest_phone)}</p>
        
        <h3 style="color: #0A1128; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px; margin-top: 30px; margin-bottom: 20px;">Detalhes da Reserva</h3>
        <p style="margin: 5px 0;"><strong>Propriedade:</strong> ${escapeHtml(data.property_title)}</p>
        <p style="margin: 5px 0;"><strong>Datas:</strong> ${data.check_in} a ${data.check_out}</p>
        <p style="margin: 5px 0;"><strong>Hóspedes:</strong> ${data.adults} adultos, ${data.children} crianças, ${data.infants} bebés</p>
        ${data.extra_guests && data.extra_guests.length > 0 ? `<p style="margin: 5px 0;"><strong>Hóspedes Adicionais:</strong> ${escapeHtml(data.extra_guests.join(', '))}</p>` : ''}
        ${data.arrival_time ? `<p style="margin: 5px 0;"><strong>Hora de Chegada Estimada:</strong> ${escapeHtml(data.arrival_time)}</p>` : ''}
        
        <div style="background: #fdfaf5; border: 1px solid #f0e6d2; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; font-weight: bold; color: #B08D4A;">Detalhamento de Custos:</p>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr><td style="padding: 4px 0;">Estadia:</td><td style="text-align: right; padding: 4px 0;">€${data.base_price}</td></tr>
                <tr><td style="padding: 4px 0;">Limpeza:</td><td style="text-align: right; padding: 4px 0;">€${data.cleaning_fee}</td></tr>
                ${data.breakfast_total > 0 ? `<tr><td style="padding: 4px 0;">Pequeno Almoço:</td><td style="text-align: right; padding: 4px 0;">€${data.breakfast_total}</td></tr>` : ''}
                ${data.transfer_total > 0 ? `<tr><td style="padding: 4px 0;">Transfer:</td><td style="text-align: right; padding: 4px 0;">€${data.transfer_total}</td></tr>` : ''}
                <tr style="border-top: 1px solid #e0e0e0;"><td style="padding: 8px 0; font-weight: bold;">Total:</td><td style="text-align: right; padding: 8px 0; font-weight: bold; font-size: 18px; color: #0A1128;">€${data.total_price}</td></tr>
            </table>
        </div>

        <p style="margin: 5px 0;"><strong>Método de Pagamento:</strong> ${data.payment_method === 'wire' ? 'Transferência Bancária' : data.payment_method}</p>
        
        ${data.billing_address ? `
        <h3 style="color: #0A1128; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px; margin-top: 30px; margin-bottom: 20px;">Dados de Faturação</h3>
        <p style="margin: 5px 0; font-size: 14px;">
            ${escapeHtml(data.guest_name)}<br/>
            ${escapeHtml(data.billing_address)}<br/>
            ${escapeHtml(data.billing_zip)} ${escapeHtml(data.billing_city)}<br/>
            ${escapeHtml(data.billing_country)}
            ${data.billing_vat ? `<br/><strong>NIF:</strong> ${escapeHtml(data.billing_vat)}` : ''}
        </p>
        ` : ''}

        ${data.special_requests ? `
        <div style="margin-top: 25px; background: #f9f9f9; padding: 15px; border-radius: 8px; border-left: 4px solid #B08D4A;">
            <p style="margin: 0; font-weight: bold; font-size: 12px; text-transform: uppercase; color: #999;">Observações:</p>
            <p style="margin: 5px 0 0 0; font-style: italic;">"${escapeHtml(data.special_requests)}"</p>
        </div>
        ` : ''}
    </div>
</div>
`;

export const bookingGuestConfirmationEmail = (data: any, locale: string = 'pt') => {
    const isEn = locale === 'en';
    
    const content = {
        title: isEn ? "Thank you for your reservation!" : "Obrigado pela sua reserva!",
        greeting: isEn ? "Hello" : "Olá",
        reception: isEn ? `We have received your reservation request for the property` : `Confirmamos a receção do seu pedido de reserva para a propriedade`,
        nextStepsTitle: isEn ? "Next Steps: Payment" : "Próximos Passos: Pagamento",
        nextStepsDesc: isEn ? "To definitively confirm your reservation, please make the payment via bank transfer:" : "Para confirmar definitivamente a sua reserva, por favor realize o pagamento através de transferência bancária:",
        proofText: isEn ? "Please send the proof of payment to" : "Por favor envie o comprovativo para",
        stayDetails: isEn ? "Stay Details" : "Detalhes da Estada",
        property: isEn ? "Property" : "Imóvel",
        guests: isEn ? "Guests" : "Hóspedes",
        extraGuests: isEn ? "Additional Guests" : "Hóspedes Adicionais",
        adults: isEn ? "adults" : "adultos",
        children: isEn ? "children" : "crianças",
        infants: isEn ? "infants" : "bebés",
        arrival: isEn ? "Estimated Arrival" : "Chegada Estimada",
        footer: isEn ? "See you soon," : "Até breve,",
        team: isEn ? "Lovely Memories Team" : "Equipa Lovely Memories"
    };

    return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #0A1128; padding: 40px; text-align: center;">
            <h1 style="color: #B08D4A; margin: 0; font-size: 28px; letter-spacing: 2px;">LOVELY MEMORIES</h1>
            <h2 style="color: #fff; font-weight: 300; margin-top: 10px; font-size: 18px;">${content.title}</h2>
        </div>
        <div style="padding: 40px; color: #333; line-height: 1.6;">
            <p>${content.greeting} <strong>${escapeHtml(data.guest_name)}</strong>,</p>
            <p>${content.reception} <strong style="color: #B08D4A;">${data.property_title}</strong>.</p>
            
            <div style="border: 1px solid #B08D4A; border-radius: 16px; padding: 30px; margin: 30px 0; background-color: #fdfaf5;">
                <h3 style="margin-top: 0; color: #0A1128; font-size: 18px;">${content.nextStepsTitle}</h3>
                <p style="font-size: 14px;">${content.nextStepsDesc}</p>
                <div style="background: white; padding: 20px; border-radius: 12px; border: 1px solid #f0e6d2; margin: 15px 0;">
                    <p style="margin: 5px 0; font-size: 14px;"><strong>IBAN:</strong> PT50 0007 0000 0849 4629 1132 3</p>
                    <p style="margin: 5px 0; font-size: 14px;"><strong>SWIFT/BIC:</strong> BESC PTPL</p>
                    <p style="margin: 5px 0; font-size: 14px;"><strong>${isEn ? 'Amount' : 'Valor'}:</strong> €${data.total_price}</p>
                    <p style="margin: 5px 0; font-size: 14px;"><strong>${isEn ? 'Reference' : 'Referência'}:</strong> ${data.reference_id}</p>
                </div>
                <p style="font-size: 12px; color: #8a6d3b; margin-top: 10px;">${content.proofText} <a href="mailto:joao@lovelymemories.pt" style="color: #B08D4A; text-decoration: none; font-weight: bold;">joao@lovelymemories.pt</a></p>
            </div>

            <h3 style="color: #0A1128; margin-bottom: 15px;">${content.stayDetails}</h3>
            <table style="width: 100%; font-size: 14px;">
                <tr><td style="padding: 5px 0; color: #999;">${content.property}:</td><td style="padding: 5px 0; font-weight: bold;">${data.property_title}</td></tr>
                <tr><td style="padding: 5px 0; color: #999;">Check-in:</td><td style="padding: 5px 0;">${data.check_in}</td></tr>
                <tr><td style="padding: 5px 0; color: #999;">Check-out:</td><td style="padding: 5px 0;">${data.check_out}</td></tr>
                <tr><td style="padding: 5px 0; color: #999;">${content.guests}:</td><td style="padding: 5px 0;">${data.adults} ${content.adults}, ${data.children} ${content.children}, ${data.infants} ${content.infants}</td></tr>
                ${data.extra_guests && data.extra_guests.length > 0 ? `<tr><td style="padding: 5px 0; color: #999;">${content.extraGuests}:</td><td style="padding: 5px 0;">${data.extra_guests.join(', ')}</td></tr>` : ''}
                ${data.arrival_time ? `<tr><td style="padding: 5px 0; color: #999;">${content.arrival}:</td><td style="padding: 5px 0;">${data.arrival_time}</td></tr>` : ''}
            </table>
            
            <p style="margin-top: 40px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px;">
                ${content.footer}<br/>
                <strong>${content.team}</strong><br/>
                <span style="font-style: italic;">Creating moments that last.</span>
            </p>
        </div>
    </div>
    `;
};

export const bookingGuestPaidEmail = (data: any, locale: string = 'pt') => {
    const isEn = locale === 'en';
    
    const content = {
        title: isEn ? "Payment Confirmed!" : "Pagamento Confirmado!",
        greeting: isEn ? "Hello" : "Olá",
        confirmation: isEn ? `We confirm that your payment of <strong style="color: #B08D4A;">€${data.total_price}</strong> has been successfully processed.` : `Confirmamos que o seu pagamento de <strong style="color: #B08D4A;">€${data.total_price}</strong> foi processado com sucesso.`,
        guaranteed: isEn ? `Your reservation for the property <strong style="color: #B08D4A;">${data.property_title}</strong> is now guaranteed and confirmed! ✨` : `A sua reserva para a propriedade <strong style="color: #B08D4A;">${data.property_title}</strong> está agora garantida e confirmada! ✨`,
        reference: isEn ? "Booking Reference" : "Referência da Reserva",
        stayDetails: isEn ? "Stay Details" : "Detalhes da Estada",
        property: isEn ? "Property" : "Imóvel",
        guests: isEn ? "Guests" : "Hóspedes",
        extraGuests: isEn ? "Additional Guests" : "Hóspedes Adicionais",
        adults: isEn ? "adults" : "adultos",
        children: isEn ? "children" : "crianças",
        infants: isEn ? "infants" : "bebés",
        arrival: isEn ? "Estimated Arrival" : "Chegada Estimada",
        footer: isEn ? "We look forward to your visit," : "Aguardamos a sua visita,",
        team: isEn ? "Lovely Memories Team" : "Equipa Lovely Memories"
    };

    return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #0A1128; padding: 40px; text-align: center;">
            <h1 style="color: #B08D4A; margin: 0; font-size: 28px; letter-spacing: 2px;">LOVELY MEMORIES</h1>
            <h2 style="color: #fff; font-weight: 300; margin-top: 10px; font-size: 18px;">${content.title}</h2>
        </div>
        <div style="padding: 40px; color: #333; line-height: 1.6;">
            <p>${content.greeting} <strong>${escapeHtml(data.guest_name)}</strong>,</p>
            <p>${content.confirmation}</p>
            <p>${content.guaranteed}</p>
            
            <div style="border: 1px solid #2d8653; border-radius: 16px; padding: 25px; margin: 30px 0; background-color: #f6fdf9; text-align: center;">
                <p style="margin: 0; color: #2d8653; font-weight: bold; font-size: 16px;">${content.reference}: ${data.reference_id}</p>
            </div>

            <h3 style="color: #0A1128; margin-bottom: 15px;">${content.stayDetails}</h3>
            <table style="width: 100%; font-size: 14px;">
                <tr><td style="padding: 5px 0; color: #999;">${content.property}:</td><td style="padding: 5px 0; font-weight: bold;">${data.property_title}</td></tr>
                <tr><td style="padding: 5px 0; color: #999;">Check-in:</td><td style="padding: 5px 0;">${data.check_in}</td></tr>
                <tr><td style="padding: 5px 0; color: #999;">Check-out:</td><td style="padding: 5px 0;">${data.check_out}</td></tr>
                <tr><td style="padding: 5px 0; color: #999;">${content.guests}:</td><td style="padding: 5px 0;">${data.adults} ${content.adults}, ${data.children} ${content.children}, ${data.infants} ${content.infants}</td></tr>
                ${data.extra_guests && data.extra_guests.length > 0 ? `<tr><td style="padding: 5px 0; color: #999;">${content.extraGuests}:</td><td style="padding: 5px 0;">${data.extra_guests.join(', ')}</td></tr>` : ''}
                ${data.arrival_time ? `<tr><td style="padding: 5px 0; color: #999;">${content.arrival}:</td><td style="padding: 5px 0;">${data.arrival_time}</td></tr>` : ''}
            </table>

            <p style="margin-top: 40px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px;">
                ${content.footer}<br/>
                <strong>${content.team}</strong><br/>
                <span style="font-style: italic;">Creating moments that last.</span>
            </p>
        </div>
    </div>
    `;
};

export const passwordResetEmail = (data: { fullName?: string; link: string; email?: string }, locale: string = 'pt') => {
    const isEn = locale === 'en';

    const c = {
        subtitle: isEn ? "Password Reset" : "Recuperação de Palavra-passe",
        greeting: isEn ? "Hello" : "Olá",
        intro: isEn
            ? `We received a request to reset the password for your <strong style="color:#B08D4A;">Lovely Memories</strong> account.`
            : `Recebemos um pedido para redefinir a palavra-passe da sua conta <strong style="color:#B08D4A;">Lovely Memories</strong>.`,
        instruction: isEn
            ? `Click the button below to choose a new password.`
            : `Clique no botão abaixo para escolher uma nova palavra-passe.`,
        cta: isEn ? "Reset password" : "Redefinir palavra-passe",
        fallback: isEn ? "If the button doesn't work, copy and paste this link into your browser:" : "Se o botão não funcionar, copie e cole este link no navegador:",
        ignore: isEn
            ? "If you didn't request this, you can safely ignore this email — your password won't change."
            : "Se não fez este pedido, pode ignorar este email com segurança — a sua palavra-passe não será alterada.",
        footer: isEn ? "Best regards," : "Com os melhores cumprimentos,",
        team: isEn ? "Lovely Memories Team" : "Equipa Lovely Memories"
    };

    const name = data.fullName ? ` ${escapeHtml(data.fullName)}` : "";

    return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #0A1128; padding: 40px; text-align: center;">
            <h1 style="color: #B08D4A; margin: 0; font-size: 28px; letter-spacing: 2px;">LOVELY MEMORIES</h1>
            <h2 style="color: #fff; font-weight: 300; margin-top: 10px; font-size: 18px;">${c.subtitle}</h2>
        </div>
        <div style="padding: 40px; color: #333; line-height: 1.6;">
            <p>${c.greeting}<strong>${name}</strong>,</p>
            <p>${c.intro}</p>
            <p>${c.instruction}</p>

            <div style="text-align: center; margin: 36px 0;">
                <a href="${data.link}" style="display: inline-block; background-color: #B08D4A; color: #0A1128; text-decoration: none; font-weight: bold; font-size: 15px; padding: 16px 40px; border-radius: 9999px; letter-spacing: 0.5px;">${c.cta}</a>
            </div>

            <p style="font-size: 12px; color: #999; margin: 4px 0;">${c.fallback}</p>
            <p style="font-size: 12px; word-break: break-all; margin: 4px 0;"><a href="${data.link}" style="color: #B08D4A;">${data.link}</a></p>

            <p style="font-size: 12px; color: #b8b8b8; margin-top: 24px;">${c.ignore}</p>

            <p style="margin-top: 40px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px;">
                ${c.footer}<br/>
                <strong>${c.team}</strong><br/>
                <span style="font-style: italic;">Creating moments that last.</span>
            </p>
        </div>
    </div>
    `;
};

export const ownerInviteEmail = (data: { fullName?: string; link: string; email?: string }, locale: string = 'pt') => {
    const isEn = locale === 'en';

    const c = {
        subtitle: isEn ? "Owner Portal" : "Portal de Proprietário",
        greeting: isEn ? "Hello" : "Olá",
        intro: isEn
            ? `You've been invited to join the <strong style="color:#B08D4A;">Lovely Memories Owner Portal</strong> — your private space to follow how your properties are performing.`
            : `Foi convidado(a) para aceder ao <strong style="color:#B08D4A;">Portal de Proprietário da Lovely Memories</strong> — o seu espaço privado para acompanhar o desempenho das suas propriedades.`,
        bullets: isEn
            ? ["Revenue & payouts at a glance", "Bookings and occupancy in real time", "Monthly reports you can export"]
            : ["Receitas e pagamentos num relance", "Reservas e ocupação em tempo real", "Relatórios mensais para exportar"],
        cta: isEn ? "Set up your account" : "Criar conta e aceder",
        fallback: isEn ? "If the button doesn't work, copy and paste this link into your browser:" : "Se o botão não funcionar, copie e cole este link no navegador:",
        ignore: isEn ? "This invitation is personal to you. If you weren't expecting it, you can safely ignore this email." : "Este convite é pessoal. Se não estava à espera, pode ignorar este email com segurança.",
        footer: isEn ? "Welcome aboard," : "Bem-vindo(a) a bordo,",
        team: isEn ? "Lovely Memories Team" : "Equipa Lovely Memories"
    };

    const name = data.fullName ? ` ${escapeHtml(data.fullName)}` : "";

    return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #0A1128; padding: 40px; text-align: center;">
            <h1 style="color: #B08D4A; margin: 0; font-size: 28px; letter-spacing: 2px;">LOVELY MEMORIES</h1>
            <h2 style="color: #fff; font-weight: 300; margin-top: 10px; font-size: 18px;">${c.subtitle}</h2>
        </div>
        <div style="padding: 40px; color: #333; line-height: 1.6;">
            <p>${c.greeting}<strong>${name}</strong>,</p>
            <p>${c.intro}</p>

            <div style="border: 1px solid #B08D4A; border-radius: 16px; padding: 20px 30px; margin: 28px 0; background-color: #fdfaf5;">
                ${c.bullets.map(b => `<p style="margin: 8px 0; font-size: 14px; color:#0A1128;"><span style="color:#B08D4A; font-weight:bold;">&#10003;</span>&nbsp;&nbsp;${b}</p>`).join('')}
            </div>

            <div style="text-align: center; margin: 36px 0;">
                <a href="${data.link}" style="display: inline-block; background-color: #B08D4A; color: #0A1128; text-decoration: none; font-weight: bold; font-size: 15px; padding: 16px 40px; border-radius: 9999px; letter-spacing: 0.5px;">${c.cta}</a>
            </div>

            <p style="font-size: 12px; color: #999; margin: 4px 0;">${c.fallback}</p>
            <p style="font-size: 12px; word-break: break-all; margin: 4px 0;"><a href="${data.link}" style="color: #B08D4A;">${data.link}</a></p>

            <p style="font-size: 12px; color: #b8b8b8; margin-top: 24px;">${c.ignore}</p>

            <p style="margin-top: 40px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px;">
                ${c.footer}<br/>
                <strong>${c.team}</strong><br/>
                <span style="font-style: italic;">Creating moments that last.</span>
            </p>
        </div>
    </div>
    `;
};

export const bookingGuestCancellationEmail = (data: any, locale: string = 'pt') => {
    const isEn = locale === 'en';

    // Match the backoffice display (e.g. €1,246.00). Falsy/NaN totals hide the refund block.
    const totalNum = Number(data.total_price);
    const hasTotal = Number.isFinite(totalNum) && totalNum > 0;
    const formattedTotal = hasTotal
        ? totalNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : '';

    const content = {
        title: isEn ? "Reservation Cancelled" : "Reserva Cancelada",
        greeting: isEn ? "Hello" : "Olá",
        intro: isEn
            ? `We're writing to let you know that your reservation for the property`
            : `Informamos que a sua reserva para a propriedade`,
        cancelled: isEn ? "Reservation cancelled" : "Reserva cancelada",
        reference: isEn ? "Reference" : "Referência",
        refundTitle: isEn ? "Refund" : "Reembolso",
        refundDesc: isEn
            ? `The amount of <strong>€${formattedTotal}</strong> will be refunded to your original payment method within <strong>5–10 business days</strong>.`
            : `O valor de <strong>€${formattedTotal}</strong> será reembolsado no método de pagamento original em até <strong>5–10 dias úteis</strong>.`,
        stayDetails: isEn ? "Cancelled reservation details" : "Detalhes da reserva cancelada",
        property: isEn ? "Property" : "Imóvel",
        guests: isEn ? "Guests" : "Hóspedes",
        adults: isEn ? "adults" : "adultos",
        children: isEn ? "children" : "crianças",
        infants: isEn ? "infants" : "bebés",
        help: isEn
            ? `If you have any questions or would like to reschedule your stay, simply reply to this email or contact us at`
            : `Se tiver alguma dúvida ou quiser reagendar a sua estada, responda a este email ou contacte-nos em`,
        footer: isEn ? "Kind regards," : "Com os melhores cumprimentos,",
        team: isEn ? "Lovely Memories Team" : "Equipa Lovely Memories"
    };

    // Only list guest segments that are actually present (e.g. "2 adults, 2 children").
    const guestParts: string[] = [];
    if (Number(data.adults) > 0) guestParts.push(`${data.adults} ${content.adults}`);
    if (Number(data.children) > 0) guestParts.push(`${data.children} ${content.children}`);
    if (Number(data.infants) > 0) guestParts.push(`${data.infants} ${content.infants}`);
    const guestLine = guestParts.join(', ');

    return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #0A1128; padding: 40px; text-align: center;">
            <h1 style="color: #B08D4A; margin: 0; font-size: 28px; letter-spacing: 2px;">LOVELY MEMORIES</h1>
            <h2 style="color: #fff; font-weight: 300; margin-top: 10px; font-size: 18px;">${content.title}</h2>
        </div>
        <div style="padding: 40px; color: #333; line-height: 1.6;">
            <p>${content.greeting} <strong>${escapeHtml(data.guest_name)}</strong>,</p>
            <p>${content.intro} <strong style="color: #B08D4A;">${escapeHtml(data.property_title)}</strong> ${isEn ? 'has been cancelled.' : 'foi cancelada.'}</p>

            <div style="border: 1px solid #b0464a; border-radius: 16px; padding: 22px; margin: 28px 0; background-color: #fbf1f1; text-align: center;">
                <p style="margin: 0; color: #8a2f33; font-weight: bold; font-size: 16px;">${content.cancelled}</p>
                <p style="margin: 6px 0 0; color: #8a2f33; font-size: 14px;">${content.reference}: ${escapeHtml(data.reference_id)}</p>
            </div>

            ${hasTotal ? `
            <div style="border: 1px solid #B08D4A; border-radius: 16px; padding: 20px 24px; margin: 28px 0; background-color: #fdfaf5;">
                <h3 style="margin: 0 0 6px; color: #0A1128; font-size: 16px;">${content.refundTitle}</h3>
                <p style="margin: 0; font-size: 14px;">${content.refundDesc}</p>
            </div>` : ''}

            <h3 style="color: #0A1128; margin-bottom: 15px;">${content.stayDetails}</h3>
            <table style="width: 100%; font-size: 14px;">
                <tr><td style="padding: 5px 0; color: #999;">${content.property}:</td><td style="padding: 5px 0; font-weight: bold;">${escapeHtml(data.property_title)}</td></tr>
                <tr><td style="padding: 5px 0; color: #999;">Check-in:</td><td style="padding: 5px 0;">${data.check_in}</td></tr>
                <tr><td style="padding: 5px 0; color: #999;">Check-out:</td><td style="padding: 5px 0;">${data.check_out}</td></tr>
                ${guestLine ? `<tr><td style="padding: 5px 0; color: #999;">${content.guests}:</td><td style="padding: 5px 0;">${guestLine}</td></tr>` : ''}
            </table>

            <p style="margin-top: 30px; font-size: 14px;">${content.help} <a href="mailto:joao@lovelymemories.pt" style="color: #B08D4A; text-decoration: none; font-weight: bold;">joao@lovelymemories.pt</a>.</p>

            <p style="margin-top: 40px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px;">
                ${content.footer}<br/>
                <strong>${content.team}</strong><br/>
                <span style="font-style: italic;">Creating moments that last.</span>
            </p>
        </div>
    </div>
    `;
};
