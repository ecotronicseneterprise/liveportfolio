'use client'

import { useEffect, useRef, useState } from 'react'
import { checkSlugShape, normalizeSlug } from '@/lib/slug'
import { slugFromName } from '@/lib/onboarding/slugify'
import { accountUrl } from '@/lib/onboarding/state'
import { applyAfterProfile, readAttribution } from '@/lib/onboarding/attribution'
import { browserStorage } from '@/lib/onboarding/draft'
import { useFlow } from '@/lib/onboarding/use-flow'
import { t } from '@/lib/onboarding/t'
import FlowShell, { FlowLoading } from './ui/FlowShell'
import { AlertIcon, CheckIcon } from './ui/icons'

type Status = 'idle' | 'checking' | 'available' | 'taken' | 'reserved' | 'invalid' | 'locked'

/**
 * Address step. Format and reserved words are checked in the browser (instant, exact message); availability comes from
 * /api/check-slug. "Taken" is shown ONLY for reason === 'taken'. Saving creates the users row (POST /api/account/profile,
 * idempotent) or, if one exists and the portfolio was never published, changes the address (POST /api/account/slug).
 */
export default function AddressStep() {
  const flow = useFlow('address')
  const [slug, setSlug] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (flow.loading || slug) return
    // provider name (social sign-in) is only a suggestion; slugFromName always returns a valid slug
    setSlug(flow.server?.slug || slugFromName(flow.draft?.name || flow.provider.name || ''))
  }, [flow.loading, flow.server, flow.draft, flow.provider.name, slug])

  useEffect(() => {
    if (!slug) return setStatus('idle')
    const shape = checkSlugShape(slug)
    if (!shape.ok) { setSuggestions([]); return setStatus(shape.error === 'reserved_slug' ? 'reserved' : 'invalid') }
    if (flow.server?.slug === normalizeSlug(slug)) return setStatus('available')
    setStatus('checking')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/check-slug?slug=${encodeURIComponent(slug)}`)
        const j = await r.json()
        setSuggestions(Array.isArray(j.suggestions) ? j.suggestions : [])
        setStatus(j.available ? 'available' : j.reason === 'taken' ? 'taken' : j.reason === 'reserved' ? 'reserved' : 'invalid')
      } catch {
        setStatus('idle')
      }
    }, 400)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [slug, flow.server?.slug])

  const save = async () => {
    setError(''); setBusy(true)
    try {
      const token = await flow.getToken()
      if (!token) { location.href = accountUrl('/create/address'); return }
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      const hasProfile = !!flow.server?.profile
      const store = browserStorage()
      const referral = hasProfile ? null : readAttribution(store).referral
      const res = await fetch(hasProfile ? '/api/account/slug' : '/api/account/profile', {
        method: 'POST', headers, body: JSON.stringify({ slug, ...(referral ? { referral_code: referral } : {}) }),
      })
      const j = await res.json().catch(() => ({}))
      if (res.ok) {
        // first time only: the users row now exists, so apply the invite / bootcamp link and drop the stored referral
        if (!hasProfile) await applyAfterProfile(fetch, token, flow.userId, store, typeof sessionStorage !== 'undefined' ? sessionStorage : null)
        return void (await flow.goNext())
      }
      if (res.status === 409 && j.error === 'slug_taken') { setStatus('taken'); setSuggestions(Array.isArray(j.suggestions) ? j.suggestions : []); return }
      if (res.status === 403 && j.error === 'slug_locked') { setStatus('locked'); return }
      if (res.status === 409 && j.error === 'profile_required') { await flow.refresh(); return }
      setError(j.message || t('errors.unknown'))
    } finally {
      setBusy(false)
    }
  }

  if (flow.loading) return <FlowLoading step="address" />
  const msg =
    status === 'checking' ? t('address.checking')
    : status === 'available' ? t('address.available', { slug })
    : status === 'taken' ? t('address.taken')
    : status === 'reserved' ? t('address.reserved')
    : status === 'invalid' ? t('address.invalid')
    : status === 'locked' ? t('address.locked') : ''
  return (
    <FlowShell step="address">
      <h1 className="lp-title" style={{ marginBottom: 'var(--lp-s5)' }}>{t('address.title')}</h1>
      <div className="lp-wrap">
        <span className="lp-prefix">liveportfolio.site/</span>
        <input aria-label="address" className="lp-input" autoComplete="off" autoCapitalize="none" spellCheck={false} value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30))} />
      </div>
      <p role="status" className="lp-status" data-state={status}>
        {status === 'available' && <CheckIcon />}
        {(status === 'taken' || status === 'reserved' || status === 'invalid' || status === 'locked') && <AlertIcon />}
        {msg}
      </p>
      {suggestions.length > 0 && (status === 'taken' || status === 'reserved') && (
        <p className="lp-chips">{t('address.try')} {suggestions.map((s) => <button key={s} className="lp-chip" onClick={() => setSlug(s)}>{s}</button>)}</p>
      )}
      {error && <p role="alert" className="lp-msg lp-msg--error" style={{ marginTop: 'var(--lp-s4)' }}><AlertIcon />{error}</p>}
      <div className="lp-actions">
        <button className="lp-btn lp-btn--primary lp-btn--block" disabled={busy || status !== 'available'} aria-busy={busy} onClick={save}>{t('address.save')}</button>
      </div>
    </FlowShell>
  )
}
