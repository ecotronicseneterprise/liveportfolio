import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import {
  analyticsWindow, classifyReferrer, summarizeAnalytics,
  type AnalyticsEvent, type AnalyticsSummary,
} from '../lib/analytics/summary'

const h = vi.hoisted(() => ({
  getUser: vi.fn(), from: vi.fn(), entitlements: vi.fn(),
  ownership: vi.fn(), events: vi.fn(), select: vi.fn(), eq: vi.fn(), gte: vi.fn(), lte: vi.fn(),
}))
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ auth: { getUser: h.getUser } }) }))
vi.mock('@/lib/supabase', () => ({ getSupabaseAdmin: () => ({ from: h.from }) }))
vi.mock('@/lib/entitlements', () => ({ entitlements: h.entitlements }))
import { GET } from '../app/api/analytics/summary/route'

const NOW = new Date('2026-03-02T12:34:56.000Z')
const OLD = '2025-01-01T00:00:00.000Z'
const ZERO = { totalViews: 0, totalUniqueVisitors: 0, totalClicks: 0 }
const event = (created_at: string, overrides: Partial<AnalyticsEvent> = {}): AnalyticsEvent => ({
  event_type: 'portfolio_view', label: null, referrer: null, company: null, country: null,
  ip_hash: 'hash-a', device_type: null, created_at, ...overrides,
})
const request = (params = 'portfolioId=p1&userId=u1', authorization: string | null = 'Bearer test-token') => GET(
  new NextRequest(`http://localhost:3101/api/analytics/summary?${params}`, {
    headers: authorization === null ? {} : { authorization },
  }),
)

beforeEach(() => {
  vi.resetAllMocks()
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  h.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
  h.entitlements.mockResolvedValue({ analytics: true })
  h.ownership.mockResolvedValue({ data: { id: 'p1', published_at: OLD }, error: null })
  h.events.mockResolvedValue({ data: [], error: null, count: 0 })
  const query: Record<string, unknown> = { select: h.select, eq: h.eq, gte: h.gte, lte: h.lte, maybeSingle: h.ownership, range: h.events }
  query.order = () => query
  for (const fn of [h.from, h.select, h.eq, h.gte, h.lte]) fn.mockReturnValue(query)
})
afterEach(() => vi.useRealTimers())

describe('UTC analytics periods', () => {
  it.each([
    [7, '2026-02-24T00:00:00.000Z', '2026-02-17T00:00:00.000Z'],
    [30, '2026-02-01T00:00:00.000Z', '2026-01-02T00:00:00.000Z'],
  ] as const)('%i days includes today across month boundaries', (period, start, previousStart) => {
    const window = analyticsWindow(period, NOW)
    expect(window).toMatchObject({ periodDays: period, periodStart: start, periodEnd: NOW.toISOString(), comparisonStart: previousStart, comparisonEnd: start })
    expect(window.days).toHaveLength(period)
    expect(window.days[0]).toBe(start.slice(0, 10))
    expect(window.days.at(-1)).toBe('2026-03-02')
    expect(new Set(window.days).size).toBe(period)
  })
  it('uses UTC rather than local offset, including leap days and year boundaries', () => {
    expect(analyticsWindow(7, new Date('2024-03-01T00:30:00+02:00')).days).toEqual([
      '2024-02-23', '2024-02-24', '2024-02-25', '2024-02-26', '2024-02-27', '2024-02-28', '2024-02-29',
    ])
    expect(analyticsWindow(7, new Date('2026-01-02T00:00:00Z'))).toMatchObject({
      periodStart: '2025-12-27T00:00:00.000Z', comparisonStart: '2025-12-20T00:00:00.000Z',
    })
  })
})

