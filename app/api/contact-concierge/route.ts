import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, email, message, service, website } = body;

        // 1. HONEYPOT CHECK
        if (website && website.length > 0) {
            console.warn(`[Anti-Spam] Honeypot filled by ${email} in concierge.`);
            return NextResponse.json({ message: 'Success' }, { status: 200 });
        }

        // 2. RATE LIMITING CHECK
        const cookieStore = await cookies();
        const lastSubmission = cookieStore.get('contact-concierge-submitted');

        if (lastSubmission) {
            return NextResponse.json(
                { message: 'You have already submitted a request recently. Please wait a few minutes.' },
                { status: 429 }
            );
        }

        // Disparar Email para o Admin
        const result = await sendEmail({
            to: "info@lovelymemories.pt",
            subject: `💎 Pedido de Serviço Concierge: ${service}`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
                    <div style="background-color: #0A1128; padding: 30px; text-align: center;">
                        <h1 style="color: #B08D4A; margin: 0; font-size: 24px;">Novo Pedido Concierge</h1>
                    </div>
                    <div style="padding: 30px; color: #333; line-height: 1.6;">
                        <p>Recebeste um novo pedido de serviço Concierge / VIP.</p>
                        
                        <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <p><strong>Serviço:</strong> ${service}</p>
                            <p><strong>Nome:</strong> ${name}</p>
                            <p><strong>Email:</strong> ${email}</p>
                            <p><strong>Mensagem:</strong> ${message || 'Sem mensagem adicional.'}</p>
                        </div>
                    </div>
                </div>
            `,
            replyTo: email
        });

        if (!result.success) {
            console.error("Failed to send Concierge email:", result.error);
            return NextResponse.json({ message: 'Error sending email', error: result.error }, { status: 500 });
        }

        // 3. SET RATE LIMIT COOKIE
        const response = NextResponse.json({ message: 'Success' }, { status: 200 });
        response.cookies.set('contact-concierge-submitted', 'true', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 10, // 10 minutes
            path: '/',
        });

        return response;
    } catch (error) {
        console.error("API Error [contact-concierge]:", error);
        return NextResponse.json({ message: 'Error' }, { status: 500 });
    }
}
