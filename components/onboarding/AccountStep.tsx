'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Turnstile from './Turnstile'
import { createAccount, sendReset, signIn } from '@/lib/onboarding/auth-actions'
import { signOutAndClear } from '@/lib/onboarding/draft'
import { getAuth, useFlow } from '@/lib/onboarding/use-flow'
import { getSupabaseClient } from '@/lib/supabase'
import { t } from '@/lib/onboarding/t'

export const VERIFY_EMAIL_KEY = 'lp_verify_email'
const MIN_PASSWORD = 10

export default function AccountStep() {
  const router = useRouter()
  const flow = useFlow('account')
  const [mode, setMode] = useState<'create' | 'signin'>('create')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [captcha, setCaptcha] = useState<string | null>(null)
  const [captchaReset, setCaptchaReset] = useState(0)

  const finishCaptcha = () => setCaptchaReset((n) => n + 1)
  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setNotice('')
    if (!email.includes('@')) { setError(t('errors.unknown')); return }
    if (mode === 'create' && password.length < MIN_PASSWORD) { setError(t('errors.weak_password')); return }
    setBusy(true)
    try {
      const auth = getAuth()
      if (mode === 'create') {
        const out = await createAccount(auth, { email: email.trim(), password, captchaToken: captcha, redirectTo: `${origin}/auth/confirm?next=/create` })
        finishCaptcha()
        if (out.kind === 'signed_in') return void (await flow.goNext())
        if (out.kind === 'verify') {
          try { sessionStorage.setItem(VERIFY_EMAIL_KEY, out.email) } catch {}
          return void router.push('/create/verify')
        }
        if (out.kind === 'existing') { setMode('signin'); setNotice(t('account.existing')); return }
        if (out.kind === 'error') setError(t(`errors.${out.code}`))
      } else {
        const out = await signIn(auth, { email: email.trim(), password, captchaToken: captcha })
        finishCaptcha()
        if (out.kind === 'signed_in') return void (await flow.goNext())
        if (out.kind === 'unverified') {
          try { sessionStorage.setItem(VERIFY_EMAIL_KEY, out.email) } catch {}
          return void router.push('/create/verify')
        }
        if (out.kind === 'error') setError(t(`errors.${out.code}`))
      }
    } finally {
      setBusy(false)
    }
  }

  const reset = async () => {
    setError(''); setNotice('')
    if (!email.includes('@')) { setError(t('errors.unknown')); return }
    setBusy(true)
    const r = await sendReset(getAuth(), { email: email.trim(), captchaToken: captcha, redirectTo: `${origin}/auth/confirm?next=${encodeURIComponent('/reset-password?recovery=1')}` })
    finishCaptcha()
    setBusy(false)
    if (r.ok) setNotice(t('account.resetSent')); else setError(t('errors.unknown'))
  }

  if (flow.loading) return <p className="p-6">…</p>

  // Signed in already (e.g. verified in another tab but sent here): offer to continue rather than create again.
  if (flow.email && flow.state !== 'no_session') {
    return (
      <div className="max-w-md mx-auto p-6">
        <p>{t('account.continueAs', { email: flow.email })}</p>
        <button className="mt-4 underline" onClick={() => signOutAndClear(getSupabaseClient().auth, flow.store).then(() => location.reload())}>
          {t('account.signOut')}
        </button>
      </div>
    )
  }

  return (
    <main className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">{t('account.title')}</h1>
      <div role="tablist" className="flex gap-2 mb-4">
        <button role="tab" aria-selected={mode === 'create'} className="min-h-11 px-3 border rounded" onClick={() => setMode('create')}>{t('account.create')}</button>
        <button role="tab" aria-selected={mode === 'signin'} className="min-h-11 px-3 border rounded" onClick={() => setMode('signin')}>{t('account.signin')}</button>
      </div>
      <form onSubmit={submit} noValidate>
        <label className="block mb-3">{t('account.email')}
          <input className="block w-full border rounded px-3 min-h-11" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="block mb-1">{t('account.password')}
          <input className="block w-full border rounded px-3 min-h-11" type={show ? 'text' : 'password'} autoComplete={mode === 'create' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button type="button" className="text-sm underline min-h-11" onClick={() => setShow((s) => !s)}>{show ? t('account.hide') : t('account.show')}</button>
        {mode === 'create' && <p className="text-sm">{t('account.passwordHint')}</p>}
        <Turnstile onToken={setCaptcha} resetSignal={captchaReset} />
        {notice && <p role="status" className="my-2">{notice}</p>}
        {error && <p role="alert" className="my-2 text-red-700">{error}</p>}
        <button type="submit" disabled={busy} className="w-full min-h-12 border rounded mt-2">{t('account.continue')}</button>
        {mode === 'signin' && <button type="button" onClick={reset} disabled={busy} className="block mt-3 underline min-h-11">{t('account.forgot')}</button>}
        <p className="text-sm mt-4">{t('account.terms')}</p>
      </form>
    </main>
  )
}