describe('analytics aggregation', () => {
  const window = analyticsWindow(7, NOW)
  it('includes exact boundaries, excludes future/old events, and separates clicks from visitors', () => {
    const result = summarizeAnalytics([
      event('2026-02-16T23:59:59.999Z'),
      event(window.comparisonStart),
      event('2026-02-23T23:59:59.999Z', { event_type: 'click' }),
      event(window.periodStart, { referrer: 'https://www.linkedin.com/feed' }),
      event('2026-02-24T23:00:00Z', { referrer: 'https://linkedin.com/feed' }),
      event('2026-02-25T00:00:00Z'),
      event('2026-03-02T11:00:00Z', { ip_hash: 'hash-b', referrer: 'https://t.co/abc' }),
      event('2026-03-02T12:00:00Z', { event_type: 'click', ip_hash: 'click-only', label: 'Email', referrer: 'https://github.com' }),
      event(window.periodEnd, { ip_hash: '' }),
      event(window.periodEnd, { ip_hash: '   ' }),
      event(window.periodEnd, { ip_hash: null }),
      event('2026-03-02T12:34:56.001Z'),
      event('invalid'),
    ], window, OLD)
    expect(result).toMatchObject({ totalViews: 7, totalUniqueVisitors: 2, totalClicks: 1, eventCount: 8, hasComparison: true,
      previous: { totalViews: 1, totalUniqueVisitors: 1, totalClicks: 1 }, updatedAt: NOW.toISOString() })
    expect(result.viewsByDay).toEqual([2, 1, 0, 0, 0, 0, 4])
    expect(result.visitorsByDay).toEqual([1, 1, 0, 0, 0, 0, 1])
    expect(result.dayLabels).toEqual(['Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon'])
    expect(result.topSources).toEqual([
      { label: 'Direct', count: 4, pct: 57 }, { label: 'LinkedIn', count: 2, pct: 29 }, { label: 'Twitter/X', count: 1, pct: 14 },
    ])
    expect(result.recentActivity).toHaveLength(5)
    expect(result.recentActivity[3]).toEqual({ event_type: 'click', label: 'Email', company: null, country: null, referrer_source: 'GitHub', device_type: null, time: '2026-03-02T12:00:00Z' })
    expect(JSON.stringify(result)).not.toMatch(/hash-a|hash-b|click-only|ip_hash|https:/)
  })
  it('keeps repeated events from one visitor and events without hashes in recent activity', () => {
    const result = summarizeAnalytics(Array.from({ length: 6 }, (_, i) => event(`2026-03-02T0${i}:00:00Z`, { event_type: i % 2 ? 'click' : 'portfolio_view', ip_hash: i === 5 ? null : 'same' })), window, OLD)
    expect(result.recentActivity.map(item => item.time)).toEqual([5, 4, 3, 2, 1].map(i => `2026-03-02T0${i}:00:00Z`))
    expect(result.totalUniqueVisitors).toBe(1)
  })
  it.each([OLD, window.comparisonStart])('reports real zero comparisons only for an established portfolio (%s)', created => {
    const result = summarizeAnalytics([], window, created)
    expect(result).toMatchObject({ ...ZERO, eventCount: 0, hasComparison: true, previous: ZERO, topSources: [], recentActivity: [] })
    expect(result.viewsByDay).toEqual(Array(7).fill(0))
    expect(result.visitorsByDay).toEqual(Array(7).fill(0))
  })
  it.each([null, 'invalid', '2026-02-17T00:00:00.001Z', window.periodStart])('does not infer coverage from absent or present events (%s)', created => {
    for (const events of [[], [event(window.comparisonStart)]]) {
      expect(summarizeAnalytics(events, window, created)).toMatchObject({ hasComparison: false, previous: null })
    }
  })
})

