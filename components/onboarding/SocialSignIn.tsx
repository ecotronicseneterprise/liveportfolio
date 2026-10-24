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
export default function SocialSignIn({ next, onSignedIn }: { next: string; onSignedIn: () => void | Promise<void> }) {
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
  return (
    <div>
      <p className="lp-or">{t('account.or')}</p>
      <div className="lp-stack" style={{ display: 'grid', gap: 'var(--lp-s2)' }}>
        {providers.map((p) => (
          <button key={p} type="button" disabled={busy} onClick={() => oauth(p)} className="lp-btn lp-btn--ghost lp-btn--block">
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
