import { describe, expect, it } from 'vitest'
import { FREE_TEMPLATES, PRO_TEMPLATES } from '../lib/plans'
import { parseLayout } from '../lib/blocks/settings'
import { applyOps, CONTENT_KEYS, Op, OpError } from '../lib/portfolio/ops'
import {
  canTransitionProDesigns, isProTemplateId, ProDesignsSchema, readProDesigns, usesProDesign, withProDesign,
  type ProDesigns, type ProTemplateId,
} from '../lib/portfolio/presentation'

describe('Pro presentation read/write contract', () => {
  it('recognises precisely the current Pro template catalogue', () => {
    for (const template of PRO_TEMPLATES) expect(isProTemplateId(template)).toBe(true)
    for (const value of [...FREE_TEMPLATES, 'future-template', 'Developer', '', null, undefined, 2, {}]) {
      expect(isProTemplateId(value)).toBe(false)
    }
    const template: ProTemplateId = 'developer'
    const map: ProDesigns = { [template]: 2 }
    expect(ProDesignsSchema.parse(map)).toEqual(map)
    expect(ProDesignsSchema.parse({})).toEqual({})
    expect(ProDesignsSchema.parse(Object.fromEntries(PRO_TEMPLATES.map((id) => [id, 2])))).toHaveProperty('cybersecurity', 2)
  })

  it.each([
    null, undefined, [], 'developer', 2,
    { developer: 1 }, { developer: 3 }, { developer: '2' }, { developer: true },
    { developer: null }, { developer: undefined }, { minimal: 2 }, { unknown: 2 },
    { developer: 2, future: 2 }, { developer: 2, designer: 3 },
    JSON.parse('{"__proto__":2}'),
  ])('rejects invalid write maps strictly: %j', (map) => {
    expect(ProDesignsSchema.safeParse(map).success).toBe(false)
    expect(() => applyOps({ content: {}, template: 'minimal' }, [{ op: 'replace_content', content: { pro_designs: map } }])).toThrow(OpError)
  })

  it('reads valid keys independently, ignoring unknown versions and future keys without mutation', () => {
    const raw = Object.freeze({ developer: 2, designer: 3, finance: '2', graduate: 2, future: 2, minimal: 2 })
    const before = JSON.stringify(raw)
    expect(readProDesigns(raw)).toEqual({ developer: 2, graduate: 2 })
    expect(JSON.stringify(raw)).toBe(before)
    expect(readProDesigns(Object.create({ developer: 2 }))).toEqual({})
    for (const invalid of [null, undefined, [], '2', 2, true, { developer: 3 }, { future: 2 }]) {
      expect(readProDesigns(invalid)).toEqual({})
    }
  })

  it('never infers Pro opt-in from the free layout and never enables a different template', () => {
    const layout = { v: 1, arrangement: 'proof' }
    const content = { layout, pro_designs: { developer: 2, designer: 3, minimal: 2, future: 2 } }
    expect(parseLayout(content.layout)).toEqual(layout)
    expect(usesProDesign(content, 'developer')).toBe(true)
    expect(usesProDesign({ pro_designs: { developer: 2 } }, 'developer')).toBe(true)
    for (const template of [...FREE_TEMPLATES, 'designer', 'finance', 'future']) {
      expect(usesProDesign(content, template)).toBe(false)
    }
    for (const template of PRO_TEMPLATES) {
      expect(usesProDesign({ ...content, pro_designs: undefined }, template)).toBe(false)
      expect(usesProDesign(null, template)).toBe(false)
      expect(usesProDesign(undefined, template)).toBe(false)
    }
  })

  it('immutably adds/removes just the named valid marker and preserves layout/content', () => {
    const content = Object.freeze({
      name: 'Ada', layout: Object.freeze({ v: 1, arrangement: 'proof' }),
      pro_designs: Object.freeze({ developer: 2, finance: 2, designer: 3, future: 2 }),
    })
    const enabled = withProDesign(content, 'graduate', true)
    expect(enabled).not.toBe(content)
    expect(enabled.pro_designs).not.toBe(content.pro_designs)
    expect(enabled.pro_designs).toEqual({ developer: 2, finance: 2, graduate: 2 })
    expect(enabled.layout).toBe(content.layout)
    expect(enabled.name).toBe('Ada')
    const removed = withProDesign(enabled, 'finance', false)
    expect(removed.pro_designs).toEqual({ developer: 2, graduate: 2 })
    expect(enabled.pro_designs.finance).toBe(2)
    expect(content.pro_designs).toEqual({ developer: 2, finance: 2, designer: 3, future: 2 })
    expect(withProDesign({}, 'developer', false)).toEqual({ pro_designs: {} })
  })
})

