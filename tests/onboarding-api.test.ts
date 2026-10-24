// Server side of the new flow: /api/account/state, /api/account/slug, /api/check-slug reason codes, the per-user usage
// limiter and the auth guard on /api/import and /api/parse-cv. Supabase is an in-memory fake.
import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  ctx: null as null | ReturnType<typeof import('./helpers/fake-supabase').createFakeDb>,
  tokenUser: null as null | { id: string; email: string | null; email_confirmed_at: string | null },
  revalidated: [] as string[],
}))

vi.mock('next/cache', () => ({ revalidatePath: (p: string) => { h.revalidated.push(p) } }))
vi.mock('@/lib/supabase', async () => {
  const { createFakeDb } = await import('./helpers/fake-supabase')
  h.ctx = createFakeDb()
  return {
    getSupabaseAdmin: () => h.ctx!.admin,
    getSupabaseClient: () => ({
      auth: { getUser: async () => (h.tokenUser ? { data: { user: h.tokenUser }, error: null } : { data: { user: null }, error: new Error('bad jwt') }) },
    }),
  }
})
vi.mock('@/lib/connectors/document', () => ({
  importDocument: async () => ({ profile: { name: 'Ada', role: 'Engineer', skills: ['Go'], projects: [], experience: [], education: [], certifications: [] } }),
  importText: async () => ({ profile: {} }),
}))

import { NextRequest } from 'next/server'
import { GET as stateGET } from '../app/api/account/state/route'
import { POST as slugPOST } from '../app/api/account/slug/route'
import { GET as checkSlugGET } from '../app/api/check-slug/route'
import { POST as parseCvPOST } from '../app/api/parse-cv/route'
import { checkAndRecordUsage } from '../lib/usage'

const DAY = 24 * 60 * 60 * 1000
let n = 0
const req = (url: string, init: RequestInit & { token?: string | null } = {}) => {
  const { token = 't', ...rest } = init
  const headers = new Headers(rest.headers)
  if (token) headers.set('authorization', `Bearer ${token}`)
  return new NextRequest(`http://localhost${url}`, { ...rest, headers } as never)
}
const json = (url: string, body: unknown, token: string | null = 't') =>
  req(url, { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers: { 'content-type': 'application/json' }, token })

beforeEach(() => {
  n++
  const c = h.ctx!
  for (const k of Object.keys(c.db)) c.db[k] = []
  c.failures.length = 0
  c.missing.clear()
  h.revalidated = []
  h.tokenUser = { id: `u-${n}`, email: `u${n}@example.com`, email_confirmed_at: '2026-01-01' }
  delete process.env.REQUIRE_AUTH_FOR_LLM
})
const user = () => h.tokenUser!.id
const addUser = (o: Record<string, unknown> = {}) => h.ctx!.db.users.push({ id: user(), email: h.tokenUser!.email, slug: 'ada-dev', published_at: null, plan: 'unpublished', ...o })

describe('GET /api/account/state', () => {
  it('401 without a valid token', async () => {
    h.tokenUser = null
    expect((await stateGET(req('/api/account/state'))).status).toBe(401)
    expect((await stateGET(req('/api/account/state', { token: null }))).status).toBe(401)
  })
  it('authenticated but no users row → profile:false (the stranded-signup case)', async () => {
    const j = await (await stateGET(req('/api/account/state'))).json()
    expect(j).toEqual({ emailVerified: true, profile: false, slug: null, published: false, portfolioId: null })
  })
  it('profile without a portfolio, then with one', async () => {
    addUser()
    expect(await (await stateGET(req('/api/account/state'))).json()).toMatchObject({ profile: true, slug: 'ada-dev', portfolioId: null, published: false })
    h.ctx!.db.portfolios.push({ id: 'pf1', user_id: user() })
    expect(await (await stateGET(req('/api/account/state'))).json()).toMatchObject({ portfolioId: 'pf1' })
  })
  it('reports unverified e-mail and published state; never caches', async () => {
    h.tokenUser!.email_confirmed_at = null
    addUser({ published_at: '2026-02-01' })
    const res = await stateGET(req('/api/account/state'))
    expect(await res.json()).toMatchObject({ emailVerified: false, published: true })
    expect(res.headers.get('cache-control')).toBe('no-store')
  })
  it('a database error is a 500, not a false "no profile"', async () => {
    h.ctx!.failures.push({ table: 'users', op: 'select' })
    expect((await stateGET(req('/api/account/state'))).status).toBe(500)
  })
})

