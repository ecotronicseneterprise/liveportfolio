// Typed portfolio operations, revisions and undo: the pure layer (lib/portfolio/ops.ts) and the real routes
// (/api/update, /api/revisions) against the in-memory Supabase stand-in.
import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  ctx: null as null | ReturnType<typeof import('./helpers/fake-supabase').createFakeDb>,
  user: null as null | { id: string; email: string },
  revalidated: [] as string[],
}))

vi.mock('next/cache', () => ({ revalidatePath: (p: string) => { h.revalidated.push(p) } }))
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { getUser: async () => (h.user ? { data: { user: h.user }, error: null } : { data: { user: null }, error: new Error('bad jwt') }) } }),
}))
vi.mock('@/lib/supabase', async () => {
  const { createFakeDb } = await import('./helpers/fake-supabase')
  h.ctx = createFakeDb({ users: ['id', 'slug', 'email'], payments: ['ls_order_id'] })
  return { getSupabaseAdmin: () => h.ctx!.admin, getSupabaseClient: () => ({ auth: { getUser: async () => (h.user ? { data: { user: h.user }, error: null } : { data: { user: null }, error: new Error('bad jwt') }) } }) }
})

import { NextRequest } from 'next/server'
import { PATCH as updatePATCH } from '../app/api/update/route'
import { GET as revGET, POST as revPOST } from '../app/api/revisions/route'
import { OpError, applyOps, type PortfolioState } from '../lib/portfolio/ops'
import { KEEP_REVISIONS, commitState, _resetWarn } from '../lib/portfolio/commit'

const SB = 'https://proj.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_URL = SB
const OURS = `${SB}/storage/v1/object/public/project-images/u1/0.jpg`
const AVATAR = `${SB}/storage/v1/object/public/avatars/u1/a.jpg`

const base = (): PortfolioState => ({
  template: 'minimal',
  content: {
    name: 'Ada', role: 'Engineer', headline: 'Old headline', about: 'About', email: 'a@b.co',
    skills: ['Go'],
    projects: [{ title: 'One', problem: 'p', solution: 's', outcome: '3 hours', stack: ['Go'] }, { title: 'Two', problem: '', solution: '', outcome: '', stack: [] }],
    experience: [{ company: 'Acme', role: 'Eng', period: '2020', bullets: ['Built x'] }],
  },
})
const run = (ops: unknown, s = base()) => applyOps(s, ops)
const fails = (ops: unknown, code?: string, s = base()) => {
  try { applyOps(s, ops) } catch (e) { expect(e).toBeInstanceOf(OpError); if (code) expect((e as OpError).code).toBe(code); return }
  throw new Error('expected OpError')
}

describe('applyOps: fields and links', () => {
  it('set_field trims, records one change, and a no-change op records nothing', () => {
    const r = run([{ op: 'set_field', field: 'headline', value: '  New headline  ' }])
    expect(r.state.content.headline).toBe('New headline')
    expect(r.changes).toEqual(['Changed headline'])
    expect(run([{ op: 'set_field', field: 'headline', value: 'Old headline' }]).changes).toEqual([])
  })
  it('never mutates its input', () => {
    const s = base(); const before = JSON.stringify(s)
    run([{ op: 'set_field', field: 'role', value: 'X' }, { op: 'remove_project', index: 0 }], s)
    expect(JSON.stringify(s)).toBe(before)
  })
  it('the name cannot be emptied; text over its limit is refused', () => {
    fails([{ op: 'set_field', field: 'name', value: '   ' }], 'invalid_op')
    fails([{ op: 'set_field', field: 'headline', value: 'x'.repeat(201) }], 'limit')
  })
  it('links: https accepted; javascript:, data:, credentials, foreign avatars refused; our own storage and GitHub avatars accepted', () => {
    expect(run([{ op: 'set_link', field: 'github_url', value: 'https://github.com/ada' }]).state.content.github_url).toBe('https://github.com/ada')
    for (const bad of ['javascript:alert(1)', 'data:text/html,x', 'https://u:p@evil.com', 'github.com/ada', 'ftp://x.com']) fails([{ op: 'set_link', field: 'github_url', value: bad }], 'invalid_op')
    expect(run([{ op: 'set_link', field: 'avatar_url', value: AVATAR }]).state.content.avatar_url).toBe(AVATAR)
    expect(run([{ op: 'set_link', field: 'avatar_url', value: 'https://avatars.githubusercontent.com/u/1?v=4' }]).changes).toHaveLength(1)
    fails([{ op: 'set_link', field: 'avatar_url', value: 'https://evil.com/a.jpg' }], 'invalid_op')
    fails([{ op: 'set_link', field: 'avatar_url', value: `https://other.supabase.co/storage/v1/object/public/avatars/x.jpg` }], 'invalid_op')
  })
  it('a link already stored is accepted unchanged, an empty value removes it', () => {
    const s = base(); s.content.github_url = 'http://old-style.example/ada'
    expect(run([{ op: 'set_link', field: 'github_url', value: 'http://old-style.example/ada' }], s).changes).toEqual([])
    const r = run([{ op: 'set_link', field: 'github_url', value: '' }], s)
    expect(r.state.content.github_url).toBeUndefined()
    expect(r.changes).toEqual(['Removed github link'])
  })
  it('skills are capped at 15', () => {
    fails([{ op: 'set_skills', skills: Array.from({ length: 16 }, (_, i) => `s${i}`) }])
    expect(run([{ op: 'set_skills', skills: [' Go ', '', 'Rust'] }]).state.content.skills).toEqual(['Go', 'Rust'])
  })
})

