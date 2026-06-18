'use server'
/**
 * Auth Actions - Updated for Profile Management
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { type EmailOtpType } from '@supabase/supabase-js'
import { assertNotImpersonating } from './auth-context'

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
    const next = (formData.get('next') as string | null) || '/en/set-password'
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

/**
 * Request a password reset email
 */
export async function requestPasswordReset(email: string, locale: string = 'en') {
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

    // Determine the base URL for redirection
    const getBaseUrl = () => {
        if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
        const vercelUrl = process.env.VERCEL_URL;
        if (vercelUrl) return `https://${vercelUrl}`;
        return 'http://localhost:3000';
    };
    
    const baseUrl = getBaseUrl();
    const redirectTo = `${baseUrl}/api/auth/confirm?next=/${locale}/set-password&email=${encodeURIComponent(email)}`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
    })

    if (error) {
        return { error: error.message }
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