describe('POST /api/account/slug (change only while never published)', () => {
  it('401 / bad body / bad format', async () => {
    h.tokenUser = null
    expect((await slugPOST(json('/api/account/slug', { slug: 'new-one' }))).status).toBe(401)
    h.tokenUser = { id: `u-${++n}`, email: 'a@b.co', email_confirmed_at: 'x' }
    expect((await slugPOST(json('/api/account/slug', '{oops'))).status).toBe(400)
    expect((await slugPOST(json('/api/account/slug', 'null'))).status).toBe(400)
    const bad = await slugPOST(json('/api/account/slug', { slug: 'ada-' }))
    expect(bad.status).toBe(400)
    expect((await bad.json()).error).toBe('invalid_slug')
    const reserved = await slugPOST(json('/api/account/slug', { slug: 'create' }))
    expect((await reserved.json()).error).toBe('reserved_slug')
  })

  it('no users row → 409 profile_required (it never creates one)', async () => {
    const res = await slugPOST(json('/api/account/slug', { slug: 'new-one' }))
    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe('profile_required')
    expect(h.ctx!.db.users).toHaveLength(0)
  })

  it('changes the address while published_at is null and refreshes both paths', async () => {
    addUser()
    const res = await slugPOST(json('/api/account/slug', { slug: 'ada-okonkwo' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ slug: 'ada-okonkwo', changed: true })
    expect(h.ctx!.db.users[0].slug).toBe('ada-okonkwo')
    expect(h.revalidated).toEqual(expect.arrayContaining(['/portfolio/ada-dev', '/ada-dev', '/portfolio/ada-okonkwo', '/ada-okonkwo']))
  })

  it('locked once published', async () => {
    addUser({ published_at: '2026-02-01', plan: 'pro' })
    const res = await slugPOST(json('/api/account/slug', { slug: 'other-name' }))
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBe('slug_locked')
    expect(h.ctx!.db.users[0].slug).toBe('ada-dev')
  })

  it('a lapsed customer (plan reset to "unpublished" by the expiry cron, published_at still set) stays locked', async () => {
    addUser({ plan: 'unpublished', published_at: '2025-06-01' })
    expect((await slugPOST(json('/api/account/slug', { slug: 'new-name' }))).status).toBe(403)
    expect(h.ctx!.db.users[0].slug).toBe('ada-dev')
  })

  it('the gate is part of the UPDATE: publishing between the read and the write still blocks the change', async () => {
    addUser()
    const users = h.ctx!.db.users
    // simulate the race: the row is published right after the route has read it as unpublished
    const original = h.ctx!.admin.from
    let reads = 0
    h.ctx!.admin.from = ((t: string) => {
      const q = original(t)
      if (t === 'users') {
        const maybe = q.maybeSingle
        q.maybeSingle = async () => {
          const r = await maybe()
          if (++reads === 1) users[0].published_at = '2026-03-01'
          return { ...r, data: r.data ? { ...r.data, published_at: null } : r.data }
        }
      }
      return q
    }) as typeof original
    const res = await slugPOST(json('/api/account/slug', { slug: 'sneaky-name' }))
    h.ctx!.admin.from = original
    expect(res.status).toBe(403)
    expect(users[0].slug).toBe('ada-dev')
  })

  it('same slug is a no-op; a taken slug is 409 with suggestions', async () => {
    addUser()
    expect(await (await slugPOST(json('/api/account/slug', { slug: 'ada-dev' }))).json()).toEqual({ slug: 'ada-dev', changed: false })
    h.ctx!.db.users.push({ id: 'other', slug: 'taken-one', email: 'o@x.co' })
    const res = await slugPOST(json('/api/account/slug', { slug: 'taken-one' }))
    expect(res.status).toBe(409)
    const j = await res.json()
    expect(j.error).toBe('slug_taken')
    expect(j.suggestions.length).toBeGreaterThan(0)
  })

  it('a unique-violation race is a 409, other database errors a 500 without details', async () => {
    addUser()
    h.ctx!.failures.push({ table: 'users', op: 'update', code: '23505' })
    expect((await slugPOST(json('/api/account/slug', { slug: 'race-one' }))).status).toBe(409)
    h.ctx!.failures.push({ table: 'users', op: 'update', code: 'XX000' })
    const res = await slugPOST(json('/api/account/slug', { slug: 'race-two' }))
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toContain('injected')
  })
})

describe('GET /api/check-slug reason codes (the UI says "taken" only for reason=taken)', () => {
  const check = async (slug: string) => (await checkSlugGET(req(`/api/check-slug?slug=${encodeURIComponent(slug)}`, { headers: { 'x-forwarded-for': `10.0.0.${++n}` } }))).json()

  it('invalid format is "invalid", with the rule in plain words, never "taken"', async () => {
    for (const s of ['ada-', '-ada', 'ab', 'a b', 'ADA!!']) {
      const j = await check(s)
      expect(j).toMatchObject({ available: false, reason: 'invalid' })
      expect(j.message).toMatch(/3-30 characters/)
      expect(JSON.stringify(j)).not.toMatch(/taken/i)
    }
  })
  it('reserved words are "reserved"', async () => {
    const j = await check('create')
    expect(j).toMatchObject({ available: false, reason: 'reserved' })
    expect(j.suggestions.length).toBeGreaterThan(0)
  })
  it('an existing slug is "taken" with free, valid suggestions', async () => {
    h.ctx!.db.users.push({ id: 'x', slug: 'ada-okonkwo' }, { id: 'y', slug: 'ada-okonkwo-1' })
    const j = await check('ada-okonkwo')
    expect(j).toMatchObject({ available: false, reason: 'taken', message: 'That address is taken.' })
    expect(j.suggestions).not.toContain('ada-okonkwo-1')
    expect(j.suggestion).toBe(j.suggestions[0])
  })
  it('a free slug is available, and the old fields still work for the old wizard', async () => {
    expect(await check('brand-new-one')).toEqual({ available: true, reason: null, suggestions: [] })
    expect((await check('create')).suggestion).toBeTruthy() // old wizard reads `suggestion`
  })
})

describe('usage limiter (usage_events)', () => {
  it('allows up to the limit inside the window, then refuses', async () => {
    const admin = h.ctx!.admin as never
    for (let i = 0; i < 3; i++) expect(await checkAndRecordUsage('uA', 'import', 3, DAY, admin, () => 1)).toBe('ok')
    expect(await checkAndRecordUsage('uA', 'import', 3, DAY, admin, () => 1)).toBe('limited')
    expect(h.ctx!.db.usage_events).toHaveLength(3)
  })
  it('is per user and per kind', async () => {
    const admin = h.ctx!.admin as never
    await checkAndRecordUsage('uA', 'import', 1, DAY, admin, () => 1)
    expect(await checkAndRecordUsage('uB', 'import', 1, DAY, admin, () => 1)).toBe('ok')
    expect(await checkAndRecordUsage('uA', 'parse_cv', 1, DAY, admin, () => 1)).toBe('ok')
  })
  it('old rows fall out of the window and the purge deletes rows older than 7 days', async () => {
    const admin = h.ctx!.admin as never
    h.ctx!.db.usage_events = [
      { id: 'o1', user_id: 'uC', kind: 'import', at: new Date(Date.now() - 2 * DAY).toISOString() },
      { id: 'o2', user_id: 'uC', kind: 'import', at: new Date(Date.now() - 9 * DAY).toISOString() },
    ]
    expect(await checkAndRecordUsage('uC', 'import', 1, DAY, admin, () => 0)).toBe('ok') // random=0 → purge runs
    expect(h.ctx!.db.usage_events.map((r) => r.id)).not.toContain('o2')
    expect(h.ctx!.db.usage_events.map((r) => r.id)).toContain('o1')
  })
  it('falls back to the in-process limiter when the table does not exist yet (migration not run)', async () => {
    h.ctx!.missing.add('usage_events')
    const admin = h.ctx!.admin as never
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await checkAndRecordUsage('uFallback', 'import', 2, DAY, admin)).toBe('ok')
    expect(await checkAndRecordUsage('uFallback', 'import', 2, DAY, admin)).toBe('ok')
    expect(await checkAndRecordUsage('uFallback', 'import', 2, DAY, admin)).toBe('limited')
  })
})

