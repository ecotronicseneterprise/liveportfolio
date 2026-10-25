// How the block renderer is wired in: which portfolios use it, what a NEW portfolio stores, what the onboarding preview shows.
// The key promise now: every free-template portfolio gets a valid block layout, while Pro templates keep their own renderer.
import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  ctx: null as null | ReturnType<typeof import('./helpers/fake-supabase').createFakeDb>,
  user: null as null | { id: string; email: string },
  modelReply: {} as Record<string, unknown>,
}))
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { getUser: async () => (h.user ? { data: { user: h.user }, error: null } : { data: { user: null }, error: new Error('bad jwt') }) } }),
}))
vi.mock('@/lib/supabase', async () => {
  const { createFakeDb } = await import('./helpers/fake-supabase')
  h.ctx = createFakeDb()
  return { getSupabaseAdmin: () => h.ctx!.admin, getSupabaseClient: () => ({}) }
})
vi.mock('openai', () => ({
  default: class {
    chat = { completions: { create: async () => ({ choices: [{ message: { content: JSON.stringify(h.modelReply) } }] }) } }
  },
}))

import '@/lib/supabase'
import { NextRequest } from 'next/server'
import { POST } from '../app/api/generate/route'
import { storedLayout } from '../lib/blocks/mode'
import { portfolioRenderMode } from '../lib/portfolio/render-mode'
import { parseLayout } from '../lib/blocks/settings'
import { draftToPreviewContent } from '../lib/onboarding/preview-content'
import { sanitizeDraft } from '../lib/onboarding/draft'
import { draftToGeneratePayload } from '../lib/onboarding/generate'
import { SAMPLE_PEOPLE } from '../lib/blocks/sample'
import { FREE_TEMPLATES, PRO_TEMPLATES } from '../lib/plans'

const rows = (t: string) => h.ctx!.db[t]
let n = 0
const call = (body: unknown) =>
  POST(new NextRequest('http://localhost/api/generate', { method: 'POST', headers: { authorization: 'Bearer t', 'content-type': 'application/json', 'x-forwarded-for': `10.1.0.${++n}` }, body: JSON.stringify(body) }))
const reply = (outcome: string) => ({
  headline: 'Backend engineer who ships payment systems', about: 'About text.', skills_narrative: 'Go.', skills_grouped: [{ category: 'Core', items: ['Go'] }],
  projects: [{ title: 'Ledger', problem: 'p', solution: 's', outcome, stack: ['Go'], url: null }], experience: [], education: [], certifications: [], seo_title: 'Ada | Backend', seo_description: 'Ada.',
})
const base = { name: 'Ada', role: 'Backend engineer', email: 'ada@example.com', location: 'Lagos', bio: '', skills: ['Go'], projects: [{ title: 'Ledger', description: 'A ledger', stack: ['Go'] }], experience: [], education: [] }

beforeEach(() => { h.ctx!.db.portfolios = []; h.ctx!.db.users = []; h.user = { id: `u-${++n}`, email: 'ada@example.com' } })