describe('applyOps: projects and experience', () => {
  it('add / update / move / remove with readable changes', () => {
    let r = run([{ op: 'add_project', project: { title: 'Three', outcome: 'Cut cost 40%' } }])
    expect((r.state.content.projects as unknown[]).length).toBe(3)
    expect(r.changes).toEqual(['Added project "Three"'])
    r = run([{ op: 'update_project', index: 0, patch: { outcome: '9 minutes' } }])
    expect(r.changes).toEqual(['Edited project "One"'])
    r = run([{ op: 'move_project', from: 0, to: 1 }])
    expect((r.state.content.projects as Array<{ title: string }>)[0].title).toBe('Two')
    r = run([{ op: 'remove_project', index: 1 }])
    expect(r.changes).toEqual(['Removed project "Two"'])
  })
  // Guards the zod 4 behaviour change: ".default() values apply inside optional fields". A patch built with .partial() from a schema
  // whose fields use .default() would silently reset every field the patch does not mention.
  it('a patch changes only the fields it names (update_project keeps everything else)', () => {
    const s = base()
    s.content.projects = [{ title: 'One', problem: 'P', solution: 'S', outcome: 'O', stack: ['Go', 'SQL'], url: 'https://x.dev', image_url: OURS }]
    const r = run([{ op: 'update_project', index: 0, patch: { outcome: 'New outcome' } }], s)
    expect((r.state.content.projects as unknown[])[0]).toEqual({ title: 'One', problem: 'P', solution: 'S', outcome: 'New outcome', stack: ['Go', 'SQL'], url: 'https://x.dev', image_url: OURS })
  })
  it('a patch changes only the fields it names (update_experience keeps everything else)', () => {
    const s = base()
    s.content.experience = [{ company: 'Acme', role: 'Eng', period: '2020 to 2022', bullets: ['Built x', 'Led y'] }]
    const r = run([{ op: 'update_experience', index: 0, patch: { role: 'Senior Eng' } }], s)
    expect((r.state.content.experience as unknown[])[0]).toEqual({ company: 'Acme', role: 'Senior Eng', period: '2020 to 2022', bullets: ['Built x', 'Led y'] })
  })
  it('an empty patch changes nothing and records no change', () => {
    expect(run([{ op: 'update_project', index: 0, patch: {} }]).changes).toEqual([])
    expect(run([{ op: 'update_experience', index: 0, patch: {} }]).changes).toEqual([])
  })
  it('limits and ranges: six projects at most, a title is required, a missing index is refused', () => {
    const s = base(); s.content.projects = Array.from({ length: 6 }, (_, i) => ({ title: `p${i}` }))
    fails([{ op: 'add_project', project: { title: 'x' } }], 'limit', s)
    fails([{ op: 'add_project', project: { title: '  ' } }], 'invalid_op')
    fails([{ op: 'update_project', index: 5, patch: { title: 'x' } }], 'out_of_range')
    fails([{ op: 'remove_experience', index: 3 }], 'out_of_range')
  })
  it('a project image must be one of our own uploads', () => {
    expect(run([{ op: 'update_project', index: 0, patch: { image_url: OURS } }]).changes).toEqual(['Edited project "One"'])
    fails([{ op: 'update_project', index: 0, patch: { image_url: 'https://evil.com/x.png' } }], 'invalid_op')
    fails([{ op: 'add_project', project: { title: 'x', image_url: 'javascript:1' } }], 'invalid_op')
  })
  it('experience bullets lose their leading markers and empty or trailing-colon bullets', () => {
    const r = run([{ op: 'add_experience', experience: { company: 'Kobo', role: 'Eng', period: '2018', bullets: ['▸ Built it', '', 'Heading:'] } }])
    expect((r.state.content.experience as Array<{ bullets: string[] }>)[1].bullets).toEqual(['Built it'])
  })
  it('all or nothing: a bad op after a good one changes nothing', () => {
    const s = base()
    fails([{ op: 'set_field', field: 'role', value: 'Changed' }, { op: 'remove_project', index: 9 }], 'out_of_range', s)
    expect(s.content.role).toBe('Engineer')
  })
})

