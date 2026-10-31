'use client'

// "My Portfolio" for Pro accounts: is it getting attention, what is working, what to improve next. Traffic numbers come from
// /api/analytics/summary for the chosen period (totals, chart and sources all share it); the checklist is deterministic (no AI call);
// the weekly review is the cached one the dashboard already loads. Empty means empty: no sample data.
import { useEffect, useMemo, useState } from 'react'
import type { PortfolioContent } from '@/components/templates/Minimal'
import type { AnalyticsSummary } from '@/lib/analytics/summary'
import { comparisonLabel, portfolioIntelligence, type WeeklyInsight } from '@/lib/dashboard/intelligence'

type Metric = 'views' | 'visitors'

export interface ProOverviewProps {
  portfolioId: string
  userId: string
  token: string | null
  slug: string
  portfolioUrl: string
  content: Partial<PortfolioContent>
  insight: WeeklyInsight | null
  insightLoading: boolean
  /** When the portfolio was last saved; a review older than this was written before the latest changes. */
  contentUpdatedAt?: string | null
  onEdit: (targetId: string) => void
}

const card = 'bg-white border border-gray-200 rounded-2xl p-5'
const heading = 'text-xs font-semibold uppercase tracking-[0.08em] text-gray-500'
const ghost = 'min-h-[44px] px-4 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-800 hover:bg-gray-50 inline-flex items-center justify-center'
const primary = 'min-h-[44px] px-5 rounded-full bg-[#0A66C2] text-sm font-semibold text-white hover:bg-[#084D9A] inline-flex items-center justify-center'

const fmtDay = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' })

function Stat({ label, value, note }: { label: string; value: number | string | null; note: string }) {
  return (
    <div className={card}>
      <p className={heading}>{label}</p>
      <p className="mt-2 text-3xl font-semibold text-gray-900">{value === null ? '–' : typeof value === 'number' ? value.toLocaleString() : value}</p>
      <p className="mt-1 text-xs text-gray-500">{note}</p>
    </div>
  )
}

