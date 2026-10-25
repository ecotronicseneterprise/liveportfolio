// Real routes, entitlement resolution and commit/history pipeline; only external services are faked.
import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  ctx: null as null | ReturnType<typeof import('./helpers/fake-supabase').createFakeDb>,
  user: null as null | { id: string; email: string },
  modelReply: {} as Record<string, unknown>,
  modelCalls: 0,
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
vi.mock('openai', () => ({
  default: class {
    chat = { completions: { create: async () => {
      h.modelCalls++
      return { choices: [{ message: { content: JSON.stringify(h.modelReply) } }] }
    } } }
  },
}))

import { NextRequest } from 'next/server'
import { PATCH as updatePATCH } from '../app/api/update/route'
import { POST as revPOST } from '../app/api/revisions/route'
import { POST as generatePOST } from '../app/api/generate/route'
import { PRO_TEMPLATES, type PlanId } from '../lib/plans'

const DAY = 24 * 60 * 60 * 1000
let n = 0
const content = () => ({ name: 'Ada', role: 'Engineer', headline: 'Old', about: 'About', email: 'ada@example.com', skills: ['Go'], projects: [], experience: [] })
const layout = { v: 1, arrangement: 'profile' }
function seed(plan: PlanId = 'free', proDesigns?: unknown, template = 'minimal') {
  const id = `user-${++n}`
  h.user = { id, email: `u${n}@example.com` }
  h.ctx!.db.users.push({ id, slug: `slug-${n}`, plan: plan === 'free' ? 'unpublished' : plan, published_at: null })
  h.ctx!.db.portfolios.push({ id: `pf-${n}`, user_id: id, template, content: { ...content(), layout, ...(proDesigns === undefined ? {} : { pro_designs: proDesigns }) }, health_score: 10 })
  if (plan !== 'free') h.ctx!.db.subscriptions.push({ id: `s-${n}`, user_id: id, plan, status: 'active', created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 100 * DAY).toISOString() })
}
const req = (url: string, method: string, body: unknown) => new NextRequest(`http://localhost${url}`, {
  method, headers: { authorization: 'Bearer t', 'content-type': 'application/json', 'x-forwarded-for': `10.1.0.${++n}` }, body: JSON.stringify(body),
})
const patch = (body: unknown) => updatePATCH(req('/api/update', 'PATCH', body))
const rows = (table: string) => h.ctx!.db[table]
const pf = () => rows('portfolios')[0]
const restore = (revisionId?: string) => revPOST(req('/api/revisions', 'POST', revisionId ? { revision_id: revisionId } : { latest: true }))
function revision(proDesigns?: unknown, template = 'minimal') {
  const row = {
    id: `rev-${++n}`, portfolio_id: pf().id, user_id: h.user!.id, template,
    content: { ...content(), headline: 'Earlier', layout, ...(proDesigns === undefined ? {} : { pro_designs: proDesigns }) },
    created_at: '2026-10-25T10:00:00.000Z',
  }
  rows('portfolio_revisions').push(row)
  return row
}
const saveShapes = [
  { name: 'whole-map', body: (map: unknown) => ({ content: { pro_designs: map } }) },
  { name: 'typed replace_content', body: (map: unknown) => ({ ops: [{ op: 'replace_content', content: { pro_designs: map } }] }) },
]

beforeEach(() => {
  for (const table of ['users', 'subscriptions', 'portfolios', 'portfolio_revisions']) h.ctx!.db[table] = []
  h.ctx!.failures.length = 0
  h.ctx!.missing.clear()
  h.user = null
  h.modelReply = {}
  h.modelCalls = 0
})

