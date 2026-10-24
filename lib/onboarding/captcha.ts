// Cloudflare Turnstile → Supabase Auth. When "CAPTCHA protection" is enforced in Supabase, EVERY password sign-in,
// sign-up, password-reset and resend call must carry a captchaToken or it is rejected. These helpers are the one
// place that shapes the option, so no call site can forget its spelling:
//   signUp / signInWithPassword / resend:       { options: { captchaToken } }
//   resetPasswordForEmail(email, { captchaToken, redirectTo })
// With no site key configured (NEXT_PUBLIC_TURNSTILE_SITE_KEY unset) the token is undefined and nothing is added, so
// the calls behave exactly as before until you turn enforcement on.
//
// IMPORTANT: Supabase enforces the captcha for all of those calls at once. The OLD /create wizard's signUp has no
// widget, so enforce it in Supabase only when the old wizard is retired.

export const turnstileSiteKey = (): string => process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''

export function captchaOptions(token?: string | null): { captchaToken?: string } {
  return token ? { captchaToken: token } : {}
}
