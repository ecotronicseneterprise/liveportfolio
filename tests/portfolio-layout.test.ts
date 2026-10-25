// The look (content.layout) is saved through the normal save path, so History and undo cover it. Same harness as portfolio-ops.test.ts.
import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  ctx: null as null | ReturnType<typeof import('./helpers/fake-supabase').createFakeDb>,
  user: null as null | { id: string; email: string },
}))
vi.mock('next/cache', () => ({ revalidatePath: () => {} }))
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { getUser: async () => (h.user ? { data: { user: h.user }, error: null } : { data: { user: null }, error: new Error('bad jwt') }) } }),
}))
vi.mock('@/lib/supabase', async () => {
  const { createFakeDb } = await import('./helpers/fake-supabase')
  h.ctx = createFakeDb({ users: ['id', 'slug', 'email'], payments: ['ls_order_id'] })
  const auth = { getUser: async () => (h.user ? { data: { user: { ...h.user, email_confirmed_at: '2026-01-01' } }, error: null } : { data: { user: null }, error: new Error('bad jwt') }) }
  return { getSupabaseAdmin: () => h.ctx!.admin, getSupabaseClient: () => ({ auth }) }
})

import { NextRequest } from 'next/server'
import { PATCH as updatePATCH } from '../app/api/update/route'
import { POST as revPOST } from '../app/api/revisions/route'

const DAY = 24 * 60 * 60 * 1000
let n = 0
const content = () => ({ name: 'Ada', role: 'Engineer', headline: 'Old', about: 'About', email: 'a@b.co', skills: ['Go'], projects: [], experience: [] })
function seed(plan: 'free' | 'pro' = 'free', layout?: unknown) {
  n++
  const id = `user-${n}`
  h.user = { id, email: `u${n}@example.com` }
  h.ctx!.db.users.push({ id, slug: `slug-${n}`, plan: plan === 'free' ? 'unpublished' : 'pro', published_at: null })
  h.ctx!.db.portfolios.push({ id: `pf-${n}`, user_id: id, template: 'minimal', content: { ...content(), ...(layout ? { layout } : {}) }, health_score: 10 })
  if (plan === 'pro') h.ctx!.db.subscriptions.push({ id: `s-${n}`, user_id: id, plan: 'pro', status: 'active', created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 100 * DAY).toISOString() })
}
const req = (url: string, method: string, body?: unknown) =>
  new NextRequest(`http://localhost${url}`, { method, headers: { authorization: 'Bearer t', 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
const patch = (body: unknown) => updatePATCH(req('/api/update', 'PATCH', body))
const rows = (t: string) => h.ctx!.db[t]

beforeEach(() => {
  for (const t of ['users', 'subscriptions', 'portfolios', 'portfolio_revisions']) h.ctx!.db[t] = []
  h.ctx!.failures.length = 0; h.ctx!.missing.clear()
  h.user = null
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('the look is saved through the normal save path, with history and undo', () => {
  it('PATCH /api/update stores the layout, records a revision with the previous look, and undo restores it', async () => {
    seed('free', { v: 1, arrangement: 'profile' })
    const res = await patch({ content: { layout: { v: 1, arrangement: 'proof', accent: 'teal' } }, template: 'creative' })
    expect(res.status).toBe(200)
    expect((await res.json()).changes).toEqual(['Changed look', 'Changed template'])
    expect(rows('portfolios')[0].content.layout).toEqual({ v: 1, arrangement: 'proof', accent: 'teal' })
    expect(rows('portfolios')[0].template).toBe('creative')
    expect(rows('portfolio_revisions')[0].content.layout).toEqual({ v: 1, arrangement: 'profile' }) // the state BEFORE the change
    rows('portfolio_revisions')[0].created_at = '2026-10-26T10:00:00.000Z' // the fake database stamps another column
    const undo = await revPOST(req('/api/revisions', 'POST', { latest: true }))
    expect(undo.status).toBe(200)
    expect(rows('portfolios')[0].content.layout).toEqual({ v: 1, arrangement: 'profile' })
    expect(rows('portfolios')[0].template).toBe('minimal')
  })
  it('a typed set_layout op through the same route works, and an invalid layout is a 400 that writes nothing', async () => {
    seed()
    expect((await patch({ ops: [{ op: 'set_layout', layout: { v: 1, arrangement: 'index' } }] })).status).toBe(200)
    expect(rows('portfolios')[0].content.layout).toEqual({ v: 1, arrangement: 'index' })
    const bad = await patch({ ops: [{ op: 'set_layout', layout: { v: 1, arrangement: 'carousel' } }] })
    expect(bad.status).toBe(400)
    expect(rows('portfolios')[0].content.layout).toEqual({ v: 1, arrangement: 'index' })
  })
  it('going back to the classic design removes the layout (and undo brings it back)', async () => {
    seed('free', { v: 1, arrangement: 'proof' })
    expect((await patch({ ops: [{ op: 'set_layout', layout: null }] })).status).toBe(200)
    expect('layout' in rows('portfolios')[0].content).toBe(false)
    rows('portfolio_revisions')[0].created_at = '2026-10-26T10:00:00.000Z'
    await revPOST(req('/api/revisions', 'POST', { latest: true }))
    expect(rows('portfolios')[0].content.layout).toEqual({ v: 1, arrangement: 'proof' })
  })
  it('a save that does not mention the look leaves it exactly as it was', async () => {
    seed('free', { v: 1, arrangement: 'showcase', density: 'airy' })
    await patch({ content: { headline: 'A new headline' } })
    expect(rows('portfolios')[0].content.layout).toEqual({ v: 1, arrangement: 'showcase', density: 'airy' })
  })
  it('a Pro template is still refused for a free account even with a layout in the content', async () => {
    seed('free')
    const res = await patch({ content: { layout: { v: 1, arrangement: 'proof' } }, template: 'developer' })
    expect(res.status).toBe(403)
    expect(rows('portfolios')[0].template).toBe('minimal')
  })
})
