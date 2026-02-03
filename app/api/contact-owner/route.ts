import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import { adminLeadEmail } from '@/lib/email-templates';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { fullName, email, phoneNumber, address, location, plan, numProperties, website } = body;

        // 1. HONEYPOT CHECK
        // If the hidden 'website' field is filled, it's a bot.
        // Return success to fool the bot, but DO NOT send email.
        if (website && website.length > 0) {
            console.warn(`[Anti-Spam] Honeypot filled by ${email}. Blocking.`);
            return NextResponse.json({ message: 'Success' }, { status: 200 });
        }

        // 2. RATE LIMITING CHECK (Cookie)
        const cookieStore = await cookies();
        const lastSubmission = cookieStore.get('owner-lead-submitted');

        if (lastSubmission) {
            console.warn(`[Anti-Spam] Rate limit hit for ${email}. Blocking.`);
            return NextResponse.json(
                { message: 'You have already submitted a request recently. Please wait a few minutes.' },
                { status: 429 }
            );
        }

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

        // 3. SET RATE LIMIT COOKIE
        // Success! Set a cookie to prevent another submission for 10 minutes (600s)
        const response = NextResponse.json({ message: 'Success' }, { status: 200 });
        response.cookies.set('owner-lead-submitted', 'true', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 10, // 10 minutes
            path: '/',
        });

        return response;

    } catch (error) {
        console.error("API Error [contact-owner]:", error);
        return NextResponse.json({ message: 'Error processing request' }, { status: 500 });
    }
}