describe('applyOps: the dashboard save (replace_content) and the guard rails', () => {
  it('drops unknown keys, refuses wrong types, cleans bullets', () => {
    const r = run([{ op: 'replace_content', content: { headline: 'H', plan: 'pro', slug: 'x', experience: [{ company: 'A', role: 'B', period: '', bullets: ['• one', 'Skills:'] }] } }])
    expect(r.state.content.headline).toBe('H')
    expect('plan' in r.state.content || 'slug' in r.state.content).toBe(false)
    expect((r.state.content.experience as Array<{ bullets: string[] }>)[0].bullets).toEqual(['one'])
    fails([{ op: 'replace_content', content: { name: 5 } }], 'invalid_op')
    fails([{ op: 'replace_content', content: { projects: 'nope' } }], 'invalid_op')
  })
  it('project images in a whole save: ours or already stored pass; anything else is refused; empty ones are dropped', () => {
    const s = base(); (s.content.projects as Array<Record<string, unknown>>)[0].image_url = 'http://legacy.example/i.png'
    const keep = run([{ op: 'replace_content', content: { projects: [{ title: 'One', image_url: 'http://legacy.example/i.png' }, { title: 'Two', image_url: OURS }, { title: 'T', image_url: '' }] } }], s)
    expect(keep.changes).toHaveLength(1)
    expect((keep.state.content.projects as Array<Record<string, unknown>>)[2].image_url).toBeUndefined()
    fails([{ op: 'replace_content', content: { projects: [{ title: 'x', image_url: 'https://evil.com/p.png' }] } }], 'invalid_op', s)
  })
  it('a whole save that changes nothing records nothing', () => {
    const s = base()
    expect(run([{ op: 'replace_content', content: { name: 'Ada', skills: ['Go'] } }], s).changes).toEqual([])
  })
  it('unknown ops, extra keys, raw html in nothing, and more than 20 ops are rejected', () => {
    fails([{ op: 'delete_everything' }])
    fails([{ op: 'set_field', field: 'role', value: 'x', extra: 1 }])
    fails([{ op: 'set_field', field: 'plan', value: 'pro' }])
    fails(Array.from({ length: 21 }, () => ({ op: 'set_field', field: 'role', value: 'x' })))
    fails([])
  })
  it('set_template changes only the template, and says so', () => {
    const r = run([{ op: 'set_template', template: 'bold' }])
    expect(r.state.template).toBe('bold'); expect(r.changes).toEqual(['Changed template'])
  })
})

