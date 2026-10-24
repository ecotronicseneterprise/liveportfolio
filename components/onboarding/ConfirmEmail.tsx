'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { confirmWithTokenHash } from '@/lib/onboarding/auth-actions'
import { safeNext } from '@/lib/onboarding/safe-next'
import { getAuth } from '@/lib/onboarding/use-flow'
import { t } from '@/lib/onboarding/t'

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
    <main className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">{t('confirm.title')}</h1>
      {error && <p role="alert" className="text-red-700 mb-3">{error}</p>}
      <button className="w-full min-h-12 border rounded" disabled={busy || !params?.tokenHash} onClick={confirm}>{t('confirm.button')}</button>
      <a className="block mt-4 underline min-h-11" href="/create/account">{t('confirm.back')}</a>
    </main>
  )
}
