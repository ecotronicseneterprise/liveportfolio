'use client'

import { useEffect, useRef, useState } from 'react'
import { checkSlugShape, normalizeSlug } from '@/lib/slug'
import { slugFromName } from '@/lib/onboarding/slugify'
import { useFlow } from '@/lib/onboarding/use-flow'
import { t } from '@/lib/onboarding/t'

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
      if (!token) { location.href = '/create/account'; return }
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      const hasProfile = !!flow.server?.profile
      const res = await fetch(hasProfile ? '/api/account/slug' : '/api/account/profile', { method: 'POST', headers, body: JSON.stringify({ slug }) })
      const j = await res.json().catch(() => ({}))
      if (res.ok) return void (await flow.goNext())
      if (res.status === 409 && j.error === 'slug_taken') { setStatus('taken'); setSuggestions(Array.isArray(j.suggestions) ? j.suggestions : []); return }
      if (res.status === 403 && j.error === 'slug_locked') { setStatus('locked'); return }
      if (res.status === 409 && j.error === 'profile_required') { await flow.refresh(); return }
      setError(j.message || t('errors.unknown'))
    } finally {
      setBusy(false)
    }
  }

  if (flow.loading) return <p className="p-6">…</p>
  const msg =
    status === 'checking' ? t('address.checking')
    : status === 'available' ? t('address.available', { slug })
    : status === 'taken' ? t('address.taken')
    : status === 'reserved' ? t('address.reserved')
    : status === 'invalid' ? t('address.invalid')
    : status === 'locked' ? t('address.locked') : ''
  return (
    <main className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">{t('address.title')}</h1>
      <div className="flex items-center border rounded">
        <span className="px-2">liveportfolio.site/</span>
        <input aria-label="address" className="flex-1 min-h-11 px-2" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30))} />
      </div>
      <p role="status" className="my-2">{msg}</p>
      {suggestions.length > 0 && (status === 'taken' || status === 'reserved') && (
        <p>{t('address.try')} {suggestions.map((s) => <button key={s} className="underline mx-1 min-h-11" onClick={() => setSlug(s)}>{s}</button>)}</p>
      )}
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <button className="w-full min-h-12 border rounded mt-3" disabled={busy || status !== 'available'} onClick={save}>{t('address.save')}</button>
    </main>
  )
}