describe('which portfolios use the block renderer', () => {
  const L = { v: 1, arrangement: 'proof' }
  it('no layout, or an invalid one: free templates derive the new layout and Pro templates still ignore it', () => {
    for (const tpl of FREE_TEMPLATES) {
      expect(storedLayout({ ...SAMPLE_PEOPLE.engineer }, tpl), tpl).toMatchObject({ v: 1 })
      expect(storedLayout({ ...SAMPLE_PEOPLE.engineer, layout: { v: 1, arrangement: 'carousel' } } as never, tpl), tpl).toMatchObject({ v: 1 })
      expect(storedLayout({ ...SAMPLE_PEOPLE.engineer, layout: 'proof' } as never, tpl), tpl).toMatchObject({ v: 1 })
    }
    for (const tpl of PRO_TEMPLATES) {
      expect(storedLayout({ ...SAMPLE_PEOPLE.engineer }, tpl), tpl).toBeNull()
      expect(storedLayout({ ...SAMPLE_PEOPLE.engineer, layout: { v: 1, arrangement: 'carousel' } } as never, tpl), tpl).toBeNull()
      expect(storedLayout({ ...SAMPLE_PEOPLE.engineer, layout: 'proof' } as never, tpl), tpl).toBeNull()
    }
    expect(storedLayout(null, 'minimal')).toEqual({ v: 1, arrangement: 'profile' })
    expect(storedLayout(undefined, 'minimal')).toEqual({ v: 1, arrangement: 'profile' })
  })
  it('a valid layout on a free template id: blocks. On a Pro template id: the free-template layout is still ignored', () => {
    for (const tpl of FREE_TEMPLATES) expect(storedLayout({ ...SAMPLE_PEOPLE.engineer, layout: L } as never, tpl), tpl).toEqual(L)
    for (const tpl of PRO_TEMPLATES) expect(storedLayout({ ...SAMPLE_PEOPLE.engineer, layout: L } as never, tpl), tpl).toBeNull()
  })
  it('the public page and the picker use exactly this rule', async () => {
    const fs = await import('node:fs')
    expect(fs.readFileSync('app/portfolio/[slug]/page.tsx', 'utf8')).toMatch(/portfolioRenderMode\(safe, effectiveTemplate\)/)
    expect(fs.readFileSync('components/templates/dynamic.ts', 'utf8')).toMatch(/portfolioRenderMode\(content, id\)/)
    for (const template of FREE_TEMPLATES) expect(portfolioRenderMode({ ...SAMPLE_PEOPLE.engineer, layout: L }, template)).toEqual({ kind: 'blocks', layout: L })
    for (const template of FREE_TEMPLATES) expect(portfolioRenderMode({ ...SAMPLE_PEOPLE.engineer }, template).kind).toBe('blocks')
    // a Pro template shows its redesign by default (free-look layout settings never matter); the original only if the owner kept it (marker 1)
    for (const template of PRO_TEMPLATES) {
      expect(portfolioRenderMode({ ...SAMPLE_PEOPLE.engineer, layout: L }, template)).toEqual({ kind: 'pro', template })
      expect(portfolioRenderMode({ ...SAMPLE_PEOPLE.engineer, layout: L, pro_designs: { [template]: 1 } }, template)).toEqual({ kind: 'legacy' })
    }
  })
})

describe('/api/generate stores the look for a NEW portfolio', () => {
  it('a free template: the layout is stored inside content, the template column is the chosen id, and the layout validates', async () => {
    h.modelReply = reply('Cut reconciliation from 3 hours to 9 minutes')
    const res = await call({ ...base, template: 'bold' })
    expect(res.status).toBe(200)
    const row = rows('portfolios')[0]
    expect(row.template).toBe('bold')
    expect(parseLayout(row.content.layout)).toMatchObject({ v: 1 })
    expect(Object.keys(row.content.layout).sort()).toEqual(['arrangement', 'v'])
  })
  it('no look chosen: the recommended one is stored (Studio, "creative", when the results carry figures)', async () => {
    h.modelReply = reply('Cut reconciliation from 3 hours to 9 minutes')
    await call({ ...base, template: '' })
    expect(rows('portfolios')[0].template).toBe('creative')
    expect(parseLayout(rows('portfolios')[0].content.layout)).toBeTruthy()
  })
  it('a Pro template is stored as chosen and gets NO layout (legacy)', async () => {
    h.modelReply = reply('Cut reconciliation from 3 hours to 9 minutes')
    await call({ ...base, template: 'developer' })
    expect(rows('portfolios')[0].template).toBe('developer')
    expect('layout' in rows('portfolios')[0].content).toBe(false)
  })
  it('the layout never contains words: only the schema keys', async () => {
    h.modelReply = reply('Shipped it')
    await call({ ...base, template: 'minimal' })
    expect(JSON.stringify(rows('portfolios')[0].content.layout)).toMatch(/^\{"v":1,"arrangement":"(proof|profile|index|showcase)"\}$/)
  })
})

describe('onboarding: the preview matches what a new portfolio gets', () => {
  it('the preview content carries a valid layout, so the gallery draws the new designs', () => {
    const c = draftToPreviewContent(sanitizeDraft({ name: 'Ada', role: 'Backend engineer', skills: ['Go'], projects: [{ title: 'Ledger', description: 'x' }] }), 'ada@example.com')
    expect(parseLayout((c as { layout?: unknown }).layout)).toBeTruthy()
  })
  it('a draft with no look chosen stays "not chosen" and is sent as such, so the server picks the recommended look', () => {
    const d = sanitizeDraft({ name: 'Ada', role: 'Engineer' })!
    expect(d.template).toBe('')
    expect(draftToGeneratePayload(d, 'ada@example.com').template).toBe('')
    expect(sanitizeDraft({ name: 'Ada', template: 'bold' })!.template).toBe('bold')
  })
})