describe('Pro design saves use normal history and undo', () => {
  for (const shape of saveShapes) {
    it(`${shape.name}: stores metadata with a before snapshot and restores it`, async () => {
      seed('pro', { finance: 2 })
      const before = JSON.parse(JSON.stringify(pf().content))
      const response = await patch(shape.body({ finance: 2, developer: 2 }))
      expect(response.status).toBe(200)
      const result = await response.json()
      expect(result.changes).toEqual(['Changed pro designs'])
      expect(result.revision_id).toBeTruthy()
      expect(result.revisions).toBe(true)
      expect(result.edit_count).toBe(1)
      expect(pf().content.pro_designs).toEqual({ finance: 2, developer: 2 })
      expect(pf().content.layout).toEqual(layout)
      expect(rows('portfolio_revisions')[0].content).toEqual(before)
      rows('portfolio_revisions')[0].created_at = '2026-10-25T10:00:00.000Z'
      const restored = await restore(result.revision_id)
      expect(restored.status).toBe(200)
      expect((await restored.json()).edit_count).toBe(2)
      expect(pf().edit_count).toBe(2)
      expect(pf().content).toEqual(before)
      expect(rows('portfolio_revisions')).toHaveLength(2)
      expect(rows('portfolio_revisions')[1].source).toBe('restore')
      expect(rows('portfolio_revisions')[1].content.pro_designs).toEqual({ finance: 2, developer: 2 })
    })
  }

  it('typed enable/removal preserves other markers and free layout; latest undo brings the marker back', async () => {
    seed('pro', { finance: 2 })
    expect((await patch({ ops: [{ op: 'set_pro_design', template: 'developer', version: 2 }] })).status).toBe(200)
    const removal = await patch({ ops: [{ op: 'set_pro_design', template: 'developer', version: null }] })
    expect(removal.status).toBe(200)
    expect((await removal.json()).changes).toEqual(['Restored classic developer design'])
    expect(pf().content.pro_designs).toEqual({ developer: 1, finance: 2 })
    expect(pf().content.layout).toEqual(layout)
    rows('portfolio_revisions')[0].created_at = '2026-10-25T09:00:00.000Z'
    rows('portfolio_revisions')[1].created_at = '2026-10-25T10:00:00.000Z'
    expect((await restore()).status).toBe(200)
    expect(pf().content.pro_designs).toEqual({ developer: 2, finance: 2 })
  })

  it.each(['free', 'basic', 'pro'] as const)('omitted metadata survives content edits on %s, including future markers', async (plan) => {
    const markers = { developer: 2, designer: 7, future: 2 }
    seed(plan, markers)
    const testimonials = [{ quote: 'Excellent work', name: 'Colleague' }]
    expect((await patch({ content: { headline: 'New', testimonials } })).status).toBe(200)
    expect((await patch({ ops: [{ op: 'set_field', field: 'role', value: 'Senior engineer' }] })).status).toBe(200)
    expect(pf().content.pro_designs).toEqual(markers)
    expect(pf().content.layout).toEqual(layout)
    expect(pf().content.testimonials).toEqual(testimonials)
    expect(rows('portfolio_revisions')[1].content.pro_designs).toEqual(markers)
  })
})

describe('client snapshot edit counts', () => {
  const designSaves = [
    ...saveShapes.map((shape) => ({ name: shape.name, body: shape.body({ finance: 2, developer: 2 }) })),
    { name: 'typed set_pro_design', body: { ops: [{ op: 'set_pro_design', template: 'developer', version: 2 }] } },
  ]

  for (const shape of designSaves) {
    it(`${shape.name}: rejects a stale snapshot before any write or history, then accepts the current count`, async () => {
      seed('pro', { finance: 2 })
      pf().edit_count = 4
      const before = JSON.stringify(pf())
      // Unconsumed failures prove the stale request never even attempts either write.
      h.ctx!.failures.push({ table: 'portfolios', op: 'update' }, { table: 'portfolio_revisions', op: 'insert' })
      const stale = await patch({ ...shape.body, expected_edit_count: 3 })
      expect(stale.status).toBe(409)
      expect((await stale.json()).error).toBe('conflict')
      expect(JSON.stringify(pf())).toBe(before)
      expect(rows('portfolio_revisions')).toHaveLength(0)
      expect(h.ctx!.failures).toHaveLength(2)
      h.ctx!.failures.length = 0

      const current = await patch({ ...shape.body, expected_edit_count: 4 })
      expect(current.status).toBe(200)
      const result = await current.json()
      expect(result.edit_count).toBe(5)
      expect(result.revision_id).toBeTruthy()
      expect(pf().edit_count).toBe(5)
      expect(pf().content.pro_designs).toEqual({ finance: 2, developer: 2 })
      expect(rows('portfolio_revisions')).toHaveLength(1)
      expect(rows('portfolio_revisions')[0].content.pro_designs).toEqual({ finance: 2 })
    })

    it.each([undefined, null, 0])(`${shape.name}: matches stored count %j exactly, treating missing as null`, async (stored) => {
      seed('pro', { finance: 2 })
      if (stored !== undefined) pf().edit_count = stored
      const expected = stored ?? null
      const before = JSON.stringify(pf())
      const stale = await patch({ ...shape.body, expected_edit_count: expected === null ? 0 : null })
      expect(stale.status).toBe(409)
      expect(JSON.stringify(pf())).toBe(before)
      expect(rows('portfolio_revisions')).toHaveLength(0)

      const current = await patch({ ...shape.body, expected_edit_count: expected })
      expect(current.status).toBe(200)
      expect((await current.json()).edit_count).toBe(1)
      expect(pf().edit_count).toBe(1)
      expect(rows('portfolio_revisions')).toHaveLength(1)
    })

    it(`${shape.name}: keeps omitted expected counts backward-compatible on an already edited portfolio`, async () => {
      seed('pro', { finance: 2 })
      pf().edit_count = 7
      const response = await patch(shape.body)
      expect(response.status).toBe(200)
      expect((await response.json()).edit_count).toBe(8)
      expect(pf().edit_count).toBe(8)
      expect(rows('portfolio_revisions')).toHaveLength(1)
    })

    it.each([-1, 1.5, '0', '4', true, false, [], {}, [4]].map((expected) => ({ expected })))(
      `${shape.name}: rejects invalid expected count $expected without writes`, async ({ expected }) => {
        seed('pro', { finance: 2 })
        pf().edit_count = 4
        const before = JSON.stringify(pf())
        const response = await patch({ ...shape.body, expected_edit_count: expected })
        expect(response.status).toBe(400)
        expect((await response.json()).error).toBe('invalid_request')
        expect(JSON.stringify(pf())).toBe(before)
        expect(rows('portfolio_revisions')).toHaveLength(0)
      },
    )
  }

  it.each([undefined, null, 0, 4])('noop responses include the current count %j and still reject stale clients', async (stored) => {
    seed('pro', { finance: 2 })
    if (stored !== undefined) pf().edit_count = stored
    const expected = stored ?? null
    const before = JSON.stringify(pf())
    for (const body of [
      {}, { ops: [] }, { content: { pro_designs: { finance: 2 } } },
      { ops: [{ op: 'set_pro_design', template: 'finance', version: 2 }] },
    ]) {
      const stale = await patch({ ...body, expected_edit_count: expected === null ? 0 : null })
      expect(stale.status).toBe(409)
      for (const request of [body, { ...body, expected_edit_count: expected }]) {
        const response = await patch(request)
        expect(response.status).toBe(200)
        expect(await response.json()).toMatchObject({ edit_count: expected, unchanged: true, changes: [], revision_id: null })
      }
    }
    expect(JSON.stringify(pf())).toBe(before)
    expect(rows('portfolio_revisions')).toHaveLength(0)
  })
})