describe('countries', () => {
  const win = analyticsWindow(30, NOW)
  const day = '2026-02-20T10:00:00Z'
  const at = (country: string | null, ip_hash: string | null, over: Partial<AnalyticsEvent> = {}) => event(day, { country, ip_hash, ...over })
  it('counts distinct visitors per country, only where the country is known, and says how many that is', () => {
    const r = summarizeAnalytics([
      at('Nigeria', 'a'), at('Nigeria', 'a'), at('Nigeria', 'b'), at('Ghana', 'c'), at(null, 'd'), at('', 'e'), at('Kenya', null),
    ], win, OLD)
    expect(r.topCountries).toEqual([
      { label: 'Nigeria', count: 2, pct: 67 },
      { label: 'Ghana', count: 1, pct: 33 },
    ])
    expect(r.countryKnownVisitors).toBe(3)
    expect(r.totalUniqueVisitors).toBe(5) // a, b, c, d, e: visitors with an unknown country still count as visitors
  })
  it('ignores clicks and visits outside the period, and is empty when no country is known', () => {
    const r = summarizeAnalytics([at('Nigeria', 'a', { event_type: 'click' }), event('2025-01-01T00:00:00Z', { country: 'Ghana', ip_hash: 'z' })], win, OLD)
    expect(r.topCountries).toEqual([])
    expect(r.countryKnownVisitors).toBe(0)
  })
  it('a visitor seen from two countries is counted in both, never lost', () => {
    const r = summarizeAnalytics([at('Nigeria', 'a'), at('Germany', 'a')], win, OLD)
    expect(r.topCountries.map((x) => x.label).sort()).toEqual(['Germany', 'Nigeria'])
  })
})

describe('referrer host classification', () => {
  it.each([
    [null, 'Direct'], ['', 'Direct'], ['  ', 'Direct'],
    ['https://www.linkedin.com/feed', 'LinkedIn'], ['https://wa.me/123', 'WhatsApp'],
    ['https://web.whatsapp.com', 'WhatsApp'], ['https://t.co/abc', 'Twitter/X'],
    ['https://x.com/name', 'Twitter/X'], ['https://twitter.com/name', 'Twitter/X'],
    ['https://github.com/name', 'GitHub'], ['https://www.google.co.uk/search?q=a', 'Google'],
    ['https://GOOGLE.COM./search', 'Google'], ['https://m.facebook.com', 'Facebook'],
    ['https://example.com/linkedin.com?ref=google.com', 'Other'], ['https://linkedin.com.evil.test', 'Other'],
    ['https://notgithub.com', 'Other'], ['https://x.com@evil.test', 'Other'],
    ['https://google.com.evil.test', 'Other'], ['https://example.com/?q=wa.me', 'Other'],
    ['not a url', 'Other'], ['javascript:linkedin.com', 'Other'],
  ])('%s => %s', (referrer, expected) => expect(classifyReferrer(referrer)).toBe(expected))
})

