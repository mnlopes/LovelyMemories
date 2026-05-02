import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import { adminContactEmail } from '@/lib/email-templates';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, location, bedrooms, website } = body;

        // 1. HONEYPOT CHECK
        if (website && website.length > 0) {
            console.warn(`[Anti-Spam] Honeypot filled by ${email} in contact-general.`);
            return NextResponse.json({ message: 'Success' }, { status: 200 });
        }

        // 2. RATE LIMITING CHECK
        const cookieStore = await cookies();
        const lastSubmission = cookieStore.get('contact-general-submitted');

        if (lastSubmission) {
            return NextResponse.json(
                { message: 'You have already submitted a request recently. Please wait a few minutes.' },
                { status: 429 }
            );
        }

        // Disparar Email para o Admin
        const result = await sendEmail({
            to: "info@lovelymemories.pt",
            subject: `Novo Pedido de Estimativa: ${email}`,
            html: adminContactEmail(body),
            replyTo: email
        });

        if (!result.success) {
            console.error("Failed to send General Contact email:", result.error);
            return NextResponse.json({ message: 'Error sending email', error: result.error }, { status: 500 });
        }

        console.log("Novo Pedido de Estimativa Recebido:", body);

        // 3. SET RATE LIMIT COOKIE
        const response = NextResponse.json({ message: 'Success' }, { status: 200 });
        response.cookies.set('contact-general-submitted', 'true', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 10, // 10 minutes
            path: '/',
        });

        return response;
    } catch (error) {
        console.error("API Error [contact-general]:", error);
        return NextResponse.json({ message: 'Error processing request' }, { status: 500 });
    }
}
