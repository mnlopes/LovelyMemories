import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailProps {
    to: string | string[];
    subject: string;
    html: string;
    replyTo?: string;
    from?: string;
}

/**
 * Utility to send emails via Resend.
 * Ensure RESEND_API_KEY is set in .env.local
 */
export async function sendEmail({
    to,
    subject,
    html,
    replyTo,
    from = "Lovely Memories <onboarding@resend.dev>" // Standard Resend testing sender
}: SendEmailProps) {
    if (!process.env.RESEND_API_KEY) {
        console.error("CRITICAL: RESEND_API_KEY is not defined.");
        return { success: false, error: "Configuration missing" };
    }

    try {
        const { data, error } = await resend.emails.send({
            from,
            to,
            subject,
            html,
            replyTo,
        });

        if (error) {
            console.error("❌ Resend Error:", error);
            return { success: false, error: error.message, details: error };
        }

        console.log("✅ Email Sent Successfully. ID:", data?.id);
        return { success: true, id: data?.id };
    } catch (error: any) {
        console.error("💥 Email Dispatch Exception:", error);
        return { success: false, error: error.message };
    }
}
