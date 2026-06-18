import { Mail, ShieldCheck, AlertTriangle } from "lucide-react";
import { Link } from "@/i18n/routing";
import { ConfirmForm } from "@/components/auth/ConfirmForm";

/**
 * Scanner-safe interstitial for invite/recovery links.
 *
 * Email link prefetchers (Gmail, Outlook Safe Links, antivirus) follow GET links and would
 * otherwise consume Supabase's single-use token before the human ever clicks — leaving the
 * owner stuck on "Session Not Found". This page does NOT verify on load; verification only
 * happens when the user submits the form (confirmAuthLink server action), which scanners do
 * not do. The token_hash therefore survives until the real click.
 */
export default async function ConfirmPage({
    params,
    searchParams,
}: {
    params: Promise<{ locale: string }>;
    searchParams: Promise<{ token_hash?: string; type?: string; next?: string; email?: string }>;
}) {
    const { locale } = await params;
    const sp = await searchParams;

    const tokenHash = sp.token_hash ?? "";
    const type = sp.type ?? "invite";
    const email = sp.email ?? "";
    const next = sp.next || `/${locale}/set-password${email ? `?email=${encodeURIComponent(email)}` : ""}`;

    const isPt = locale === "pt";
    const t = {
        title: isPt ? "Confirmar acesso" : "Confirm your access",
        subtitle: isPt
            ? "Está quase. Confirme abaixo para definir a sua palavra-passe."
            : "Almost there. Confirm below to set your password.",
        forLabel: isPt ? "A confirmar para" : "Confirming for",
        button: isPt ? "Continuar" : "Continue",
        invalidTitle: isPt ? "Link inválido" : "Invalid link",
        invalidBody: isPt
            ? "Este link está incompleto ou expirou. Peça um novo ao administrador."
            : "This link is incomplete or has expired. Please request a new one from your administrator.",
        backToLogin: isPt ? "Voltar ao login" : "Back to login",
    };

    return (
        <main className="min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#B09E80]/5 rounded-full blur-[120px] -mr-64 -mt-64 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#192537]/5 rounded-full blur-[120px] -ml-64 -mb-64 pointer-events-none" />

            <div className="text-center mb-10 relative z-10">
                <Link href="/" className="inline-block group">
                    <img
                        src="/legacy/home/images/logo.svg"
                        alt="Lovely Memories"
                        className="h-16 mx-auto mb-6 brightness-0 transition-all duration-300 group-hover:scale-105 group-active:scale-95"
                        style={{ filter: "brightness(0) saturate(100%) invert(8%) sepia(35%) saturate(1210%) hue-rotate(188deg) brightness(96%) contrast(97%)" }}
                    />
                </Link>
            </div>

            <div className="w-full max-w-md relative z-10">
                {!tokenHash ? (
                    <div className="bg-white rounded-[32px] p-12 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-[#E1E6EC] text-center">
                        <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-8">
                            <AlertTriangle className="w-10 h-10 text-amber-500" />
                        </div>
                        <h1 className="text-2xl font-bold text-[#192537] mb-3">{t.invalidTitle}</h1>
                        <p className="text-[#192537]/60 mb-8 font-medium text-sm">{t.invalidBody}</p>
                        <Link
                            href="/login"
                            className="text-[#192537] hover:text-[#B09E80] font-bold uppercase tracking-widest text-xs transition-colors"
                        >
                            {t.backToLogin}
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className="text-center mb-8">
                            <h1 className="text-3xl font-playfair font-bold text-[#192537] mb-2 font-display">{t.title}</h1>
                            <p className="text-[#192537]/60 font-medium text-sm">{t.subtitle}</p>
                        </div>

                        <div className="bg-white rounded-[32px] p-8 md:p-10 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-[#E1E6EC] space-y-6">
                            <div className="flex flex-col items-center text-center">
                                <div className="size-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 mb-4">
                                    <ShieldCheck className="size-7" />
                                </div>
                            </div>

                            {email && (
                                <div className="p-4 bg-blue-50/50 border border-blue-100/50 rounded-2xl flex items-center gap-3">
                                    <div className="size-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-blue-500">
                                        <Mail className="size-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase tracking-widest font-bold text-blue-500/60 leading-none mb-1">
                                            {t.forLabel}
                                        </p>
                                        <p className="text-sm font-bold text-[#192537] leading-tight">{email}</p>
                                    </div>
                                </div>
                            )}

                            <ConfirmForm tokenHash={tokenHash} type={type} next={next} label={t.button} />
                        </div>
                    </>
                )}
            </div>
        </main>
    );
}
