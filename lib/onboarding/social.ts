// Social / passwordless sign-in. Nothing here is on unless NEXT_PUBLIC_SOCIAL_PROVIDERS lists it:
//   NEXT_PUBLIC_SOCIAL_PROVIDERS="google,github,linkedin_oidc,email_otp"     (default empty: no button renders)
// IMPORTANT: turn "Confirm email" ON in Supabase BEFORE any provider goes live (docs/social-signin-setup.md). Supabase links
// an OAuth identity to an existing account with the same e-mail; an unverified password sign-up on someone else's address
// could otherwise end up sharing access with the real owner.

import { isGithubLogin } from '@/lib/connectors/safe-url'
import { safeNext } from './safe-next'
import { classifyAuthError, type AuthLike, type ErrorCode } from './auth-actions'
import { captchaOptions } from './captcha'

export const OAUTH_PROVIDERS = ['google', 'github', 'linkedin_oidc'] as const
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number]
export type SocialOption = OAuthProvider | 'email_otp'
const ALL: readonly SocialOption[] = [...OAUTH_PROVIDERS, 'email_otp']

/** Parses the env value. Unknown names are ignored; order and duplicates are normalised. Empty/undefined → nothing. */
export function enabledSocial(raw: string | undefined = process.env.NEXT_PUBLIC_SOCIAL_PROVIDERS): SocialOption[] {
  if (!raw) return []
  const want = new Set(raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean))
  return ALL.filter((p) => want.has(p))
}

export const PROVIDER_LABEL: Record<SocialOption, string> = {
  google: 'Continue with Google',
  github: 'Continue with GitHub',
  linkedin_oidc: 'Continue with LinkedIn',
  email_otp: 'Email me a code',
}

/** Same-origin redirect back to /auth/return with an allow-listed next path. */
export function oauthRedirectTo(origin: string, next: string): string {
  return `${origin.replace(/\/$/, '')}/auth/return?next=${encodeURIComponent(safeNext(next, '/create/account'))}`
}

export async function startOAuth(
  auth: AuthLike,
  a: { provider: string; origin: string; next: string; enabled?: SocialOption[] },
): Promise<{ ok: true } | { ok: false; code: ErrorCode | 'not_enabled' }> {
  const enabled = a.enabled ?? enabledSocial()
  if (!(OAUTH_PROVIDERS as readonly string[]).includes(a.provider) || !enabled.includes(a.provider as SocialOption)) {
    return { ok: false, code: 'not_enabled' }
  }
  try {
    const { error } = await auth.signInWithOAuth({ provider: a.provider as OAuthProvider, options: { redirectTo: oauthRedirectTo(a.origin, a.next) } })
    if (error) {
      const c = classifyAuthError(error).code
      return { ok: false, code: c === 'exists' || c === 'unconfirmed' ? 'unknown' : c }
    }
    return { ok: true } // the browser is being redirected to the provider
  } catch (err) {
    const c = classifyAuthError(err).code
    return { ok: false, code: c === 'exists' || c === 'unconfirmed' ? 'unknown' : c }
  }
}

/** "Email me a code": works for new and existing people (shouldCreateUser). The code is entered in the same box. */
export async function sendLoginCode(
  auth: AuthLike,
  a: { email: string; captchaToken?: string | null; redirectTo?: string },
): Promise<{ ok: true } | { ok: false; code: ErrorCode; message: string }> {
  try {
    const { error } = await auth.signInWithOtp({
      email: a.email,
      options: { shouldCreateUser: true, ...captchaOptions(a.captchaToken), ...(a.redirectTo ? { emailRedirectTo: a.redirectTo } : {}) },
    })
    if (error) {
      const c = classifyAuthError(error)
      return { ok: false, code: c.code === 'exists' || c.code === 'unconfirmed' ? 'unknown' : c.code, message: c.message }
    }
    return { ok: true }
  } catch (err) {
    const c = classifyAuthError(err)
    return { ok: false, code: c.code === 'exists' || c.code === 'unconfirmed' ? 'unknown' : c.code, message: c.message }
  }
}

// ── what we take from the provider ───────────────────────────────────────────────────────────────────────────
// Only two things, both validated, both used only to PREFILL a field the person can edit:
//   name        → the suggested address and the review form's name field (control characters stripped, 80 chars, no markup)
//   githubLogin → the import form's GitHub username, only for a GitHub identity and only if it matches GitHub's login rules
// Never used: the avatar, the provider's e-mail (the account e-mail is the one Supabase verified), any other field.
export interface ProviderUser {
  app_metadata?: { provider?: string; providers?: string[] } | null
  user_metadata?: Record<string, unknown> | null
}

const clean = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : ''

export function providerProfile(user: ProviderUser | null | undefined): { social: boolean; name: string; githubLogin: string } {
  if (!user) return { social: false, name: '', githubLogin: '' }
  const providers = [user.app_metadata?.provider, ...(user.app_metadata?.providers ?? [])].filter(Boolean) as string[]
  const social = providers.some((p) => (OAUTH_PROVIDERS as readonly string[]).includes(p))
  if (!social) return { social: false, name: '', githubLogin: '' }
  const m = user.user_metadata ?? {}
  const name = clean(m.full_name, 80) || clean(m.name, 80)
  const gh = providers.includes('github') ? [m.user_name, m.preferred_username].find((v) => isGithubLogin(v)) : undefined
  return { social: true, name, githubLogin: typeof gh === 'string' ? gh : '' }
}

/** Decides what /auth/return does. Pure. */
export function decideOAuthReturn(i: { hasSession: boolean; providerError: boolean; timedOut: boolean; next: unknown }):
  | { kind: 'go'; to: string }
  | { kind: 'error' }
  | { kind: 'wait' } {
  if (i.providerError) return { kind: 'error' }
  if (i.hasSession) return { kind: 'go', to: safeNext(i.next, '/create/account') }
  return i.timedOut ? { kind: 'error' } : { kind: 'wait' }
}