describe('LLM routes: authenticated for the new flow, unchanged for the old wizard', () => {
  const upload = (token: string | null) => {
    const fd = new FormData()
    fd.append('file', new File([new Uint8Array([1, 2, 3])], 'cv.pdf', { type: 'application/pdf' }))
    return req('/api/parse-cv', { method: 'POST', body: fd, token, headers: { 'x-forwarded-for': `10.1.0.${++n}` } })
  }

  it('a valid verified user gets through and is counted', async () => {
    const res = await parseCvPOST(upload('t'))
    expect(res.status).toBe(200)
    expect((await res.json()).name).toBe('Ada')
    expect(h.ctx!.db.usage_events).toEqual([expect.objectContaining({ user_id: user(), kind: 'parse_cv' })])
  })
  it('an invalid token is 401 and nothing is parsed or counted', async () => {
    h.tokenUser = null
    expect((await parseCvPOST(upload('bad'))).status).toBe(401)
    expect(h.ctx!.db.usage_events ?? []).toHaveLength(0)
  })
  it('an unverified e-mail is 403', async () => {
    h.tokenUser!.email_confirmed_at = null
    expect((await parseCvPOST(upload('t'))).status).toBe(403)
  })
  it('over the per-user daily limit (5) is 429', async () => {
    for (let i = 0; i < 5; i++) expect((await parseCvPOST(upload('t'))).status).toBe(200)
    expect((await parseCvPOST(upload('t'))).status).toBe(429)
  })
  it('the old wizard (no token) still works while REQUIRE_AUTH_FOR_LLM is off, and is refused when it is on', async () => {
    expect((await parseCvPOST(upload(null))).status).toBe(200)
    process.env.REQUIRE_AUTH_FOR_LLM = 'true'
    const res = await parseCvPOST(upload(null))
    expect(res.status).toBe(401)
    expect((await res.json()).error).toBe('unauthorized')
  })
})
