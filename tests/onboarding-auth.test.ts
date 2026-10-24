// The account step: every outcome and failure from section 2.5 of docs/onboarding-plan.md, over a fake auth client.
import { describe, expect, it, vi } from 'vitest'
import {
  classifyAuthError, confirmWithTokenHash, createAccount, resendCode, sendReset, signIn, verifyCode, type AuthLike,
} from '../lib/onboarding/auth-actions'

const SESSION = { user: { email: 'ada@example.com', email_confirmed_at: '2026-01-01' } }

function fakeAuth(over: Partial<Record<keyof AuthLike, unknown>> = {}) {
  const auth = {
    getSession: vi.fn(async () => ({ data: { session: null } })),
    signUp: vi.fn(async () => ({ data: { user: { identities: [{}] }, session: null }, error: null })),
    signInWithPassword: vi.fn(async () => ({ data: { session: SESSION }, error: null })),
    resend: vi.fn(async () => ({ error: null })),
    verifyOtp: vi.fn(async () => ({ data: { session: SESSION }, error: null })),
    resetPasswordForEmail: vi.fn(async () => ({ error: null })),
    ...over,
  }
  return auth as typeof auth & AuthLike
}
const err = (message: string, extra: Record<string, unknown> = {}) => ({ message, ...extra })
const creds = { email: 'ada@example.com', password: 'correct horse battery' }

describe('createAccount', () => {
  it('closed tab / retry: an existing session is reused and signUp is NEVER called', async () => {
    const auth = fakeAuth({ getSession: vi.fn(async () => ({ data: { session: SESSION } })) })
    expect(await createAccount(auth, creds)).toEqual({ kind: 'signed_in', reused: true })
    expect(auth.signUp).not.toHaveBeenCalled()
  })

  it('confirmation OFF: signUp returns a session → signed in', async () => {
    const auth = fakeAuth({ signUp: vi.fn(async () => ({ data: { user: { identities: [{}] }, session: SESSION }, error: null })) })
    expect(await createAccount(auth, creds)).toEqual({ kind: 'signed_in', reused: false })
  })

  it('confirmation ON: no session, new identity → verify screen', async () => {
    expect(await createAccount(fakeAuth(), creds)).toEqual({ kind: 'verify', email: creds.email })
  })

  it('"User already registered" never surfaces as an error: it switches to sign-in', async () => {
    for (const e of [err('User already registered'), err('x', { code: 'user_already_exists' }), err('A user with this email address has already been registered')]) {
      const auth = fakeAuth({ signUp: vi.fn(async () => ({ data: { user: null, session: null }, error: e })) })
      expect(await createAccount(auth, creds)).toEqual({ kind: 'existing' })
    }
  })

  it('confirmation ON + existing e-mail comes back with identities: [] and no error → same neutral outcome', async () => {
    const auth = fakeAuth({ signUp: vi.fn(async () => ({ data: { user: { identities: [] }, session: null }, error: null })) })
    expect(await createAccount(auth, creds)).toEqual({ kind: 'existing' })
  })

  it.each([
    [err('Password should be at least 6 characters', { code: 'weak_password' }), 'weak_password'],
    [err('captcha verification process failed'), 'captcha'],
    [err('email rate limit exceeded', { status: 429 }), 'rate_limited'],
    [err('x', { status: 429 }), 'rate_limited'],
  ])('error %j → %s', async (e, code) => {
    const auth = fakeAuth({ signUp: vi.fn(async () => ({ data: { user: null, session: null }, error: e })) })
    expect(await createAccount(auth, creds)).toMatchObject({ kind: 'error', code })
  })

  it('a thrown network error becomes a network outcome, not an exception', async () => {
    const auth = fakeAuth({ signUp: vi.fn(async () => { throw new TypeError('Failed to fetch') }) })
    expect(await createAccount(auth, creds)).toMatchObject({ kind: 'error', code: 'network' })
  })

  it('passes the Turnstile token and the redirect to signUp', async () => {
    const auth = fakeAuth()
    await createAccount(auth, { ...creds, captchaToken: 'tok', redirectTo: 'https://x.test/auth/confirm?next=/create' })
    expect(auth.signUp).toHaveBeenCalledWith(expect.objectContaining({ options: { captchaToken: 'tok', emailRedirectTo: 'https://x.test/auth/confirm?next=/create' } }))
  })
})

describe('signIn', () => {
  it('success', async () => {
    expect(await signIn(fakeAuth(), creds)).toEqual({ kind: 'signed_in', reused: false })
  })
  it('wrong password: one generic message, whatever Supabase said', async () => {
    for (const m of ['Invalid login credentials', 'invalid credentials']) {
      const auth = fakeAuth({ signInWithPassword: vi.fn(async () => ({ data: { session: null }, error: err(m) })) })
      expect(await signIn(auth, creds)).toEqual({ kind: 'error', code: 'invalid_credentials', message: 'Wrong email or password.' })
    }
  })
  it('unconfirmed e-mail → verify screen (not an error)', async () => {
    const auth = fakeAuth({ signInWithPassword: vi.fn(async () => ({ data: { session: null }, error: err('Email not confirmed') })) })
    expect(await signIn(auth, creds)).toEqual({ kind: 'unverified', email: creds.email })
  })
  it('passes the Turnstile token', async () => {
    const auth = fakeAuth()
    await signIn(auth, { ...creds, captchaToken: 'tok' })
    expect(auth.signInWithPassword).toHaveBeenCalledWith(expect.objectContaining({ options: { captchaToken: 'tok' } }))
  })
})

