// The account step as pure functions over an injected auth client, so every outcome (and every failure in section 2.5
// of docs/onboarding-plan.md) is unit-testable without a browser or a Supabase project.
//
// Rules this file enforces:
//  - an existing session is REUSED: signUp is never called when someone is already signed in;
//  - "already registered" never surfaces as an error: it switches the UI to sign-in;
//  - with confirmation ON an existing e-mail comes back as identities: [] (no error): same neutral outcome;
//  - every call carries the Turnstile token when there is one (captchaOptions).

import { captchaOptions } from './captcha'

type AuthErr = { message: string; status?: number; code?: string } | null
type Session = { user?: { email?: string; email_confirmed_at?: string | null } } | null

export interface AuthLike {
  getSession(): Promise<{ data: { session: Session } }>
  signUp(a: { email: string; password: string; options?: { captchaToken?: string; emailRedirectTo?: string } }): Promise<{
    data: { user: { identities?: unknown[] | null } | null; session: Session }
    error: AuthErr
  }>
  signInWithPassword(a: { email: string; password: string; options?: { captchaToken?: string } }): Promise<{
    data: { session: Session }
    error: AuthErr
  }>
  resend(a: { type: 'signup'; email: string; options?: { captchaToken?: string; emailRedirectTo?: string } }): Promise<{ error: AuthErr }>
  verifyOtp(
    a: { email: string; token: string; type: 'email' | 'signup' } | { token_hash: string; type: OtpType },
  ): Promise<{ data: { session: Session }; error: AuthErr }>
  resetPasswordForEmail(email: string, o?: { redirectTo?: string; captchaToken?: string }): Promise<{ error: AuthErr }>
  signInWithOtp(a: { email: string; options?: { shouldCreateUser?: boolean; captchaToken?: string; emailRedirectTo?: string } }): Promise<{ error: AuthErr }>
  signInWithOAuth(a: { provider: 'google' | 'github' | 'linkedin_oidc'; options?: { redirectTo?: string } }): Promise<{ error: AuthErr }>
}
export type OtpType = 'signup' | 'email' | 'recovery' | 'email_change' | 'invite' | 'magiclink'

export type ErrorCode =
  | 'weak_password' | 'captcha' | 'rate_limited' | 'invalid_credentials' | 'code_invalid' | 'network' | 'unknown'

export type AccountOutcome =
  | { kind: 'signed_in'; reused: boolean }
  | { kind: 'verify'; email: string }
  | { kind: 'existing' } // switch to sign-in (neutral wording)
  | { kind: 'unverified'; email: string } // sign-in refused because the e-mail is not confirmed yet
  | { kind: 'error'; code: ErrorCode; message: string }

export function classifyAuthError(err: unknown): { code: ErrorCode | 'exists' | 'unconfirmed'; message: string } {
  if (err instanceof TypeError) return { code: 'network', message: 'network' }
  const e = (err ?? {}) as { message?: string; status?: number; code?: string }
  const msg = String(e.message ?? '')
  if (e.code === 'user_already_exists' || /already (been )?registered|already exists/i.test(msg)) return { code: 'exists', message: msg }
  if (e.code === 'email_not_confirmed' || /email not confirmed/i.test(msg)) return { code: 'unconfirmed', message: msg }
  if (e.code === 'weak_password' || /password.*(weak|at least|short|characters)|weak password/i.test(msg)) return { code: 'weak_password', message: msg }
  if (/captcha/i.test(msg) || e.code === 'captcha_failed') return { code: 'captcha', message: msg }
  if (e.status === 429 || /rate limit|too many|over_.*_rate_limit/i.test(msg + (e.code ?? ''))) return { code: 'rate_limited', message: msg }
  if (e.code === 'invalid_credentials' || /invalid (login )?credentials|invalid login/i.test(msg)) return { code: 'invalid_credentials', message: msg }
  if (/otp|token/i.test(msg) && /expired|invalid/i.test(msg)) return { code: 'code_invalid', message: msg }
  if (/fetch|network|failed to/i.test(msg)) return { code: 'network', message: msg }
  return { code: 'unknown', message: msg }
}

const fail = (err: unknown): AccountOutcome => {
  const c = classifyAuthError(err)
  const code = c.code === 'exists' || c.code === 'unconfirmed' ? 'unknown' : c.code
  return { kind: 'error', code, message: c.message }
}

export async function createAccount(
  auth: AuthLike,
  a: { email: string; password: string; captchaToken?: string | null; redirectTo?: string },
): Promise<AccountOutcome> {
  try {
    // 1. A session already exists (closed tab, second tab, retry): reuse it, never call signUp again.
    const { data: existing } = await auth.getSession()
    if (existing.session) return { kind: 'signed_in', reused: true }

    const { data, error } = await auth.signUp({
      email: a.email,
      password: a.password,
      options: { ...captchaOptions(a.captchaToken), ...(a.redirectTo ? { emailRedirectTo: a.redirectTo } : {}) },
    })
    if (error) {
      const c = classifyAuthError(error)
      if (c.code === 'exists') return { kind: 'existing' } // confirmation OFF: "User already registered"
      return fail(error)
    }
    if (data.session) return { kind: 'signed_in', reused: false } // confirmation OFF
    // confirmation ON: an e-mail that already has an account comes back with no identities and no error
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) return { kind: 'existing' }
    return { kind: 'verify', email: a.email }
  } catch (err) {
    return fail(err)
  }
}

