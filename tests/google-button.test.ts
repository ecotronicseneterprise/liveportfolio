// The Google sign-in button: it must look like a button wherever it is shown, and show nothing unless the switch is on.
import fs from 'node:fs'
import path from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SocialSignIn from '../components/onboarding/SocialSignIn'

const render = (appearance?: 'flow' | 'plain') => renderToStaticMarkup(createElement(SocialSignIn, { next: '/dashboard', onSignedIn: () => {}, appearance }))
const read = (p: string) => fs.readFileSync(path.resolve(__dirname, p), 'utf8').replace(/\r\n/g, '\n')

afterEach(() => vi.unstubAllEnvs())

describe('Google sign-in button', () => {
  it('shows nothing when the switch is off', () => {
    vi.stubEnv('NEXT_PUBLIC_SOCIAL_PROVIDERS', '')
    expect(render('flow')).toBe('')
    expect(render('plain')).toBe('')
  })

  it('sign-up flow: a styled ghost button with the Google logo', () => {
    vi.stubEnv('NEXT_PUBLIC_SOCIAL_PROVIDERS', 'google')
    const html = render('flow')
    expect(html).toContain('lp-btn lp-btn--ghost lp-btn--block')
    expect(html).toContain('Continue with Google')
    expect(html).toContain('<svg')
    expect(html).toContain('#4285F4')
  })

  it('sign-in page: styled with Tailwind (that page does not load the flow stylesheet), at least 48px tall, with the logo', () => {
    vi.stubEnv('NEXT_PUBLIC_SOCIAL_PROVIDERS', 'google')
    const html = render('plain')
    expect(html).toContain('Continue with Google')
    expect(html).toContain('min-h-[48px]')
    expect(html).toContain('rounded-full')
    expect(html).toContain('#4285F4')
    expect(html).not.toContain('lp-btn') // those classes have no styles on this page
  })

  it('sign-in page shows only provider buttons, never the emailed-code box', () => {
    vi.stubEnv('NEXT_PUBLIC_SOCIAL_PROVIDERS', 'google,email_otp')
    const html = render('plain')
    expect(html).toContain('Continue with Google')
    expect(html).not.toContain('Email me a code')
  })

  it('an emailed code alone gives the sign-in page nothing to draw', () => {
    vi.stubEnv('NEXT_PUBLIC_SOCIAL_PROVIDERS', 'email_otp')
    expect(render('plain')).toBe('')
  })

  it('the login page asks for the plain look', () => {
    expect(read('../app/login/page.tsx')).toContain('<SocialSignIn appearance="plain"')
  })
})