export default function ProOverview({ portfolioId, userId, token, slug, portfolioUrl, content, insight, insightLoading, contentUpdatedAt, onEdit }: ProOverviewProps) {
  const [period, setPeriod] = useState<'7' | '30'>('30')
  const [metric, setMetric] = useState<Metric>('views')
  const [data, setData] = useState<AnalyticsSummary | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'unavailable'>('loading')
  const [picked, setPicked] = useState<number | null>(null)
  const [share, setShare] = useState(false)
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    const ctl = new AbortController()
    setState('loading'); setPicked(null)
    fetch(`/api/analytics/summary?portfolioId=${encodeURIComponent(portfolioId)}&userId=${encodeURIComponent(userId)}&period=${period}`, {
      headers: { Authorization: `Bearer ${token}` }, signal: ctl.signal,
    })
      .then(async (r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<AnalyticsSummary> })
      .then((d) => { setData(d); setState('ready') })
      .catch((e) => { if ((e as Error).name !== 'AbortError') setState('unavailable') })
    return () => ctl.abort()
  }, [portfolioId, userId, token, period])

  const quality = useMemo(() => portfolioIntelligence(content), [content])
  const series = data ? (metric === 'views' ? data.viewsByDay : data.visitorsByDay) : []
  const max = Math.max(1, ...series)
  const prev = data?.hasComparison ? data.previous : null
  const label = period === '7' ? 'last 7 days' : 'last 30 days'
  const down = state === 'unavailable'
  const topSource = data && state === 'ready' && data.topSources.length > 0 ? data.topSources[0] : null
  // "Direct" is every visit that did not say where it came from: a typed address, but also WhatsApp, Instagram, Telegram and e-mail, which hide it.
  const sourceNote = topSource
    ? topSource.label === 'Direct'
      ? `${topSource.count} of ${data?.totalViews ?? 0} visits. Includes WhatsApp, Instagram and email, which hide where a click came from`
      : `${topSource.count} of ${data?.totalViews ?? 0} visits (${topSource.pct}%)`
    : ''
  const countryNote = !data || state !== 'ready' ? '' : data.countryKnownVisitors === 0
    ? 'Country not known for these visits yet'
    : `${data.topCountries.slice(0, 2).map((c) => c.label).join(', ')}. Known for ${data.countryKnownVisitors} of ${data.totalUniqueVisitors} visitors`
  const empty = state === 'ready' && data !== null && data.eventCount === 0

  const copy = () => {
    try { void navigator.clipboard.writeText(portfolioUrl); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* clipboard blocked */ }
  }
  const qr = (size: number) => `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(portfolioUrl)}&color=0A66C2&bgcolor=ffffff&qzone=2`
  const downloadQr = async () => {
    try {
      const blob = await (await fetch(`${qr(600)}&format=png`)).blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob); a.download = `${slug}-portfolio-qr.png`; a.click(); URL.revokeObjectURL(a.href)
    } catch { /* offline */ }
  }

  // arrow keys (and Home/End) move between the bars; Tab also works
  const moveBar = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const bars = Array.from(e.currentTarget.parentElement?.children ?? []) as HTMLElement[]
    const at = bars.indexOf(e.currentTarget)
    const to = e.key === 'ArrowRight' ? at + 1 : e.key === 'ArrowLeft' ? at - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? bars.length - 1 : -1
    if (to < 0 || to >= bars.length) return
    e.preventDefault()
    bars[to].focus()
  }

  const next = quality.next
  const missing = (g: typeof quality.groups[number]) => g.checks.filter((c) => !c.complete)

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">My portfolio</h2>
          <p className="text-sm text-gray-600">Published · <span className="break-all">{portfolioUrl.replace(/^https?:\/\//, '')}</span></p>
        </div>
        <div className="flex gap-2">
          <a href={portfolioUrl} target="_blank" rel="noopener noreferrer" className={ghost}>View portfolio</a>
          <button type="button" className={primary} aria-expanded={share} onClick={() => setShare((s) => !s)}>Share</button>
        </div>
      </div>

      {share && (
        <section aria-label="Share your portfolio" className={`${card} flex flex-col gap-4 sm:flex-row sm:items-start`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr(140)} width={140} height={140} alt={`QR code for ${portfolioUrl}`} className="rounded-lg border border-gray-200" />
          <div className="flex flex-col gap-3">
            <p className="text-sm text-gray-700">Print the QR code on your CV or business card, or send the link.</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={primary} onClick={copy}>{copied ? 'Copied' : 'Copy link'}</button>
              <a className={ghost} target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`Check out my portfolio: ${portfolioUrl}`)}`}>WhatsApp</a>
              <a className={ghost} target="_blank" rel="noopener noreferrer" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(portfolioUrl)}`}>LinkedIn</a>
              <a className={ghost} target="_blank" rel="noopener noreferrer" href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`My portfolio: ${portfolioUrl}`)}`}>X</a>
              <a className={ghost} href={`mailto:?subject=${encodeURIComponent('My portfolio')}&body=${encodeURIComponent(portfolioUrl)}`}>Email</a>
              <button type="button" className={ghost} onClick={() => void downloadQr()}>Download QR</button>
            </div>
          </div>
        </section>
      )}

      {/* Attention */}
      <div className="flex items-center justify-between gap-3">
        <h3 className={heading}>Attention</h3>
        <label className="text-sm text-gray-700">
          <span className="sr-only">Period</span>
          <select value={period} onChange={(e) => setPeriod(e.target.value as '7' | '30')} className="min-h-[44px] rounded-xl border border-gray-200 bg-white px-3 text-sm">
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
          </select>
        </label>
      </div>

      {down && (
        <div className={`${card} text-sm text-gray-700`} role="status">Visitor numbers are unavailable right now. Your portfolio is unaffected; try again in a moment.</div>
      )}
      {(
        <>
          {!down && <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-busy={state === 'loading'}>
            <Stat label="Visitors" value={data && state === 'ready' ? data.totalUniqueVisitors : null} note={state === 'loading' ? 'Loading…' : `${data?.totalViews ?? 0} visits · ${comparisonLabel(data?.totalUniqueVisitors ?? 0, prev ? prev.totalUniqueVisitors : null)}`} />
            <Stat label="Top source" value={topSource ? topSource.label : null} note={state === 'loading' ? 'Loading…' : topSource ? sourceNote : 'No visits in this period'} />
            <Stat label="Countries" value={data && state === 'ready' && data.countryKnownVisitors > 0 ? data.topCountries.length : null} note={state === 'loading' ? 'Loading…' : countryNote} />
          </div>}

          <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            {/* Chart */}
            {!down && <section className={card} aria-label="Audience activity">
              <div className="flex items-center justify-between gap-2">
                <h3 className={heading}>Audience activity</h3>
                <div role="group" aria-label="Chart metric" className="flex rounded-full border border-gray-200 p-0.5">
                  {(['views', 'visitors'] as const).map((m) => (
                    <button key={m} type="button" aria-pressed={metric === m} onClick={() => setMetric(m)}
                      className={`min-h-[36px] rounded-full px-3 text-xs font-medium ${metric === m ? 'bg-[#0A66C2] text-white' : 'text-gray-700'}`}>{m === 'views' ? 'Views' : 'Visitors'}</button>
                  ))}
                </div>
              </div>
              {empty ? (
                <p className="mt-6 text-sm text-gray-600">No visits in the {label} yet. Share your link to get the first one.</p>
              ) : (
                <>
                  <div className="mt-4 flex h-36 items-end gap-[3px]" role="list" aria-label={`${metric} per day, ${label}`}>
                    {series.map((v, i) => (
                      <button key={i} type="button" role="listitem" onClick={() => setPicked(i)} onFocus={() => setPicked(i)} onKeyDown={moveBar} onMouseEnter={() => setPicked(i)}
                        aria-label={`${data ? fmtDay(data.days[i]) : ''}: ${v} ${metric}`}
                        className="group relative flex h-full min-w-0 flex-1 items-end focus:outline-none">
                        <span className={`block w-full rounded-t ${picked === i ? 'bg-[#084D9A]' : 'bg-[#0A66C2]/70'} group-focus-visible:ring-2 group-focus-visible:ring-[#0A66C2]`} style={{ height: `${Math.max(v > 0 ? 6 : 2, (v / max) * 100)}%` }} />
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 min-h-[20px] text-sm text-gray-700" role="status" aria-live="polite">
                    {picked !== null && data ? `${fmtDay(data.days[picked])}: ${series[picked]} ${metric}` : 'Hover, tap or use arrow keys on a bar for the day.'}
                  </p>
                </>
              )}
            </section>}

            {/* Next best action */}
            <section className={`${card} flex flex-col`} aria-label="Your next best action">
              <h3 className={heading}>Your next best action</h3>
              {next ? (
                <>
                  <p className="mt-3 text-base font-semibold text-gray-900">{next.title}</p>
                  <p className="mt-1 text-sm text-gray-700">{next.detail}</p>
                  <button type="button" className={`${primary} mt-4 self-start`} onClick={() => onEdit(next.action.targetId)}>{next.cta}</button>
                </>
              ) : (
                <p className="mt-3 text-sm text-gray-700">Nothing is missing.</p>
              )}
            </section>

            {/* Sources */}
            {!down && <section className={card} aria-label="Where attention comes from">
              <h3 className={heading}>Where attention comes from</h3>
              {data && data.topSources.length > 0 ? (
                <ol className="mt-3 space-y-2">
                  {data.topSources.map((s) => (
                    <li key={s.label} className="text-sm text-gray-800">
                      <div className="flex justify-between"><span>{s.label}</span><span className="text-gray-600">{s.count} · {s.pct}%</span></div>
                      <div className="mt-1 h-1.5 rounded-full bg-gray-100"><div className="h-1.5 rounded-full bg-[#0A66C2]" style={{ width: `${s.pct}%` }} /></div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-3 text-sm text-gray-600">{state === 'loading' ? 'Loading…' : 'No visits to attribute in this period.'}</p>
              )}
            </section>}

            {/* Quality */}
            <section className={card} aria-label="Portfolio quality">
              <div className="flex items-baseline justify-between">
                <h3 className={heading}>Portfolio quality</h3>
                <span className="text-sm font-semibold text-gray-900">{quality.score}%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-gray-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={quality.score} aria-label="Content completeness">
                <div className="h-2 rounded-full bg-[#1D9E75]" style={{ width: `${quality.score}%` }} />
              </div>
              <p className="mt-1 text-xs text-gray-500">A checklist of what your portfolio contains ({quality.completed} of {quality.total} done). It stops at 95%, because there is always more to show. It is not a prediction of hiring success.</p>
              <ul className="mt-3 divide-y divide-gray-100">
                {quality.groups.map((g) => (
                  <li key={g.id}>
                    <button type="button" aria-expanded={open === g.id} onClick={() => setOpen(open === g.id ? null : g.id)} className="flex min-h-[44px] w-full items-center justify-between text-left text-sm text-gray-800">
                      <span>{g.label}</span><span className="text-gray-600">{g.score === 100 ? 'Complete' : `${missing(g).length} to do`}</span>
                    </button>
                    {open === g.id && missing(g).length > 0 && (
                      <ul className="pb-2 pl-2">
                        {missing(g).map((c) => (
                          <li key={c.id} className="flex items-center justify-between gap-2 py-1 text-sm text-gray-700">
                            <span>{c.label}</span>
                            <button type="button" className="min-h-[44px] text-sm font-medium text-[#0A66C2] underline" onClick={() => onEdit(c.improvement.action.targetId)}>{c.improvement.cta}</button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}

      {/* Weekly review: only the parts that exist */}
      <section className={card} aria-label="Weekly portfolio review">
        <h3 className={heading}>Weekly portfolio review</h3>
        {insightLoading ? (
          <p className="mt-3 text-sm text-gray-600">Loading your latest review…</p>
        ) : insight ? (
          <div className="mt-3 space-y-3 text-sm text-gray-800">
            {insight.summary && <p className="font-semibold text-gray-900">{insight.summary}</p>}
            {insight.top_strength && <p><span className="font-semibold">Strength: </span>{insight.top_strength}</p>}
            {insight.top_gap && <p><span className="font-semibold">Gap: </span>{insight.top_gap}</p>}
            {(insight.portfolio_actions?.length ?? 0) > 0 && (
              <ul className="list-disc pl-5">{insight.portfolio_actions!.slice(0, 3).map((a, i) => <li key={i}>{a}</li>)}</ul>
            )}
            <p className="text-xs text-gray-500">AI review generated {new Date(insight.scored_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}. It refreshes weekly and is separate from the checklist above.</p>
            {contentUpdatedAt && Date.parse(contentUpdatedAt) > Date.parse(insight.scored_at) + 60_000 && (
              <p className="text-xs font-medium text-amber-800" role="note">You have changed your portfolio since this review, so some advice may already be done.</p>
            )}
          </div>
        ) : (
          <p className="mt-3 text-sm text-gray-600">Your first weekly review will appear here.</p>
        )}
      </section>

      {/* Recent activity */}
      <section className={card} aria-label="Recent activity">
        <div className="flex items-baseline justify-between">
          <h3 className={heading}>Recent activity</h3>
          {data && state === 'ready' && <span className="text-xs text-gray-500">Updated {new Date(data.updatedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>}
        </div>
        {data && data.recentActivity.length > 0 ? (
          <ul className="mt-3 divide-y divide-gray-100">
            {data.recentActivity.map((a, i) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm text-gray-800">
                <span>
                  {a.event_type === 'click' ? `Clicked ${a.label || 'a link'}` : 'Viewed your portfolio'}
                  {[a.company, a.country, a.referrer_source ? `via ${a.referrer_source}` : null].filter(Boolean).length > 0 && (
                    <span className="text-gray-600"> · {[a.company, a.country, a.referrer_source ? `via ${a.referrer_source}` : null].filter(Boolean).join(' · ')}</span>
                  )}
                </span>
                <time className="text-xs text-gray-500" dateTime={a.time}>{new Date(a.time).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</time>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-gray-600">{state === 'loading' ? 'Loading…' : 'No activity in this period.'}</p>
        )}
      </section>
    </div>
  )
}
