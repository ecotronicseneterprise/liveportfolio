'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { draftToGeneratePayload, generateWithRetry } from '@/lib/onboarding/generate'
import { useFlow } from '@/lib/onboarding/use-flow'
import { INVITED_FLAG } from '@/lib/onboarding/attribution'
import { accountUrl } from '@/lib/onboarding/state'
import { t } from '@/lib/onboarding/t'
import FlowShell from './ui/FlowShell'
import { AlertIcon } from './ui/icons'

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
    if (!token) return void router.replace(accountUrl('/create/generate'))
    const body = JSON.stringify(draftToGeneratePayload(flow.draft, flow.email))
    const result = await generateWithRetry(() =>
      fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body }),
    )
    if (!result.ok) {
      if (result.reason === 'unauthorized') return void router.replace(accountUrl('/create/generate'))
      return setPhase('failed')
    }
    flow.store.clear() // the content now lives in the portfolio; nothing personal stays in localStorage
    // best effort; the route sends only to the signed-in user's own address
    fetch('/api/email/welcome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ portfolioId: result.portfolioId, name: flow.draft.name }),
    }).catch(() => {})
    // an invite that upgraded the account lands on the preview's "your Pro portfolio is live" banner, as the old wizard did
    let invited = false
    try { invited = sessionStorage.getItem(INVITED_FLAG) === '1'; sessionStorage.removeItem(INVITED_FLAG) } catch {}
    router.replace(`/preview/${result.portfolioId}${invited ? '?invited=true' : ''}`)
  }, [flow, router])

  useEffect(() => {
    if (flow.loading || started.current) return
    started.current = true
    void run()
  }, [flow.loading, run])

  return (
    <FlowShell step="generate">
      <h1 className="lp-title" style={{ marginBottom: 'var(--lp-s5)' }}>{t('generate.title')}</h1>
      {phase === 'working' && (
        <>
          <div className="lp-working"><span className="lp-spinner" aria-hidden="true" /><p role="status" className="lp-lede">{t('generate.working')}</p></div>
          <div className="lp-track" aria-hidden="true"><i /></div>
        </>
      )}
      {phase === 'failed' && (
        <>
          <p role="alert" className="lp-msg lp-msg--error"><AlertIcon />{t('generate.failed')}</p>
          <div className="lp-actions">
            <button className="lp-btn lp-btn--primary lp-btn--block" onClick={() => { started.current = true; void run() }}>{t('generate.retry')}</button>
          </div>
        </>
      )}
    </FlowShell>
  )
}
