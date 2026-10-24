'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { draftToGeneratePayload, generateWithRetry } from '@/lib/onboarding/generate'
import { useFlow } from '@/lib/onboarding/use-flow'
import { t } from '@/lib/onboarding/t'

/**
 * Generate step. Safe to reload or retry at any time: /api/generate returns the existing portfolio if one exists,
 * and this step never asks for the password or the form again. The draft is cleared only after success.
 */
export default function GenerateStep() {
  const router = useRouter()
  const flow = useFlow('generate')
  const [phase, setPhase] = useState<'working' | 'failed'>('working')
  const started = useRef(false)

  const run = useCallback(async () => {
    if (!flow.draft || !flow.email) return void router.replace('/create/import')
    setPhase('working')
    const token = await flow.getToken()
    if (!token) return void router.replace('/create/account')
    const body = JSON.stringify(draftToGeneratePayload(flow.draft, flow.email))
    const result = await generateWithRetry(() =>
      fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body }),
    )
    if (!result.ok) {
      if (result.reason === 'unauthorized') return void router.replace('/create/account')
      return setPhase('failed')
    }
    flow.store.clear() // the content now lives in the portfolio; nothing personal stays in localStorage
    // best effort; the route sends only to the signed-in user's own address
    fetch('/api/email/welcome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ portfolioId: result.portfolioId, name: flow.draft.name }),
    }).catch(() => {})
    router.replace(`/preview/${result.portfolioId}`)
  }, [flow, router])

  useEffect(() => {
    if (flow.loading || started.current) return
    started.current = true
    void run()
  }, [flow.loading, run])

  return (
    <main className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">{t('generate.title')}</h1>
      {phase === 'working' && <p role="status">{t('generate.working')}</p>}
      {phase === 'failed' && (
        <>
          <p role="alert">{t('generate.failed')}</p>
          <button className="mt-3 min-h-12 px-4 border rounded" onClick={() => { started.current = true; void run() }}>{t('generate.retry')}</button>
        </>
      )}
    </main>
  )
}
