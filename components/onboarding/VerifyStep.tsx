'use client'

import { useEffect, useState } from 'react'
import Turnstile from './Turnstile'
import { resendCode, verifyCode } from '@/lib/onboarding/auth-actions'
import { signOutAndClear } from '@/lib/onboarding/draft'
import { getAuth, useFlow } from '@/lib/onboarding/use-flow'
import { getSupabaseClient } from '@/lib/supabase'
import { t } from '@/lib/onboarding/t'
import { VERIFY_EMAIL_KEY } from './AccountStep'
import FlowShell, { FlowLoading } from './ui/FlowShell'
import { AlertIcon } from './ui/icons'

const COOLDOWN = 60

export default function VerifyStep() {
  const flow = useFlow('verify')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [left, setLeft] = useState(0)
  const [captcha, setCaptcha] = useState<string | null>(null)
  const [captchaReset, setCaptchaReset] = useState(0)

  useEffect(() => {
    try { setEmail(sessionStorage.getItem(VERIFY_EMAIL_KEY) || '') } catch {}
  }, [])
  useEffect(() => { if (!email && flow.email) setEmail(flow.email) }, [email, flow.email])
  // Nothing to verify (no remembered address, no session): back to the start rather than an empty form.
  useEffect(() => {
    if (!flow.loading && !email && !flow.email) { try { if (!sessionStorage.getItem(VERIFY_EMAIL_KEY)) location.replace('/create/account') } catch {} }
  }, [flow.loading, email, flow.email])
  useEffect(() => {
    if (left <= 0) return
    const id = setTimeout(() => setLeft((n) => n - 1), 1000)
    return () => clearTimeout(id)
  }, [left])

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setNotice(''); setBusy(true)
    const r = await verifyCode(getAuth(), { email, code })
    setBusy(false)
    if (r.ok) return void (await flow.goNext())
    setError(t(`errors.${r.code}`))
  }

  const resend = async () => {
    setError(''); setNotice(''); setBusy(true)
    const r = await resendCode(getAuth(), { email, captchaToken: captcha, redirectTo: `${location.origin}/auth/confirm?next=/create` })
    setCaptchaReset((n) => n + 1)
    setBusy(false)
    if (r.ok) { setNotice(t('verify.resent')); setLeft(COOLDOWN) } else setError(t(`errors.${r.code}`))
  }

  if (flow.loading) return <FlowLoading step="account" />
  return (
    <FlowShell step="account">
      <div className="lp-stack">
        <h1 className="lp-title">{t('verify.title')}</h1>
        <p className="lp-lede">{t('verify.body', { email: email || '…' })}</p>
      </div>
      <form onSubmit={confirm} style={{ marginTop: 'var(--lp-s5)' }}>
        <label className="lp-field">
          <span className="lp-label">{t('verify.code')}</span>
          <input className="lp-input lp-code" inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={code} onChange={(e) => setCode(e.target.value)} />
        </label>
        {error && <p role="alert" className="lp-msg lp-msg--error" style={{ marginTop: 'var(--lp-s4)' }}><AlertIcon />{error}</p>}
        {notice && <p role="status" className="lp-msg lp-msg--ok" style={{ marginTop: 'var(--lp-s4)' }}>{notice}</p>}
        <div className="lp-actions">
          <button type="submit" disabled={busy} aria-busy={busy} className="lp-btn lp-btn--primary lp-btn--block">{t('verify.confirm')}</button>
        </div>
      </form>
      <Turnstile onToken={setCaptcha} resetSignal={captchaReset} />
      <div style={{ marginTop: 'var(--lp-s4)', display: 'grid', justifyItems: 'start' }}>
        <button className="lp-link" disabled={busy || left > 0} onClick={resend}>
          {left > 0 ? t('verify.resendIn', { seconds: left }) : t('verify.resend')}
        </button>
        <button className="lp-link" onClick={() => signOutAndClear(getSupabaseClient().auth, flow.store).then(() => (location.href = '/create/account'))}>
          {t('verify.wrongEmail')}
        </button>
      </div>
    </FlowShell>
  )
}
