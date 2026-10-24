'use client'

import { useEffect, useState } from 'react'
import Turnstile from './Turnstile'
import { resendCode, verifyCode } from '@/lib/onboarding/auth-actions'
import { signOutAndClear } from '@/lib/onboarding/draft'
import { getAuth, useFlow } from '@/lib/onboarding/use-flow'
import { getSupabaseClient } from '@/lib/supabase'
import { t } from '@/lib/onboarding/t'
import { VERIFY_EMAIL_KEY } from './AccountStep'

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

  if (flow.loading) return <p className="p-6">…</p>
  return (
    <main className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-2">{t('verify.title')}</h1>
      <p className="mb-4">{t('verify.body', { email: email || '…' })}</p>
      <form onSubmit={confirm}>
        <label className="block mb-3">{t('verify.code')}
          <input className="block w-full border rounded px-3 min-h-11 tracking-widest" inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={code} onChange={(e) => setCode(e.target.value)} />
        </label>
        {error && <p role="alert" className="text-red-700 mb-2">{error}</p>}
        {notice && <p role="status" className="mb-2">{notice}</p>}
        <button type="submit" disabled={busy} className="w-full min-h-12 border rounded">{t('verify.confirm')}</button>
      </form>
      <Turnstile onToken={setCaptcha} resetSignal={captchaReset} />
      <button className="block mt-4 underline min-h-11" disabled={busy || left > 0} onClick={resend}>
        {left > 0 ? t('verify.resendIn', { seconds: left }) : t('verify.resend')}
      </button>
      <button className="block mt-2 underline min-h-11" onClick={() => signOutAndClear(getSupabaseClient().auth, flow.store).then(() => (location.href = '/create/account'))}>
        {t('verify.wrongEmail')}
      </button>
    </main>
  )
}
