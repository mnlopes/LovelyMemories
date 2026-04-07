'use server'
/**
 * Auth Actions - Updated for Profile Management
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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

    const updateData: any = {};
    if (data.fullName !== undefined) updateData.full_name = data.fullName;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.language !== undefined) updateData.preferred_language = data.language;

    const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)

    if (error) {
        return { error: error.message }
    }

    return { success: true }
}
