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
            <p><strong>Address:</strong> ${data.address || 'N/A'}</p>
            <p><strong>Location:</strong> ${data.location}</p>
            <p><strong>Selected Plan:</strong> ${data.plan.toUpperCase()}</p>
            <p><strong>Number of Properties:</strong> ${data.numProperties}</p>
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
        ` : ''}
    </div>
</div>
`;

export const bookingGuestConfirmationEmail = (data: any) => `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
    <div style="background-color: #0A1128; padding: 40px; text-align: center;">
        <h1 style="color: #B08D4A; margin: 0; font-size: 28px; letter-spacing: 2px;">LOVELY MEMORIES</h1>
        <h2 style="color: #fff; font-weight: 300; margin-top: 10px; font-size: 18px;">Obrigado pela sua reserva!</h2>
    </div>
    <div style="padding: 40px; color: #333; line-height: 1.6;">
        <p>Olá <strong>${data.guest_name}</strong>,</p>
        <p>Confirmamos a receção do seu pedido de reserva para a propriedade <strong style="color: #B08D4A;">${data.property_title}</strong>.</p>
        
        <div style="border: 1px solid #B08D4A; border-radius: 16px; padding: 30px; margin: 30px 0; background-color: #fdfaf5;">
            <h3 style="margin-top: 0; color: #0A1128; font-size: 18px;">Próximos Passos: Pagamento</h3>
            <p style="font-size: 14px;">Para confirmar definitivamente a sua reserva, por favor realize o pagamento através de transferência bancária:</p>
            <div style="background: white; padding: 20px; border-radius: 12px; border: 1px solid #f0e6d2; margin: 15px 0;">
                <p style="margin: 5px 0; font-size: 14px;"><strong>IBAN:</strong> PT50 XXXX XXXX XXXX XXXX X</p>
                <p style="margin: 5px 0; font-size: 14px;"><strong>Valor:</strong> €${data.total_price}</p>
                <p style="margin: 5px 0; font-size: 14px;"><strong>Referência:</strong> ${data.reference_id}</p>
            </div>
            <p style="font-size: 12px; color: #8a6d3b; margin-top: 10px;">Por favor envie o comprovativo para <a href="mailto:lovelymemories.office@gmail.com" style="color: #B08D4A; text-decoration: none; font-weight: bold;">lovelymemories.office@gmail.com</a></p>
        </div>

        <h3 style="color: #0A1128; margin-bottom: 15px;">Detalhes da Estada</h3>
        <table style="width: 100%; font-size: 14px;">
            <tr><td style="padding: 5px 0; color: #999;">Imóvel:</td><td style="padding: 5px 0; font-weight: bold;">${data.property_title}</td></tr>
            <tr><td style="padding: 5px 0; color: #999;">Check-in:</td><td style="padding: 5px 0;">${data.check_in}</td></tr>
            <tr><td style="padding: 5px 0; color: #999;">Check-out:</td><td style="padding: 5px 0;">${data.check_out}</td></tr>
            <tr><td style="padding: 5px 0; color: #999;">Hóspedes:</td><td style="padding: 5px 0;">${data.adults} adultos, ${data.children} crianças, ${data.infants} bebés</td></tr>
            ${data.arrival_time ? `<tr><td style="padding: 5px 0; color: #999;">Chegada Estimada:</td><td style="padding: 5px 0;">${data.arrival_time}</td></tr>` : ''}
        </table>
        
        <p style="margin-top: 40px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px;">
            Até breve,<br/>
            <strong>Equipa Lovely Memories</strong><br/>
            <span style="font-style: italic;">Creating moments that last.</span>
        </p>
    </div>
</div>
`;