describe('presentation operations and compatibility', () => {
  const state = () => ({
    template: 'minimal',
    content: { name: 'Ada', layout: { v: 1, arrangement: 'profile' }, pro_designs: { developer: 2, finance: 2 } },
  })

  it('preserves omitted metadata verbatim, including unsupported future entries', () => {
    const input = { template: 'minimal', content: { pro_designs: { developer: 2, designer: 7, future: 2 }, layout: { v: 1, arrangement: 'profile' } } }
    const before = JSON.stringify(input)
    for (const ops of [
      [{ op: 'replace_content', content: { headline: 'New words' } }],
      [{ op: 'set_field', field: 'headline', value: 'New words' }],
      [{ op: 'set_layout', layout: null }],
      [{ op: 'set_template', template: 'developer' }],
    ]) {
      expect(applyOps(input, ops).state.content.pro_designs).toEqual(input.content.pro_designs)
    }
    expect(JSON.stringify(input)).toBe(before)
  })

  it('whole-map saves replace the map, while typed removal preserves other markers and layout', () => {
    const input = state()
    const replaced = applyOps(input, [{ op: 'replace_content', content: { pro_designs: { graduate: 2 } } }])
    expect(replaced.state.content.pro_designs).toEqual({ graduate: 2 })
    expect(replaced.changes).toEqual(['Changed pro designs'])
    const removed = applyOps(input, [{ op: 'set_pro_design', template: 'developer', version: null }])
    expect(removed.state.content.pro_designs).toEqual({ finance: 2 })
    expect(removed.state.content.layout).toEqual(input.content.layout)
    expect(removed.changes).toEqual(['Restored classic developer design'])
    expect(input).toEqual(state())
    const enabled = applyOps(input, [{ op: 'set_pro_design', template: 'designer', version: 2 }])
    expect(enabled.state.content.pro_designs).toEqual({ developer: 2, finance: 2, designer: 2 })
    expect(enabled.changes).toEqual(['Enabled new designer design'])
    expect(applyOps(input, [{ op: 'set_pro_design', template: 'developer', version: 2 }]).changes).toEqual([])
  })

  it.each([
    { op: 'set_pro_design', template: 'minimal', version: 2 },
    { op: 'set_pro_design', template: 'future', version: 2 },
    { op: 'set_pro_design', template: 'developer', version: 3 },
    { op: 'set_pro_design', template: 'developer', version: '2' },
    { op: 'set_pro_design', template: 'developer' },
    { op: 'set_pro_design', template: 'developer', version: 2, extra: true },
  ])('rejects invalid typed operations: %j', (op) => {
    expect(Op.safeParse(op).success).toBe(false)
    expect(() => applyOps(state(), [op])).toThrow(OpError)
  })

  it('retains testimonials and legacy education periods; both education save shapes allow 50', () => {
    expect(CONTENT_KEYS).toContain('testimonials')
    const testimonials = [{ quote: 'Excellent work.', name: 'A colleague', role: 'Engineer' }]
    const education = Array.from({ length: 50 }, () => ({ degree: 'BSc', institution: 'University', period: '2016–2020', year: '' }))
    const result = applyOps(state(), [{ op: 'replace_content', content: { testimonials, education } }])
    expect(result.state.content.testimonials).toEqual(testimonials)
    expect(result.state.content.education).toEqual(education)
    expect(applyOps(state(), [{ op: 'set_education', education }]).state.content.education).toEqual(education)
    expect(() => applyOps(state(), [{ op: 'set_education', education: [...education, education[0]] }])).toThrow(OpError)
    expect(() => applyOps(state(), [{ op: 'replace_content', content: { testimonials: 'not a list' } }])).toThrow(OpError)
    expect(() => applyOps(state(), [{ op: 'replace_content', content: { testimonials: Array(51).fill({}) } }])).toThrow(OpError)
  })
})

describe('partial project link updates', () => {
  const project = () => ({
    title: 'Portfolio', problem: 'Problem', solution: 'Solution', outcome: 'Outcome', stack: ['TypeScript'],
    url: 'https://example.com', github_url: 'https://github.com/ada/portfolio', image_url: 'https://legacy.example.com/project.png',
  })

  for (const key of ['url', 'github_url', 'image_url'] as const) {
    it.each(['', '   '])(`clears only ${key} for empty value %j without mutating the input`, (value) => {
      const input = { template: 'minimal', content: { projects: [project(), { title: 'Untouched' }] } }
      const before = JSON.stringify(input)
      const result = applyOps(input, [{ op: 'update_project', index: 0, patch: { [key]: value } }])
      const expected: Record<string, unknown> = project()
      delete expected[key]
      expect(result.state.content.projects).toEqual([expected, { title: 'Untouched' }])
      expect(result.changes).toEqual(['Edited project "Portfolio"'])
      expect(JSON.stringify(input)).toBe(before)
      expect(applyOps(result.state, [{ op: 'update_project', index: 0, patch: { [key]: value } }]).changes).toEqual([])
    })
  }

  it('retains all omitted links and other fields when changing only the title', () => {
    const input = { template: 'minimal', content: { projects: [project()] } }
    const result = applyOps(input, [{ op: 'update_project', index: 0, patch: { title: 'Renamed' } }])
    expect(result.state.content.projects).toEqual([{ ...project(), title: 'Renamed' }])
    expect(input.content.projects).toEqual([project()])
  })
})

describe('shared save/restore plan transition guard', () => {
  it.each(['free', 'basic'] as const)('%s may keep/remove but cannot newly enable any marker', (plan) => {
    expect(canTransitionProDesigns(plan, { developer: 2, finance: 2 }, { developer: 2, finance: 2 })).toBe(true)
    expect(canTransitionProDesigns(plan, { developer: 2, finance: 2 }, { finance: 2 })).toBe(true)
    expect(canTransitionProDesigns(plan, { developer: 2 }, undefined)).toBe(true)
    expect(canTransitionProDesigns(plan, undefined, {})).toBe(true)
    for (const template of PRO_TEMPLATES) {
      expect(canTransitionProDesigns(plan, {}, { [template]: 2 })).toBe(false)
      expect(canTransitionProDesigns(plan, { [template]: 3 }, { [template]: 2 })).toBe(false)
    }
    expect(canTransitionProDesigns(plan, { developer: 2 }, { developer: 2, designer: 2 })).toBe(false)
    expect(canTransitionProDesigns(plan, { developer: 2 }, { finance: 2 })).toBe(false)
  })

  it('allows Pro to opt into any supported template', () => {
    for (const template of PRO_TEMPLATES) expect(canTransitionProDesigns('pro', undefined, { [template]: 2 })).toBe(true)
  })
})