describe('strict API write validation', () => {
  for (const shape of saveShapes) {
    it.each([null, [], '2', { developer: 3 }, { developer: '2' }, { developer: null }, { minimal: 2 }, { developer: 2, future: 2 }])(
      `${shape.name}: invalid map %j returns 400 with no writes`, async (map) => {
        seed('pro', { finance: 2 })
        const before = JSON.stringify(pf())
        const response = await patch(shape.body(map))
        expect(response.status).toBe(400)
        expect((await response.json()).error).toBe('invalid_op')
        expect(JSON.stringify(pf())).toBe(before)
        expect(rows('portfolio_revisions')).toHaveLength(0)
      },
    )
  }

  it.each([
    { template: 'minimal', version: 2 }, { template: 'unknown', version: 2 },
    { template: 'developer', version: 3 }, { template: 'developer', version: '2' }, { template: 'developer' },
  ])('rejects malformed typed design operation %j atomically', async (op) => {
    seed('pro')
    expect((await patch({ ops: [{ op: 'set_field', field: 'headline', value: 'Should not save' }, { op: 'set_pro_design', ...op }] })).status).toBe(400)
    expect(pf().content.headline).toBe('Old')
    expect(rows('portfolio_revisions')).toHaveLength(0)
  })
})

describe('plan checks cover every marker, not just the active template', () => {
  for (const plan of ['free', 'basic'] as const) {
    for (const shape of saveShapes) {
      it(`${plan} cannot enable an inactive marker through ${shape.name}`, async () => {
        seed(plan, { finance: 2 })
        expect((await patch(shape.body({ finance: 2, developer: 2 }))).status).toBe(403)
        expect(pf().content.pro_designs).toEqual({ finance: 2 })
        expect(rows('portfolio_revisions')).toHaveLength(0)
      })

      it(`${plan} may keep or remove stored markers through ${shape.name}`, async () => {
        seed(plan, { developer: 2, finance: 2 }, 'developer')
        const unchanged = await patch(shape.body({ developer: 2, finance: 2 }))
        expect(unchanged.status).toBe(200)
        expect((await unchanged.json()).unchanged).toBe(true)
        expect((await patch(shape.body({ finance: 2 }))).status).toBe(200)
        expect(pf().content.pro_designs).toEqual({ finance: 2 })
        expect((await patch(shape.body({}))).status).toBe(200)
        expect(pf().content.pro_designs).toEqual({})
        expect(pf().template).toBe('developer')
      })
    }

    it(`${plan}: typed enable is blocked for ALL Pro templates, even when inactive`, async () => {
      seed(plan)
      for (const template of PRO_TEMPLATES) {
        const response = await patch({ ops: [{ op: 'set_pro_design', template, version: 2 }] })
        expect(response.status).toBe(403)
        expect((await response.json()).error).toBe('pro_design_locked')
      }
      expect(pf().content).not.toHaveProperty('pro_designs')
      expect(rows('portfolio_revisions')).toHaveLength(0)
    })

    it(`${plan}: lapsed Pro can edit/keep/remove, but cannot re-enable through undo`, async () => {
      seed(plan, { developer: 2, finance: 2 }, 'developer')
      expect((await patch({ template: 'developer', content: { headline: 'Still editable' } })).status).toBe(200)
      const unchanged = await patch({ ops: [{ op: 'set_pro_design', template: 'developer', version: 2 }] })
      expect((await unchanged.json()).unchanged).toBe(true)
      const removal = await patch({ ops: [{ op: 'set_pro_design', template: 'developer', version: null }] })
      expect(removal.status).toBe(200)
      const { revision_id } = await removal.json()
      expect(pf().content.pro_designs).toEqual({ developer: 1, finance: 2 })
      const count = rows('portfolio_revisions').length
      expect((await restore(revision_id)).status).toBe(403)
      expect(rows('portfolio_revisions')).toHaveLength(count)
      expect(pf().content.pro_designs).toEqual({ developer: 1, finance: 2 })
    })
  }

  it('template selection gates remain unchanged for both save shapes', async () => {
    seed('free', { developer: 2 })
    expect((await patch({ content: { pro_designs: { developer: 2 } }, template: 'developer' })).status).toBe(403)
    expect((await patch({ ops: [{ op: 'set_template', template: 'developer' }] })).status).toBe(403)
    expect((await patch({ ops: [{ op: 'set_template', template: 'unknown' }] })).status).toBe(400)
    expect(pf().template).toBe('minimal')
    expect(rows('portfolio_revisions')).toHaveLength(0)
  })
})