// ── routes ───────────────────────────────────────────────────────────────────────────────────────────────
let n = 0
const DAY = 24 * 60 * 60 * 1000
function seed(plan: 'free' | 'pro' = 'free', template = 'minimal') {
  n++
  const c = h.ctx!
  const id = `user-${n}`
  h.user = { id, email: `u${n}@example.com` }
  c.db.users.push({ id, slug: `slug-${n}`, plan: plan === 'free' ? 'unpublished' : 'pro', published_at: plan === 'free' ? null : '2026-01-01' })
  c.db.portfolios.push({ id: `pf-${n}`, user_id: id, template, content: base().content, health_score: 10 })
  if (plan === 'pro') c.db.subscriptions.push({ id: `sub-${n}`, user_id: id, plan: 'pro', status: 'active', created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 100 * DAY).toISOString() })
  return { id, pf: `pf-${n}` }
}
const req = (url: string, method: string, body?: unknown) =>
  new NextRequest(`http://localhost${url}`, { method, headers: { authorization: 'Bearer t', 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
const patch = (body: unknown) => updatePATCH(req('/api/update', 'PATCH', body))
const rows = (t: string) => h.ctx!.db[t]

beforeEach(() => {
  const c = h.ctx!
  for (const t of ['users', 'subscriptions', 'portfolios', 'portfolio_revisions']) c.db[t] = []
  c.failures.length = 0; c.missing.clear()
  h.user = null; h.revalidated = []
  _resetWarn()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('/api/update records a revision for every real change', () => {
  it('stores the state BEFORE the change, what changed, and bumps edit_count', async () => {
    const { pf } = seed()
    const res = await patch({ content: { headline: 'Hello' }, portfolio_id: pf })
    expect(res.status).toBe(200)
    const j = await res.json()
    expect(j.changes).toEqual(['Changed headline']); expect(j.revisions).toBe(true); expect(j.edit_count).toBe(1)
    expect(rows('portfolio_revisions')).toHaveLength(1)
    const r = rows('portfolio_revisions')[0]
    expect(r.content.headline).toBe('Old headline'); expect(r.summary).toEqual(['Changed headline']); expect(r.source).toBe('dashboard')
    expect(rows('portfolios')[0].content.headline).toBe('Hello')
    expect(h.revalidated).toContain('/slug-' + n)
  })
  it('typed ops work through the same route; ops together with content is refused', async () => {
    seed()
    expect((await patch({ ops: [{ op: 'add_project', project: { title: 'New' } }] })).status).toBe(200)
    expect(rows('portfolios')[0].content.projects).toHaveLength(3)
    expect((await patch({ ops: [{ op: 'set_field', field: 'role', value: 'x' }], content: { role: 'y' } })).status).toBe(400)
    const bad = await patch({ ops: [{ op: 'remove_project', index: 8 }] })
    expect(bad.status).toBe(400); expect((await bad.json()).error).toBe('out_of_range')
  })
  it('a save that changes nothing writes nothing and keeps the current score', async () => {
    seed()
    const res = await patch({ content: { name: 'Ada' } })
    const j = await res.json()
    expect(res.status).toBe(200); expect(j.unchanged).toBe(true); expect(j.health_score).toBe(10)
    expect(rows('portfolio_revisions')).toHaveLength(0)
    expect(rows('portfolios')[0].edit_count).toBeUndefined()
  })
  it('a bad link in a save is a 400 and nothing is written', async () => {
    seed()
    const res = await patch({ content: { github_url: 'javascript:alert(1)' } })
    expect(res.status).toBe(400)
    expect(rows('portfolios')[0].content.github_url).toBeUndefined(); expect(rows('portfolio_revisions')).toHaveLength(0)
  })
  it('the revisions table not existing yet does not block editing', async () => {
    seed(); h.ctx!.missing.add('portfolio_revisions')
    const res = await patch({ content: { headline: 'Still works' } })
    expect(res.status).toBe(200); expect((await res.json()).revisions).toBe(false)
    expect(rows('portfolios')[0].content.headline).toBe('Still works')
  })
  it('a stale write is a conflict: nothing changes and the snapshot is removed', async () => {
    const { id, pf } = seed()
    const stale = { id: pf, user_id: id, content: base().content, template: 'minimal', edit_count: null as number | null }
    expect((await commitState(stale, { content: { ...base().content, role: 'A' }, template: 'minimal' }, { source: 'dashboard', summary: ['a'] })).ok).toBe(true)
    const second = await commitState(stale, { content: { ...base().content, role: 'B' }, template: 'minimal' }, { source: 'dashboard', summary: ['b'] })
    expect(second).toEqual({ ok: false, status: 409, error: 'conflict' })
    expect(rows('portfolios')[0].content.role).toBe('A')
    expect(rows('portfolio_revisions')).toHaveLength(1)
  })
  it('requireRevisions refuses to edit when history cannot be recorded (for the assistant, later)', async () => {
    const { id, pf } = seed(); h.ctx!.missing.add('portfolio_revisions')
    const r = await commitState({ id: pf, user_id: id, content: base().content, template: 'minimal', edit_count: null }, { content: { ...base().content, role: 'Z' }, template: 'minimal' }, { source: 'assistant', summary: ['z'], requireRevisions: true })
    expect(r).toEqual({ ok: false, status: 503, error: 'revisions_unavailable' })
    expect(rows('portfolios')[0].content.role).toBe('Engineer')
  })
  it(`keeps only the newest ${KEEP_REVISIONS} revisions`, async () => {
    const { id, pf } = seed()
    let ec: number | null = null
    for (let i = 0; i < KEEP_REVISIONS + 5; i++) {
      const r = await commitState({ id: pf, user_id: id, content: base().content, template: 'minimal', edit_count: ec }, { content: { ...base().content, role: `r${i}` }, template: 'minimal' }, { source: 'dashboard', summary: [`edit ${i}`] })
      expect(r.ok).toBe(true); ec = r.ok ? r.edit_count : ec
      rows('portfolio_revisions').forEach((x, k) => { x.created_at ??= new Date(Date.UTC(2026, 0, 1, 0, 0, 0, i * 1000 + k)).toISOString() })
    }
    expect(rows('portfolio_revisions').length).toBeLessThanOrEqual(KEEP_REVISIONS)
  })
})

describe('/api/revisions: history, undo, restore', () => {
  async function twoEdits() {
    const s = seed()
    await patch({ content: { headline: 'First' } })
    rows('portfolio_revisions')[0].created_at = '2026-10-26T10:00:00.000Z'
    await patch({ content: { headline: 'Second' } })
    rows('portfolio_revisions')[1].created_at = '2026-10-26T11:00:00.000Z'
    return s
  }
  it('lists the newest first, only for the signed-in user, without the content', async () => {
    await twoEdits()
    seed() // another user, own history
    h.user = { id: 'user-' + (n - 1), email: 'x' }
    const j = await (await revGET(req('/api/revisions', 'GET'))).json()
    expect(j.available).toBe(true); expect(j.revisions).toHaveLength(2)
    expect(j.revisions[0].summary).toEqual(['Changed headline'])
  })
  it('undo restores the version before the latest change, and the undo is itself recorded', async () => {
    await twoEdits()
    const res = await revPOST(req('/api/revisions', 'POST', { latest: true }))
    expect(res.status).toBe(200)
    expect(rows('portfolios')[0].content.headline).toBe('First')
    expect(rows('portfolio_revisions')).toHaveLength(3)
    expect(rows('portfolio_revisions')[2].source).toBe('restore'); expect(rows('portfolio_revisions')[2].content.headline).toBe('Second')
    rows('portfolio_revisions')[2].created_at = '2026-10-26T12:00:00.000Z'
    // undoing the undo brings "Second" back
    expect((await revPOST(req('/api/revisions', 'POST', { latest: true }))).status).toBe(200)
    expect(rows('portfolios')[0].content.headline).toBe('Second')
  })
  it('restores a chosen revision; an id from another account is a 404', async () => {
    await twoEdits()
    const first = rows('portfolio_revisions')[0].id
    expect((await revPOST(req('/api/revisions', 'POST', { revision_id: first }))).status).toBe(200)
    expect(rows('portfolios')[0].content.headline).toBe('Old headline')
    const mine = rows('portfolio_revisions')[0].id
    seed() // sign in as someone else
    expect((await revPOST(req('/api/revisions', 'POST', { revision_id: mine }))).status).toBe(404)
  })
  it('nothing to undo is a 404; restoring what you already have is a 409', async () => {
    seed()
    expect((await revPOST(req('/api/revisions', 'POST', { latest: true }))).status).toBe(404)
    await patch({ content: { headline: 'A' } })
    await patch({ content: { headline: 'Old headline' } })
    rows('portfolio_revisions')[0].created_at = '2026-10-26T10:00:00.000Z'; rows('portfolio_revisions')[1].created_at = '2026-10-26T11:00:00.000Z'
    expect((await revPOST(req('/api/revisions', 'POST', { revision_id: rows('portfolio_revisions')[1].id }))).status).toBe(200)
    const again = await revPOST(req('/api/revisions', 'POST', { revision_id: rows('portfolio_revisions')[0].id }))
    expect(again.status).toBe(200)
  })
  it('a Pro template in an old version is not re-selected on a plan that cannot use it', async () => {
    const { id } = seed('free', 'minimal')
    rows('portfolio_revisions').push({ id: 'rv', portfolio_id: `pf-${n}`, user_id: id, content: { ...base().content, headline: 'Old' }, template: 'developer', summary: [], source: 'dashboard', created_at: '2026-10-26T09:00:00.000Z' })
    const res = await revPOST(req('/api/revisions', 'POST', { revision_id: 'rv' }))
    expect(res.status).toBe(200)
    expect(rows('portfolios')[0].template).toBe('minimal'); expect(rows('portfolios')[0].content.headline).toBe('Old')
  })
  it('without the table: history is empty and unavailable, not an error', async () => {
    seed(); h.ctx!.missing.add('portfolio_revisions')
    const j = await (await revGET(req('/api/revisions', 'GET'))).json()
    expect(j).toEqual({ available: false, revisions: [] })
  })
  it('signed-out requests are 401', async () => {
    h.user = null
    expect((await revGET(req('/api/revisions', 'GET'))).status).toBe(401)
    expect((await revPOST(req('/api/revisions', 'POST', {}))).status).toBe(401)
  })
})
