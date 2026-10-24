// Plans: the matrix, the copy rules, and server enforcement (free/basic/pro x action) through the real routes.
import fs from 'node:fs'
import path from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
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
  h.ctx = createFakeDb()
  return { getSupabaseAdmin: () => h.ctx!.admin, getSupabaseClient: () => ({}) }
})
vi.mock('@/hooks/useRegion', () => ({ useRegion: () => ({ region: 'NG', loading: false }) }))
vi.mock('@/hooks/useUsdRate', () => ({ useUsdRate: () => ({ basicUsd: '10', proUsd: '30', rateLoading: false }) }))

import { NextRequest } from 'next/server'
import { PATCH as updatePATCH } from '../app/api/update/route'
import { GET as scoreGET } from '../app/api/score/route'
import { GET as summaryGET } from '../app/api/analytics/summary/route'
import { GET as userPlanGET } from '../app/api/user-plan/route'
import { getUserPlan, planFromUserColumn } from '../lib/getUserPlan'
import {
  ALL_TEMPLATES, canUseTemplate, comingSoon, entitlementsFor, FEATURES, features, FREE_TEMPLATES, includedFeatures, newFeatures,
  PRO_TEMPLATES, type FeatureId, type PlanId,
} from '../lib/plans'
import PricingSection from '../components/PricingSection'

const ROOT = path.resolve(__dirname, '..')
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8')
const DAY = 24 * 60 * 60 * 1000
const PLANS: PlanId[] = ['free', 'basic', 'pro']

describe('the plan matrix (lib/plans.ts)', () => {
  it('Free / Basic / Pro entitlements', () => {
    expect(entitlementsFor('free')).toEqual({ plan: 'free', canEdit: true, canPublish: false, templates: 'free', analytics: false, qr: false, weeklyScore: false })
    expect(entitlementsFor('basic')).toEqual({ plan: 'basic', canEdit: true, canPublish: true, templates: 'free', analytics: false, qr: false, weeklyScore: false })
    expect(entitlementsFor('pro')).toEqual({ plan: 'pro', canEdit: true, canPublish: true, templates: 'all', analytics: true, qr: true, weeklyScore: true })
  })
  it('three free templates, seven Pro, ten in total (the number the code actually has)', () => {
    expect(FREE_TEMPLATES).toHaveLength(3)
    expect(PRO_TEMPLATES).toHaveLength(7)
    expect(ALL_TEMPLATES).toHaveLength(10)
    expect(FEATURES.find((f) => f.id === 'pro_templates')!.label).toContain('7 more')
    expect(FEATURES.find((f) => f.id === 'pro_templates')!.label).toContain('10 in total')
  })
  it.each(PLANS)('%s: which templates can be SELECTED', (plan) => {
    for (const t of FREE_TEMPLATES) expect(canUseTemplate(plan, t)).toBe(true)
    for (const t of PRO_TEMPLATES) expect(canUseTemplate(plan, t)).toBe(plan === 'pro')
    for (const bad of ['', 'nope', '../x', null, undefined, 5, {}, 'MINIMAL']) expect(canUseTemplate(plan, bad), String(bad)).toBe(false)
  })
  it('Pricing lists: Basic adds only publishing; Pro adds the extras; nothing "soon" is included anywhere', () => {
    expect(newFeatures('basic').map((f) => f.id)).toEqual(['publish'])
    expect(newFeatures('pro').map((f) => f.id)).toEqual(['pro_templates', 'analytics', 'qr', 'weekly_score'])
    for (const p of PLANS) for (const f of includedFeatures(p)) expect(f.status).toBe('available')
    expect(comingSoon().map((f) => f.id).sort()).toEqual(['ai_assistant', 'github_sync', 'mcp'])
  })
})