export async function signIn(
  auth: AuthLike,
  a: { email: string; password: string; captchaToken?: string | null },
): Promise<AccountOutcome> {
  try {
    const { data, error } = await auth.signInWithPassword({
      email: a.email,
      password: a.password,
      options: captchaOptions(a.captchaToken),
    })
    if (error) {
      const c = classifyAuthError(error)
      if (c.code === 'unconfirmed') return { kind: 'unverified', email: a.email }
      if (c.code === 'invalid_credentials') return { kind: 'error', code: 'invalid_credentials', message: 'Wrong email or password.' }
      return fail(error)
    }
    return data.session ? { kind: 'signed_in', reused: false } : { kind: 'error', code: 'unknown', message: 'no session' }
  } catch (err) {
    return fail(err)
  }
}

export async function resendCode(
  auth: AuthLike,
  a: { email: string; captchaToken?: string | null; redirectTo?: string },
): Promise<{ ok: true } | { ok: false; code: ErrorCode; message: string }> {
  try {
    const { error } = await auth.resend({
      type: 'signup',
      email: a.email,
      options: { ...captchaOptions(a.captchaToken), ...(a.redirectTo ? { emailRedirectTo: a.redirectTo } : {}) },
    })
    if (error) {
      const o = fail(error)
      return o.kind === 'error' ? { ok: false, code: o.code, message: o.message } : { ok: false, code: 'unknown', message: '' }
    }
    return { ok: true }
  } catch (err) {
    const o = fail(err)
    return o.kind === 'error' ? { ok: false, code: o.code, message: o.message } : { ok: false, code: 'unknown', message: '' }
  }
}

/**
 * Confirms the e-mail with the 6-digit code. Which `type` name Supabase expects for sign-up confirmation has changed
 * between versions ('signup' vs 'email'); try the current one and fall back once. Verify against the current docs.
 */
export async function verifyCode(
  auth: AuthLike,
  a: { email: string; code: string },
): Promise<{ ok: true } | { ok: false; code: ErrorCode; message: string }> {
  const token = a.code.replace(/\s+/g, '')
  if (!/^\d{6}$/.test(token)) return { ok: false, code: 'code_invalid', message: 'Enter the 6-digit code.' }
  try {
    let res = await auth.verifyOtp({ email: a.email, token, type: 'email' })
    if (res.error && classifyAuthError(res.error).code === 'code_invalid') {
      res = await auth.verifyOtp({ email: a.email, token, type: 'signup' })
    }
    if (res.error) {
      const c = classifyAuthError(res.error)
      return { ok: false, code: c.code === 'exists' || c.code === 'unconfirmed' ? 'unknown' : c.code, message: c.message }
    }
    return res.data.session ? { ok: true } : { ok: false, code: 'code_invalid', message: 'no session' }
  } catch (err) {
    const c = classifyAuthError(err)
    return { ok: false, code: c.code === 'exists' || c.code === 'unconfirmed' ? 'unknown' : c.code, message: c.message }
  }
}

export async function sendReset(
  auth: AuthLike,
  a: { email: string; captchaToken?: string | null; redirectTo: string },
): Promise<{ ok: boolean }> {
  try {
    const { error } = await auth.resetPasswordForEmail(a.email, { redirectTo: a.redirectTo, ...captchaOptions(a.captchaToken) })
    // The same answer whether or not the address has an account (no enumeration); only transport/captcha errors surface.
    return { ok: !error || classifyAuthError(error).code === 'unknown' }
  } catch {
    return { ok: false }
  }
}

/** Link fallback: the /auth/confirm page. */
export async function confirmWithTokenHash(
  auth: AuthLike,
  a: { tokenHash: string; type: string },
): Promise<{ ok: true; type: OtpType } | { ok: false; code: ErrorCode }> {
  const allowed: OtpType[] = ['signup', 'email', 'recovery', 'email_change', 'invite', 'magiclink']
  if (!a.tokenHash || a.tokenHash.length > 512 || !allowed.includes(a.type as OtpType)) return { ok: false, code: 'code_invalid' }
  try {
    const { data, error } = await auth.verifyOtp({ token_hash: a.tokenHash, type: a.type as OtpType })
    if (error || !data.session) return { ok: false, code: 'code_invalid' }
    return { ok: true, type: a.type as OtpType }
  } catch {
    return { ok: false, code: 'network' }
  }
}
