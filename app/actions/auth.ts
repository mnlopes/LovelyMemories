'use server'
/**
 * Auth Actions - Updated for Profile Management
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { type EmailOtpType } from '@supabase/supabase-js'
import { assertNotImpersonating } from './auth-context'
import { routing } from '@/i18n/routing'

/**
 * Only allow same-origin relative paths as a post-auth redirect target.
 * Blocks open redirects (e.g. `https://evil.com`, `//evil.com`, `/\evil.com`) that an
 * attacker could smuggle through the `next` param to phish a user right after they verify.
 */
function sanitizeNext(raw: string | null): string {
    const fallbackLocale = 'en'
    const isSafeRelative =
        !!raw &&
        raw.startsWith('/') &&
        !raw.startsWith('//') &&
        !raw.startsWith('/\\')
    if (!isSafeRelative) return `/${fallbackLocale}/set-password`

    const localeCandidate = raw.split('/').filter(Boolean)[0]
    const locale = (routing.locales as readonly string[]).includes(localeCandidate)
        ? localeCandidate
        : fallbackLocale
    // Re-anchor to a known locale prefix if the path didn't carry a valid one.
    return (routing.locales as readonly string[]).includes(localeCandidate)
        ? raw
        : `/${locale}${raw}`
}

export async function loginWithEmail(email: string, password: string, rememberMe: boolean = true) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            // If NOT rememberMe, we clear the maxAge to make it a session cookie
                            const cookieOptions = !rememberMe 
                                ? { ...options, maxAge: undefined } 
                                : options;
                                
                            cookieStore.set(name, value, cookieOptions)
                        })
                    } catch (error) {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    )

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        return { error: error.message }
    }

    // Role detection directly inside the action
    let role = 'authenticated';
    if (data.user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single();
            
        if (profile) {
            role = profile.role;
        }
    }

    return { user: data.user, role }
}

/**
 * Confirm an invite/recovery link AFTER the user explicitly clicks "Continue" on the
 * interstitial page. This is the scanner-safe step: email prefetchers (Gmail, Outlook
 * Safe Links, antivirus) only follow GET links, so the token_hash is NOT consumed until
 * a real human submits this form. Here we exchange the single-use token_hash for a
 * session (cookies) and redirect to /set-password.
 */
export async function confirmAuthLink(formData: FormData) {
    const token_hash = formData.get('token_hash') as string | null
    const type = formData.get('type') as EmailOtpType | null
    // SECURITY: never trust `next` verbatim — it could be an external URL (open redirect).
    const next = sanitizeNext(formData.get('next') as string | null)
    const locale = next.split('/').filter(Boolean)[0] || 'en'

    let verified = false
    if (token_hash && type) {
        const cookieStore = await cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll()
                    },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) =>
                                cookieStore.set(name, value, options)
                            )
                        } catch {
                            // Ignore — set from a context where cookies are read-only.
                        }
                    },
                },
            }
        )

        const { error } = await supabase.auth.verifyOtp({ type, token_hash })
        verified = !error
        if (error) {
            console.error('confirmAuthLink verifyOtp error:', error.message)
        }
    }

    // redirect() throws NEXT_REDIRECT, so it must live outside the verify block.
    redirect(verified ? next : `/${locale}/auth-error`)
}

// How often a single account may actually receive a reset email, and how long a single
// browser is throttled after a request. Both protect against email bombing / Resend abuse.
const RESET_EMAIL_THROTTLE_MS = 2 * 60 * 1000 // 2 minutes per email address
const RESET_COOKIE_MAX_AGE_S = 2 * 60        // 2 minutes per browser

/**
 * Request a password reset email.
 *
 * Sends our own branded Lovely Memories email via Resend (localized PT/EN) instead of
 * Supabase's default English template — mirroring the owner invite flow. The link routes
 * through our scanner-safe /confirm interstitial (single verifyOtp on an explicit click)
 * so email prefetchers (Gmail, Outlook Safe Links) don't consume the single-use token.
 *
 * SECURITY:
 * - Anti-enumeration: ALWAYS returns { success: true } to the caller. Whether the account
 *   exists, the send fails, or we're throttling — the response is identical, so an attacker
 *   can't tell which emails are registered. Failures are logged server-side only.
 * - Rate limiting: because we bypass Supabase's built-in email rate limit (we send via Resend
 *   ourselves), we re-add our own — a per-browser cookie AND a per-email throttle stored on the
 *   user record — to prevent inbox bombing and Resend quota abuse from this public endpoint.
 */
