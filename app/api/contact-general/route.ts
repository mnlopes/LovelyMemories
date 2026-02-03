import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import { adminContactEmail } from '@/lib/email-templates';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, location, bedrooms } = body;

        // Disparar Email para o Admin
        const result = await sendEmail({
            to: "lovelymemories.office@gmail.com",
            subject: `Novo Pedido de Estimativa: ${email}`,
            html: adminContactEmail(body),
            replyTo: email
        });

        if (!result.success) {
            console.error("Failed to send General Contact email:", result.error);
            return NextResponse.json({ message: 'Error sending email', error: result.error }, { status: 500 });
        }

        console.log("Novo Pedido de Estimativa Recebido:", body);

        return NextResponse.json({ message: 'Success' }, { status: 200 });
    } catch (error) {
        console.error("API Error [contact-general]:", error);
        return NextResponse.json({ message: 'Error processing request' }, { status: 500 });
    }
}
