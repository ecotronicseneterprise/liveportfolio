'use client'

import { useEffect, useState } from 'react'

export interface PortfolioVisit { country: string | null; time: string }
export const VISIT_POLL_MS = 30_000

export function visitAge(time: string, now: number): string {
  const elapsed = now - Date.parse(time)
  if (!Number.isFinite(elapsed) || elapsed < 0) return 'recently'
  if (elapsed < 60_000) return 'just now'
  if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)}m ago`
  if (elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)}h ago`
  return `${Math.floor(elapsed / 86_400_000)}d ago`
}

interface Snapshot { owner: string; visit: PortfolioVisit | null; failed: boolean }

export default function LatestPortfolioVisit({ portfolioId, userId, token }: { portfolioId: string; userId: string; token: string | null }) {
  const owner = `${userId}:${portfolioId}`
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!token) return
    let live = true
    let timer: ReturnType<typeof setTimeout> | undefined
    let controller: AbortController | undefined
    const isVisible = () => document.visibilityState !== 'hidden'
    const refresh = async () => {
      if (!live || !isVisible()) return
      clearTimeout(timer)
      controller?.abort()
      const request = new AbortController()
      controller = request
      try {
        const response = await fetch(`/api/analytics/latest-visit?portfolioId=${encodeURIComponent(portfolioId)}`, {
          headers: { Authorization: `Bearer ${token}` }, signal: request.signal, cache: 'no-store',
        })
        if (!response.ok) throw new Error('Visits unavailable')
        const { visit } = await response.json() as { visit: PortfolioVisit | null }
        if (live && !request.signal.aborted) setSnapshot({ owner, visit, failed: false })
      } catch {
        if (live && !request.signal.aborted) setSnapshot(previous => ({ owner, visit: previous?.owner === owner ? previous.visit : null, failed: true }))
      } finally {
        if (live && !request.signal.aborted) {
          setNow(Date.now())
          if (isVisible()) timer = setTimeout(refresh, VISIT_POLL_MS)
        }
      }
    }
    const visibility = () => {
      if (document.visibilityState === 'hidden') { clearTimeout(timer); controller?.abort() }
      else void refresh()
    }
    void refresh()
    document.addEventListener('visibilitychange', visibility)
    return () => { live = false; clearTimeout(timer); controller?.abort(); document.removeEventListener('visibilitychange', visibility) }
  }, [portfolioId, owner, token])

  const current = token && snapshot?.owner === owner ? snapshot : null
  const visit = current?.visit
  return (
    <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-gray-600" role="status" aria-live="polite" aria-atomic="true" aria-label="Latest portfolio visit">
      {!current ? 'Checking latest visit…' : visit ? <>
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#0A66C2]" aria-hidden="true" />
        <span>{visit.country ? `Someone from ${visit.country} viewed your portfolio` : 'Someone viewed your portfolio'}</span>
        <span aria-hidden="true">·</span>
        <time dateTime={visit.time} title={new Date(visit.time).toLocaleString()}>{visitAge(visit.time, now)}</time>
        {current.failed && <span>· Updates temporarily unavailable</span>}
      </> : current.failed ? 'Visit updates are temporarily unavailable.' : 'No portfolio visits yet.'}
    </p>
  )
}