describe('copy rules', () => {
  // Where each AVAILABLE feature is actually implemented (so a feature cannot be advertised without enforcement).
  const IMPLEMENTED: Record<string, { file: string; needle: RegExp }> = {
    build_preview: { file: 'app/api/update/route.ts', needle: /ent\.canEdit/ },
    free_templates: { file: 'app/api/update/route.ts', needle: /canUseTemplate\(/ },
    preview_all: { file: 'components/onboarding/ReviewStep.tsx', needle: /TemplateGallery/ },
    publish: { file: 'app/api/paystack-webhook/route.ts', needle: /applyEntitlement/ },
    pro_templates: { file: 'app/portfolio/[slug]/page.tsx', needle: /canUseTemplate\(/ },
    analytics: { file: 'app/api/analytics/summary/route.ts', needle: /\.analytics/ },
    qr: { file: 'app/dashboard/page.tsx', needle: /qrserver|isPro/ }, // client-only: there is no server resource to protect
    weekly_score: { file: 'app/api/score/route.ts', needle: /\.weeklyScore/ },
  }
  it('every available feature has an implementing entitlement; no soon feature has one', () => {
    for (const f of features('available')) {
      const impl = IMPLEMENTED[f.id]
      expect(impl, `no implementation registered for ${f.id}`).toBeTruthy()
      expect(read(impl.file), `${f.id} in ${impl.file}`).toMatch(impl.needle)
    }
    for (const f of features('soon')) expect(IMPLEMENTED[f.id as FeatureId], f.id).toBeUndefined()
  })
  it('the pricing section renders every available feature of its plan, and soon features ONLY under "Coming soon"', () => {
    const html = renderToStaticMarkup(createElement(PricingSection))
    for (const f of features('available')) expect(html, f.id).toContain(f.label.replace(/&/g, '&amp;'))
    const at = html.indexOf('Coming soon')
    expect(at).toBeGreaterThan(-1)
    for (const f of features('soon')) {
      const i = html.indexOf(f.label)
      expect(i, f.id).toBeGreaterThan(at) // only in the coming-soon line, after the plan cards
    }
  })
  it('checkout (UpgradeModal) never lists a soon feature and reads its lists from plans.ts', () => {
    const src = read('components/UpgradeModal.tsx')
    expect(src).toMatch(/newFeatures\('basic'\)/)
    expect(src).toMatch(/newFeatures\('pro'\)/)
    expect(src).not.toMatch(/comingSoon|AI assistant|\bMCP\b|GitHub sync/i)
  })
  it('no user-facing source claims a soon feature as included, or a custom domain, or the wrong template count', () => {
    const files = ['components/PricingSection.tsx', 'components/UpgradeModal.tsx', 'app/page.tsx', 'lib/email.ts', 'lib/email-drip.ts', 'app/api/email/welcome/route.ts', 'components/onboarding/ReviewStep.tsx']
    for (const f of files) {
      const src = read(f)
      expect(src, f).not.toMatch(/\b11 (professional )?templates\b|\b11 in total\b/i)
      expect(src, f).not.toMatch(/custom domains? (support )?(is|are) available/i)
      if (f !== 'components/PricingSection.tsx') expect(src, f).not.toMatch(/(includes?|included|everything in pro)[^.\n]{0,60}(AI assistant|\bMCP\b|GitHub sync)/i)
    }
  })
  it('the dashboard template list (hard-coded there) matches plans.ts: same ids, same Pro flags', () => {
    const src = read('app/dashboard/page.tsx')
    const rows = [...src.matchAll(/\{ id: '([a-z-]+)', name: '[^']+', dark: (?:true|false), pro: (true|false) \}/g)].map((m) => [m[1], m[2] === 'true'] as const)
    expect(rows.map((r) => r[0]).sort()).toEqual([...ALL_TEMPLATES].sort())
    for (const [id, pro] of rows) expect(pro, id).toBe((PRO_TEMPLATES as readonly string[]).includes(id))
  })
})

describe('getUserPlan maps users.plan by name (a lapsed Basic is never Pro)', () => {
  beforeEach(() => { for (const t of ['users', 'subscriptions', 'portfolios', 'career_scores', 'analytics_events', 'payments']) h.ctx!.db[t] = [] })
  it('planFromUserColumn', () => {
    expect(planFromUserColumn('unpublished')).toBe('free')
    expect(planFromUserColumn(null)).toBe('free')
    expect(planFromUserColumn('')).toBe('free')
    expect(planFromUserColumn('basic')).toBe('basic')
    expect(planFromUserColumn('pro')).toBe('pro')
    expect(planFromUserColumn('launch')).toBe('pro') // legacy one-time payers keep their old meaning
  })
  it('subscription first; expired subscription with users.plan still "basic" (grace) is Basic, not Pro', async () => {
    const c = h.ctx!
    c.db.users.push({ id: 'uA', plan: 'basic' })
    c.db.subscriptions.push({ id: 's', user_id: 'uA', plan: 'basic', status: 'active', created_at: new Date().toISOString(), expires_at: new Date(Date.now() - DAY).toISOString() })
    expect(await getUserPlan('uA')).toBe('basic')
    c.db.users.push({ id: 'uB', plan: 'unpublished' })
    c.db.subscriptions.push({ id: 's2', user_id: 'uB', plan: 'pro', status: 'cancelled', created_at: new Date().toISOString(), expires_at: new Date(Date.now() + DAY).toISOString() })
    expect(await getUserPlan('uB')).toBe('pro') // cancelled keeps access until expiry
  })
})

// ── server enforcement through the real routes ───────────────────────────────────────────────────────────────
let n = 0
function seed(plan: PlanId, opts: { template?: string } = {}) {
  n++
  const c = h.ctx!
  const id = `user-${n}`
  h.user = { id, email: `u${n}@example.com` }
  c.db.users.push({ id, slug: `slug-${n}`, plan: plan === 'free' ? 'unpublished' : plan, published_at: plan === 'free' ? null : '2026-01-01' })
  c.db.portfolios.push({ id: `pf-${n}`, user_id: id, template: opts.template ?? 'minimal', content: { name: 'Ada', role: 'Eng' } })
  if (plan !== 'free') {
    c.db.subscriptions.push({ id: `sub-${n}`, user_id: id, plan, status: 'active', created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 100 * DAY).toISOString() })
  }
  return { id, portfolioId: `pf-${n}` }
}
const patch = (body: unknown) =>
  updatePATCH(new NextRequest('http://localhost/api/update', { method: 'PATCH', headers: { authorization: 'Bearer t', 'content-type': 'application/json' }, body: JSON.stringify(body) }))
const getReq = (url: string) => new NextRequest(`http://localhost${url}`, { headers: { authorization: 'Bearer t' } })

beforeEach(() => {
  const c = h.ctx!
  for (const t of ['users', 'subscriptions', 'portfolios', 'career_scores', 'analytics_events', 'payments']) h.ctx!.db[t] = []
  c.failures.length = 0
  h.user = null
  h.revalidated = []
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('/api/update: edit and template, by plan', () => {
  it.each(PLANS)('%s may edit content privately', async (plan) => {
    const { id } = seed(plan)
    const res = await patch({ content: { headline: 'Hello' } })
    expect(res.status).toBe(200)
    expect(h.ctx!.db.portfolios.find((p) => p.user_id === id)!.content.headline).toBe('Hello')
  })

  it.each(PLANS)('%s: the 3 free templates are selectable', async (plan) => {
    for (const t of FREE_TEMPLATES) {
      h.ctx!.db.users = []; h.ctx!.db.portfolios = []; h.ctx!.db.subscriptions = []
      const { id } = seed(plan)
      expect((await patch({ template: t })).status, `${plan}/${t}`).toBe(200)
      expect(h.ctx!.db.portfolios.find((p) => p.user_id === id)!.template).toBe(t)
    }
  })

  it.each([['free', 403], ['basic', 403], ['pro', 200]] as const)('%s picking a Pro template → %i, and the stored template only changes when allowed', async (plan, status) => {
    for (const t of PRO_TEMPLATES) {
      h.ctx!.db.users = []; h.ctx!.db.portfolios = []; h.ctx!.db.subscriptions = []
      const { id } = seed(plan)
      const res = await patch({ template: t })
      expect(res.status, `${plan}/${t}`).toBe(status)
      const stored = h.ctx!.db.portfolios.find((p) => p.user_id === id)!.template
      expect(stored).toBe(status === 200 ? t : 'minimal')
      if (status === 403) expect((await res.json()).error).toBe('template_locked')
    }
  })

  it('unknown or malformed templates are 400 for everyone, including Pro', async () => {
    for (const plan of PLANS) {
      h.ctx!.db.users = []; h.ctx!.db.portfolios = []; h.ctx!.db.subscriptions = []
      seed(plan)
      for (const bad of ['nope', '../../etc', 'MINIMAL', '', 5, {}, ['bold']]) {
        const res = await patch({ template: bad })
        expect([400, 200], `${plan}/${JSON.stringify(bad)}`).toContain(res.status)
        if (bad !== '' ) expect(res.status, `${plan}/${JSON.stringify(bad)}`).toBe(400)
      }
    }
  })

  it('a lapsed Pro user keeps a Pro template they already have: saving it again is allowed, switching to another Pro one is not', async () => {
    const { id } = seed('basic', { template: 'developer' })
    expect((await patch({ template: 'developer', content: { headline: 'x' } })).status).toBe(200)
    expect((await patch({ template: 'designer' })).status).toBe(403)
    expect(h.ctx!.db.portfolios.find((p) => p.user_id === id)!.template).toBe('developer')
  })

  it('the request cannot change plan, publishing or anything outside the content allow-list', async () => {
    const { id } = seed('free')
    const res = await patch({ content: { plan: 'pro', published_at: '2026-01-01', slug: 'hijack', user_id: 'other', template: 'developer', headline: 'ok' }, plan: 'pro', published_at: '2026-01-01' })
    expect(res.status).toBe(200)
    const u = h.ctx!.db.users.find((x) => x.id === id)!
    expect(u.plan).toBe('unpublished')
    expect(u.published_at).toBeNull()
    expect(u.slug).not.toBe('hijack')
    const p = h.ctx!.db.portfolios.find((x) => x.user_id === id)!
    expect(p.content).toEqual({ name: 'Ada', role: 'Eng', headline: 'ok' })
    expect(p.template).toBe('minimal')
  })

  it('401 without a valid token', async () => {
    seed('pro')
    h.user = null
    expect((await patch({ content: { headline: 'x' } })).status).toBe(401)
  })
})

describe('Pro-only features are enforced on the server, not only hidden in the UI', () => {
  it.each([['free', 403], ['basic', 403]] as const)('%s: /api/score and /api/analytics/summary are %i (no LLM call, no data)', async (plan, status) => {
    const { id, portfolioId } = seed(plan)
    const score = await scoreGET(getReq(`/api/score?portfolioId=${portfolioId}&userId=${id}`))
    expect(score.status).toBe(status)
    expect((await score.json()).error).toBe('upgrade_required')
    const summary = await summaryGET(getReq(`/api/analytics/summary?portfolioId=${portfolioId}&userId=${id}`))
    expect(summary.status).toBe(status)
    expect((await summary.json()).feature).toBe('analytics')
    expect(h.ctx!.db.career_scores ?? []).toHaveLength(0)
  })
  it('pro: both are served (cached score, empty analytics)', async () => {
    const { id, portfolioId } = seed('pro')
    h.ctx!.db.career_scores = [{ id: 'cs', portfolio_id: portfolioId, score: 71, breakdown: {}, summary: 's', scored_at: new Date().toISOString() }]
    const score = await scoreGET(getReq(`/api/score?portfolioId=${portfolioId}&userId=${id}`))
    expect(score.status).toBe(200)
    expect((await score.json()).score).toBe(71)
    expect((await summaryGET(getReq(`/api/analytics/summary?portfolioId=${portfolioId}&userId=${id}`))).status).toBe(200)
  })
  it('another user\'s id is still refused before the plan check', async () => {
    const { portfolioId } = seed('pro')
    expect((await scoreGET(getReq(`/api/score?portfolioId=${portfolioId}&userId=someone-else`))).status).toBe(401)
  })
  it('/api/user-plan returns the plan with its entitlements', async () => {
    seed('basic')
    const j = await (await userPlanGET(getReq('/api/user-plan'))).json()
    expect(j.plan).toBe('basic')
    expect(j.entitlements).toEqual(entitlementsFor('basic'))
  })
})

describe('a free user cannot publish or select a Pro template through any route', () => {
  // Publishing = users.plan leaving "unpublished" (the public page returns 404 for "unpublished"). The ONLY server code
  // allowed to write users.plan / published_at is this allow-list; every one of them is payment, invite, bootcamp, expiry
  // or the signup row (which forces "unpublished"). Browser writes are blocked by tests/no-browser-writes.test.ts.
  const WRITERS_OF_PLAN = new Set([
    'app/api/paystack-webhook/route.ts',
    'app/api/admin/invite/consume/route.ts',
    'app/api/bootcamp/redeem/route.ts',
    'app/api/cron/expire-plans/route.ts',
    'app/api/account/profile/route.ts',
  ])
  function walk(dir: string, out: string[] = []): string[] {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name)
      if (fs.statSync(full).isDirectory()) walk(full, out)
      else if (/\.(ts|tsx)$/.test(name)) out.push(full)
    }
    return out
  }
  it('only the allow-listed routes write users.plan or users.published_at', () => {
    const offenders: string[] = []
    for (const f of walk(path.join(ROOT, 'app'))) {
      const rel = path.relative(ROOT, f).split(path.sep).join('/')
      const src = fs.readFileSync(f, 'utf8').replace(/\s+/g, ' ')
      const writes = /\.from\(\s*'users'\s*\)\s*\.(update|insert|upsert)\(\s*\{[^}]*\b(plan|published_at)\b/.test(src)
      if (writes && !WRITERS_OF_PLAN.has(rel)) offenders.push(rel)
    }
    expect(offenders).toEqual([])
  })
  it('/api/update (the only route a free user can PATCH) never touches users and only writes portfolios', () => {
    const src = read('app/api/update/route.ts').replace(/\s+/g, ' ')
    expect(src).not.toMatch(/\.from\(\s*'users'\s*\)\s*\.(update|insert|upsert|delete)/)
  })
  it('/api/generate stores a requested template as-is (protected file, unchanged), so the public page re-checks it', () => {
    const page = read('app/portfolio/[slug]/page.tsx')
    expect(page).toMatch(/canUseTemplate\(planFromUserColumn/)
    expect(page).toMatch(/\.neq\('plan', 'unpublished'\)/) // unpublished = 404 for the public
  })
})

// ── free accounts can edit from the dashboard ───────────────────────────────────────────────────────────────────
describe('free (unpublished) accounts edit on the dashboard, through the server route only', () => {
  it('a free user\'s edit saves, naming their own portfolio id is fine, and publishing stays untouched', async () => {
    const { id, portfolioId } = seed('free')
    const res = await patch({ portfolio_id: portfolioId, content: { headline: 'Mine' }, template: 'bold' })
    expect(res.status).toBe(200)
    const p = h.ctx!.db.portfolios.find((x) => x.id === portfolioId)!
    expect(p.content.headline).toBe('Mine')
    expect(p.template).toBe('bold')
    const u = h.ctx!.db.users.find((x) => x.id === id)!
    expect(u.plan).toBe('unpublished')
    expect(u.published_at).toBeNull()
  })

  it('the route rejects another user\'s portfolio id (403) and writes nothing', async () => {
    const a = seed('free')
    const b = seed('free') // the signed-in user is now b
    const before = JSON.stringify(h.ctx!.db.portfolios)
    const res = await patch({ portfolio_id: a.portfolioId, content: { headline: 'hijack' } })
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBe('forbidden')
    expect(JSON.stringify(h.ctx!.db.portfolios)).toBe(before)
    // and b's own id still works, touching only b
    expect((await patch({ portfolio_id: b.portfolioId, content: { headline: 'mine' } })).status).toBe(200)
    expect(h.ctx!.db.portfolios.find((x) => x.id === b.portfolioId)!.content.headline).toBe('mine')
    expect(h.ctx!.db.portfolios.find((x) => x.id === a.portfolioId)!.content.headline).toBeUndefined()
  })

  it('an id-less request edits the signed-in user\'s own portfolio, never anyone else\'s', async () => {
    const a = seed('free')
    const b = seed('free')
    expect((await patch({ content: { headline: 'only b' } })).status).toBe(200)
    expect(h.ctx!.db.portfolios.find((x) => x.id === b.portfolioId)!.content.headline).toBe('only b')
    expect(h.ctx!.db.portfolios.find((x) => x.id === a.portfolioId)!.content.headline).toBeUndefined()
  })

  it('Pro templates stay locked for a free account on the server', async () => {
    seed('free')
    const res = await patch({ template: PRO_TEMPLATES[0] })
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBe('template_locked')
  })

  it('the dashboard no longer says "Publish to unlock editing", does not gate the Edit tab by plan, sends the portfolio id, and keeps Pro templates locked', () => {
    const src = read('app/dashboard/page.tsx')
    expect(src).not.toMatch(/Publish to unlock editing/)
    expect(src).not.toMatch(/activeTab === 'edit' && userPlan/)
    expect(src).toMatch(/activeTab === 'edit' && \(/)
    expect(src).toMatch(/portfolio_id: portfolio\.id/)
    expect(src).toMatch(/const isLocked = t\.pro && !isPro/)
    expect(src).toMatch(/features\(\)\.find\(\(f\) => f\.id === 'build_preview'\)/)
  })

  it('the browser never writes the portfolios table from the dashboard (the route is the only writer)', () => {
    const src = read('app/dashboard/page.tsx')
    expect(src).not.toMatch(/\.from\('portfolios'\)\s*\.(update|insert|upsert|delete)/)
  })
})