describe('verify code and resend', () => {
  it('rejects anything that is not 6 digits without calling Supabase', async () => {
    const auth = fakeAuth()
    for (const c of ['', '12345', '1234567', 'abcdef', '12 34 5x']) {
      expect(await verifyCode(auth, { email: creds.email, code: c })).toMatchObject({ ok: false, code: 'code_invalid' })
    }
    expect(auth.verifyOtp).not.toHaveBeenCalled()
  })
  it('accepts spaces in a pasted code', async () => {
    const auth = fakeAuth()
    expect(await verifyCode(auth, { email: creds.email, code: '123 456' })).toEqual({ ok: true })
    expect(auth.verifyOtp).toHaveBeenCalledWith({ email: creds.email, token: '123456', type: 'email' })
  })
  it('falls back to type "signup" once when "email" is not accepted', async () => {
    const verifyOtp = vi.fn()
      .mockResolvedValueOnce({ data: { session: null }, error: err('Token has expired or is invalid') })
      .mockResolvedValueOnce({ data: { session: SESSION }, error: null })
    const auth = fakeAuth({ verifyOtp })
    expect(await verifyCode(auth, { email: creds.email, code: '123456' })).toEqual({ ok: true })
    expect(verifyOtp.mock.calls.map((c) => (c[0] as { type: string }).type)).toEqual(['email', 'signup'])
  })
  it('expired or used code → code_invalid ("send a new code")', async () => {
    const auth = fakeAuth({ verifyOtp: vi.fn(async () => ({ data: { session: null }, error: err('Token has expired or is invalid') })) })
    expect(await verifyCode(auth, { email: creds.email, code: '123456' })).toMatchObject({ ok: false, code: 'code_invalid' })
  })
  it('resend carries the Turnstile token; errors map to codes', async () => {
    const auth = fakeAuth()
    expect(await resendCode(auth, { email: creds.email, captchaToken: 'tok' })).toEqual({ ok: true })
    expect(auth.resend).toHaveBeenCalledWith(expect.objectContaining({ type: 'signup', options: { captchaToken: 'tok' } }))
    const limited = fakeAuth({ resend: vi.fn(async () => ({ error: err('x', { status: 429 }) })) })
    expect(await resendCode(limited, { email: creds.email })).toMatchObject({ ok: false, code: 'rate_limited' })
  })
})

describe('password reset', () => {
  it('carries the Turnstile token and answers the same whether or not the address exists', async () => {
    const auth = fakeAuth()
    expect(await sendReset(auth, { email: creds.email, captchaToken: 'tok', redirectTo: 'https://x.test/r' })).toEqual({ ok: true })
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith(creds.email, { redirectTo: 'https://x.test/r', captchaToken: 'tok' })
    const missing = fakeAuth({ resetPasswordForEmail: vi.fn(async () => ({ error: err('User not found') })) })
    expect(await sendReset(missing, { email: 'nobody@example.com', redirectTo: 'x' })).toEqual({ ok: true })
  })
})

describe('confirmWithTokenHash (the /auth/confirm button)', () => {
  it('verifies on call, for each allowed type', async () => {
    for (const type of ['signup', 'email', 'recovery', 'email_change']) {
      const auth = fakeAuth()
      expect(await confirmWithTokenHash(auth, { tokenHash: 'hash123', type })).toEqual({ ok: true, type })
      expect(auth.verifyOtp).toHaveBeenCalledWith({ token_hash: 'hash123', type })
    }
  })
  it('refuses unknown types, empty or oversized hashes without calling Supabase', async () => {
    const auth = fakeAuth()
    for (const a of [{ tokenHash: '', type: 'email' }, { tokenHash: 'h', type: 'admin' }, { tokenHash: 'h'.repeat(600), type: 'email' }, { tokenHash: 'h', type: '' }]) {
      expect(await confirmWithTokenHash(auth, a)).toMatchObject({ ok: false })
    }
    expect(auth.verifyOtp).not.toHaveBeenCalled()
  })
  it('an expired/used link fails cleanly', async () => {
    const auth = fakeAuth({ verifyOtp: vi.fn(async () => ({ data: { session: null }, error: err('Email link is invalid or has expired') })) })
    expect(await confirmWithTokenHash(auth, { tokenHash: 'h', type: 'email' })).toMatchObject({ ok: false })
  })
})

describe('classifyAuthError', () => {
  it('recognises the messages the app depends on', () => {
    expect(classifyAuthError(err('User already registered')).code).toBe('exists')
    expect(classifyAuthError(err('Email not confirmed')).code).toBe('unconfirmed')
    expect(classifyAuthError(new TypeError('x')).code).toBe('network')
    expect(classifyAuthError(undefined).code).toBe('unknown')
  })
})
