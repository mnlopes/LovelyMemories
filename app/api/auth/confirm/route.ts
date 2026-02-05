import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { routing } from '@/i18n/routing'

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type') as EmailOtpType | null
    const next = searchParams.get('next') ?? '/set-password'
    const email = searchParams.get('email')

    // For i18n support, we should ensure the next path has a locale prefix
    // If next doesn't start with a locale, we prepend the default one (e.g. /en)
    const hasLocale = routing.locales.some((loc: string) => next.startsWith(`/${loc}/`))
    const localeNext = hasLocale ? next : `/en${next.startsWith('/') ? '' : '/'}${next}`

    const redirectTo = request.nextUrl.clone()
    redirectTo.pathname = localeNext
    redirectTo.searchParams.delete('token_hash')
    redirectTo.searchParams.delete('type')
    redirectTo.searchParams.delete('next')

    if (email) {
        redirectTo.searchParams.set('email', email)
    }

    if (token_hash && type) {
        const cookieStore = await cookies()
        const response = NextResponse.redirect(redirectTo)

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll()
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            response.cookies.set(name, value, options)
                        )
                    },
                },
            }
        )

        const { error } = await supabase.auth.verifyOtp({
            type,
            token_hash,
        })

        if (!error) {
            console.log("Auth confirmation successful, redirecting with cookies:", redirectTo.toString())
            return response
        }

        console.error("Auth confirmation error details:", {
            error,
            type,
            token_hash: token_hash.substring(0, 5) + "..."
        })
    }

    // Fallback: If OTP fails, it might be already verified (pre-fetch case)
    // or it's an invalid link. Redirect anyway to let the client try to recover.
    return NextResponse.redirect(redirectTo)
}
