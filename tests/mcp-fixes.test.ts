import { describe, expect, it } from 'vitest'
import { cutAtWord, deriveSeo } from '@/lib/portfolio/derive'
import { describeChanges, displayWarnings } from '@/lib/mcp/diff'
import { applyOps } from '@/lib/portfolio/ops'
import { TOOLS, toolByName } from '@/lib/mcp/tools'
import type { McpCtx } from '@/lib/mcp/auth'

const ctx: McpCtx = { userId: 'u', email: 'a@b.c', plan: 'pro', connection: { id: 'c', client_id: 'x', client_name: 't', allow_edits: true, share_contact: false } }

describe('SEO text', () => {
  it('is cut at a word boundary with an ellipsis, never mid-word, within 155 characters', () => {
    const long = 'Clifford Nwanna is an Engineer who builds intelligent products by combining AI, software, electronics, and engineering. He enjoys solving complex real-world problems, turning ideas into practical systems, and creating products that generate lasting value.'
    const out = cutAtWord(long, 155)
    expect(out.length).toBeLessThanOrEqual(155)
    expect(out.endsWith('…')).toBe(true)
    expect(long.startsWith(out.slice(0, -1))).toBe(true)
    expect(long.charAt(out.length - 1)).toBe(' ') // the cut falls on a space
  })
  it('is built from role, location and headline (About is the fallback)', () => {
    const s = deriveSeo({ name: 'Ada', role: 'AI Systems Engineer', location: 'Lagos', headline: 'Building production AI systems.', about: 'ignored' })
    expect(s.seo_title).toBe('Ada | AI Systems Engineer')
    expect(s.seo_description).toBe('AI Systems Engineer in Lagos. Building production AI systems.')
    expect(deriveSeo({ name: 'Ada', role: '', about: 'Only about.' }).seo_description).toBe('Only about.')
  })
})

describe('limits match real portfolios', () => {
  const base = { content: { skills: Array.from({ length: 17 }, (_, i) => `s${i}`), projects: [{ title: 'P', solution: 'x'.repeat(604), stack: [] }] }, template: 'minimal' }
  it('accepts a project text of 604 characters and edits other fields of such a project', () => {
    expect(() => applyOps(base, [{ op: 'update_project', index: 0, patch: { solution: 'y'.repeat(1200) } }])).not.toThrow()
    expect(applyOps(base, [{ op: 'update_project', index: 0, patch: { title: 'Q' } }]).changes).toHaveLength(1)
  })
  it('accepts a flat skills list of 17 or 30', () => {
    expect(() => applyOps(base, [{ op: 'set_skills', skills: Array.from({ length: 30 }, (_, i) => `n${i}`) }])).not.toThrow()
  })
})

describe('assistant tools', () => {
  it('portfolio_get_schema lists the real operations (not empty) and never replace_content', async () => {
    const r = (await toolByName('portfolio_get_schema')!.run(ctx, {})) as { operations: Array<{ properties: { op: { const: string } } }> }
    const names = r.operations.map((o) => o.properties.op.const)
    expect(names.length).toBeGreaterThan(15)
    expect(names).toContain('add_project')
    expect(names).not.toContain('replace_content')
  })
  it('has the narrow tools, and add_education takes a period', () => {
    const names = TOOLS.map((t) => t.name)
    for (const n of ['portfolio_add_skill', 'portfolio_add_skill_to_group', 'portfolio_remove_certification', 'portfolio_remove_education']) expect(names).toContain(n)
    expect(Object.keys(toolByName('portfolio_add_education')!.input.shape)).toContain('period')
    expect(Object.keys(toolByName('portfolio_get')!.input.shape)).toContain('sections')
    expect(toolByName('portfolio_remove_certification')!.kind).toBe('approval')
    expect(toolByName('portfolio_add_skill')!.kind).toBe('direct')
  })
  it('there is deliberately no SEO tool (SEO is derived on every save)', () => {
    expect(TOOLS.map((t) => t.name).join(' ')).not.toMatch(/seo/)
  })
})

describe('approval before/after and display warnings', () => {
  it('shows labelled before and after, hides contact details, and skips unchanged fields', () => {
    const c = describeChanges({ about: 'Old', email: 'a@b.c', skills: ['a'], name: 'X' }, { about: 'New', email: 'z@y.x', skills: ['a', 'b'], name: 'X' })
    expect(c.map((x) => x.label)).toEqual(['About', 'Skills'])
    expect(c[0]).toEqual({ label: 'About', before: 'Old', after: 'New' })
    expect(JSON.stringify(c)).not.toContain('@')
  })
  it('warns about a stack longer than the page shows and an outcome equal to the solution', () => {
    const w = displayWarnings({ projects: [{ title: 'A', stack: ['1', '2', '3', '4', '5', '6', '7'], solution: 'same', outcome: 'same' }] })
    expect(w.join(' ')).toMatch(/first 5 of its 7/)
    expect(w.join(' ')).toMatch(/outcome is identical/)
  })
})
