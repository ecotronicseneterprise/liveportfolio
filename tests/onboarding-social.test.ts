// Social and passwordless sign-in: flag parsing, rendering, redirects, what is taken from the provider, the return page.
import fs from 'node:fs'
import path from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  decideOAuthReturn, enabledSocial, oauthRedirectTo, providerProfile, sendLoginCode, startOAuth,
} from '../lib/onboarding/social'
import { routeFor, STEP_ALLOWS } from '../lib/onboarding/state'
import type { AuthLike } from '../lib/onboarding/auth-actions'
import SocialSignIn from '../components/onboarding/SocialSignIn'

const ROOT = path.resolve(__dirname, '..')
const err = (message: string, extra: Record<string, unknown> = {}) => ({ message, ...extra })
function fakeAuth(over: Partial<Record<keyof AuthLike, unknown>> = {}) {
  return {
    signInWithOAuth: vi.fn(async () => ({ error: null })),
    signInWithOtp: vi.fn(async () => ({ error: null })),
    ...over,
  } as unknown as AuthLike & { signInWithOAuth: ReturnType<typeof vi.fn>; signInWithOtp: ReturnType<typeof vi.fn> }
}

describe('NEXT_PUBLIC_SOCIAL_PROVIDERS', () => {
  it('is empty by default: nothing is enabled', () => {
    expect(enabledSocial(undefined)).toEqual([])
    expect(enabledSocial('')).toEqual([])
    expect(enabledSocial(' , ,')).toEqual([])
  })
  it('lists only known providers, trimmed, case-insensitive, de-duplicated, in a stable order', () => {
    expect(enabledSocial('github, Google ,github')).toEqual(['google', 'github'])
    expect(enabledSocial('linkedin_oidc,email_otp,facebook,apple,x,twitter')).toEqual(['linkedin_oidc', 'email_otp'])
    expect(enabledSocial('google,github,linkedin_oidc,email_otp')).toEqual(['google', 'github', 'linkedin_oidc', 'email_otp'])
  })
})

describe('the buttons render only for listed providers', () => {
  const html = (env: string | undefined) => {
    if (env === undefined) delete process.env.NEXT_PUBLIC_SOCIAL_PROVIDERS; else process.env.NEXT_PUBLIC_SOCIAL_PROVIDERS = env
    return renderToStaticMarkup(createElement(SocialSignIn, { next: '/create/account', onSignedIn: () => {} }))
  }
  afterEach(() => { delete process.env.NEXT_PUBLIC_SOCIAL_PROVIDERS })

  it('renders nothing at all when the list is empty or unset', () => {
    expect(html(undefined)).toBe('')
    expect(html('')).toBe('')
    expect(html('facebook,apple')).toBe('')
  })
  it('renders exactly the listed buttons', () => {
    const g = html('google')
    expect(g).toContain('Continue with Google')
    expect(g).not.toContain('GitHub')
    expect(g).not.toContain('LinkedIn')
    expect(g).not.toContain('Email me a code')
    const all = html('google,github,linkedin_oidc,email_otp')
    for (const label of ['Continue with Google', 'Continue with GitHub', 'Continue with LinkedIn', 'Email me a code']) expect(all).toContain(label)
    const onlyCode = html('email_otp')
    expect(onlyCode).toContain('Email me a code')
    expect(onlyCode).not.toContain('Continue with')
  })
})

