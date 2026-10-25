'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Turnstile from './Turnstile'
import SocialSignIn from './SocialSignIn'
import { createAccount, sendReset, signIn } from '@/lib/onboarding/auth-actions'
import { browserStorage, signOutAndClear } from '@/lib/onboarding/draft'
import { captureAttribution, clearBootcamp, confirmNext, readAttribution } from '@/lib/onboarding/attribution'
import { getAuth, useFlow } from '@/lib/onboarding/use-flow'
import { getSupabaseClient } from '@/lib/supabase'
import { t } from '@/lib/onboarding/t'
import { includedFeatures, newFeatures } from '@/lib/plans'
import FlowShell, { FlowLoading } from './ui/FlowShell'
import { AlertIcon, CheckIcon } from './ui/icons'

export const VERIFY_EMAIL_KEY = 'lp_verify_email'
const MIN_PASSWORD = 10

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

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

  // ?ref= / ?invite= / ?bootcamp= (kept by the /create redirect) are stored here and applied once the account row exists
  const [perk, setPerk] = useState<{ invite: boolean; bootcamp: string | null }>({ invite: false, bootcamp: null })
  useEffect(() => {
    const store = browserStorage()
    captureAttribution(window.location.search, store)
    const a = readAttribution(store)
    setPerk({ invite: !!a.invite?.freePro, bootcamp: a.bootcamp ? a.bootcamp.name : null })
    if (new URLSearchParams(window.location.search).get('mode') === 'signin') setMode('signin')
  }, [])

  // The bootcamp perk is for people who arrive through the bootcamp link. A plain visit (no ?bootcamp=, nobody signed in, no
  // draft in progress) drops any leftover one, so the banner never shows by default and nothing is applied later.
  useEffect(() => {
    if (flow.loading) return
    if (new URLSearchParams(window.location.search).has('bootcamp') || flow.email || flow.draft) return
    clearBootcamp(browserStorage())
    setPerk((p) => (p.bootcamp ? { ...p, bootcamp: null } : p))
  }, [flow.loading, flow.email, flow.draft])

  const nextParam = () => (typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('next'))
  const finishCaptcha = () => setCaptchaReset((n) => n + 1)
  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setNotice('')
    if (!isValidEmail(email)) { setError(t('errors.invalid_email')); return }
    if (mode === 'create' && password.length < MIN_PASSWORD) { setError(t('errors.weak_password')); return }
    setBusy(true)
    try {
      const auth = getAuth()
      if (mode === 'create') {
        const out = await createAccount(auth, { email: email.trim(), password, captchaToken: captcha, redirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(confirmNext(readAttribution(browserStorage()).bootcamp))}` })
        finishCaptcha()
        if (out.kind === 'signed_in') return void (await flow.goNext(nextParam()))
        if (out.kind === 'verify') {
          try { sessionStorage.setItem(VERIFY_EMAIL_KEY, out.email) } catch {}
          return void router.push('/create/verify')
        }
        if (out.kind === 'existing') { setMode('signin'); setNotice(t('account.existing')); return }
        if (out.kind === 'error') setError(t(`errors.${out.code}`))
      } else {
        const out = await signIn(auth, { email: email.trim(), password, captchaToken: captcha })
        finishCaptcha()
        if (out.kind === 'signed_in') return void (await flow.goNext(nextParam()))
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
    if (!isValidEmail(email)) { setError(t('errors.invalid_email')); return }
    setBusy(true)
    const r = await sendReset(getAuth(), { email: email.trim(), captchaToken: captcha, redirectTo: `${origin}/auth/confirm?next=${encodeURIComponent('/reset-password?recovery=1')}` })
    finishCaptcha()
    setBusy(false)
    if (r.ok) setNotice(t('account.resetSent')); else setError(t('errors.unknown'))
  }

  if (flow.loading) return <FlowLoading step="account" />

  // Signed in already (e.g. verified in another tab but sent here): offer to continue rather than create again.
  if (flow.email && flow.state !== 'no_session') {
    return (
      <FlowShell step="account">
        <p className="lp-lede">{t('account.continueAs', { email: flow.email })}</p>
        <div className="lp-actions">
          <button className="lp-btn lp-btn--ghost lp-btn--block" onClick={() => signOutAndClear(getSupabaseClient().auth, flow.store).then(() => location.reload())}>
            {t('account.signOut')}
          </button>
        </div>
      </FlowShell>
    )
  }

  const met = password.length >= MIN_PASSWORD
  return (
    <FlowShell step="account" aside={<ValuePanel />}>
      <div className="lp-stack">
        <h1 className="lp-title">{t('account.title')}</h1>
        <p className="lp-lede">{t('account.lede')}</p>
        {perk.invite && <p role="note" className="lp-msg">{t('account.inviteFree')}</p>}
        {perk.bootcamp && !perk.invite && <p role="note" className="lp-msg">{t('account.bootcamp', { name: perk.bootcamp })}</p>}
        <div role="tablist" className="lp-seg">
          <button role="tab" aria-selected={mode === 'create'} onClick={() => setMode('create')}>{t('account.create')}</button>
          <button role="tab" aria-selected={mode === 'signin'} onClick={() => setMode('signin')}>{t('account.signin')}</button>
        </div>
      </div>
      <form onSubmit={submit} noValidate>
        <label className="lp-field">
          <span className="lp-label">{t('account.email')}</span>
          <input className="lp-input" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <div className="lp-field">
          <label className="lp-label" htmlFor="lp-pw">{t('account.password')}</label>
          <span className="lp-wrap">
            <input id="lp-pw" className="lp-input" type={show ? 'text' : 'password'} autoComplete={mode === 'create' ? 'new-password' : 'current-password'} aria-describedby={mode === 'create' ? 'lp-pw-hint' : undefined} value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" className="lp-reveal-btn" aria-pressed={show} onClick={() => setShow((s) => !s)}>{show ? t('account.hide') : t('account.show')}</button>
          </span>
        </div>
        {mode === 'create' && (
          <p id="lp-pw-hint" className="lp-hint" data-met={met}>
            <CheckIcon />
            {t('account.passwordHint')}
            <span className="lp-count" aria-hidden="true">{Math.min(password.length, MIN_PASSWORD)}/{MIN_PASSWORD}</span>
          </p>
        )}
        <Turnstile onToken={setCaptcha} resetSignal={captchaReset} />
        {notice && <p role="status" className="lp-msg lp-msg--ok" style={{ marginTop: 'var(--lp-s4)' }}>{notice}</p>}
        {error && <p role="alert" className="lp-msg lp-msg--error" style={{ marginTop: 'var(--lp-s4)' }}><AlertIcon />{error}</p>}
        <div className="lp-actions">
          <button type="submit" disabled={busy} aria-busy={busy} className="lp-btn lp-btn--primary lp-btn--block">{t('account.continue')}</button>
        </div>
        {mode === 'signin' && <button type="button" onClick={reset} disabled={busy} className="lp-link" style={{ marginTop: 'var(--lp-s2)' }}>{t('account.forgot')}</button>}
        <p className="lp-fine" style={{ marginTop: 'var(--lp-s4)' }}>{t('account.terms')}</p>
      </form>
      <SocialSignIn next="/create/account" onSignedIn={() => flow.goNext(nextParam())} />
    </FlowShell>
  )
}

/** The calm panel beside the form (laptop only): what a redraft looks like, and what is free versus what publishing adds. Lists come from lib/plans.ts. */
function ValuePanel() {
  return (
    <>
      <div className="lp-sheetdemo" aria-hidden="true">
        <b>{t('account.sampleName')}</b>
        <small>{t('account.sampleRole')}</small>
        <p><del>{t('account.sampleBefore')}</del> <ins>{t('account.sampleAfter')}</ins> {t('account.sampleTail')}</p>
        <p className="lp-demo-note lp-fine">{t('account.sampleNote')}</p>
      </div>
      <div>
        <h2 className="lp-list-title">{t('account.panelFree')}</h2>
        <ul className="lp-ticks">{includedFeatures('free').map((f) => <li key={f.id}><CheckIcon />{f.label}</li>)}</ul>
      </div>
      <div>
        <h2 className="lp-list-title">{t('account.panelPublish')}</h2>
        <ul className="lp-ticks">{newFeatures('basic').map((f) => <li key={f.id}><CheckIcon />{f.label}</li>)}</ul>
      </div>
    </>
  )
}
