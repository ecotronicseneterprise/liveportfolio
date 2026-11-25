// displayReport: the one check that says how much of what is saved the public page draws. Uses the page's own adapter, so it cannot drift.
import { describe, expect, it } from 'vitest'
import { displayNotices, displayReport, textUsage } from '../lib/blocks/display'
import { PROJECT_TEXT_MAX } from '../lib/blocks/adapt'
import { TEXT_LIMITS } from '../lib/portfolio/ops'

const bullets = (n: number) => Array.from({ length: n }, (_, i) => `bullet ${i + 1}`)
const full = {
  name: 'Ada', about: 'One.\n\nTwo.',
  projects: [{ title: 'P', problem: 'a', solution: 'b', outcome: 'c', stack: Array.from({ length: 9 }, (_, i) => `S${i}`) }],
  experience: [{ company: 'A', role: 'B', period: '2020', bullets: bullets(9) }],
  testimonials: Array.from({ length: 5 }, (_, i) => ({ text: `t${i}`, author: `a${i}`, role: '', company: '' })),
}
const row = (rows: ReturnType<typeof displayReport>, s: string) => rows.find((r) => r.section === s)

describe('displayReport', () => {
  it('everything saved is drawn (shown equals total, nothing truncated); a phone folds the long lists', () => {
    const rows = displayReport(full, 'minimal')
    for (const r of rows) expect(r.shown, r.section).toBe(r.total)
    for (const r of rows) expect(r.truncated, r.section).toBe(false)
    expect(row(rows, 'experience bullets')!.folded_on_phone).toBe(6)
    expect(row(rows, 'testimonials')!.folded_on_phone).toBe(2)
    expect(row(rows, 'stack')!.folded_on_phone).toBe(4)
  })
  it('Pro designs draw everything with no fold', () => {
    const rows = displayReport(full, 'developer')
    expect(rows.every((r) => !r.folded_on_phone)).toBe(true)
  })
  it('says so when a testimonial or project would be left out, and when a flat skill is not drawn', () => {
    const rows = displayReport({ projects: [{ title: '', problem: 'x', solution: '', outcome: '', stack: [] }], testimonials: [{ text: 'hi', author: '' }], skills: ['Go', 'Rust'], skills_grouped: [{ category: 'Langs', items: ['Go'] }] } as never, 'minimal')
    expect(row(rows, 'projects')!.note).toMatch(/no title/)
    expect(row(rows, 'testimonials')!.truncated).toBe(true)
    expect(row(rows, 'skills')!.note).toMatch(/Rust/)
    expect(displayNotices(rows).length).toBeGreaterThanOrEqual(3)
  })
  it('flags text longer than what can be drawn', () => {
    const rows = displayReport({ projects: [{ title: 'P', problem: '', solution: 'x'.repeat(PROJECT_TEXT_MAX + 5), outcome: '', stack: [] }] } as never, 'minimal')
    expect(row(rows, 'projects')!.truncated).toBe(true)
  })
  it('an empty portfolio reports nothing alarming', () => {
    expect(displayNotices(displayReport({}, 'minimal'))).toEqual([])
    expect(displayNotices(displayReport(null, undefined))).toEqual([])
  })
})

describe('textUsage', () => {
  it('gives characters used, the limit, characters remaining and words', () => {
    const u: any = textUsage({ about: 'one two three', projects: [{ title: 'P', solution: 'x'.repeat(100) }] }, { ...TEXT_LIMITS })
    expect(u.about).toEqual({ length: 13, limit: 6000, remaining: 5987, words: 3 })
    expect(u.projects[0].solution).toMatchObject({ length: 100, limit: PROJECT_TEXT_MAX, remaining: PROJECT_TEXT_MAX - 100 })
  })
})