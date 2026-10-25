'use client'

// The countdown for free cohort access (a bootcamp or university link): how long is left, what happens at the end, and one way to keep
// the portfolio live. Shown above the dashboard tabs, and only for people who have cohort access (or had it and it has ended without a
// plan). The server decides everything (GET /api/billing); this only draws it. Counts down live: days, then hours in the last two days.
import { useEffect, useState } from 'react'
import { formatNaira } from '@/lib/billing/copy'
import { PLANS } from '@/lib/plans'
import { t } from '@/lib/onboarding/t'

export interface CohortInfo { name: string; ends_at: string; days_left: number; active: boolean }

const HOUR = 3_600_000
const DAY = 24 * HOUR
const COHORT_MS = 183 * DAY // the bar shows how much of the 6 months has gone

/** The big number and its label. Pure so it can be tested. */
export function countdownParts(endsAt: string, now: number): { value: number; unit: 'days' | 'hours' | 'ended' } {
  const ms = new Date(endsAt).getTime() - now
  if (!Number.isFinite(ms) || ms <= 0) return { value: 0, unit: 'ended' }
  if (ms > 2 * DAY) return { value: Math.ceil(ms / DAY), unit: 'days' }
  return { value: Math.max(1, Math.ceil(ms / HOUR)), unit: 'hours' }
}

export default function CohortBanner({ token, onKeep }: { token: string; onKeep: () => void }) {
  const [info, setInfo] = useState<CohortInfo | null>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!token) return
    let live = true
    fetch('/api/billing', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (live && j?.cohort) setInfo(j.cohort as CohortInfo) })
      .catch(() => { /* no banner is better than a broken page */ })
    return () => { live = false }
  }, [token])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  if (!info) return null
  const { value, unit } = countdownParts(info.ends_at, now)
  const date = new Date(info.ends_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const price = formatNaira(PLANS.basic.priceNgn ?? 0)
  const urgent = unit === 'hours' || (unit === 'days' && value <= 14)
  const used = Math.min(100, Math.max(0, Math.round((1 - (new Date(info.ends_at).getTime() - now) / COHORT_MS) * 100)))

  const button = 'inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#0A66C2] px-5 text-sm font-semibold text-white hover:bg-[#084D9A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A66C2] focus-visible:ring-offset-2'

  if (unit === 'ended') {
    return (
      <section aria-labelledby="cohort-h" className="mb-6 rounded-2xl border border-gray-300 bg-white p-5">
        <h2 id="cohort-h" className="text-base font-semibold text-gray-900">{t('cohort.endedTitle', { name: info.name })}</h2>
        <p className="mt-1 text-sm text-gray-700">{t('cohort.endedBody', { price })}</p>
        <div className="mt-3"><button type="button" className={button} onClick={onKeep}>{t('cohort.endedCta')}</button></div>
      </section>
    )
  }

  return (
    <section aria-labelledby="cohort-h" className={`mb-6 rounded-2xl border p-5 ${urgent ? 'border-amber-300 bg-amber-50' : 'border-[#0A66C2]/20 bg-[#E8F0F9]'}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="text-center" role="timer" aria-live="off" aria-label={t(unit === 'days' ? 'cohort.daysLeft' : 'cohort.hoursLeft', { n: value })}>
            <p className="text-4xl font-bold leading-none text-gray-900">{value}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-gray-700">{unit === 'days' ? (value === 1 ? t('cohort.day') : t('cohort.days')) : (value === 1 ? t('cohort.hour') : t('cohort.hours'))}</p>
          </div>
          <div>
            <h2 id="cohort-h" className="text-base font-semibold text-gray-900">{t('cohort.title', { name: info.name })}</h2>
            <p className="mt-0.5 text-sm text-gray-700">{t('cohort.ends', { date })} {t('cohort.keep', { price })}</p>
          </div>
        </div>
        <div className="flex-shrink-0"><button type="button" className={button} onClick={onKeep}>{t('cohort.cta')}</button></div>
      </div>
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white" aria-hidden="true">
        <div className={`h-full rounded-full ${urgent ? 'bg-amber-600' : 'bg-[#0A66C2]'}`} style={{ width: `${used}%` }} />
      </div>
    </section>
  )
}
