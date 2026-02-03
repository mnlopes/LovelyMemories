import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';

export async function POST(request: Request) {
    try {
        const { email } = await request.json();

        // Notify Admin of new subscriber
        const result = await sendEmail({
            to: "lovelymemories.office@gmail.com",
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

        return NextResponse.json({ message: 'Success' }, { status: 200 });
    } catch (error) {
        console.error("API Error [newsletter]:", error);
        return NextResponse.json({ message: 'Error' }, { status: 500 });
    }
}