describe('startOAuth', () => {
  const base = { origin: 'https://liveportfolio.site', next: '/create/account' }
  it('sends a same-origin redirectTo with the allow-listed next path', async () => {
    const auth = fakeAuth()
    expect(await startOAuth(auth, { ...base, provider: 'google', enabled: ['google'] })).toEqual({ ok: true })
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: 'https://liveportfolio.site/auth/return?next=%2Fcreate%2Faccount' },
    })
  })
  it('a hostile next never reaches the provider redirect', async () => {
    for (const next of ['https://evil.example', '//evil.example', '/\\evil', '/api/account/profile', 'javascript:alert(1)', '/create/../x']) {
      const url = oauthRedirectTo('https://liveportfolio.site', next)
      expect(url).toBe('https://liveportfolio.site/auth/return?next=%2Fcreate%2Faccount')
    }
    expect(oauthRedirectTo('https://liveportfolio.site/', '/dashboard')).toBe('https://liveportfolio.site/auth/return?next=%2Fdashboard')
  })
  it('refuses a provider that is not listed or not known, without calling Supabase', async () => {
    const auth = fakeAuth()
    expect(await startOAuth(auth, { ...base, provider: 'github', enabled: ['google'] })).toEqual({ ok: false, code: 'not_enabled' })
    expect(await startOAuth(auth, { ...base, provider: 'facebook', enabled: ['google'] })).toEqual({ ok: false, code: 'not_enabled' })
    expect(await startOAuth(auth, { ...base, provider: 'google', enabled: [] })).toEqual({ ok: false, code: 'not_enabled' })
    expect(auth.signInWithOAuth).not.toHaveBeenCalled()
  })
  it('maps provider errors to codes instead of throwing', async () => {
    const limited = fakeAuth({ signInWithOAuth: vi.fn(async () => ({ error: err('x', { status: 429 }) })) })
    expect(await startOAuth(limited, { ...base, provider: 'google', enabled: ['google'] })).toEqual({ ok: false, code: 'rate_limited' })
    const down = fakeAuth({ signInWithOAuth: vi.fn(async () => { throw new TypeError('Failed to fetch') }) })
    expect(await startOAuth(down, { ...base, provider: 'google', enabled: ['google'] })).toEqual({ ok: false, code: 'network' })
  })
})

describe('sendLoginCode ("Email me a code")', () => {
  it('signs in or creates, carries the captcha token and a redirect', async () => {
    const auth = fakeAuth()
    expect(await sendLoginCode(auth, { email: 'a@b.co', captchaToken: 'tok', redirectTo: 'https://x.test/auth/confirm?next=%2Fdashboard' })).toEqual({ ok: true })
    expect(auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'a@b.co',
      options: { shouldCreateUser: true, captchaToken: 'tok', emailRedirectTo: 'https://x.test/auth/confirm?next=%2Fdashboard' },
    })
  })
  it('without a captcha token nothing extra is sent; errors become codes', async () => {
    const auth = fakeAuth()
    await sendLoginCode(auth, { email: 'a@b.co' })
    expect(auth.signInWithOtp).toHaveBeenCalledWith({ email: 'a@b.co', options: { shouldCreateUser: true } })
    const bad = fakeAuth({ signInWithOtp: vi.fn(async () => ({ error: err('captcha verification process failed') })) })
    expect(await sendLoginCode(bad, { email: 'a@b.co' })).toMatchObject({ ok: false, code: 'captcha' })
  })
})

describe('providerProfile: only a validated name and GitHub login, never avatar or provider e-mail', () => {
  const gh = (meta: Record<string, unknown>, providers: string[] = ['github']) => ({ app_metadata: { provider: providers[0], providers }, user_metadata: meta })

  it('Google: the name, nothing else', () => {
    const p = providerProfile({ app_metadata: { provider: 'google' }, user_metadata: { full_name: 'Ada Okonkwo', email: 'x@y.z', avatar_url: 'https://evil.example/p.png', picture: 'https://evil.example/p.png' } })
    expect(p).toEqual({ social: true, name: 'Ada Okonkwo', githubLogin: '' })
    expect(Object.keys(p).sort()).toEqual(['githubLogin', 'name', 'social'])
  })
  it('GitHub: a valid login is passed on, an invalid one is dropped', () => {
    expect(providerProfile(gh({ user_name: 'octocat', full_name: 'The Octocat' })).githubLogin).toBe('octocat')
    expect(providerProfile(gh({ preferred_username: 'a-b' })).githubLogin).toBe('a-b')
    for (const bad of ['../etc', 'a--b', '-a', 'a-', 'x'.repeat(40), 'a b', 'a/b', 'octo?cat', '<script>', '', 5, null, {}]) {
      expect(providerProfile(gh({ user_name: bad })).githubLogin, String(bad)).toBe('')
    }
  })
  it('a login is only taken for a GitHub identity (not Google or LinkedIn)', () => {
    expect(providerProfile(gh({ user_name: 'octocat' }, ['google'])).githubLogin).toBe('')
    expect(providerProfile(gh({ user_name: 'octocat' }, ['linkedin_oidc'])).githubLogin).toBe('')
  })
  it('strips markup and control characters from the name and caps it', () => {
    const p = providerProfile({ app_metadata: { provider: 'google' }, user_metadata: { full_name: '<img src=x onerror=alert(1)>Ada\u0000\nO' + 'x'.repeat(200) } })
    expect(p.name).not.toMatch(/[<>\u0000\n]/)
    expect(p.name.length).toBeLessThanOrEqual(80)
    expect(providerProfile({ app_metadata: { provider: 'google' }, user_metadata: { full_name: { a: 1 }, name: 7 } }).name).toBe('')
  })
  it('a password or e-mail-code account has no social profile at all', () => {
    expect(providerProfile({ app_metadata: { provider: 'email' }, user_metadata: { full_name: 'Ada', user_name: 'octocat' } })).toEqual({ social: false, name: '', githubLogin: '' })
    expect(providerProfile(null)).toEqual({ social: false, name: '', githubLogin: '' })
    expect(providerProfile(undefined)).toEqual({ social: false, name: '', githubLogin: '' })
  })
})

