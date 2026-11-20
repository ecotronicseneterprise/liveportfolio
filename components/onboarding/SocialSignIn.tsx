'use client'

import { useState } from 'react'
import Turnstile from './Turnstile'
import { verifyCode } from '@/lib/onboarding/auth-actions'
import { enabledSocial, PROVIDER_LABEL, sendLoginCode, startOAuth, type OAuthProvider } from '@/lib/onboarding/social'
import { getAuth } from '@/lib/onboarding/use-flow'
import { t } from '@/lib/onboarding/t'

/**
 * Social and passwordless sign-in. Renders NOTHING unless NEXT_PUBLIC_SOCIAL_PROVIDERS lists something, and only the
 * listed buttons. "Confirm email" must be ON in Supabase before any provider is enabled (docs/social-signin-setup.md).
 */
/** The Google "G" (Google's brand colours), shown on the provider button. */
const GoogleG = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" focusable="false" style={{ flex: 'none' }}>
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 0 1 9.5 24c0-1.59.28-3.14.76-4.59l-7.98-6.19A23.99 23.99 0 0 0 0 24c0 3.77.9 7.35 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
)

/**
 * appearance 'flow' is the account-first onboarding look (lp-* classes, loaded by FlowShell). 'plain' is for pages that do not load that
 * stylesheet (the sign-in page): the same buttons in Tailwind, provider buttons only (no code box).
 */
export default function SocialSignIn({ next, onSignedIn, appearance = 'flow' }: { next: string; onSignedIn: () => void | Promise<void>; appearance?: 'flow' | 'plain' }) {
  const enabled = enabledSocial()
  const [codeMode, setCodeMode] = useState(false)
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [captcha, setCaptcha] = useState<string | null>(null)
  const [captchaReset, setCaptchaReset] = useState(0)

  if (enabled.length === 0) return null

  const oauth = async (provider: OAuthProvider) => {
    setError(''); setBusy(true)
    const r = await startOAuth(getAuth(), { provider, origin: window.location.origin, next, enabled })
    if (!r.ok) { setBusy(false); setError(t(`errors.${r.code === 'not_enabled' ? 'unknown' : r.code}`)) }
    // on success the browser is already leaving for the provider
  }

  const send = async () => {
    setError('')
    if (!email.includes('@')) return setError(t('errors.unknown'))
    setBusy(true)
    const r = await sendLoginCode(getAuth(), { email: email.trim(), captchaToken: captcha, redirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next)}` })
    setCaptchaReset((n) => n + 1)
    setBusy(false)
    if (r.ok) setSent(true); else setError(t(`errors.${r.code}`))
  }

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setBusy(true)
    const r = await verifyCode(getAuth(), { email: email.trim(), code })
    setBusy(false)
    if (r.ok) await onSignedIn(); else setError(t(`errors.${r.code}`))
  }

  const providers = enabled.filter((p): p is OAuthProvider => p !== 'email_otp')
  if (appearance === 'plain') {
    if (providers.length === 0) return null
    return (
      <div>
        <div className="my-5 flex items-center gap-3 text-xs text-gray-400" role="separator"><span className="h-px flex-1 bg-gray-200" />{t('account.or')}<span className="h-px flex-1 bg-gray-200" /></div>
        <div className="grid gap-2">
          {providers.map((p) => (
            <button key={p} type="button" disabled={busy} onClick={() => oauth(p)}
              className="flex min-h-[48px] w-full items-center justify-center gap-3 rounded-full border border-gray-300 bg-white px-6 text-sm font-semibold text-gray-800 transition-colors hover:border-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A66C2] focus-visible:ring-offset-2 disabled:opacity-50">
              {p === 'google' && <GoogleG />}
              {PROVIDER_LABEL[p]}
            </button>
          ))}
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
    )
  }
  return (
    <div>
      <p className="lp-or">{t('account.or')}</p>
      <div className="lp-stack" style={{ display: 'grid', gap: 'var(--lp-s2)' }}>
        {providers.map((p) => (
          <button key={p} type="button" disabled={busy} onClick={() => oauth(p)} className="lp-btn lp-btn--ghost lp-btn--block">
            {p === 'google' && <GoogleG />}
            {PROVIDER_LABEL[p]}
          </button>
        ))}
        {enabled.includes('email_otp') && !codeMode && (
          <button type="button" className="lp-btn lp-btn--ghost lp-btn--block" onClick={() => setCodeMode(true)}>{PROVIDER_LABEL.email_otp}</button>
        )}
      </div>
      {codeMode && !sent && (
        <div className="lp-panel" style={{ marginTop: 'var(--lp-s3)' }}>
          <label className="lp-field">
            <span className="lp-label">{t('account.email')}</span>
            <input className="lp-input" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <Turnstile onToken={setCaptcha} resetSignal={captchaReset} />
          <button type="button" disabled={busy} className="lp-btn lp-btn--primary lp-btn--block" style={{ marginTop: 'var(--lp-s4)' }} onClick={send}>{t('social.sendCode')}</button>
        </div>
      )}
      {codeMode && sent && (
        <form onSubmit={confirm} className="lp-panel" style={{ marginTop: 'var(--lp-s3)' }}>
          <p className="lp-fine" style={{ marginBottom: 'var(--lp-s3)' }}>{t('verify.body', { email })}</p>
          <input aria-label={t('verify.code')} className="lp-input lp-code" inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={code} onChange={(e) => setCode(e.target.value)} />
          <button type="submit" disabled={busy} className="lp-btn lp-btn--primary lp-btn--block" style={{ marginTop: 'var(--lp-s3)' }}>{t('verify.confirm')}</button>
          <button type="button" disabled={busy} className="lp-link" style={{ marginTop: 'var(--lp-s1)' }} onClick={() => { setSent(false); setCode('') }}>{t('social.useAnother')}</button>
        </form>
      )}
      {error && <p role="alert" className="lp-msg lp-msg--error" style={{ marginTop: 'var(--lp-s3)' }}>{error}</p>}
    </div>
  )
}
