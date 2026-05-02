import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
    try {
        const { email, website } = await request.json();

        // 1. HONEYPOT CHECK
        if (website && website.length > 0) {
            console.warn(`[Anti-Spam] Honeypot filled by ${email} in newsletter.`);
            return NextResponse.json({ message: 'Success' }, { status: 200 });
        }

        // 2. RATE LIMITING CHECK
        const cookieStore = await cookies();
        const lastSubmission = cookieStore.get('newsletter-submitted');

        if (lastSubmission) {
            return NextResponse.json(
                { message: 'You have already submitted a request recently. Please wait a few minutes.' },
                { status: 429 }
            );
        }

        // Notify Admin of new subscriber
        const result = await sendEmail({
            to: "info@lovelymemories.pt",
            subject: `📩 Nova Inscrição na Newsletter: ${email}`,
            html: `
                <div style="font-family: sans-serif; padding: 20px;">
                    <h2>Nova Inscrição na Newsletter</h2>
                    <p>O utilizador <strong>${email}</strong> subscreveu a newsletter da Lovely Memories.</p>
                </div>
            `
        });

        if (!result.success) {
            console.error("Failed to send Newsletter email:", result.error);
            return NextResponse.json({ message: 'Error sending email', error: result.error }, { status: 500 });
        }

        // 3. SET RATE LIMIT COOKIE
        const response = NextResponse.json({ message: 'Success' }, { status: 200 });
        response.cookies.set('newsletter-submitted', 'true', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 10, // 10 minutes
            path: '/',
        });

        return response;
    } catch (error) {
        console.error("API Error [newsletter]:", error);
        return NextResponse.json({ message: 'Error' }, { status: 500 });
    }
}