describe('routing after a social sign-in (no users row yet)', () => {
  it('goes to the address step, with no draft', () => {
    expect(routeFor('no_profile', 'none', null, { social: true })).toBe('/create/address')
    expect(routeFor('no_profile', 'none', null, { social: false })).toBe('/create/import')
    expect(routeFor('no_profile', 'none')).toBe('/create/import')
  })
  it('an existing draft wins over the social shortcut; a profile skips it', () => {
    expect(routeFor('no_profile', 'imported', null, { social: true })).toBe('/create/review')
    expect(routeFor('no_portfolio', 'none', null, { social: true })).toBe('/create/import')
  })
  it('the address step accepts a person with no profile (so the redirect cannot loop)', () => {
    expect(STEP_ALLOWS.address).toContain('no_profile')
  })
  it('the verify step accepts "no session" (Confirm email ON: a new sign-up has no session until the code is entered)', () => {
    expect(STEP_ALLOWS.verify).toEqual(expect.arrayContaining(['unverified', 'no_session']))
  })
})

describe('the return page', () => {
  it('goes to an allow-listed next once there is a session', () => {
    expect(decideOAuthReturn({ hasSession: true, providerError: false, timedOut: false, next: '/create/account' })).toEqual({ kind: 'go', to: '/create/account' })
    expect(decideOAuthReturn({ hasSession: true, providerError: false, timedOut: false, next: '/dashboard' })).toEqual({ kind: 'go', to: '/dashboard' })
  })
  it('a hostile next falls back to the account step', () => {
    for (const next of ['https://evil.example', '//evil.example', '/api/x', null, undefined, 5]) {
      expect(decideOAuthReturn({ hasSession: true, providerError: false, timedOut: false, next })).toEqual({ kind: 'go', to: '/create/account' })
    }
  })
  it('a provider error is an error even if a stale session exists; waiting until the timeout, then an error', () => {
    expect(decideOAuthReturn({ hasSession: true, providerError: true, timedOut: false, next: '/create' })).toEqual({ kind: 'error' })
    expect(decideOAuthReturn({ hasSession: false, providerError: false, timedOut: false, next: '/create' })).toEqual({ kind: 'wait' })
    expect(decideOAuthReturn({ hasSession: false, providerError: false, timedOut: true, next: '/create' })).toEqual({ kind: 'error' })
  })
})

describe('wiring', () => {
  const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8')
  it('/login and the account step include the buttons; the return page is not behind the onboarding flag', () => {
    expect(read('app/login/page.tsx')).toMatch(/<SocialSignIn next="\/dashboard"/)
    expect(read('components/onboarding/AccountStep.tsx')).toMatch(/<SocialSignIn next="\/create\/account"/)
    expect(read('app/auth/return/page.tsx')).not.toMatch(/onboardingEnabled/)
  })
  it('the env example lists the variable empty, and nothing is enabled by default', () => {
    expect(read('.env.local.example')).toMatch(/^NEXT_PUBLIC_SOCIAL_PROVIDERS=\s*$/m)
  })
  it('no avatar or provider e-mail is read from provider metadata anywhere in the flow', () => {
    for (const f of ['lib/onboarding/social.ts', 'components/onboarding/SocialSignIn.tsx', 'components/onboarding/OAuthReturn.tsx']) {
      const src = read(f).replace(/\/\/.*$/gm, '')
      expect(src, f).not.toMatch(/avatar_url|picture/)
    }
  })
})