describe('GET /api/analytics/summary', () => {
  it.each([['', 30], ['&period=30', 30], ['&period=7', 7]])('returns the exported contract for %s from a single bounded event read', async (suffix, period) => {
    const res = await request(`portfolioId=p1&userId=u1${suffix}`)
    expect(res.status).toBe(200)
    const body: AnalyticsSummary = await res.json()
    expect(body).toEqual(summarizeAnalytics([], analyticsWindow(period as 7 | 30, NOW), OLD))
    expect(h.from.mock.calls).toEqual([['portfolios'], ['users'], ['analytics_events']])
    expect(h.select).toHaveBeenCalledWith('id') // the portfolios table has no created_at column
    expect(h.select).toHaveBeenCalledWith('published_at')
    expect(h.eq).toHaveBeenCalledWith('id', 'p1')
    expect(h.eq).toHaveBeenCalledWith('user_id', 'u1')
    expect(h.eq).toHaveBeenCalledWith('portfolio_id', 'p1')
    expect(h.gte).toHaveBeenCalledWith('created_at', body.comparisonStart)
    expect(h.lte).toHaveBeenCalledWith('created_at', body.periodEnd)
    expect(h.events).toHaveBeenCalledTimes(1)
    expect(h.getUser).toHaveBeenCalledWith('test-token')
    expect(h.entitlements).toHaveBeenCalledWith('u1')
  })
  it.each(['', '0', '07', '8', '31', '-7', '7.0', 'abc'])('rejects invalid period=%s', async period => {
    expect((await request(`portfolioId=p1&userId=u1&period=${period}`)).status).toBe(400)
    expect(h.from).not.toHaveBeenCalled()
  })
  it.each(['', 'portfolioId=p1', 'userId=u1'])('requires identifiers (%s)', async params => {
    expect((await request(params)).status).toBe(400)
    expect(h.from).not.toHaveBeenCalled()
  })
  it.each([null, '', 'Basic token', 'test-token', 'Bearer '])('requires a bearer token (%s)', async header => {
    expect((await request(undefined, header)).status).toBe(401)
    expect(h.from).not.toHaveBeenCalled()
  })
  it.each([
    { data: { user: null }, error: null },
    { data: { user: { id: 'u2' } }, error: null },
    { data: { user: { id: 'u1' } }, error: new Error('bad token') },
  ])('rejects invalid or mismatched identities', async auth => {
    h.getUser.mockResolvedValue(auth)
    expect((await request()).status).toBe(401)
    expect(h.from).not.toHaveBeenCalled()
  })
  it('returns 404 for a missing or unowned portfolio', async () => {
    h.ownership.mockResolvedValue({ data: null, error: null })
    expect((await request()).status).toBe(404)
    expect(h.entitlements).not.toHaveBeenCalled()
    expect(h.events).not.toHaveBeenCalled()
  })
  it('requires Pro analytics entitlement', async () => {
    h.entitlements.mockResolvedValue({ analytics: false })
    const res = await request()
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'upgrade_required', feature: 'analytics' })
    expect(h.events).not.toHaveBeenCalled()
  })
  it('asks the portfolios table only for its id: it has no created_at column, and asking for one made every read fail', async () => {
    expect((await request()).status).toBe(200)
    expect(h.select.mock.calls[0]).toEqual(['id'])
  })
  it('uses how long the account has been published for comparison availability', async () => {
    h.ownership.mockResolvedValue({ data: { id: 'p1', published_at: NOW.toISOString() }, error: null })
    expect(await (await request()).json()).toMatchObject({ hasComparison: false, previous: null })
  })
  it.each(['ownership', 'events', 'null-data', 'exception', 'entitlements'])('returns 503 instead of zeros on %s failure', async failure => {
    if (failure === 'ownership') h.ownership.mockResolvedValue({ data: null, error: { message: 'private database details' } })
    if (failure === 'events') h.events.mockResolvedValue({ data: [], error: { message: 'private database details' }, count: 0 })
    if (failure === 'null-data') h.events.mockResolvedValue({ data: null, error: null, count: 0 })
    if (failure === 'exception') h.events.mockRejectedValue(new Error('private database details'))
    if (failure === 'entitlements') h.entitlements.mockRejectedValue(new Error('private database details'))
    const res = await request()
    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ error: 'analytics_unavailable' })
  })
  it('reads every page when there are more than 1,000 events, so a busy portfolio still gets its numbers', async () => {
    const page = (n: number) => Array.from({ length: n }, (_, i) => event('2026-03-01T10:00:00Z', { ip_hash: `h${i % 50}` }))
    h.events.mockResolvedValueOnce({ data: page(1000), error: null }).mockResolvedValueOnce({ data: page(1000), error: null }).mockResolvedValueOnce({ data: page(250), error: null })
    const res = await request()
    expect(res.status).toBe(200)
    expect(h.events).toHaveBeenCalledTimes(3)
    expect(await res.json()).toMatchObject({ totalViews: 2250, totalUniqueVisitors: 50 })
  })
  it('says unavailable, never a partial total, if the data is too large to read', async () => {
    h.events.mockResolvedValue({ data: Array.from({ length: 1000 }, () => event('2026-03-01T10:00:00Z')), error: null })
    const res = await request()
    expect(res.status).toBe(503)
  })
})