export async function requestPasswordReset(email: string, locale: string = 'en') {
    const inviteLocale = locale === 'en' ? 'en' : 'pt'

    // Per-browser throttle (mirrors the app's contact-form anti-spam pattern).
    const cookieStore = await cookies()
    if (cookieStore.get('pw-reset-requested')) {
        return { success: true }
    }

    const { getSupabaseAdmin } = await import('@/lib/supabase')
    const adminSupabase = await getSupabaseAdmin()

    // Determine the base URL for redirection
    const getBaseUrl = () => {
        if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
        const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
        const vercelUrl = process.env.VERCEL_URL;
        if (vercelProductionUrl) return `https://${vercelProductionUrl}`;
        if (vercelUrl) return `https://${vercelUrl}`;
        return 'http://localhost:3000';
    };
    const baseUrl = getBaseUrl();
    // Only used as a fallback; the email points at our scanner-safe interstitial below.
    const redirectTo = `${baseUrl}/api/auth/confirm?next=/${inviteLocale}/set-password&email=${encodeURIComponent(email)}`;

    const { data: linkData, error: linkError } = await adminSupabase.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo },
    })

    // Don't reveal whether the email is registered: silently succeed if the user doesn't exist.
    if (linkError || !linkData?.properties?.hashed_token || !linkData.user) {
        console.warn('requestPasswordReset: no link generated for', email, linkError?.message)
        return { success: true }
    }

    const user = linkData.user
    const existingMetadata = (user.user_metadata || {}) as Record<string, any>

    // Per-email throttle: gate the actual SEND on a timestamp stored on the user record, so
    // an attacker can't bomb a victim's inbox by hitting this endpoint from many browsers/IPs.
    const lastSentRaw = existingMetadata.last_reset_email_at
    const lastSent = lastSentRaw ? Date.parse(lastSentRaw) : 0
    if (lastSent && Date.now() - lastSent < RESET_EMAIL_THROTTLE_MS) {
        return { success: true }
    }

    const hashedToken = linkData.properties.hashed_token
    const resetLink = `${baseUrl}/${inviteLocale}/confirm?token_hash=${hashedToken}&type=recovery&next=${encodeURIComponent(`/${inviteLocale}/set-password`)}&email=${encodeURIComponent(email)}`

    // Best-effort: greet the user by name.
    const { data: profile } = await adminSupabase
        .from('profiles')
        .select('full_name')
        .eq('email', email)
        .single()

    const { sendEmail } = await import('@/lib/email')
    const { passwordResetEmail } = await import('@/lib/email-templates')

    const emailResult = await sendEmail({
        to: email,
        subject: inviteLocale === 'en'
            ? 'Reset your Lovely Memories password'
            : 'Recuperação de palavra-passe | Lovely Memories',
        html: passwordResetEmail({ fullName: profile?.full_name || undefined, link: resetLink, email }, inviteLocale),
    })

    // Anti-enumeration: never surface a send failure to the caller — log it and report success.
    if (!emailResult.success) {
        console.error('requestPasswordReset: failed to send email to', email, emailResult.error)
        return { success: true }
    }

    // Record the send time for the per-email throttle (merge so we don't drop other metadata).
    try {
        await adminSupabase.auth.admin.updateUserById(user.id, {
            user_metadata: { ...existingMetadata, last_reset_email_at: new Date().toISOString() },
        })
    } catch (e) {
        console.warn('requestPasswordReset: could not record throttle timestamp', e)
    }

    // Throttle this browser too.
    try {
        cookieStore.set('pw-reset-requested', '1', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: RESET_COOKIE_MAX_AGE_S,
            path: '/',
        })
    } catch {
        // Ignore — set from a context where cookies are read-only.
    }

    return { success: true }
}

/**
 * Update the current user's email
 */
export async function updateUserEmail(email: string) {
    await assertNotImpersonating()
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch (error) {
                        // Ignore
                    }
                },
            },
        }
    )

    const { error } = await supabase.auth.updateUser({ email })

    if (error) {
        return { error: error.message }
    }

    return { success: true }
}

/**
 * Update the current user's password
 */
export async function updateUserPassword(password: string) {
    await assertNotImpersonating()
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch (error) {
                        // Ignore
                    }
                },
            },
        }
    )

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
        return { error: error.message }
    }

    return { success: true }
}

/**
 * Update the current user's profile metadata (e.g. name, phone, language)
 */
export async function updateProfileMetadata(data: { fullName?: string, phone?: string, language?: string }) {
    await assertNotImpersonating()
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch (error) {
                        // Ignore
                    }
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    // SECURITY: only an explicit allowlist of self-editable fields is ever written.
    // `role` is deliberately never part of this update. We use the service-role client
    // (scoped to the caller's own id) so this works regardless of profiles RLS policies,
    // while the DB trigger prevent_role_self_escalation blocks any role change anyway.
    const updateData: any = {};
    if (data.fullName !== undefined) updateData.full_name = data.fullName;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.language !== undefined) updateData.preferred_language = data.language;

    const { getSupabaseAdmin } = await import('@/lib/supabase')
    const adminSupabase = await getSupabaseAdmin()

    const { error } = await adminSupabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)

    if (error) {
        return { error: error.message }
    }

    return { success: true }
}
