import { Resend } from 'resend';

// Initialize Resend with a dummy key for build time if missing
// The actual send function checks for the key before sending
const resend = new Resend(process.env.RESEND_API_KEY || 're_123456789');

// Warn once per server instance when EMAIL_DRY_RUN reaches production (see sendEmail).
let dryRunIgnoredWarned = false;

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
    from = "Lovely Memories <info@lovelymemories.pt>",
    replyTo = "info@lovelymemories.pt"
}: SendEmailProps) {
    // Test mode: never reach Resend. Log only the subject and the recipient's domain.
    // Never honoured in production: there it would drop booking emails while reporting success.
    if (process.env.EMAIL_DRY_RUN === '1' && process.env.VERCEL_ENV === 'production') {
        if (!dryRunIgnoredWarned) {
            dryRunIgnoredWarned = true;
            console.error('⚠️ EMAIL_DRY_RUN=1 is set in production and is IGNORED: emails are sent normally. Remove the variable.');
        }
    } else if (process.env.EMAIL_DRY_RUN === '1') {
        const first = Array.isArray(to) ? to[0] : to;
        const domain = String(first ?? '').split('@')[1]?.trim() || 'unknown';
        console.log(`[email dry-run] ${subject} → ${domain}`);
        return { success: true };
    }

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
            // Never log the whole error object: it may contain addresses.
            console.error("❌ Resend Error:", error.name, (error as { statusCode?: number }).statusCode);
            return { success: false, error: error.message, details: error };
        }

        console.log("✅ Email Sent Successfully. ID:", data?.id);
        return { success: true, id: data?.id };
    } catch (error: any) {
        console.error("💥 Email Dispatch Exception:", error?.name, error?.statusCode);
        return { success: false, error: error.message };
    }
}
