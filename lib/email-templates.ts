/**
 * Simple HTML templates for emails.
 * These follow the brand style: Dark Navy (#0A1128) and Gold (#B08D4A).
 */

export const adminLeadEmail = (data: any) => `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
    <div style="background-color: #0A1128; padding: 30px; text-align: center;">
        <h1 style="color: #B08D4A; margin: 0; font-size: 24px;">New Property Owner Lead</h1>
    </div>
    <div style="padding: 30px; color: #333; line-height: 1.6;">
        <p>You have received a new evaluation / contact request from the website.</p>
        
        <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Name:</strong> ${data.fullName}</p>
            <p><strong>Email:</strong> ${data.email}</p>
            <p><strong>Phone:</strong> ${data.phoneNumber}</p>
            <p><strong>Typology:</strong> ${data.typology}</p>
            <p><strong>Extra Perks:</strong> ${data.perks}</p>
            <p><strong>Location:</strong> ${data.location}</p>
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
            <p><strong>Email:</strong> ${data.email}</p>
            ${data.fullName ? `<p><strong>Name:</strong> ${data.fullName}</p>` : ''}
            <p><strong>Location:</strong> ${data.location || 'N/A'}</p>
            ${data.bedrooms ? `<p><strong>Typology (Bedrooms):</strong> ${data.bedrooms}</p>` : ''}
            ${data.message ? `<div style="margin-top: 15px; border-top: 1px solid #ddd; padding-top: 10px;"><strong>Message:</strong><br/>${data.message}</div>` : ''}
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
        <p style="margin: 5px 0;"><strong>Hóspede:</strong> ${data.guest_name}</p>
        <p style="margin: 5px 0;"><strong>Email:</strong> ${data.guest_email}</p>
        <p style="margin: 5px 0;"><strong>Telefone:</strong> ${data.guest_phone}</p>
        
        <h3 style="color: #0A1128; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px; margin-top: 30px; margin-bottom: 20px;">Detalhes da Reserva</h3>
        <p style="margin: 5px 0;"><strong>Propriedade:</strong> ${data.property_title}</p>
        <p style="margin: 5px 0;"><strong>Datas:</strong> ${data.check_in} a ${data.check_out}</p>
        <p style="margin: 5px 0;"><strong>Hóspedes:</strong> ${data.adults} adultos, ${data.children} crianças, ${data.infants} bebés</p>
        ${data.arrival_time ? `<p style="margin: 5px 0;"><strong>Hora de Chegada Estimada:</strong> ${data.arrival_time}</p>` : ''}
        
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
            ${data.guest_name}<br/>
            ${data.billing_address}<br/>
            ${data.billing_zip} ${data.billing_city}<br/>
            ${data.billing_country}
            ${data.billing_vat ? `<br/><strong>NIF:</strong> ${data.billing_vat}` : ''}
        </p>
        ` : ''}

        ${data.special_requests ? `
        <div style="margin-top: 25px; background: #f9f9f9; padding: 15px; border-radius: 8px; border-left: 4px solid #B08D4A;">
            <p style="margin: 0; font-weight: bold; font-size: 12px; text-transform: uppercase; color: #999;">Observações:</p>
            <p style="margin: 5px 0 0 0; font-style: italic;">"${data.special_requests}"</p>
        </div>
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
            <p>${content.greeting} <strong>${data.guest_name}</strong>,</p>
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
            <p>${content.greeting} <strong>${data.guest_name}</strong>,</p>
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