describe('revision restoration cannot bypass Pro opt-in gating', () => {
  it.each(['free', 'basic'] as const)('%s cannot restore a new inactive Pro marker', async (plan) => {
    seed(plan, { developer: 2 })
    const rev = revision({ developer: 2, finance: 2 }, 'finance')
    const before = JSON.stringify(pf())
    expect((await restore(rev.id)).status).toBe(403)
    expect(JSON.stringify(pf())).toBe(before)
    expect(rows('portfolio_revisions')).toHaveLength(1)
  })

  it.each(['free', 'basic'] as const)('%s can restore unchanged/fewer markers without selecting a locked template', async (plan) => {
    seed(plan, { developer: 2, finance: 2 })
    const kept = revision({ developer: 2, finance: 2 }, 'developer')
    expect((await restore(kept.id)).status).toBe(200)
    expect(pf().template).toBe('minimal')
    expect(pf().content.pro_designs).toEqual({ developer: 2, finance: 2 })
    const removed = revision({ finance: 2 })
    expect((await restore(removed.id)).status).toBe(200)
    expect(pf().content.pro_designs).toEqual({ finance: 2 })
    const legacy = revision()
    expect((await restore(legacy.id)).status).toBe(200)
    expect(pf().content).not.toHaveProperty('pro_designs')
  })

  it('Pro may restore both the opted-in design and the Pro template, recording the state left behind', async () => {
    seed('pro')
    const before = JSON.parse(JSON.stringify(pf().content))
    const rev = revision({ developer: 2 }, 'developer')
    expect((await restore(rev.id)).status).toBe(200)
    expect(pf().content.pro_designs).toEqual({ developer: 2 })
    expect(pf().template).toBe('developer')
    expect(rows('portfolio_revisions')[1].content).toEqual(before)
    expect(rows('portfolio_revisions')[1].source).toBe('restore')
  })
})

describe('generation never opts into a Pro design', () => {
  it.each(['minimal', 'developer'])('strips model-created metadata for %s without extra calls or changing the once-only guard', async (template) => {
    seed('pro')
    h.ctx!.db.portfolios = []
    h.modelReply = { headline: 'Engineer', about: 'Builds useful tools.', pro_designs: { developer: 2, finance: 2 } }
    const body = { ...content(), bio: '', template, pro_designs: { developer: 2 } }
    const first = await generatePOST(req('/api/generate', 'POST', body))
    expect(first.status).toBe(200)
    expect(pf().content).not.toHaveProperty('pro_designs')
    expect(pf().template).toBe(template)
    expect(h.modelCalls).toBe(1)
    const again = await generatePOST(req('/api/generate', 'POST', body))
    expect(again.status).toBe(200)
    expect((await again.json()).portfolio_id).toBe((await first.json()).portfolio_id)
    expect(h.modelCalls).toBe(1)
    expect(rows('portfolios')).toHaveLength(1)
  })
})