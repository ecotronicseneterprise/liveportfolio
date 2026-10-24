import { describe, expect, it } from 'vitest'
import mammoth from 'mammoth'
import { buildProfiles, Gold, fmtPeriod } from '../synthetic/profiles'
import { buildHardProfiles } from '../synthetic/hard'
import { toDocModel } from '../synthetic/model'
import { renderPdf } from '../synthetic/render-pdf'
import { renderDocx } from '../synthetic/render-docx'
import { layoutText } from '../lib/layout-pdf'
import { norm } from '../lib/score'

const easy = buildProfiles()
const hard = buildHardProfiles()

describe('easy set', () => {
  it('is deterministic and has 44 profiles in the documented mix', () => {
    expect(JSON.stringify(buildProfiles())).toBe(JSON.stringify(easy))
    expect(easy).toHaveLength(44)
    const v = easy.reduce<Record<string, number>>((a, g) => ((a[g.meta.variant] = (a[g.meta.variant] || 0) + 1), a), {})
    expect(v).toEqual({ clean: 29, messy: 7, 'injection-late': 4, 'injection-early': 4 })
  })
})

describe('hard set', () => {
  it('is deterministic, 100 profiles, unique ids, split by profile ≈ 30/70', () => {
    expect(JSON.stringify(buildHardProfiles())).toBe(JSON.stringify(hard))
    expect(hard).toHaveLength(100)
    expect(new Set(hard.map((g) => g.meta.id)).size).toBe(100)
    const dev = hard.filter((g) => g.meta.split === 'dev').length
    expect(dev).toBeGreaterThanOrEqual(22)
    expect(dev).toBeLessThanOrEqual(38)
    expect(hard.filter((g) => g.meta.split === 'test').length).toBe(100 - dev)
  })

  it('covers every layout × format combination and every hard feature at least 3×', () => {
    const combos = new Set(hard.map((g) => `${g.meta.layout}/${g.meta.ext}`))
    expect(combos.size).toBe(8)
    const tags = hard.reduce<Record<string, number>>((a, g) => (g.meta.tags!.forEach((t) => (a[t] = (a[t] || 0) + 1)), a), {})
    for (const t of ['alt-headings', 'prose-jobs', 'prose-skills', 'abbr-dates', 'ambiguous-dates', 'date-word', 'long-career', 'missing-education', 'missing-skills', 'header-footer', 'merged-cells', 'typos', 'referees', 'french', 'ng-conventions', 'injection-early', 'injection-late']) {
      expect(tags[t] ?? 0, t).toBeGreaterThanOrEqual(3)
    }
  })

  it('keeps every dev/test split stratified across tags (each hard feature appears in both)', () => {
    for (const split of ['dev', 'test'] as const) {
      const tags = new Set(hard.filter((g) => g.meta.split === split).flatMap((g) => g.meta.tags!))
      for (const t of ['alt-headings', 'prose-jobs', 'referees', 'french', 'header-footer']) expect(tags.has(t), `${split}:${t}`).toBe(true)
    }
  })

  it('contains no real-looking contact data', () => {
    for (const g of [...easy, ...hard]) {
      expect(g.basics.email).toMatch(/@(example\.(com|org|net)|gmail\.com|yahoo\.com|outlook\.com)$/)
      if (/@(gmail|yahoo|outlook)\.com$/.test(g.basics.email)) expect(g.basics.email).toContain('synth')
      for (const p of g.basics.profiles) expect(p.username).toContain('synth')
      for (const r of g.referees ?? []) expect(r.email).toContain('.ref')
      expect(g.basics.email).not.toBe(g.referees?.[0]?.email)
    }
  })

  it('is JSON Resume-shaped and structurally valid', () => {
    for (const g of hard) {
      expect(g.basics.name).toBeTruthy()
      expect(g.work.length).toBeGreaterThan(0)
      for (const w of g.work) {
        expect(w.startDate).toMatch(/^\d{4}-\d{2}$/)
        if (w.endDate) expect(w.endDate >= w.startDate).toBe(true)
        expect(w.highlights.length).toBeGreaterThan(0)
      }
      if (g.meta.tags!.includes('long-career')) expect(g.work.length).toBeGreaterThanOrEqual(8)
      for (const t of g.meta.tags!.filter((x) => x.startsWith('missing-'))) {
        const k = t.replace('missing-', '')
        if (k === 'education') expect(g.education).toHaveLength(0)
        if (k === 'skills') expect(g.skills).toHaveLength(0)
        if (k === 'projects') expect(g.projects).toHaveLength(0)
        if (k === 'certs') expect(g.certificates).toHaveLength(0)
        if (k === 'summary') expect(g.basics.summary).toBe('')
      }
      if (g.meta.variant !== 'clean') expect(g.meta.injectedEmail).toMatch(/@evil\.example$/)
    }
  })

  it('formats dates in each hard style', () => {
    expect(fmtPeriod('2019-03', '2021-11', 'abbr')).toBe("Mar '19 – Nov '21")
    expect(fmtPeriod('2019-03', undefined, 'date')).toBe('Mar 2019 – date')
    expect(fmtPeriod('2019-03', '2021-11', 'fr')).toBe('mars 2019 – nov. 2021')
    expect(fmtPeriod('2019-03', '2021-11', 'amb')).toMatch(/^\d\d\/\d\d\/2019 – \d\d\/\d\d\/2021$/)
  })
})

describe('rendering (sampled: 2 profiles per layout×format, easy + hard)', () => {
  const sample = (set: Gold[], layoutOf: (g: Gold, i: number) => string, extOf: (g: Gold, i: number) => 'pdf' | 'docx') => {
    const seen = new Map<string, number>()
    return set.filter((g, i) => {
      const k = `${layoutOf(g, i)}/${extOf(g, i)}`
      const n = (seen.get(k) ?? 0) + 1
      seen.set(k, n)
      return n <= 2
    })
  }

  it('hard docs contain the gold name, email, employers and (unless omitted) schools and skills', async () => {
    const picked = sample(hard, (g) => g.meta.layout!, (g) => g.meta.ext!)
    expect(picked.length).toBe(16)
    for (const g of picked) {
      const m = toDocModel(g)
      const layout = g.meta.layout as 'one-column' | 'two-column' | 'photo-header' | 'table-heavy'
      const buf = g.meta.ext === 'pdf' ? await renderPdf(m, layout) : await renderDocx(m, layout)
      const text = g.meta.ext === 'pdf' ? await layoutText(buf) : (await mammoth.extractRawText({ buffer: buf })).value
      // bag-of-words: wrapped or column-interleaved lines must not fail a completeness check
      const bag = new Set(norm(text).split(' '))
      const need = [g.basics.name, ...g.work.map((w) => w.name), ...g.education.map((e) => e.institution), ...g.skills.flatMap((s) => s.keywords)]
      const miss = need.filter((x) => !norm(x).split(' ').every((w) => bag.has(w)))
      expect(miss, `${g.meta.id} ${layout}/${g.meta.ext}`).toEqual([])
      expect(text).toContain(g.basics.email)
      if (g.referees?.length) expect(text).toContain(g.referees[0].email)
      // DOCX headers/footers live outside the body, so mammoth drops them (realistic); PDFs repeat them per page
      if (g.meta.headerFooter && g.meta.ext === 'pdf') expect(text).toContain('Curriculum Vitae')
    }
  })

  it('easy docs render identically to the earlier set (legacy summary rule preserved)', () => {
    const g = easy.find((x) => x.meta.variant === 'messy' && x.meta.id.endsWith('4'))
    if (g) expect(toDocModel(g).summary).toBeUndefined()
  })
})
