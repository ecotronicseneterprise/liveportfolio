import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { visitAge } from '../components/dashboard/LatestPortfolioVisit'

const h = vi.hoisted(() => ({ user: vi.fn(), from: vi.fn(), permissions: vi.fn(), owner: vi.fn(), visit: vi.fn(), select: vi.fn(), eq: vi.fn(), limit: vi.fn() }))
vi.mock('@/lib/server-auth', () => ({ getUserFromRequest: h.user }))
vi.mock('@/lib/supabase', () => ({ getSupabaseAdmin: () => ({ from: h.from }) }))
vi.mock('@/lib/entitlements', () => ({ entitlements: h.permissions }))
import { GET } from '../app/api/analytics/latest-visit/route'

beforeEach(() => {
  vi.resetAllMocks()
  h.user.mockResolvedValue({ id: 'owner' })
  h.permissions.mockResolvedValue({ analytics: true })
  h.owner.mockResolvedValue({ data: { id: 'portfolio' } })
  h.visit.mockResolvedValue({ data: { country: 'Nigeria', created_at: '2026-10-31T10:00:00Z' } })
  const query = { select: h.select, eq: h.eq, limit: h.limit, lte: () => query, order: () => query, maybeSingle: h.owner }
  for (const fn of [h.select, h.eq, h.limit]) fn.mockReturnValue(query)
  h.from.mockImplementation(table => { query.maybeSingle = table === 'portfolios' ? h.owner : h.visit; return query })
})
const get = (query = '?portfolioId=portfolio') => GET(new NextRequest(`http://localhost:3101/api/analytics/latest-visit${query}`))

describe('latest portfolio visit', () => {
  it('returns only a country and timestamp, for the authenticated owner', async () => {
    const response = await get('?portfolioId=portfolio&userId=someone-else')
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ visit: { country: 'Nigeria', time: '2026-10-31T10:00:00Z' } })
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(h.eq).toHaveBeenCalledWith('user_id', 'owner')
    expect(h.eq).toHaveBeenCalledWith('event_type', 'portfolio_view')
    expect(h.select).toHaveBeenCalledWith('country, created_at')
    expect(h.limit).toHaveBeenCalledWith(1)
  })
  it('requires sign-in', async () => {
    h.user.mockResolvedValue(null)
    expect((await get()).status).toBe(401)
    expect(h.from).not.toHaveBeenCalled()
  })
  it('rejects missing IDs and other owners', async () => {
    expect((await get('')).status).toBe(400)
    h.owner.mockResolvedValue({ data: null })
    expect((await get()).status).toBe(404)
    expect(h.visit).not.toHaveBeenCalled()
  })
  it.each(['free', 'basic'])('does not disclose visits to the %s plan', async () => {
    h.permissions.mockResolvedValue({ analytics: false })
    expect((await get()).status).toBe(403)
    expect(h.visit).not.toHaveBeenCalled()
  })
  it('returns an honest empty state and handles unknown countries', async () => {
    h.visit.mockResolvedValue({ data: null })
    expect(await (await get()).json()).toEqual({ visit: null })
    h.visit.mockResolvedValue({ data: { country: '  ', created_at: '2026-10-31T10:00:00Z' } })
    expect(await (await get()).json()).toEqual({ visit: { country: null, time: '2026-10-31T10:00:00Z' } })
  })
  it.each(['ownership', 'visit'])('does not turn a %s database error into no visits', async kind => {
    const failing = kind === 'ownership' ? h.owner : h.visit
    failing.mockResolvedValue({ data: null, error: { message: 'database failure' } })
    const response = await get()
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: 'Visits unavailable' })
  })
})

describe('visit age', () => {
  const now = Date.parse('2026-10-31T12:00:00Z')
  it.each([[0, 'just now'], [59_000, 'just now'], [60_000, '1m ago'], [3_600_000, '1h ago'], [86_400_000, '1d ago']])('labels age %i truthfully', (elapsed, expected) => {
    expect(visitAge(new Date(now - Number(elapsed)).toISOString(), now)).toBe(expected)
  })
  it('does not label invalid or future timestamps just now', () => {
    expect(visitAge('invalid', now)).toBe('recently')
    expect(visitAge(new Date(now + 60_000).toISOString(), now)).toBe('recently')
  })
})
