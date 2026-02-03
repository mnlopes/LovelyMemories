import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import { adminLeadEmail } from '@/lib/email-templates';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { fullName, email, phoneNumber, address, location, plan, numProperties } = body;

        // Disparar Email para o Admin
        const result = await sendEmail({
            to: "lovelymemories.office@gmail.com",
            subject: `🏠 Novo LEAD de Proprietário: ${fullName}`,
            html: adminLeadEmail(body),
            replyTo: email
        });

        if (!result.success) {
            console.error("Failed to send Owner Lead email:", result.error);
            return NextResponse.json({ message: 'Error sending email', error: result.error }, { status: 500 });
        }

        console.log("Novo Lead de Proprietário Recebido:", body);

        return NextResponse.json({ message: 'Success' }, { status: 200 });
    } catch (error) {
        console.error("API Error [contact-owner]:", error);
        return NextResponse.json({ message: 'Error processing request' }, { status: 500 });
    }
}
