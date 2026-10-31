export type AnalyticsPeriodDays = 7 | 30

export interface AnalyticsEvent {
  event_type: string
  label: string | null
  referrer: string | null
  company: string | null
  country: string | null
  ip_hash: string | null
  created_at: string
  device_type: string | null
}

export interface AnalyticsTotals {
  totalViews: number
  /** Approximate visitors: distinct nonempty hashes on view events only. */
  totalUniqueVisitors: number
  /** Stored link-click events, not leads or conversions. */
  totalClicks: number
}

export interface AnalyticsWindow {
  periodDays: AnalyticsPeriodDays
  /** Inclusive UTC midnight. */
  periodStart: string
  /** Inclusive request-time cutoff; today is partial. */
  periodEnd: string
  /** Inclusive UTC midnight, periodDays before periodStart. */
  comparisonStart: string
  /** Exclusive UTC midnight, equal to periodStart. */
  comparisonEnd: string
  days: string[]
}

export interface AnalyticsSource {
  label: string
  count: number
  pct: number
}

export interface AnalyticsActivity {
  event_type: string
  label: string | null
  company: string | null
  country: string | null
  referrer_source: string | null
  device_type: string | null
  time: string
}

export interface AnalyticsSummary extends AnalyticsTotals, AnalyticsWindow {
  eventCount: number
  viewsByDay: number[]
  visitorsByDay: number[]
  dayLabels: string[]
  chartPeriod: 'last_7_days' | 'last_30_days'
  topSources: AnalyticsSource[]
  /** Countries by distinct visitor, for the visits whose country is known (the lookup can fail or time out). Never guessed. */
  topCountries: AnalyticsSource[]
  /** Visitors whose country is known: the base for the percentages above, so the page can say how complete the picture is. */
  countryKnownVisitors: number
  /** Latest five events, not deduplicated visitors. */
  recentActivity: AnalyticsActivity[]
  hasComparison: boolean
  previous: AnalyticsTotals | null
  updatedAt: string
}

const DAY_MS = 86_400_000
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function analyticsWindow(periodDays: AnalyticsPeriodDays, now: Date): AnalyticsWindow {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const start = today - (periodDays - 1) * DAY_MS
  const periodStart = new Date(start).toISOString()
  return {
    periodDays,
    periodStart,
    periodEnd: now.toISOString(),
    comparisonStart: new Date(start - periodDays * DAY_MS).toISOString(),
    comparisonEnd: periodStart,
    days: Array.from({ length: periodDays }, (_, i) => new Date(start + i * DAY_MS).toISOString().slice(0, 10)),
  }
}

export function classifyReferrer(referrer: string | null): string {
  if (!referrer?.trim()) return 'Direct'
  let host: string
  try {
    const url = new URL(referrer)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return 'Other'
    host = url.hostname.toLowerCase().replace(/\.$/, '')
  } catch {
    return 'Other'
  }
  const matches = (domain: string) => host === domain || host.endsWith(`.${domain}`)
  if (matches('linkedin.com')) return 'LinkedIn'
  if (matches('wa.me') || matches('whatsapp.com')) return 'WhatsApp'
  if (matches('twitter.com') || matches('x.com') || matches('t.co')) return 'Twitter/X'
  if (matches('github.com')) return 'GitHub'
  if (/(^|\.)google\.(com|[a-z]{2}|com\.[a-z]{2}|co\.[a-z]{2})$/.test(host)) return 'Google'
  if (matches('facebook.com') || matches('fb.com') || matches('fb.me')) return 'Facebook'
  return 'Other'
}

function uniqueVisitors(events: AnalyticsEvent[]): number {
  return new Set(events.map(event => event.ip_hash?.trim()).filter(Boolean)).size
}

function totals(events: AnalyticsEvent[]): AnalyticsTotals {
  const views = events.filter(event => event.event_type === 'portfolio_view')
  return {
    totalViews: views.length,
    totalUniqueVisitors: uniqueVisitors(views),
    totalClicks: events.filter(event => event.event_type === 'click').length,
  }
}

export function summarizeAnalytics(
  events: AnalyticsEvent[],
  window: AnalyticsWindow,
  portfolioCreatedAt: string | null,
): AnalyticsSummary {
  const start = Date.parse(window.periodStart)
  const end = Date.parse(window.periodEnd)
  const comparisonStart = Date.parse(window.comparisonStart)
  const current = events.filter(event => {
    const time = Date.parse(event.created_at)
    return time >= start && time <= end
  }).sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
  const previousEvents = events.filter(event => {
    const time = Date.parse(event.created_at)
    return time >= comparisonStart && time < start
  })
  const hasComparison = portfolioCreatedAt !== null && Date.parse(portfolioCreatedAt) <= comparisonStart
  const views = current.filter(event => event.event_type === 'portfolio_view')
  const dailyViews = window.days.map(day => views.filter(event => new Date(event.created_at).toISOString().slice(0, 10) === day))
  const sources = new Map<string, number>()
  for (const event of views) {
    const source = classifyReferrer(event.referrer)
    sources.set(source, (sources.get(source) ?? 0) + 1)
  }
  // Countries: distinct visitors per country, only where the country is actually known.
  const countryVisitors = new Map<string, Set<string>>()
  const knownVisitors = new Set<string>()
  for (const event of views) {
    const country = event.country?.trim()
    const visitor = event.ip_hash?.trim()
    if (!country || !visitor) continue
    knownVisitors.add(visitor)
    const set = countryVisitors.get(country) ?? new Set<string>()
    set.add(visitor)
    countryVisitors.set(country, set)
  }

  return {
    ...window,
    ...totals(current),
    eventCount: current.length,
    viewsByDay: dailyViews.map(day => day.length),
    visitorsByDay: dailyViews.map(uniqueVisitors),
    dayLabels: window.days.map(day => DAY_NAMES[new Date(`${day}T00:00:00Z`).getUTCDay()]),
    chartPeriod: window.periodDays === 7 ? 'last_7_days' : 'last_30_days',
    topSources: [...sources.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([label, count]) => ({ label, count, pct: Math.round(count / views.length * 100) })),
    topCountries: [...countryVisitors.entries()]
      .map(([label, visitors]) => ({ label, count: visitors.size, pct: Math.round(visitors.size / knownVisitors.size * 100) }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
    countryKnownVisitors: knownVisitors.size,
    recentActivity: current.slice(0, 5).map(event => ({
      event_type: event.event_type,
      label: event.label ?? null,
      company: event.company ?? null,
      country: event.country ?? null,
      referrer_source: event.referrer?.trim() ? classifyReferrer(event.referrer) : null,
      device_type: event.device_type ?? null,
      time: event.created_at,
    })),
    hasComparison,
    previous: hasComparison ? totals(previousEvents) : null,
    updatedAt: window.periodEnd,
  }
}
