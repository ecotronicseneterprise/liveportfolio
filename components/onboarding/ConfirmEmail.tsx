'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { confirmWithTokenHash } from '@/lib/onboarding/auth-actions'
import { safeNext } from '@/lib/onboarding/safe-next'
import { getAuth } from '@/lib/onboarding/use-flow'
import { t } from '@/lib/onboarding/t'
import FlowShell from './ui/FlowShell'
import { AlertIcon } from './ui/icons'

/**
 * /auth/confirm — the e-mail link target. It shows a button and only verifies on click, so a mail scanner or link
 * prefetcher cannot spend the single-use token. verifyOtp runs in the browser, which stores the session in
 * localStorage (this app's session model). Works for sign-up, e-mail change and password recovery links.
 * Not behind the onboarding flag: Supabase e-mail links must keep working.
 */
export default function ConfirmEmail() {
  const router = useRouter()
  const [params, setParams] = useState<{ tokenHash: string; type: string; next: string } | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    const type = q.get('type') || ''
    setParams({
      tokenHash: q.get('token_hash') || '',
      type,
      next: safeNext(q.get('next'), type === 'recovery' ? '/reset-password?recovery=1' : '/create'),
    })
  }, [])

  const confirm = async () => {
    if (!params) return
    setBusy(true); setError('')
    const r = await confirmWithTokenHash(getAuth(), { tokenHash: params.tokenHash, type: params.type })
    setBusy(false)
    if (r.ok) router.replace(params.next)
    else setError(t('confirm.failed'))
  }

  return (
    <FlowShell>
      <h1 className="lp-title" style={{ marginBottom: 'var(--lp-s5)' }}>{t('confirm.title')}</h1>
      {error && <p role="alert" className="lp-msg lp-msg--error"><AlertIcon />{error}</p>}
      <div className="lp-actions">
        <button className="lp-btn lp-btn--primary lp-btn--block" disabled={busy || !params?.tokenHash} aria-busy={busy} onClick={confirm}>{t('confirm.button')}</button>
      </div>
      <a className="lp-link" style={{ marginTop: 'var(--lp-s3)' }} href="/create/account">{t('confirm.back')}</a>
    </FlowShell>
  )
}
